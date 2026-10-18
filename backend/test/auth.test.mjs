import 'reflect-metadata'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { randomBytes, randomUUID } from 'node:crypto'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { All, Controller, Get, Logger } from '@nestjs/common'
import { MetadataScanner } from '@nestjs/core'
import { AdminAuthService } from '../dist/modules/auth/admin/admin-auth.service.js'
import { PasswordService } from '../dist/modules/auth/admin/password.service.js'
import { LoginDto } from '../dist/modules/auth/admin/dto/login.dto.js'
import { LoggingMiddleware } from '../dist/common/middleware/logging.middleware.js'
import { MAX_BODY_LENGTH } from '../dist/common/constants/common-misc.constant.js'
import { AdminApi } from '../dist/common/auth/admin-api.decorator.js'
import { ApiResourceService } from '../dist/modules/api-resource/admin/api-resource.service.js'
import { EventEmitter } from 'node:events'

// 关闭 Nest 默认日志输出，避免框架日志干扰测试结果
Logger.overrideLogger(false)

test('随机密码、独立盐、错误密码及未知用户校验', async () => {
  const passwords = new PasswordService()
  const password = passwords.generate()
  assert.match(password, /^[A-Za-z0-9]{32}$/)
  const [first, second] = await Promise.all([passwords.hash(password), passwords.hash(password)])
  assert.notEqual(first, second)
  assert.equal(await passwords.verify(password, first), true)
  assert.equal(await passwords.verify(`${password} `, first), false)
  assert.equal(await passwords.verify(password), false)
  assert.equal(await passwords.verify(password, 'malformed'), false)
})

test('DTO 拒绝隐式类型转换，用户名规范化，密码保持原样', async () => {
  const dto = plainToInstance(LoginDto, { userName: ' Admin ', password: ' secret ' }, { enableImplicitConversion: true })
  assert.equal((await validate(dto)).length, 0)
  assert.equal(dto.userName, 'admin')
  assert.equal(dto.password, ' secret ')
  for (const body of [
    { userName: 123, password: 'test' },
    { userName: 'admin', password: 123 },
    { userName: ['admin'], password: ['test'] },
    { userName: 'admin_1', password: 'test' },
    { userName: '1admin', password: 'test' },
    { userName: 'admin', password: '' },
    { userName: 'admin', password: 'a'.repeat(129) },
  ]) {
    assert.ok((await validate(plainToInstance(LoginDto, body, { enableImplicitConversion: true }))).length > 0)
  }
  // 软删除同名用户自动追加数字后缀，数字用户名必须仍可登录。
  const suffixed = plainToInstance(LoginDto, { userName: 'hlh2', password: 'secret' }, { enableImplicitConversion: true })
  assert.deepEqual(await validate(suffixed), [])
  assert.equal(suffixed.userName, 'hlh2')
})

test('JWT 验证算法、到期、版本与数据库故障', async () => {
  const secret = randomBytes(48).toString('base64')
  const options = { algorithm: 'HS256' }
  const jwt = new JwtService({
    secret,
    signOptions: options,
    verifyOptions: { algorithms: ['HS256'] },
  })
  const id = randomUUID()
  const claims = { sub: id, ver: 1, jti: randomUUID(), iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 60 }
  // 用可变状态模拟数据库不可用、用户被删除与令牌版本变更
  let unavailable = false
  let deleted = false
  let version = 1
  const users = {
    findOne: async ({ where }) => {
      if (unavailable) throw new Error('database unavailable')
      return !deleted && where.tokenVersion === version && where.id === id ? { id, tokenVersion: version } : null
    },
  }
  const auth = new AdminAuthService(users, new PasswordService(), jwt, new ConfigService())
  const token = await jwt.signAsync(claims)
  assert.equal((await auth.authenticate(token)).user.id, id)
  for (const invalid of [
    token + 'x',
    await jwt.signAsync({ ...claims, exp: claims.iat - 1 }),
    await jwt.signAsync(claims, { algorithm: 'HS384' }),
    await jwt.signAsync({ ...claims, ver: '1' }),
  ]) {
    await assert.rejects(auth.authenticate(invalid), (error) => error.getStatus() === 401)
  }
  deleted = true
  await assert.rejects(auth.authenticate(token), (error) => error.getStatus() === 401)
  deleted = false
  version = 2
  await assert.rejects(auth.authenticate(token), (error) => error.getStatus() === 401)
  version = 1
  unavailable = true
  await assert.rejects(auth.authenticate(token), (error) => error.getStatus() === 503)
})

