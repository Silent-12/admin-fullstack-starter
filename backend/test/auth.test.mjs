import 'reflect-metadata'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { randomBytes, randomUUID } from 'node:crypto'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { Logger } from '@nestjs/common'
import { AdminAuthService } from '../dist/modules/auth/admin/admin-auth.service.js'
import { PasswordService } from '../dist/modules/auth/admin/password.service.js'
import { LoginDto } from '../dist/modules/auth/admin/dto/login.dto.js'
import { LoggingMiddleware } from '../dist/common/middleware/logging.middleware.js'
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
    { userName: 'admin1', password: 'test' },
    { userName: 'admin', password: '' },
    { userName: 'admin', password: 'a'.repeat(129) },
  ]) {
    assert.ok((await validate(plainToInstance(LoginDto, body, { enableImplicitConversion: true }))).length > 0)
  }
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

test('访问日志记录认证路径的请求与响应体，大小写路径一致', async () => {
  for (const url of ['/backend/v1/admin/auth/login', '/BACKEND/V1/ADMIN/AUTH/LOGIN']) {
    const records = []
    const middleware = new LoggingMiddleware({ create: async (value) => records.push(value) })
    // 构造最小 Express 响应对象，手动触发 finish 模拟响应完成
    const response = new EventEmitter()
    response.statusCode = 200
    response.send = () => response
    middleware.use(
      { method: 'POST', originalUrl: url, headers: {}, body: { password: 'secret-password' }, socket: { remoteAddress: '127.0.0.1' } },
      response,
      () => {},
    )
    response.send({ data: { accessToken: 'secret-token' } })
    response.emit('finish')
    // 按设计，认证路径同样记录请求与响应体，供审计排查
    assert.equal(records[0].requestBody, JSON.stringify({ password: 'secret-password' }))
    assert.equal(records[0].responseBody, JSON.stringify({ data: { accessToken: 'secret-token' } }))
  }
})
