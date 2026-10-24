import 'reflect-metadata'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { randomBytes, randomUUID } from 'node:crypto'
import { config } from 'dotenv'
import { createConnection } from 'mysql2/promise'
import Redis from 'ioredis'
import { Controller, Get, Global, Logger, Module, Patch, ValidationPipe } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { AdminAuthModule } from '../dist/modules/auth/admin/admin-auth.module.js'
import { AdminUser } from '../dist/modules/auth/admin/entities/admin-user.entity.js'
import { initializeAdmin } from '../dist/modules/auth/admin/initialize-admin.js'
import { PasswordService } from '../dist/modules/auth/admin/password.service.js'
import { RbacModule } from '../dist/modules/rbac/admin/rbac.module.js'
import { initializeRbac, SUPER_ROLE_ID } from '../dist/modules/rbac/admin/initialize-rbac.js'
import { SYSTEM_BUTTON_PERMISSIONS } from '../dist/common/constants/admin-permission.constant.js'
import { AdminRole } from '../dist/modules/rbac/admin/entities/admin-role.entity.js'
import { AdminRoleResource } from '../dist/modules/rbac/admin/entities/admin-role-resource.entity.js'
import { AdminUserRole } from '../dist/modules/rbac/admin/entities/admin-user-role.entity.js'
import { AdminResourceApi } from '../dist/modules/rbac/admin/entities/admin-resource-api.entity.js'
import { AdminPermissionResource } from '../dist/modules/rbac/admin/entities/admin-permission-resource.entity.js'
import { AccessLog } from '../dist/modules/access-log/entities/access-log.entity.js'
import { AdminApi } from '../dist/common/auth/admin-api.decorator.js'
import { RedisService } from '../dist/common/redis/redis.service.js'
import { SnakeNamingStrategy } from '../dist/config/database-naming-strategy.js'
import { AllExceptionsFilter } from '../dist/common/filters/all-exceptions.filter.js'
import { DefaultHttpStatusInterceptor } from '../dist/common/interceptors/default-http-status.interceptor.js'
import { LoggingMiddleware } from '../dist/common/middleware/logging.middleware.js'

config({ quiet: true })
config({ path: '.env.local', override: true, quiet: true })
Logger.overrideLogger(false)

function flatten(nodes) {
  return nodes.flatMap((node) => [node, ...flatten(node.children ?? [])])
}

function errorResponse(response, status) {
  assert.equal(response.status, status)
  assert.equal(response.body.code, status)
  assert.equal(response.body.data, null)
  assert.equal(typeof response.body.message, 'string')
  assert.equal(typeof response.body.timestamp, 'string')
  assert.ok(response.body.traceId)
}