function captureLog(url, body, responseBody) {
  const records = []
  const middleware = new LoggingMiddleware({ create: async (value) => records.push(value) })
  // 构造最小 Express 响应对象，手动触发 finish 模拟响应完成。
  const response = new EventEmitter()
  response.statusCode = 200
  response.send = () => response
  middleware.use({ method: 'POST', originalUrl: url, headers: {}, body, socket: { remoteAddress: '127.0.0.1' } }, response, () => {})
  response.send(responseBody)
  response.emit('finish')
  assert.equal(records.length, 1)
  return records[0]
}

test('登录、创建用户和重置密码的日志按原始内容记录，大小写和全局前缀不改变处理', () => {
  for (const url of [
    '/backend/v1/admin/auth/login',
    '/BACKEND/V1/ADMIN/AUTH/LOGIN',
    '/custom-prefix/v1/admin/users',
    `/custom-prefix/v1/admin/users/${randomUUID()}/reset-password`,
  ]) {
    const record = captureLog(url, { userName: 'tester', password: 'secret-password' }, { data: { accessToken: 'secret-token' } })
    assert.deepEqual(JSON.parse(record.requestBody), { userName: 'tester', password: 'secret-password' })
    assert.deepEqual(JSON.parse(record.responseBody), { data: { accessToken: 'secret-token' } })
  }
})

test('嵌套结构与 JSON 字符串正文原样记录，原请求和响应对象保持不变', () => {
  const requestBody = {
    title: '正常内容',
    nested: [
      { PASSWORD: 'nested-password', password_hash: 'nested-hash' },
      { 'access-token': 'nested-access', 'refresh_token': 'nested-refresh' },
    ],
    meta: {
      'Authorization': 'nested-authorization',
      'SeCrEt': 'nested-secret',
      'ToKeN': 'nested-token',
      'api_key': 'nested-key',
      'salt': 'nested-salt',
      'client-secret': 'nested-client',
    },
  }
  const responseBody = { data: [{ accessToken: 'response-token', passwordHash: 'response-hash', name: '可见名称' }] }
  const originalRequest = structuredClone(requestBody)
  const originalResponse = structuredClone(responseBody)
  for (const sentBody of [responseBody, JSON.stringify(responseBody)]) {
    const record = captureLog('/backend/v1/admin/business-records', requestBody, sentBody)
    assert.deepEqual(JSON.parse(record.requestBody), originalRequest)
    assert.deepEqual(JSON.parse(record.responseBody), originalResponse)
    assert.deepEqual(requestBody, originalRequest)
    assert.deepEqual(responseBody, originalResponse)
  }
})

test('日志按长度截断，序列化失败不影响请求响应', () => {
  const record = captureLog(
    '/backend/v1/admin/business-records',
    { password: 'truncated-password', message: 'x'.repeat(MAX_BODY_LENGTH * 2) },
    JSON.stringify({ token: 'truncated-token', message: 'y'.repeat(MAX_BODY_LENGTH * 2) }),
  )
  assert.equal(record.requestBody.length, MAX_BODY_LENGTH)
  assert.equal(record.responseBody.length, MAX_BODY_LENGTH)
  assert.ok(record.requestBody.startsWith('{"password":"truncated-password"'))
  assert.ok(record.responseBody.startsWith('{"token":"truncated-token"'))
  const circular = {}
  circular.self = circular
  for (const [body, responseBody] of [
    [circular, 1n],
    [1n, circular],
    [Buffer.from('binary-secret'), Buffer.from('binary-secret')],
  ]) {
    const failed = captureLog('/backend/v1/admin/business-records', body, responseBody)
    assert.equal(failed.requestBody, undefined)
    assert.equal(failed.responseBody, undefined)
  }
})

