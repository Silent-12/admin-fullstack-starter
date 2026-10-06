import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { Request, Response } from 'express'
import { ApiResponseDto } from '../dto/api-response.dto.js'
import { generateTraceId } from '../utils/trace-id.util.js'
import { getDefaultErrorMessage } from '../utils/error-message.util.js'

/**
 * 全局异常过滤器
 * @description 捕获所有异常，返回统一的 ApiResponseDto 格式。
 * 默认返回通用错误提示，特定场景可在业务层抛出带自定义消息的 HttpException。
 * 详细错误信息记录在服务器日志中（包含 traceId 和堆栈）。
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  /**
   * 捕获并处理所有异常
   * @description 区分 HttpException 和未知异常，统一返回 { code, message, data, timestamp, traceId } 格式
   * @param exception 异常对象
   * @param host 参数宿主
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()
    // 放行指定路径，直接响应 204 ,避免日志噪音
    const allowedPaths = ['/favicon.ico', '/']
    if (allowedPaths.includes(request.url)) {
      response.status(HttpStatus.NO_CONTENT).end()
      return
    }

    const traceId = generateTraceId()
    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message = getDefaultErrorMessage(HttpStatus.INTERNAL_SERVER_ERROR)
    let data: unknown = null

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const exceptionResponse = exception.getResponse()

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null && 'message' in exceptionResponse) {
        const messageFromResponse = (exceptionResponse as Record<string, unknown>).message
        if (typeof messageFromResponse === 'string') {
          message = messageFromResponse
        } else if (Array.isArray(messageFromResponse) && messageFromResponse.length && typeof messageFromResponse[0] === 'string') {
          message = messageFromResponse[0]
        } else {
          message = getDefaultErrorMessage(status)
        }
        data = 'data' in exceptionResponse ? ((exceptionResponse as Record<string, unknown>).data ?? null) : null
      } else {
        message = getDefaultErrorMessage(status)
      }

      this.logger.warn(`[${traceId}] ${status} ${message} at ${request.url}`)
    } else if (exception instanceof Error) {
      this.logger.error(`[${traceId}] 500 Unhandled Exception at ${request.url}`, exception.stack)
    } else {
      this.logger.error(`[${traceId}] 500 Unknown Exception at ${request.url}`, exception)
    }

    const errorResponse = new ApiResponseDto(status, message, data, traceId)
    response.status(status).json(errorResponse)
  }
}