// 显式集成命令仅写入随机新建数据库及独立 Redis 前缀；不导入正式 AppModule 或修改现有业务数据。
test('RBAC 真实数据库与 HTTP：统一资源授权、审计软删除与内置角色边界', { timeout: 120000 }, async (t) => {
  const database = `rbac_test_${randomUUID().replaceAll('-', '')}`
  assert.match(database, /^rbac_test_[a-f0-9]{32}$/)
  const prefix = `${database}:`
  let adminConnection
  let redis
  let app
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
    class TestRedisModule {}
    Global()(TestRedisModule)
    Module({
      providers: [{ provide: RedisService, useValue: { isAvailable: () => redis.status === 'ready', getClient: () => redis } }],
      exports: [RedisService],
    })(TestRedisModule)
    class PermissionProbeController {
      read() {
        return { ok: 'read' }
      }
      write() {
        return { ok: 'write' }
      }
      manage() {
        return { ok: 'manage' }
      }
    }
    Controller('v1/admin/permission-probe')(PermissionProbeController)
    for (const [handler, verb, path, code] of [
      ['read', Get, '', 'tests.read'],
      ['write', Patch, '', 'tests.write'],
      ['manage', Get, 'manage', 'tests.manage'],
    ]) {
      const descriptor = Object.getOwnPropertyDescriptor(PermissionProbeController.prototype, handler)
      verb(path)(PermissionProbeController.prototype, handler, descriptor)
      AdminApi({ code, module: '集成权限模块', feature: '权限探针', action: handler })(
        PermissionProbeController.prototype,
        handler,
        descriptor,
      )
    }
    class Root {}
    Module({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ app: { jwtSecret: randomBytes(48).toString('base64'), jwtExpiresSeconds: 2592000 } })],
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
          entities: [AccessLog],
          namingStrategy: new SnakeNamingStrategy(),
          synchronize: true,
          logging: false,
        }),
        RbacModule,
        AdminAuthModule,
      ],
      controllers: [PermissionProbeController],
    })(Root)
    app = await NestFactory.create(Root, { logger: false })
    // 使用与默认值不同的前缀，验证授权标识来自实际匹配的处理器而非请求 URL。
    app.setGlobalPrefix('rbac-custom-prefix')
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }))
    app.useGlobalFilters(new AllExceptionsFilter())
    app.useGlobalInterceptors(new DefaultHttpStatusInterceptor())
    app.useBodyParser('json')
    const logs = []
    const logging = new LoggingMiddleware({ create: async (record) => logs.push(record) })
    app.use(logging.use.bind(logging))
    await app.listen(0, '127.0.0.1')
    const source = app.get(DataSource)
    const users = source.getRepository(AdminUser)
    const passwords = new PasswordService()
    const password = 'RbacInitPassword123'
    const { user: admin } = await initializeAdmin(users, passwords, password)
    await initializeRbac(source, admin.id)
    const base = `${await app.getUrl()}/rbac-custom-prefix`
    const request = async (path, { token, body, method = body ? 'POST' : 'GET' } = {}) => {
      const response = await fetch(`${base}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
      return { status: response.status, body: await response.json() }
    }
    const login = async (username, secret) => {
      const response = await request('/v1/admin/auth/login', { body: { userName: username, password: secret } })
      assert.equal(response.status, 200)
      return response.body.data.accessToken
    }
    const adminToken = await login('admin', password)
    const asAdmin = (path, options = {}) => request(path, { ...options, token: adminToken })
    const writeAdmin = async (path, method, body) => {
      const response = await asAdmin(path, { method, body })
      assert.equal(response.status, 200, `${method} ${path}: ${response.body.message}`)
      assert.equal(response.body.data, null)
    }
    const createResource = async (name, values = {}) => {
      await writeAdmin('/v1/admin/menus', 'POST', {
        type: 'menu',
        title: name,
        name,
        path: `/${name}`,
        component: '/system/user',
        enabled: true,
        sort: 0,
        ...values,
      })
      const response = await asAdmin('/v1/admin/menus')
      assert.equal(response.status, 200)
      assert.ok(Array.isArray(response.body.data))
      const listFields = ['id', 'parentId', 'type', 'title', 'name', 'path', 'permission', 'enabled', 'sort', 'isBuiltin', 'apiCount'].sort()
      for (const item of response.body.data) assert.deepEqual(Object.keys(item).sort(), listFields)
      const resource = response.body.data.find((node) => node.title === name)
      assert.ok(resource, `资源 ${name} 必须可在列表中查询`)
      const detail = await asAdmin(`/v1/admin/menus/${resource.id}`)
      assert.equal(detail.status, 200)
      return detail.body.data
    }
    const createRole = async (code) => {
      await writeAdmin('/v1/admin/roles', 'POST', { code, name: code, enabled: true })
      const list = await asAdmin(`/v1/admin/roles?keyword=${code}&pageSize=100`)
      assert.equal(list.status, 200)
      const role = list.body.data.list.find((item) => item.code === code)
      assert.ok(role)
      return role
    }
    const setResources = (roleId, resourceIds) => writeAdmin(`/v1/admin/roles/${roleId}/resources`, 'PUT', { resourceIds })
    const setRoles = (userId, roleIds) => writeAdmin(`/v1/admin/users/${userId}`, 'PATCH', { roleIds })
    await writeAdmin('/v1/admin/users', 'POST', {
      username: 'ordinary',
      password: 'OrdinaryPassword123',
      name: '普通用户',
      enabled: true,
      roleIds: [],
    })
    const ordinary = await users.findOneByOrFail({ username: 'ordinary' })
    const ordinaryToken = await login('ordinary', 'OrdinaryPassword123')
    const asOrdinary = (path, options = {}) => request(path, { ...options, token: ordinaryToken })
    const probe = '/v1/admin/permission-probe'
    let readMenu
    let writeButton
    let directory
    let readRole
    let writeRole

    await t.test('全部实体的表和字段注释实际写入 MySQL，RBAC 表具备审计与软删除列', async () => {
      const [tables] = await adminConnection.query(
        'SELECT TABLE_NAME AS name, TABLE_COMMENT AS comment FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
        [database],
      )
      const [columns] = await adminConnection.query(
        'SELECT TABLE_NAME AS tableName, COLUMN_NAME AS name, COLUMN_COMMENT AS comment, DATA_TYPE AS dataType, COLUMN_TYPE AS columnType FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ?',
        [database],
      )
      for (const metadata of source.entityMetadatas) {
        assert.equal(tables.find((table) => table.name === metadata.tableName)?.comment, metadata.comment)
        for (const column of metadata.columns) {
          assert.equal(
            columns.find((item) => item.tableName === metadata.tableName && item.name === column.databaseName)?.comment,
            column.comment,
          )
          assert.ok(column.comment?.trim())
        }
      }
      for (const tableName of ['admin_user', 'admin_role', 'admin_permission_resource', 'admin_user_role', 'admin_role_resource', 'admin_resource_api']) {
        for (const name of ['create_time', 'update_time', 'created_by', 'updated_by', 'is_deleted']) {
          const column = columns.find((item) => item.tableName === tableName && item.name === name)
          assert.ok(column, `${tableName}.${name} 必须真实存在于数据库`)
          if (name.startsWith('is_')) assert.match(column.columnType, /^tinyint(\(\d+\))? unsigned/)
        }
      }
      const [indexes] = await adminConnection.query(
        'SELECT INDEX_NAME AS name, COLUMN_NAME AS columnName, NON_UNIQUE AS nonUnique FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
        [database, 'admin_permission_resource'],
      )
      for (const columnName of ['permission', 'path']) {
        assert.ok(indexes.some((index) => index.columnName === columnName && index.nonUnique === 0))
      }
    })

    await t.test('先认证后授权，401/403 响应结构统一，profile 不下发超级标记', async () => {
      errorResponse(await request(probe), 401)
      errorResponse(await request(probe, { token: 'invalid' }), 401)
      errorResponse(await asOrdinary(probe), 403)
      errorResponse(await asOrdinary('/v1/admin/roles'), 403)
      // 系统管理接口同样要求角色资源授权，内置角色通过显式授权访问。
      assert.equal((await asAdmin('/v1/admin/roles')).status, 200)
      const profile = await asOrdinary('/v1/admin/auth/profile')
      assert.equal(profile.status, 200)
      assert.equal(Object.hasOwn(profile.body.data, 'isSuper'), false)
      assert.equal(Object.hasOwn(profile.body.data, 'auth'), false)
      assert.equal(Object.hasOwn(profile.body.data, 'roles'), false)
      assert.equal(Object.hasOwn(profile.body.data, 'apiCodes'), false)
      const authorization = await asOrdinary('/v1/admin/auth/authorization')
      assert.deepEqual(authorization.body.data.auth, [])
      const adminAuthorization = await asAdmin('/v1/admin/auth/authorization')
      assert.deepEqual([...adminAuthorization.body.data.auth].sort(), Object.values(SYSTEM_BUTTON_PERMISSIONS).sort())
    })

    await t.test('角色列表、详情返回公开资料，选项只返回启用非内置角色的最小字段', async () => {
      const expected = ['id', 'code', 'name', 'description', 'enabled', 'isBuiltin', 'updateTime', 'updatedByName'].sort()
      const list = await asAdmin('/v1/admin/roles?pageSize=100')
      const detail = await asAdmin(`/v1/admin/roles/${SUPER_ROLE_ID}`)
      for (const response of [list, detail]) assert.equal(response.status, 200)
      for (const role of [...list.body.data.list, detail.body.data]) {
        assert.deepEqual(Object.keys(role).sort(), expected)
        assert.equal(Object.hasOwn(role, 'isSuper'), false)
      }
      // 系统初始化写入的角色以「系统」作为更新人，更新时间沿用 Unix 秒。
      const builtinRole = list.body.data.list.find((role) => role.id === SUPER_ROLE_ID)
      assert.equal(builtinRole.updatedByName, '系统')
      assert.ok(builtinRole.updateTime > 0)
      const options = await asAdmin('/v1/admin/roles/options')
      assert.equal(options.status, 200)
      for (const role of options.body.data) assert.deepEqual(Object.keys(role).sort(), ['code', 'id', 'name'])
      // 内置角色不能作为用户角色选项，避免通过用户接口自造超级管理员。
      assert.ok(!options.body.data.some((role) => role.id === SUPER_ROLE_ID || role.code === 'super_admin'))
      const normalRole = await createRole('option_visible_role')
      const withNormal = await asAdmin('/v1/admin/roles/options')
      assert.ok(withNormal.body.data.some((role) => role.id === normalRole.id))
      assert.ok(!withNormal.body.data.some((role) => role.id === SUPER_ROLE_ID))
      // 选项只包含启用角色，禁用角色不参与新的绑定选择。
      const disabledRole = await createRole('disabled_option_role')
      await writeAdmin(`/v1/admin/roles/${disabledRole.id}`, 'PATCH', { enabled: false })
      const enabledOptions = await asAdmin('/v1/admin/roles/options')
      assert.ok(!enabledOptions.body.data.some((role) => role.id === disabledRole.id))
      await writeAdmin(`/v1/admin/roles/${disabledRole.id}`, 'DELETE')
      await writeAdmin(`/v1/admin/roles/${normalRole.id}`, 'DELETE')
    })

    await t.test('目录脚手架不授予子接口；菜单和按钮分别授权，多角色权限取并集', async () => {
      directory = await createResource('test_directory', { type: 'directory', component: '/index/index' })
      readMenu = await createResource('test_read', { parentId: directory.id, permission: 'tests:read', apiCodes: ['tests.read'] })
      writeButton = await createResource('test_write', {
        type: 'button',
        name: undefined,
        parentId: readMenu.id,
        permission: 'tests:write',
        path: undefined,
        component: undefined,
        apiCodes: ['tests.write'],
      })
      readRole = await createRole('test_reader')
      writeRole = await createRole('test_writer')
      await setResources(readRole.id, [directory.id])
      await setRoles(ordinary.id, [readRole.id])
      errorResponse(await asOrdinary(probe), 403)
      await setResources(readRole.id, [readMenu.id])
      assert.equal((await asOrdinary(probe)).status, 200)
      errorResponse(await asOrdinary(probe, { method: 'PATCH' }), 403)
      await setResources(writeRole.id, [writeButton.id])
      await setRoles(ordinary.id, [readRole.id, writeRole.id])
      assert.equal((await asOrdinary(probe, { method: 'PATCH' })).status, 200)
      const profile = await asOrdinary('/v1/admin/auth/profile')
      assert.equal(Object.hasOwn(profile.body.data, 'roles'), false)
      const authorization = await asOrdinary('/v1/admin/auth/authorization')
      assert.deepEqual([...authorization.body.data.auth].sort(), ['tests:read', 'tests:write'])
      await setResources(readRole.id, [])
      errorResponse(await asOrdinary(probe), 403)
      assert.equal((await asOrdinary(probe, { method: 'PATCH' })).status, 200)
      const menus = await asOrdinary('/v1/admin/auth/authorization')
      assert.equal(menus.status, 200)
      const navigation = flatten(menus.body.data.menu)
      assert.ok(!navigation.some((item) => item.name === readMenu.name), '按钮授权不能额外授予未选中的页面')
      assert.ok(navigation.every((item) => !Object.hasOwn(item.meta, 'authList')), '菜单不再下发 authList')
      await setResources(readRole.id, [readMenu.id])
      const fullMenus = await asOrdinary('/v1/admin/auth/authorization')
      const fullNavigation = flatten(fullMenus.body.data.menu)
      assert.ok(
        fullNavigation.some((item) => item.name === directory.name),
        '页面补齐有效目录祖先',
      )
    })

    await t.test('系统管理按钮与接口可由角色显式授权，撤销后立即失效', async () => {
      const response = await asAdmin('/v1/admin/menus')
      const nodes = response.body.data
      const userCreateButton = nodes.find((node) => node.permission === SYSTEM_BUTTON_PERMISSIONS.userCreate)
      assert.ok(userCreateButton, '初始化种子必须包含用户新增按钮资源')
      assert.equal(userCreateButton.apiCount, 1)
      assert.deepEqual((await asAdmin(`/v1/admin/menus/${userCreateButton.id}`)).body.data.apiCodes, ['system.users.create'])
      await setResources(writeRole.id, [writeButton.id, userCreateButton.id])
      const authorization = (await asOrdinary('/v1/admin/auth/authorization')).body.data
      assert.ok(authorization.auth.includes(SYSTEM_BUTTON_PERMISSIONS.userCreate))
      // 普通角色获得系统管理按钮与接口后即可执行系统管理操作。
      const createdByOrdinary = await asOrdinary('/v1/admin/users', {
        method: 'POST',
        body: { username: 'createdbyordinary', name: '普通角色创建', password: 'CreatedByOrdinary123', enabled: true, roleIds: [] },
      })
      assert.equal(createdByOrdinary.status, 200, createdByOrdinary.body.message)
      const created = await users.findOneByOrFail({ username: 'createdbyordinary' })
      await writeAdmin(`/v1/admin/users/${created.id}`, 'DELETE')
      await setResources(writeRole.id, [writeButton.id])
      errorResponse(
        await asOrdinary('/v1/admin/users', {
          method: 'POST',
          body: { username: 'blocked', name: '禁止创建', password: 'BlockedPassword123', enabled: true, roleIds: [] },
        }),
        403,
      )
      assert.equal(await users.countBy({ username: 'blocked' }), 0)

      // 系统接口编码同样可以绑定到普通资源，授权完全由角色资源决定。
      const listButton = await createResource('ordinary_user_list_button', {
        type: 'button',
        name: undefined,
        path: undefined,
        component: undefined,
        parentId: readMenu.id,
        permission: 'tests.system.users.list',
        apiCodes: ['system.users.list'],
      })
      await setResources(writeRole.id, [writeButton.id, listButton.id])
      assert.equal((await asOrdinary('/v1/admin/users?pageSize=1')).status, 200)
      await setResources(writeRole.id, [writeButton.id])
      errorResponse(await asOrdinary('/v1/admin/users?pageSize=1'), 403)
      await writeAdmin(`/v1/admin/menus/${listButton.id}`, 'DELETE')
    })

    await t.test('页面资源随附交叉页面依赖接口，最小授权即可打开对应弹窗', async () => {
      const nodes = (await asAdmin('/v1/admin/menus')).body.data
      const userMenu = nodes.find((node) => node.name === 'SystemUser')
      const menuMenu = nodes.find((node) => node.name === 'SystemMenu')
      const grantButton = nodes.find((node) => node.permission === SYSTEM_BUTTON_PERMISSIONS.roleGrant)
      assert.ok(userMenu && menuMenu && grantButton)
      const details = await Promise.all([userMenu, menuMenu, grantButton].map((item) => asAdmin(`/v1/admin/menus/${item.id}`)))
      assert.ok(details[0].body.data.apiCodes.includes('system.roles.options'))
      assert.ok(details[1].body.data.apiCodes.includes('system.apis.tree'))
      assert.ok(details[2].body.data.apiCodes.includes('system.menus.list'))

      const pageRole = await createRole('page_scoped_role')
      // 仅授用户管理页面即可打开用户弹窗（角色选项）。
      await setResources(pageRole.id, [userMenu.id])
      await setRoles(ordinary.id, [pageRole.id])
      assert.equal((await asOrdinary('/v1/admin/users?pageSize=1')).status, 200)
      assert.equal((await asOrdinary('/v1/admin/roles/options')).status, 200)
      errorResponse(await asOrdinary('/v1/admin/menus'), 403)

      // 仅授菜单管理页面即可打开菜单弹窗（接口树）。
      await setResources(pageRole.id, [menuMenu.id])
      assert.equal((await asOrdinary('/v1/admin/menus')).status, 200)
      assert.equal((await asOrdinary('/v1/admin/api-resources/tree')).status, 200)
      errorResponse(await asOrdinary('/v1/admin/users?pageSize=1'), 403)

      // 仅授角色授权按钮即可加载资源列表与已有授权。
      await setResources(pageRole.id, [grantButton.id])
      assert.equal((await asOrdinary('/v1/admin/menus')).status, 200)
      assert.equal((await asOrdinary(`/v1/admin/roles/${readRole.id}/resources`)).status, 200)
      errorResponse(await asOrdinary('/v1/admin/users?pageSize=1'), 403)

      await setRoles(ordinary.id, [readRole.id, writeRole.id])
      await writeAdmin(`/v1/admin/roles/${pageRole.id}`, 'DELETE')
    })

    await t.test('委派菜单管理不能篡改内置资源绑定或绑定未授权接口', async () => {
      const nodes = (await asAdmin('/v1/admin/menus')).body.data
      const userMenu = nodes.find((node) => node.name === 'SystemUser')
      const menuMenu = nodes.find((node) => node.name === 'SystemMenu')
      const menuUpdate = nodes.find((node) => node.permission === SYSTEM_BUTTON_PERMISSIONS.menuUpdate)
      assert.ok(userMenu && menuMenu && menuUpdate)
      const operatorRole = await createRole('menu_operator')
      await setResources(operatorRole.id, [menuMenu.id, menuUpdate.id])
      await setRoles(ordinary.id, [operatorRole.id])

      // 内置资源的结构和接口绑定都是系统权限定义，菜单管理员只能调整展示字段。
      errorResponse(
        await asOrdinary(`/v1/admin/menus/${userMenu.id}`, {
          method: 'PATCH',
          body: { apiCodes: ['system.users.list', 'system.users.delete'] },
        }),
        400,
      )
      // 自定义资源也只能追加操作者自身已获授权的接口，不能借此获得删除用户能力。
      errorResponse(
        await asOrdinary(`/v1/admin/menus/${readMenu.id}`, {
          method: 'PATCH',
          body: { apiCodes: ['tests.read', 'system.users.delete'] },
        }),
        403,
      )
      errorResponse(
        await asOrdinary('/v1/admin/menus', {
          method: 'POST',
          body: {
            type: 'menu',
            title: '越权接口资源',
            name: 'UnauthorizedApiMenu',
            path: '/unauthorized-api-menu',
            component: '/system/user',
            parentId: directory.id,
            enabled: true,
            apiCodes: ['system.users.delete'],
          },
        }),
        403,
      )
      await setRoles(ordinary.id, [readRole.id, writeRole.id])
      await writeAdmin(`/v1/admin/roles/${operatorRole.id}`, 'DELETE')
    })

    await t.test('委派用户管理只能分配自身授权范围内的角色', async () => {
      const nodes = (await asAdmin('/v1/admin/menus')).body.data
      const userMenu = nodes.find((node) => node.name === 'SystemUser')
      const menuMenu = nodes.find((node) => node.name === 'SystemMenu')
      const userUpdate = nodes.find((node) => node.permission === SYSTEM_BUTTON_PERMISSIONS.userUpdate)
      assert.ok(userMenu && menuMenu && userUpdate)
      const highRole = await createRole('high_scope_role')
      await setResources(highRole.id, [menuMenu.id])
      const operatorRole = await createRole('user_operator')
      await setResources(operatorRole.id, [userMenu.id, userUpdate.id])
      await setRoles(ordinary.id, [operatorRole.id])
      await writeAdmin('/v1/admin/users', 'POST', {
        username: 'delegated',
        password: 'DelegatedPassword123',
        name: '委派目标',
        enabled: true,
        roleIds: [],
      })
      const delegated = await users.findOneByOrFail({ username: 'delegated' })

      const options = await asOrdinary('/v1/admin/roles/options')
      assert.equal(options.status, 200)
      assert.ok(!options.body.data.some((role) => role.id === highRole.id), '不能看到超出自身范围的更高权限角色')
      assert.ok(options.body.data.some((role) => role.id === operatorRole.id), '自身范围角色仍可作为选项')
      errorResponse(
        await asOrdinary(`/v1/admin/users/${delegated.id}`, {
          method: 'PATCH',
          body: { roleIds: [highRole.id] },
        }),
        403,
      )
      await writeAdmin(`/v1/admin/users/${delegated.id}`, 'PATCH', { roleIds: [operatorRole.id] })
      await setRoles(ordinary.id, [readRole.id, writeRole.id])
      await writeAdmin(`/v1/admin/users/${delegated.id}`, 'DELETE')
      await writeAdmin(`/v1/admin/roles/${highRole.id}`, 'DELETE')
      await writeAdmin(`/v1/admin/roles/${operatorRole.id}`, 'DELETE')
    })

    await t.test('软删除同名用户自动追加数字后缀且可登录', async () => {
      await writeAdmin('/v1/admin/users', 'POST', {
        username: 'samename',
        password: 'SameNamePassword123',
        name: '同名用户',
        enabled: true,
        roleIds: [],
      })
      const first = await users.findOneByOrFail({ username: 'samename' })
      await writeAdmin(`/v1/admin/users/${first.id}`, 'DELETE')
      await writeAdmin('/v1/admin/users', 'POST', {
        username: 'samename',
        password: 'SameNamePassword123',
        name: '同名用户重建',
        enabled: true,
        roleIds: [],
      })
      const second = await users.findOneByOrFail({ username: 'samename1' })
      assert.equal((await login('samename1', 'SameNamePassword123')).length > 0, true)
      await writeAdmin(`/v1/admin/users/${second.id}`, 'DELETE')
    })

    await t.test('不存在的角色或资源拒绝分配，原授权集合保持完整', async () => {
      errorResponse(
        await asAdmin(`/v1/admin/roles/${readRole.id}/resources`, {
          method: 'PUT',
          body: { resourceIds: [readMenu.id, randomUUID()] },
        }),
        400,
      )
      const resources = await asAdmin(`/v1/admin/roles/${readRole.id}/resources`)
      assert.deepEqual(resources.body.data.resourceIds, [readMenu.id])
      errorResponse(
        await asAdmin(`/v1/admin/users/${ordinary.id}`, {
          method: 'PATCH',
          body: { roleIds: [readRole.id, randomUUID()] },
        }),
        400,
      )
      // 内置角色不能通过用户接口新分配，避免自造超级管理员。
      errorResponse(
        await asAdmin(`/v1/admin/users/${ordinary.id}`, {
          method: 'PATCH',
          body: { roleIds: [readRole.id, writeRole.id, SUPER_ROLE_ID] },
        }),
        400,
      )
      const user = await asAdmin(`/v1/admin/users/${ordinary.id}`)
      assert.deepEqual([...user.body.data.roleIds].sort(), [readRole.id, writeRole.id].sort())
      assert.equal((await asOrdinary(probe)).status, 200)
      assert.equal((await asOrdinary(probe, { method: 'PATCH' })).status, 200)
    })

    await t.test('撤销、角色禁用、资源与祖先禁用在下一请求生效', async () => {
      await writeAdmin(`/v1/admin/roles/${readRole.id}`, 'PATCH', { enabled: false })
      errorResponse(await asOrdinary(probe), 403)
      // 已生效的禁用角色绑定允许保留：编辑用户资料时原样回传不会失败。
      await writeAdmin(`/v1/admin/users/${ordinary.id}`, 'PATCH', { name: '普通用户', roleIds: [readRole.id, writeRole.id] })
      // 但不能用禁用角色做新分配。
      const disabledCandidate = await createRole('disabled_candidate')
      await writeAdmin(`/v1/admin/roles/${disabledCandidate.id}`, 'PATCH', { enabled: false })
      errorResponse(
        await asAdmin(`/v1/admin/users/${ordinary.id}`, {
          method: 'PATCH',
          body: { roleIds: [readRole.id, writeRole.id, disabledCandidate.id] },
        }),
        400,
      )
      const disabledRoles = await asAdmin('/v1/admin/roles?enabled=false&pageSize=100')
      assert.ok(disabledRoles.body.data.list.some((role) => role.id === readRole.id))
      assert.ok(disabledRoles.body.data.list.every((role) => role.enabled === false))
      await writeAdmin(`/v1/admin/roles/${readRole.id}`, 'PATCH', { enabled: true })
      assert.equal((await asOrdinary(probe)).status, 200)
      await writeAdmin(`/v1/admin/roles/${disabledCandidate.id}`, 'DELETE')
      await writeAdmin(`/v1/admin/menus/${readMenu.id}`, 'PATCH', { enabled: false })
      errorResponse(await asOrdinary(probe), 403)
      errorResponse(await asOrdinary(probe, { method: 'PATCH' }), 403)
      await writeAdmin(`/v1/admin/menus/${readMenu.id}`, 'PATCH', { enabled: true })
      await writeAdmin(`/v1/admin/menus/${directory.id}`, 'PATCH', { enabled: false })
      errorResponse(await asOrdinary(probe), 403)
      errorResponse(await asOrdinary(probe, { method: 'PATCH' }), 403)
      await writeAdmin(`/v1/admin/menus/${directory.id}`, 'PATCH', { enabled: true })
      assert.equal((await asOrdinary(probe)).status, 200)
      await setRoles(ordinary.id, [])
      errorResponse(await asOrdinary(probe), 403)
      await setRoles(ordinary.id, [readRole.id, writeRole.id])
    })

    await t.test('大小写、查询参数和自定义全局前缀不改变授权身份', async () => {
      assert.equal((await asOrdinary('/V1/ADMIN/PERMISSION-PROBE?ignored=tests.manage')).status, 200)
      await setResources(readRole.id, [])
      errorResponse(await asOrdinary('/V1/ADMIN/PERMISSION-PROBE?ignored=tests.read'), 403)
      assert.equal((await asOrdinary('/V1/ADMIN/PERMISSION-PROBE?ignored=tests.read', { method: 'PATCH' })).status, 200)
      await setResources(readRole.id, [readMenu.id])
    })

    await t.test('未知 API 不可绑定，失败写操作保持原绑定', async () => {
      for (const apiCodes of [['tests.read', 'unknown.api']]) {
        errorResponse(await asAdmin(`/v1/admin/menus/${readMenu.id}`, { method: 'PATCH', body: { title: '不应保存', apiCodes } }), 400)
        const response = await asAdmin('/v1/admin/menus')
        const unchanged = response.body.data.find((item) => item.id === readMenu.id)
        assert.equal(unchanged.title, 'test_read')
        assert.equal(unchanged.apiCount, 1)
        assert.deepEqual((await asAdmin(`/v1/admin/menus/${readMenu.id}`)).body.data.apiCodes, ['tests.read'])
      }
      // 直接写入已软删除资源的绑定不会扩大授权。
      const removed = await createResource('removed_binding_probe', { parentId: directory.id })
      await writeAdmin(`/v1/admin/menus/${removed.id}`, 'DELETE')
      await source.getRepository(AdminResourceApi).insert({
        resourceId: removed.id,
        apiCode: 'tests.manage',
        createTime: 1,
        updateTime: 1,
        createdBy: 'system',
        updatedBy: 'system',
        isDeleted: 0,
      })
      errorResponse(await asOrdinary(`${probe}/manage`), 403)
      assert.equal((await asAdmin('/v1/admin/roles')).status, 200)
    })

    await t.test('树结构拒绝循环移动和以按钮为父级', async () => {
      errorResponse(await asAdmin(`/v1/admin/menus/${directory.id}`, { method: 'PATCH', body: { parentId: readMenu.id } }), 400)
      errorResponse(await asAdmin(`/v1/admin/menus/${readMenu.id}`, { method: 'PATCH', body: { parentId: readMenu.id } }), 400)
      errorResponse(
        await asAdmin('/v1/admin/menus', {
          body: {
            type: 'menu',
            title: '非法子菜单',
            name: 'invalid_child',
            path: '/invalid_child',
            component: '/system/user',
            parentId: writeButton.id,
            enabled: true,
          },
        }),
        400,
      )
      assert.equal((await asOrdinary(probe)).status, 200)
    })

    await t.test('并发反向移动最多成功一个，事务串行化避免循环树', async () => {
      const first = await createResource('move_first', { type: 'directory', component: '/index/index' })
      const second = await createResource('move_second', { type: 'directory', component: '/index/index' })
      const moves = await Promise.all([
        asAdmin(`/v1/admin/menus/${first.id}`, { method: 'PATCH', body: { parentId: second.id, component: null } }),
        asAdmin(`/v1/admin/menus/${second.id}`, { method: 'PATCH', body: { parentId: first.id, component: null } }),
      ])
      assert.deepEqual(moves.map((result) => result.status).sort(), [200, 400])
      const response = await asAdmin('/v1/admin/menus')
      const moved = response.body.data.filter((item) => [first.id, second.id].includes(item.id))
      assert.equal(moved.length, 2)
      assert.equal(moved.filter((item) => item.parentId === null).length, 1)
    })

    await t.test('路由结构拒绝根页面、错误布局与绝对相对路径碰撞，移动目录检查后代', async () => {
      for (const values of [
        { type: 'menu', title: '孤立页面', name: 'orphan_page', path: '/orphan', component: '/system/user' },
        { type: 'directory', title: '错误布局', name: 'invalid_layout', path: '/invalid_layout', component: '/system/user' },
      ]) {
        errorResponse(await asAdmin('/v1/admin/menus', { body: { ...values, enabled: true } }), 400)
      }
      const first = await createResource('collision_first', { type: 'directory', path: '/collision', component: '/index/index' })
      const second = await createResource('collision_second', { type: 'directory', path: '/elsewhere', component: '/index/index' })
      await createResource('collision_record', { parentId: first.id, path: 'record' })
      for (const [name, path, component] of [
        ['duplicate_record', '/collision/record', '/system/user'],
        ['layout_page', 'layout', '/index/index'],
      ]) {
        errorResponse(
          await asAdmin('/v1/admin/menus', {
            body: { type: 'menu', title: name, name, path, component, parentId: second.id, enabled: true },
          }),
          name === 'duplicate_record' ? 409 : 400,
        )
      }
      const nested = await createResource('collision_nested', {
        type: 'directory',
        parentId: first.id,
        path: 'nested',
        component: undefined,
      })
      await createResource('collision_leaf', { parentId: nested.id, path: 'leaf' })
      await createResource('collision_destination', { parentId: second.id, path: '/elsewhere/nested/leaf' })
      errorResponse(await asAdmin(`/v1/admin/menus/${nested.id}`, { method: 'PATCH', body: { parentId: second.id } }), 409)
      const unchanged = await asAdmin(`/v1/admin/menus/${nested.id}`)
      assert.equal(unchanged.body.data.parentId, first.id)
    })

    await t.test('非法路由返回400、重复路径返回409，原资源及授权不变', async () => {
      const before = (await asAdmin(`/v1/admin/menus/${readMenu.id}`)).body.data
      for (const changes of [
        { name: 'Login' },
        { name: 'Iframe' },
        { path: '/broken/:id(' },
        { path: '/broken/:id' },
        { path: '/broken//page' },
        { path: '/broken%2Fpage' },
        { path: directory.path.toUpperCase() },
      ]) {
        const status = changes.path === directory.path.toUpperCase() ? 409 : 400
        errorResponse(
          await asAdmin('/v1/admin/menus', {
            body: {
              type: 'menu',
              title: '非法路由',
              name: 'InvalidRoute',
              path: 'invalid',
              component: '/system/user',
              enabled: true,
              parentId: directory.id,
              ...changes,
            },
          }),
          status,
        )
        errorResponse(await asAdmin(`/v1/admin/menus/${readMenu.id}`, { method: 'PATCH', body: changes }), status)
        const unchanged = (await asAdmin(`/v1/admin/menus/${readMenu.id}`)).body.data
        assert.deepEqual(unchanged, before)
      }
      assert.equal((await asOrdinary(probe)).status, 200)
      const navigation = await asAdmin('/v1/admin/auth/authorization')
      assert.equal(navigation.status, 200)
      assert.ok(!flatten(navigation.body.data.menu).some((node) => node.name === 'InvalidRoute'))
    })

    await t.test('路径和权限码全局唯一，跨父级、停用及并发写入均不能重复，失败保留原绑定', async () => {
      const first = await createResource('unique_first', { type: 'directory', component: '/index/index' })
      const second = await createResource('unique_second', { type: 'directory', component: '/index/index' })
      const existing = await createResource('unique_existing', {
        parentId: first.id,
        path: 'unique-page',
        permission: 'tests.unique',
        enabled: false,
      })
      const editable = await createResource('unique_editable', {
        parentId: second.id,
        path: 'another-page',
        permission: 'tests.another',
        apiCodes: ['tests.write'],
      })
      for (const path of ['unique-page', 'UNIQUE-PAGE']) {
        errorResponse(
          await asAdmin('/v1/admin/menus', {
            body: {
              type: 'menu',
              title: '重复路径',
              name: 'DuplicateUniquePath',
              path,
              component: '/system/user',
              parentId: second.id,
              enabled: true,
            },
          }),
          409,
        )
      }
      for (const permission of ['tests.unique', 'TESTS.UNIQUE']) {
        errorResponse(
          await asAdmin('/v1/admin/menus', {
            body: {
              type: 'menu',
              title: '重复权限',
              name: 'DuplicateUniqueCode',
              path: 'unique-code-attempt',
              permission,
              component: '/system/user',
              parentId: second.id,
              enabled: true,
            },
          }),
          409,
        )
      }
      for (const changes of [{ path: existing.path }, { permission: existing.permission }]) {
        errorResponse(
          await asAdmin(`/v1/admin/menus/${editable.id}`, {
            method: 'PATCH',
            body: { ...changes, title: '不应保存', apiCodes: ['tests.read'] },
          }),
          409,
        )
        assert.deepEqual((await asAdmin(`/v1/admin/menus/${editable.id}`)).body.data, editable)
      }
      await writeAdmin(`/v1/admin/menus/${editable.id}`, 'PATCH', { path: editable.path, permission: editable.permission })
      for (const field of ['path', 'permission']) {
        const attempts = await Promise.all(
          [first, second].map((parent, index) =>
            asAdmin('/v1/admin/menus', {
              body: {
                type: 'menu',
                title: `并发${field}${index}`,
                name: `Concurrent_${field}_${index}`,
                parentId: parent.id,
                path: field === 'path' ? 'race-path' : `race-code-${index}`,
                permission: field === 'permission' ? 'tests.race' : null,
                component: '/system/user',
                enabled: true,
              },
            }),
          ),
        )
        assert.deepEqual(attempts.map((response) => response.status).sort(), [200, 409])
        errorResponse(
          attempts.find((response) => response.status === 409),
          409,
        )
      }
      for (const permission of ['tests.button.first', 'tests.button.second']) {
        const button = await createResource(`null_path_${permission.replaceAll('.', '_')}`, {
          type: 'button',
          parentId: editable.id,
          name: null,
          path: null,
          component: null,
          permission,
        })
        assert.equal(button.path, null)
      }
      errorResponse(
        await asAdmin('/v1/admin/menus', {
          body: { type: 'button', title: '空路径', parentId: editable.id, path: '', permission: 'tests.empty', enabled: true },
        }),
        400,
      )
    })

    await t.test('绕过业务层直接写库仍由路径和权限码唯一索引拒绝重复', async () => {
      const resources = source.getRepository(AdminPermissionResource)
      const existing = await resources.findOneByOrFail({ name: 'unique_editable' })
      const count = await resources.count()
      for (const field of ['path', 'permission']) {
        await assert.rejects(
          resources.insert({
            ...existing,
            id: randomUUID(),
            name: `DirectDuplicate_${field}`,
            path: field === 'path' ? existing.path.toUpperCase() : '/direct-duplicate-code',
            permission: field === 'permission' ? existing.permission.toUpperCase() : 'tests.direct',
          }),
          (error) => error.driverError?.code === 'ER_DUP_ENTRY',
        )
      }
      assert.equal(await resources.count(), count)
    })

    await t.test('目录可在根级和嵌套层级之间双向移动，导航结构保持有效', async () => {
      const parent = await createResource('directory_parent', { type: 'directory', component: '/index/index' })
      const moving = await createResource('directory_moving', { type: 'directory', component: '/index/index' })
      const child = await createResource('directory_child', { parentId: moving.id, path: 'child' })
      // 导航由当前用户的角色授权生成，显式授权本次验证用到的资源。
      await setResources(readRole.id, [readMenu.id, parent.id, moving.id, child.id])
      await writeAdmin(`/v1/admin/menus/${moving.id}`, 'PATCH', { parentId: parent.id, component: null })
      let detail = (await asAdmin(`/v1/admin/menus/${moving.id}`)).body.data
      assert.equal(detail.parentId, parent.id)
      assert.equal(detail.component, null)
      let navigation = (await asOrdinary('/v1/admin/auth/authorization')).body.data.menu
      assert.ok(flatten(navigation.find((node) => node.id === parent.id).children).some((node) => node.id === moving.id))
      await writeAdmin(`/v1/admin/menus/${moving.id}`, 'PATCH', { parentId: null, component: '/index/index' })
      detail = (await asAdmin(`/v1/admin/menus/${moving.id}`)).body.data
      assert.equal(detail.parentId, null)
      assert.equal(detail.component, '/index/index')
      navigation = (await asOrdinary('/v1/admin/auth/authorization')).body.data.menu
      assert.ok(navigation.some((node) => node.id === moving.id && node.children.length === 1))
      await setResources(readRole.id, [readMenu.id])
    })

    await t.test('内置管理员角色授权固定，初始化恢复被破坏的资源授权与种子接口绑定', async () => {
      const response = await asAdmin('/v1/admin/menus')
      const nodes = response.body.data
      const userMenu = nodes.find((node) => node.name === 'SystemUser')
      assert.ok(userMenu)
      // 内置角色是系统兜底权限，角色授权接口必须拒绝编辑。
      errorResponse(
        await asAdmin(`/v1/admin/roles/${SUPER_ROLE_ID}/resources`, {
          method: 'PUT',
          body: { resourceIds: [] },
        }),
        400,
      )
      const roleResources = source.getRepository(AdminRoleResource)
      const userMenuGrant = await roleResources.findOneByOrFail({ roleId: SUPER_ROLE_ID, resourceId: userMenu.id })
      assert.equal(userMenuGrant.isDeleted, 0)
      const apiBindings = source.getRepository(AdminResourceApi)
      const listBinding = await apiBindings.findOneByOrFail({ resourceId: userMenu.id, apiCode: 'system.users.list' })
      assert.equal(listBinding.isDeleted, 0)

      // 模拟历史数据或人工 SQL 破坏授权，初始化命令必须恢复全量授权与种子绑定。
      await roleResources.update({ roleId: SUPER_ROLE_ID, resourceId: userMenu.id }, { isDeleted: 1 })
      await apiBindings.update({ resourceId: userMenu.id, apiCode: 'system.users.list' }, { isDeleted: 1 })
      errorResponse(await asAdmin('/v1/admin/users'), 403)
      await initializeRbac(source, admin.id)
      assert.equal((await asAdmin('/v1/admin/users')).status, 200)
      assert.equal((await asAdmin('/v1/admin/roles')).status, 200)
      assert.equal(
        (await roleResources.findOneByOrFail({ roleId: SUPER_ROLE_ID, resourceId: userMenu.id })).isDeleted,
        0,
      )
      assert.equal(
        (await apiBindings.findOneByOrFail({ resourceId: userMenu.id, apiCode: 'system.users.list' })).isDeleted,
        0,
      )
    })

    await t.test('软删除后同码同路径可重新创建，审计字段与关联软删除写入数据库', async () => {
      const roleCode = 'reusable_role'
      await writeAdmin('/v1/admin/roles', 'POST', { code: roleCode, name: '可复用角色', enabled: true })
      const roleList = await asAdmin(`/v1/admin/roles?keyword=${roleCode}&pageSize=100`)
      const role = roleList.body.data.list.find((item) => item.code === roleCode)
      assert.ok(role)
      // 列表与详情返回的更新人按操作人账号解析为显示名。
      assert.equal(role.updatedByName, admin.name)
      assert.ok(role.updateTime > 0)
      const roleRows = source.getRepository(AdminRole)
      let stored = await roleRows.findOneByOrFail({ id: role.id })
      assert.equal(stored.createdBy, admin.id)
      assert.equal(stored.updatedBy, admin.id)
      assert.equal(stored.isDeleted, 0)
      assert.ok(stored.createTime > 0 && stored.updateTime >= stored.createTime)
      await setResources(role.id, [readMenu.id])
      const grantRow = await source.getRepository(AdminRoleResource).findOneByOrFail({ roleId: role.id, resourceId: readMenu.id })
      assert.equal(grantRow.createdBy, admin.id)
      assert.equal(grantRow.updatedBy, admin.id)
      assert.equal(grantRow.isDeleted, 0)
      await setResources(role.id, [])
      const revokedRow = await source.getRepository(AdminRoleResource).findOneByOrFail({ roleId: role.id, resourceId: readMenu.id })
      assert.equal(revokedRow.isDeleted, 1)
      assert.equal(revokedRow.updatedBy, admin.id)
      await writeAdmin(`/v1/admin/roles/${role.id}`, 'DELETE')
      stored = await roleRows.findOneByOrFail({ id: role.id })
      assert.equal(stored.isDeleted, 1)
      assert.equal(stored.code, `deleted_${role.id}`)
      assert.equal(stored.updatedBy, admin.id)
      // 编码释放后可以重新创建同码角色。
      await writeAdmin('/v1/admin/roles', 'POST', { code: roleCode, name: '重建角色', enabled: true })

      // 资源删除释放唯一的名称、路径与权限标识，同路径可重新创建。
      const disposable = await createResource('reusable_resource', { type: 'directory', path: '/reusable-path', component: '/index/index' })
      await writeAdmin(`/v1/admin/menus/${disposable.id}`, 'DELETE')
      const resourceRows = source.getRepository(AdminPermissionResource)
      const removedResource = await resourceRows.findOneByOrFail({ id: disposable.id })
      assert.equal(removedResource.isDeleted, 1)
      assert.equal(removedResource.name, null)
      assert.equal(removedResource.path, null)
      assert.equal(removedResource.permission, null)
      assert.equal(removedResource.updatedBy, admin.id)
      await writeAdmin('/v1/admin/menus', 'POST', {
        type: 'directory',
        title: 'reusable_resource',
        name: 'reusable_resource',
        path: '/reusable-path',
        component: '/index/index',
        enabled: true,
      })

      // 用户与用户角色关联同样软删除并保留操作人。
      const auditUser = await users.findOneByOrFail({ username: 'ordinary' })
      assert.equal(auditUser.createdBy, admin.id)
      assert.equal(auditUser.updatedBy, admin.id)
      assert.equal(auditUser.isDeleted, 0)
      assert.equal(auditUser.name, '普通用户')
      await setRoles(auditUser.id, [])
      const userRoleRow = await source.getRepository(AdminUserRole).findOneByOrFail({ userId: auditUser.id, roleId: readRole.id })
      assert.equal(userRoleRow.isDeleted, 1)
      assert.equal(userRoleRow.updatedBy, admin.id)
      await setRoles(auditUser.id, [readRole.id, writeRole.id])
    })

    await t.test('内置管理员角色与初始化管理员边界：基本资料与角色绑定不可改，新分配内置角色被拒', async () => {
      const roleList = await asAdmin('/v1/admin/roles?pageSize=100')
      const builtinRole = roleList.body.data.list.find((item) => item.id === SUPER_ROLE_ID)
      assert.ok(builtinRole)
      assert.equal(builtinRole.isBuiltin, true)
      errorResponse(await asAdmin(`/v1/admin/roles/${builtinRole.id}`, { method: 'DELETE' }), 400)
      errorResponse(await asAdmin(`/v1/admin/roles/${builtinRole.id}`, { method: 'PATCH', body: { enabled: false } }), 400)
      const adminView = await asAdmin(`/v1/admin/users/${admin.id}`)
      const ordinaryView = await asAdmin(`/v1/admin/users/${ordinary.id}`)
      assert.equal(adminView.body.data.isBuiltin, true)
      assert.equal(ordinaryView.body.data.isBuiltin, false)
      assert.equal(Object.hasOwn(adminView.body.data, 'isDeletable'), false)
      errorResponse(await asAdmin(`/v1/admin/users/${admin.id}`, { method: 'DELETE' }), 400)
      errorResponse(await asAdmin(`/v1/admin/users/${admin.id}`, { method: 'PATCH', body: { enabled: false } }), 400)
      // 内置管理员的角色绑定固定，增删或改为其他角色都会被拒绝。
      const helper = await createRole('admin_helper')
      errorResponse(await asAdmin(`/v1/admin/users/${admin.id}`, { method: 'PATCH', body: { roleIds: [SUPER_ROLE_ID, helper.id] } }), 400)
      errorResponse(await asAdmin(`/v1/admin/users/${admin.id}`, { method: 'PATCH', body: { roleIds: [helper.id] } }), 400)
      errorResponse(await asAdmin(`/v1/admin/users/${admin.id}`, { method: 'PATCH', body: { roleIds: [] } }), 400)
      // 原样回传既有绑定属于无操作，允许保存其他资料。
      await writeAdmin(`/v1/admin/users/${admin.id}`, 'PATCH', { name: '管理员', roleIds: [SUPER_ROLE_ID] })
      const adminDetail = await asAdmin(`/v1/admin/users/${admin.id}`)
      assert.deepEqual(adminDetail.body.data.roleIds, [SUPER_ROLE_ID])
      // 内置角色也不能作为其他用户的新角色。
      errorResponse(
        await asAdmin(`/v1/admin/users/${ordinary.id}`, { method: 'PATCH', body: { roleIds: [readRole.id, SUPER_ROLE_ID] } }),
        400,
      )
      await writeAdmin(`/v1/admin/roles/${helper.id}`, 'DELETE')
      assert.equal((await asAdmin('/v1/admin/roles')).status, 200)
    })

    await t.test('API 目录按模块和功能保留匹配祖先，自定义标签不修改稳定代码', async () => {
      const tree = await asAdmin('/v1/admin/api-resources/tree?keyword=tests.read')
      assert.equal(tree.status, 200)
      const leaves = flatten(tree.body.data).filter((node) => node.kind === 'api')
      assert.ok(leaves.some((node) => node.key === 'tests.read'))
      assert.ok(tree.body.data.some((node) => node.kind === 'module' && node.children?.some((child) => child.kind === 'feature')))
      const catalog = await asAdmin('/v1/admin/api-resources?keyword=tests.read&pageSize=100')
      assert.equal(catalog.status, 200)
      const entry = catalog.body.data.list.find((item) => item.code === 'tests.read')
      assert.ok(entry)
      await writeAdmin(`/v1/admin/api-resources/${entry.code}`, 'PATCH', {
        module: '集成自定义模块',
        feature: '自定义功能',
        action: '自定义读取',
        aliases: [],
        sort: 13,
      })
      const renamed = await asAdmin('/v1/admin/api-resources/tree?keyword=自定义读取')
      const renamedLeaves = flatten(renamed.body.data).filter((node) => node.kind === 'api')
      assert.equal(renamedLeaves.length, 1)
      assert.equal(renamedLeaves[0].key, 'tests.read')
      assert.ok(renamedLeaves[0].label.includes('自定义读取'))
      assert.equal((await asOrdinary(probe)).status, 200)
    })

    await t.test('删除资源立即撤销接口，禁用账号后原 JWT 返回 401', async () => {
      for (const enabled of ['false', null]) {
        errorResponse(await asAdmin(`/v1/admin/users/${ordinary.id}`, { method: 'PATCH', body: { enabled } }), 400)
      }
      assert.equal((await asOrdinary(probe)).status, 200)
      await writeAdmin(`/v1/admin/menus/${writeButton.id}`, 'DELETE')
      errorResponse(await asOrdinary(probe, { method: 'PATCH' }), 403)
      assert.equal((await asOrdinary(probe)).status, 200)
      await writeAdmin(`/v1/admin/users/${ordinary.id}`, 'PATCH', { enabled: false })
      errorResponse(await asOrdinary(probe), 401)
      errorResponse(await asOrdinary('/v1/admin/auth/profile'), 401)
      assert.equal((await asAdmin('/v1/admin/roles')).status, 200)
      const disabled = await asAdmin('/v1/admin/users?enabled=false&pageSize=100')
      assert.ok(disabled.body.data.list.some((user) => user.id === ordinary.id))
      assert.ok(disabled.body.data.list.every((user) => user.enabled === false))
      const enabled = await asAdmin('/v1/admin/users?enabled=true&pageSize=100')
      assert.ok(!enabled.body.data.list.some((user) => user.id === ordinary.id))
      errorResponse(await asAdmin('/v1/admin/users?enabled=invalid'), 400)
    })

    await t.test('重置密码立即撤销旧会话，只有新密码能够重新登录', async () => {
      await writeAdmin(`/v1/admin/users/${ordinary.id}`, 'PATCH', { enabled: true })
      const beforeReset = await login('ordinary', 'OrdinaryPassword123')
      await writeAdmin(`/v1/admin/users/${ordinary.id}/reset-password`, 'POST', { password: 'ChangedPassword456' })
      errorResponse(await request(probe, { token: beforeReset }), 401)
      errorResponse(await request('/v1/admin/auth/login', { body: { userName: 'ordinary', password: 'OrdinaryPassword123' } }), 401)
      const afterReset = await login('ordinary', 'ChangedPassword456')
      assert.equal((await request(probe, { token: afterReset })).status, 200)
    })

    await t.test('创建用户、重置密码与登录真实 HTTP 审计日志按原始内容保存', async () => {
      const created = logs.find((record) => record.method === 'POST' && record.url.endsWith('/v1/admin/users'))
      const reset = logs.find((record) => record.method === 'POST' && record.url.endsWith(`/users/${ordinary.id}/reset-password`))
      assert.ok(created)
      assert.ok(reset)
      assert.equal(JSON.parse(created.requestBody).password, 'OrdinaryPassword123')
      assert.equal(JSON.parse(created.requestBody).username, 'ordinary')
      assert.equal(JSON.parse(reset.requestBody).password, 'ChangedPassword456')
      const loginLogs = logs.filter((record) => record.url.endsWith('/auth/login'))
      assert.ok(loginLogs.some((record) => JSON.parse(record.responseBody).data?.accessToken === ordinaryToken))
      assert.ok(loginLogs.some((record) => JSON.parse(record.requestBody).password === 'OrdinaryPassword123'))
    })
  } finally {
    if (app) await app.close()
    if (redis?.status === 'ready') {
      const keys = await redis.keys(`${prefix}*`)
      if (keys.length) await redis.del(...keys.map((key) => key.slice(prefix.length)))
    }
    redis?.disconnect()
    if (adminConnection) {
      await adminConnection.query(`DROP DATABASE IF EXISTS \`${database}\``)
      await adminConnection.end()
    }
  }
})
