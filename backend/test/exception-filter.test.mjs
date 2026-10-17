import 'reflect-metadata'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BadRequestException, HttpException, HttpStatus, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { AllExceptionsFilter } from '../dist/common/filters/all-exceptions.filter.js'
import { getDefaultErrorMessage } from '../dist/common/utils/error-message.util.js'
import { isDependencyUnavailable } from '../dist/common/utils/dependency-unavailable.util.js'

Logger.overrideLogger(false)

const UNAVAILABLE_MESSAGE = getDefaultErrorMessage(HttpStatus.SERVICE_UNAVAILABLE)

function createHost(url) {
  const response = {
    statusCode: 0,
    body: undefined,
    ended: false,
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
    end() {
      this.ended = true
      return this
    },
  }
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ url }),
    }),
  }
  return { response, host }
}

function dispatch(exception, url = '/backend/v1/admin/template-api') {
  const { response, host } = createHost(url)
  new AllExceptionsFilter().catch(exception, host)
  return response
}

function assertUnavailable(response) {
  assert.equal(response.statusCode, HttpStatus.SERVICE_UNAVAILABLE)
  assert.equal(response.body.code, HttpStatus.SERVICE_UNAVAILABLE)
  assert.equal(response.body.message, UNAVAILABLE_MESSAGE)
  assert.equal(response.body.data, null)
  assert.match(response.body.traceId, /^[a-f0-9]{32}$/)
  assert.equal(typeof response.body.timestamp, 'string')
  assert.doesNotMatch(response.body.message, /redis|mysql|database|typeorm|连接|3306|6379/i)
}

test('ServiceUnavailableException 即使携带依赖细节也只返回 503 通用提示', () => {
  assertUnavailable(dispatch(new ServiceUnavailableException('认证数据库 Redis 连接失败：ECONNREFUSED 127.0.0.1:6379')))
})

test('可识别的依赖连接错误统一返回 503 通用提示', () => {
  const dependencyErrors = [
    Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:3306'), { code: 'ECONNREFUSED' }),
    Object.assign(new Error('read ETIMEDOUT'), { code: 'ETIMEDOUT' }),
    Object.assign(new Error('Connection lost'), { code: 'PROTOCOL_CONNECTION_LOST' }),
    Object.assign(new Error('Pool is closed'), { code: 'POOL_CLOSED' }),
    Object.assign(new Error('Query failed'), {
      driverError: Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:3306'), { code: 'ECONNREFUSED' }),
    }),
    new Error('Redis connection is not available'),
  ]
  for (const error of dependencyErrors) {
    assert.equal(isDependencyUnavailable(error), true)
    assertUnavailable(dispatch(error))
  }
  assert.equal(isDependencyUnavailable(new Error('unexpected failure')), false)
})

test('普通 Error 返回 500 与默认通用提示', () => {
  const response = dispatch(new Error('unexpected failure'))
  assert.equal(response.statusCode, HttpStatus.INTERNAL_SERVER_ERROR)
  assert.equal(response.body.code, HttpStatus.INTERNAL_SERVER_ERROR)
  assert.equal(response.body.message, getDefaultErrorMessage(HttpStatus.INTERNAL_SERVER_ERROR))
  assert.equal(response.body.data, null)
  assert.match(response.body.traceId, /^[a-f0-9]{32}$/)
})

test('4xx HttpException 保留业务消息与附加数据', () => {
  for (const exception of [new BadRequestException('用户名或密码错误'), new NotFoundException('模板条目不存在')]) {
    const response = dispatch(exception)
    assert.equal(response.statusCode, exception.getStatus())
    assert.equal(response.body.code, exception.getStatus())
    assert.equal(response.body.message, exception.message)
  }
  const withData = dispatch(new HttpException({ message: '业务字段缺失', data: { field: 'name' } }, HttpStatus.UNPROCESSABLE_ENTITY))
  assert.equal(withData.statusCode, HttpStatus.UNPROCESSABLE_ENTITY)
  assert.equal(withData.body.message, '业务字段缺失')
  assert.deepEqual(withData.body.data, { field: 'name' })
})

test('5xx HttpException 不向客户端透传原始消息', () => {
  assertUnavailable(dispatch(new HttpException('查询 Redis 失败', HttpStatus.INTERNAL_SERVER_ERROR)))
  const response = dispatch(new HttpException('内部业务处理失败', HttpStatus.INTERNAL_SERVER_ERROR))
  assert.equal(response.statusCode, HttpStatus.INTERNAL_SERVER_ERROR)
  assert.equal(response.body.message, getDefaultErrorMessage(HttpStatus.INTERNAL_SERVER_ERROR))
})

test('放行路径直接返回 204，不写入响应体', () => {
  for (const url of ['/', '/favicon.ico']) {
    const { response, host } = createHost(url)
    new AllExceptionsFilter().catch(new Error('unexpected failure'), host)
    assert.equal(response.statusCode, HttpStatus.NO_CONTENT)
    assert.equal(response.ended, true)
    assert.equal(response.body, undefined)
  }
})