test('非结构化正文按原始内容记录', () => {
  for (const content of ['password=unstructured-secret', JSON.stringify('unstructured-token'), '123', 'true', '普通业务文本']) {
    const record = captureLog('/backend/v1/admin/auth/login', content, content)
    assert.equal(record.requestBody, content)
    assert.equal(record.responseBody, content)
  }
})

function declareController(path, entries) {
  class TestController {}
  Controller(path)(TestController)
  for (const [name, method, route, declaration] of entries) {
    Object.defineProperty(TestController.prototype, name, { value() {}, configurable: true })
    const descriptor = Object.getOwnPropertyDescriptor(TestController.prototype, name)
    method(route)(TestController.prototype, name, descriptor)
    if (declaration) AdminApi(declaration)(TestController.prototype, name, descriptor)
  }
  return TestController
}

function apiResourceService(controllers, rows = []) {
  const resources = {
    find: async () => rows,
    update: async ({ code }, values) => Object.assign(rows.find((row) => row.code === code), values),
  }
  return new ApiResourceService(
    { getControllers: () => controllers.map((metatype) => ({ metatype, instance: new metatype() })) },
    new MetadataScanner(),
    resources,
  )
}

const apiMetadata = (code, extra = {}) => ({ code, module: '业务模块', feature: '查询功能', action: '读取', ...extra })

test('后台接口清单要求 AdminApi 声明并拒绝非法访问策略', () => {
  const missing = declareController('v1/admin/fail-closed', [['read', Get, '', undefined]])
  assert.throws(() => apiResourceService([missing]).onModuleInit(), /AdminApi/)
  for (const access of ['permisson', 'admin']) {
    const invalid = declareController('v1/admin/fail-closed', [['read', Get, '', apiMetadata('test.invalid', { access })]])
    assert.throws(() => apiResourceService([invalid]).onModuleInit(), /访问策略/)
  }
})

test('重复接口编码、多个路由别名与 ALL 方法阻止接口清单启动', () => {
  const first = declareController('v1/admin/first', [['read', Get, '', apiMetadata('test.duplicate')]])
  const second = declareController('v1/admin/second', [['read', Get, '', apiMetadata('test.duplicate')]])
  assert.throws(() => apiResourceService([first, second]).onModuleInit(), /重复/)
  for (const [controllerPath, method, route] of [
    [['v1/admin/one', 'v1/admin/two'], Get, ''],
    ['v1/admin/one', Get, ['first', 'second']],
    ['v1/admin/one', All, ''],
  ]) {
    const controller = declareController(controllerPath, [['read', method, route, apiMetadata('test.ambiguous')]])
    assert.throws(() => apiResourceService([controller]).onModuleInit(), /唯一方法和路由/)
  }
})

test('登录态接口只能通过 AdminApi 声明，不可绑定也不进入接口树', async () => {
  const controller = declareController('v1/admin/records', [
    ['read', Get, ':id', apiMetadata('test.read')],
    ['session', Get, 'session', apiMetadata('test.session', { access: 'authenticated' })],
  ])
  const service = apiResourceService([controller])
  service.onModuleInit()
  assert.equal(service.getDefinition(controller.prototype.read).access, 'permission')
  assert.equal(service.getDefinition(controller.prototype.session).access, 'authenticated')
  service.validateCodes(['test.read'])
  assert.throws(() => service.validateCodes(['test.session']), (error) => error.getStatus() === 400)
  const tree = await service.getTree()
  assert.deepEqual(tree[0].children[0].children.map((item) => item.key), ['test.read'])
})
