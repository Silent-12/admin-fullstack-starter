import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { generateTraceId } from '../utils/trace-id.util.js'
import { MAX_BODY_LENGTH } from '../constants/common-misc.constant.js'
import { getClientIp } from '../utils/client-ip.util.js'
import { AccessLogService } from '../../modules/access-log/access-log.service.js'
import { getApiRelativePath, stripRouteVersionPrefix } from '../utils/throttle-request.util.js'

/**
 * 请求日志中间件
 * @description 记录所有 HTTP 请求的基本信息，异步写入数据库，不打印控制台日志；按设计捕获请求与响应体（超长截断），供审计排查
 */
@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  constructor(private readonly accessLogService: AccessLogService) {}

  /**
   * 处理请求并记录日志
   * @description 生成追踪 ID 并挂到请求头，在响应完成后异步落库，不阻塞请求链路
   * @param req 请求对象
   * @param res 响应对象
   * @param next 下一个中间件函数
   */
  use(req: Request, res: Response, next: NextFunction): void {
    const traceId = generateTraceId()
    const { method, originalUrl, headers } = req
    const startTime = Date.now()

    // 为请求添加 traceId，供后续处理使用
    req.headers['x-trace-id'] = traceId

    const userAgent = headers['user-agent'] || null
    const referer = headers['referer'] || null
    const requestBody = this.serializeBody(req.body)

    // 拦截 res.send 以捕获响应体，供访问日志记录。
    const originalSend = res.send
    let responseBody: string | undefined
    res.send = function (this: Response, body: unknown): Response {
      if (body !== undefined && body !== null) {
        responseBody = typeof body === 'string' ? body : JSON.stringify(body)
      }
      return originalSend.call(this, body)
    }

    // 监听响应完成事件
    res.on('finish', () => {
      const { statusCode } = res
      const duration = Date.now() - startTime

      // 异步写入数据库（不阻塞响应）
      const logData: Parameters<typeof this.accessLogService.create>[0] = {
        traceId,
        method,
        url: originalUrl,
        statusCode,
        duration,
        ip: getClientIp(req),
        source: this.resolveSource(originalUrl),
      }
      if (userAgent) logData.userAgent = userAgent
      if (referer) logData.referer = referer
      if (requestBody) logData.requestBody = requestBody
      if (responseBody) logData.responseBody = responseBody.slice(0, MAX_BODY_LENGTH)
      void this.accessLogService.create(logData)
    })

    next()
  }

  /**
   * 解析访问日志来源
   * @description 复用统一的 API 前缀与版本号归一化工具识别用户端、后台与 Webhook 请求
   * @param url 请求 URL
   * @returns 访问日志来源值
   */
  private resolveSource(url: string): 1 | 2 | 3 {
    const businessPath = stripRouteVersionPrefix(getApiRelativePath({ originalUrl: url, url }) ?? '')
    if (businessPath === 'admin' || businessPath.startsWith('admin/')) return 2
    if (businessPath === 'webhooks' || businessPath.startsWith('webhooks/')) return 3
    return 1
  }

  /**
   * 序列化请求体为字符串
   * @description 将请求体序列化为 JSON 字符串，超长内容截断，失败返回 undefined
   * @param body 请求体原始数据
   * @returns 序列化后的字符串或 undefined
   */
  private serializeBody(body: unknown): string | undefined {
    if (body === undefined || body === null) return undefined
    try {
      const str = typeof body === 'string' ? body : JSON.stringify(body)
      return str.length > MAX_BODY_LENGTH ? str.slice(0, MAX_BODY_LENGTH) : str
    } catch {
      return undefined
    }
  }
}
