import 'reflect-metadata'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { randomBytes, randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { createConnection } from 'mysql2/promise'
import Redis from 'ioredis'
import { Module, Global, Controller, Get, Logger, ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { AdminAuthModule } from '../dist/modules/auth/admin/admin-auth.module.js'
import { AdminAuthService } from '../dist/modules/auth/admin/admin-auth.service.js'
import { LoginThrottleService } from '../dist/modules/auth/admin/login-throttle.service.js'
import { AdminUser } from '../dist/modules/auth/admin/entities/admin-user.entity.js'
import { initializeAdmin } from '../dist/modules/auth/admin/initialize-admin.js'
import { PasswordService } from '../dist/modules/auth/admin/password.service.js'
import { AdminUserRole } from '../dist/modules/rbac/admin/entities/admin-user-role.entity.js'
import { AdminRoleResource } from '../dist/modules/rbac/admin/entities/admin-role-resource.entity.js'
import { SUPER_ROLE_ID } from '../dist/modules/rbac/admin/initialize-rbac.js'
import { RedisService } from '../dist/common/redis/redis.service.js'
import { SnakeNamingStrategy } from '../dist/config/database-naming-strategy.js'
import { AllExceptionsFilter } from '../dist/common/filters/all-exceptions.filter.js'
import { DefaultHttpStatusInterceptor } from '../dist/common/interceptors/default-http-status.interceptor.js'
import { LoggingMiddleware } from '../dist/common/middleware/logging.middleware.js'
import { AdminApi } from '../dist/common/auth/admin-api.decorator.js'

// 显式运行该脚本才连接基础设施；只在新建的随机测试库与带随机前缀的 Redis key 上写入。
config({ quiet: true })
config({ path: '.env.local', override: true, quiet: true })
Logger.overrideLogger(false)

test('真实 MySQL / Redis / HTTP 登录与全端撤销', { timeout: 90000 }, async (t) => {
  const database = `auth_test_${randomUUID().replaceAll('-', '')}`
  assert.match(database, /^auth_test_[a-f0-9]{32}$/)
  const prefix = `${database}:`
  let adminConnection
  let app
  let redis
  try {
    adminConnection = await createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      connectTimeout: 5000,
    })
    await adminConnection.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4`)
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT || 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      db: Number(process.env.REDIS_DB || 0),
      keyPrefix: prefix,
      retryStrategy: () => null,
      connectTimeout: 5000,
    })
    await redis.ping()
    // 在测试进程内动态声明模块与控制器，避免加载正式 AppModule 的环境配置和全局中间件。
    class TestRedisModule {}
    Global()(TestRedisModule)
    Module({
      providers: [{ provide: RedisService, useValue: { isAvailable: () => redis.status === 'ready', getClient: () => redis } }],
      exports: [RedisService],
    })(TestRedisModule)
    class ProbeController {
      get() {
        return { ok: true }
      }
    }
    Controller('v1/admin/probe')(ProbeController)
    Get()(ProbeController.prototype, 'get', Object.getOwnPropertyDescriptor(ProbeController.prototype, 'get'))
    AdminApi({ code: 'test.probe.read', module: '测试模块', feature: '探针', action: '读取', access: 'authenticated' })(
      ProbeController.prototype,
      'get',
      Object.getOwnPropertyDescriptor(ProbeController.prototype, 'get'),
    )
    // 根模块只装配测试数据库、Redis 替身与真实认证模块，隔离正式环境。
    class Root {}
    const secret = randomBytes(48).toString('base64')
    Module({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ app: { jwtSecret: secret, jwtExpiresSeconds: 2592000 } })],
        }),
        TestRedisModule,
        TypeOrmModule.forRoot({
          type: 'mysql',
          host: process.env.DB_HOST || 'localhost',
          port: Number(process.env.DB_PORT || 3306),
          username: process.env.DB_USERNAME || 'root',
          password: process.env.DB_PASSWORD || '',
          database,
          autoLoadEntities: true,
          namingStrategy: new SnakeNamingStrategy(),
          synchronize: true,
          logging: false,
        }),
        AdminAuthModule,
      ],
      controllers: [ProbeController],
    })(Root)
    app = await NestFactory.create(Root, { logger: false })
    const apiPrefix = (process.env.API_PREFIX ?? 'backend').replace(/^\/+|\/+$/g, '')
    app.setGlobalPrefix(apiPrefix)
    app.set('trust proxy', false)
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }))
    app.useGlobalFilters(new AllExceptionsFilter())
    app.useGlobalInterceptors(new DefaultHttpStatusInterceptor())
    // 测试直接注册中间件，需显式先安装解析器，保持正式 Nest 模块中间件可读取请求体的顺序。
    app.useBodyParser('json')
    const logs = []
    app.use(
      new LoggingMiddleware({ create: async (record) => logs.push(record) }).use.bind(
        new LoggingMiddleware({ create: async (record) => logs.push(record) }),
      ),
    )
    await app.listen(0, '127.0.0.1')
    const base = `${await app.getUrl()}/${apiPrefix}`
    const source = app.get(DataSource)
    const users = source.getRepository(AdminUser)
    const columns = await source.query('SHOW FULL COLUMNS FROM admin_user')
    assert.equal(columns.find((column) => column.Field === 'created_by').Default, 'system')
    assert.equal(columns.find((column) => column.Field === 'id').Type, 'varchar(36)')
    assert.equal(columns.find((column) => column.Field === 'token').Null, 'YES')
    assert.ok(!columns.some((column) => column.Field === 'profile_update_time'))
    // 内置账号与普通用户结构一致，仅 created_by 固定为 system，不再维护独立保护列。
    assert.ok(!columns.some((column) => column.Field === 'is_deletable'))
    const indexes = await source.query('SHOW INDEX FROM admin_user')
    assert.ok(
      indexes.some(
        (index) => index.Key_name === 'uk_admin_user_username' && Number(index.Non_unique) === 0 && index.Column_name === 'username',
      ),
      JSON.stringify(indexes),
    )

    const cli = () =>
      spawnSync(process.execPath, [fileURLToPath(new URL('../dist/admin-init.js', import.meta.url))], {
        cwd: tmpdir(),
        env: { ...process.env, MYSQL_ENABLED: 'true', NODE_ENV: 'test', DB_DATABASE: database, DB_SYNCHRONIZE: 'false' },
        encoding: 'utf8',
      })
    const initialized = cli()
    assert.equal(initialized.status, 0, initialized.stderr)
    const password = initialized.stdout.trim().split(/\r?\n/).at(-1)
    assert.match(password, /^[A-Za-z0-9]{32}$/)
    const repeated = cli()
    assert.equal(repeated.status, 0)
    assert.ok(!repeated.stdout.includes(password))
    const original = await users.findOneByOrFail({ username: 'admin' })
    assert.equal(original.createdBy, 'system')
    assert.equal(original.tokenVersion, 1)
    assert.equal(original.lastLoginTime, null)
    assert.equal(original.token, undefined)
    assert.equal(original.passwordHash, undefined)
    // CLI 必须在同一事务内完成角色绑定并恢复内置角色全量授权。
    const roleBindings = source.getRepository(AdminUserRole)
    assert.equal(await roleBindings.countBy({ userId: original.id, roleId: SUPER_ROLE_ID, isDeleted: 0 }), 1)
    assert.ok((await source.getRepository(AdminRoleResource).countBy({ roleId: SUPER_ROLE_ID, isDeleted: 0 })) > 0)
    // 人工破坏绑定后重跑 CLI 必须恢复，且不得重新显示密码。
    await roleBindings.update({ userId: original.id, roleId: SUPER_ROLE_ID }, { isDeleted: 1 })
    const repaired = cli()
    assert.equal(repaired.status, 0, repaired.stderr)
    assert.ok(!repaired.stdout.includes(password))
    assert.equal(await roleBindings.countBy({ userId: original.id, roleId: SUPER_ROLE_ID, isDeleted: 0 }), 1)
    // 用真实唯一约束验证并发初始化，只有一个调用能拿到明文密码。
    await users.delete({ id: original.id })
    const seeded = await Promise.all([initializeAdmin(users, new PasswordService()), initializeAdmin(users, new PasswordService())])
    const winners = seeded.filter((result) => result.password)
    assert.equal(winners.length, 1)
    const actualPassword = winners[0].password
    const user = await users.findOneByOrFail({ username: 'admin' })
    user.username = 'renamed'
    await users.save(user)
    assert.equal((await users.findOneByOrFail({ id: user.id })).username, 'admin')
    const request = async (path, { token, body, method = body ? 'POST' : 'GET', headers = {} } = {}) => {
      const response = await fetch(`${base}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
      return { status: response.status, headers: response.headers, body: await response.json() }
    }
    const login = () =>
      request('/v1/admin/auth/login', {
        body: { userName: ' Admin ', password: actualPassword },
        headers: { 'X-Forwarded-For': '203.0.113.25' },
      })
    assert.equal((await request('/v1/admin/probe')).status, 401)
    assert.equal((await request('/V1/ADMIN/PROBE')).status, 401)
    assert.equal((await request('/v1/admin/auth/login', { body: { userName: 'admin', password: 123 } })).status, 400)
    const failed = await request('/v1/admin/auth/login', { body: { userName: 'admin', password: 'wrong' } })
    assert.equal(failed.status, 401)
    assert.equal((await users.findOneByOrFail({ id: user.id })).lastLoginTime, null)
    const first = await login()
    const second = await login()
    assert.equal(first.status, 200)
    assert.equal(second.status, 200)
    assert.equal(first.headers.get('cache-control'), 'no-store')
    const firstToken = first.body.data.accessToken
    const secondToken = second.body.data.accessToken
    assert.notEqual(firstToken, secondToken)
    const stored = await users.createQueryBuilder('user').addSelect('user.token').where('user.id = :id', { id: user.id }).getOneOrFail()
    assert.equal(stored.token, secondToken)
    assert.equal(stored.lastLoginIp, '127.0.0.1')
    assert.ok(stored.lastLoginTime > 0)
    const profile = await request('/v1/admin/auth/profile', { token: firstToken })
    assert.equal(profile.status, 200)
    assert.deepEqual(Object.keys(profile.body.data).sort(), ['avatar', 'email', 'name', 'userId', 'userName'].sort())
    assert.equal((await request('/v1/admin/probe', { token: secondToken })).status, 200)
    assert.equal((await request('/v1/admin/auth/logout', { token: firstToken, method: 'POST' })).status, 200)
    assert.equal((await request('/v1/admin/auth/profile', { token: firstToken })).status, 401)
    assert.equal((await request('/v1/admin/auth/profile', { token: secondToken })).status, 401)
    const third = await login()
    assert.equal(third.status, 200)
    await assert.rejects(app.get(AdminAuthService).logout(user.id, 1), (error) => error.getStatus() === 401)
    assert.equal((await request('/v1/admin/auth/profile', { token: third.body.data.accessToken })).status, 200)
    const auth = app.get(AdminAuthService)
    const signed = await auth.authenticate(third.body.data.accessToken)
    const raced = await Promise.allSettled([auth.logout(user.id, signed.claims.ver), auth.logout(user.id, signed.claims.ver)])
    assert.equal(raced.filter((result) => result.status === 'fulfilled').length, 1)
    const loggedOut = await users.createQueryBuilder('user').addSelect('user.token').where('user.id = :id', { id: user.id }).getOneOrFail()
    assert.equal(loggedOut.tokenVersion, signed.claims.ver + 1)
    assert.equal(loggedOut.token, null)
    assert.equal(loggedOut.lastLoginIp, stored.lastLoginIp)
    assert.ok(loggedOut.lastLoginTime >= stored.lastLoginTime)
    // 密码计算期间发生撤销，登录的条件更新必须失败，不得覆盖登录记录。
    class RevokedDuringVerification extends PasswordService {
      async verify(password, hash) {
        const valid = await super.verify(password, hash)
        await auth.logout(user.id, loggedOut.tokenVersion)
        return valid
      }
    }
    const racingAuth = new AdminAuthService(
      users,
      new RevokedDuringVerification(),
      app.get(AdminAuthService).jwt,
      app.get(AdminAuthService).config,
    )
    await assert.rejects(
      racingAuth.login({ userName: 'admin', password: actualPassword }, '203.0.113.1'),
      (error) => error.getStatus() === 401,
    )
    const afterRace = await users.findOneByOrFail({ id: user.id })
    assert.equal(afterRace.lastLoginTime, loggedOut.lastLoginTime)
    assert.equal(afterRace.lastLoginIp, loggedOut.lastLoginIp)
    for (let index = 0; index < 3; index++) await login()
    const limited = await login()
    assert.equal(limited.status, 429)
    assert.ok(Number(limited.headers.get('retry-after')) > 0)
    // 更换不存在的用户名不能绕过 IP 总量限制。
    let ipLimited
    for (let index = 0; index < 31; index++) {
      ipLimited = await request('/v1/admin/auth/login', {
        body: {
          userName: `missing${String.fromCharCode(97 + (index % 26))}${String.fromCharCode(97 + Math.floor(index / 26))}`,
          password: 'incorrect',
        },
      })
      if (ipLimited.status === 429) break
      assert.equal(ipLimited.status, 401)
    }
    assert.equal(ipLimited.status, 429)
    await t.test('登录窗口末尾仍拒绝超限请求，等待时间向上取整', async () => {
      for (const [milliseconds, ipHits, userHits] of [
        [1, 30, 5],
        [250, 30, 5],
        [250, 30, 0],
        [250, 0, 5],
        [999, 30, 5],
        [1001, 30, 5],
      ]) {
        // 在同一次 Redis 执行中设置窗口末尾状态，避免依靠 sleep 造成时序不稳定。
        const throttle = new LoginThrottleService({
          isAvailable: () => true,
          getClient: () => ({
            eval: (script, count, ...args) =>
              redis.eval(
                `redis.call('SET', KEYS[1], ${ipHits}, 'PX', ${milliseconds})
                 redis.call('SET', KEYS[2], ${userHits}, 'PX', ${milliseconds})
                 ${script}`,
                count,
                ...args,
              ),
          }),
        })
        const headers = new Map()
        await assert.rejects(
          throttle.check('192.0.2.1', 'boundary', { setHeader: (name, value) => headers.set(name, value) }),
          (error) => error.getStatus() === 429,
          `剩余 ${milliseconds}ms，IP=${ipHits}、账号=${userHits} 时必须拒绝`,
        )
        assert.equal(headers.get('Retry-After'), Math.ceil(milliseconds / 1000))
      }
    })
    // 认证路径记录原始审计正文，请求密码与成功签发的令牌按实际内容保存。
    const authLogs = logs.filter((record) => /auth\//i.test(record.url))
    assert.ok(authLogs.length > 0)
    assert.ok(
      authLogs
        .filter((record) => /login/i.test(record.url))
        .every((record) => typeof record.requestBody === 'string' && typeof record.responseBody === 'string'),
    )
    assert.ok(authLogs.every((record) => typeof record.responseBody === 'string'))
    assert.ok(authLogs.some((record) => JSON.parse(record.requestBody).password === actualPassword), '登录日志应保存真实密码')
    assert.ok(authLogs.some((record) => JSON.parse(record.requestBody).password === 'wrong'), '失败登录日志应保存原始密码')
    assert.ok(
      authLogs.some((record) => JSON.parse(record.responseBody).data?.accessToken === firstToken),
      '登录响应日志应保存签发的令牌',
    )
    await source.destroy()
    const databaseDown = await request('/v1/admin/auth/profile', { token: third.body.data.accessToken })
    assert.equal(databaseDown.status, 503)
    redis.disconnect()
    const unavailable = await login()
    assert.equal(unavailable.status, 503)
  } finally {
    if (app) await app.close()
    if (redis?.status === 'ready') {
      const keys = await redis.keys(`${prefix}*`)
      if (keys.length) await redis.del(...keys.map((key) => key.slice(prefix.length)))
    }
    if (redis) redis.disconnect()
    if (adminConnection) {
      await adminConnection.query(`DROP DATABASE IF EXISTS \`${database}\``)
      await adminConnection.end()
    }
  }
})
