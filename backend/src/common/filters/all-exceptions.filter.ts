import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { Request, Response } from 'express'
import { ApiResponseDto } from '../dto/api-response.dto.js'
import { generateTraceId } from '../utils/trace-id.util.js'
import { getDefaultErrorMessage } from '../utils/error-message.util.js'
import { isDependencyUnavailable } from '../utils/dependency-unavailable.util.js'

/**
 * 全局异常过滤器
 * @description 捕获所有异常并返回统一的 `ApiResponseDto`：4xx 透传业务提示，
 * 基础设施不可用统一收敛为 503 通用提示，其余 5xx 仅返回状态码对应的默认提示，
 * 依赖名称、原始错误与堆栈只写入服务端日志
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  /**
   * 捕获并处理所有异常
   * @description 区分 4xx 业务异常与 5xx 服务端异常：前者透传业务消息，后者按依赖不可用与非依赖故障分别返回
   * 503 或原状态码的通用提示；同时保留 `allowedPaths` 的 204 放行与 `ApiResponseDto` 统一结构
   * @param exception 异常对象
   * @param host 参数宿主
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()
    // 放行指定路径，直接响应 204，避免日志噪音
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

      if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
        // 5xx 不向客户端透传异常消息：依赖不可用统一返回 503，其余保留原状态码但使用默认提示。
        this.logger.error(`[${traceId}] ${status} ${exception.message} at ${request.url}`, exception.stack)
        status = isDependencyUnavailable(exception) ? HttpStatus.SERVICE_UNAVAILABLE : status
        message = getDefaultErrorMessage(status)
      } else {
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
      }
    } else if (isDependencyUnavailable(exception)) {
      // 未包装成 HttpException 的依赖故障同样只返回通用提示，原始错误仅写服务端日志。
      status = HttpStatus.SERVICE_UNAVAILABLE
      message = getDefaultErrorMessage(status)
      this.logger.error(
        `[${traceId}] ${status} Dependency unavailable at ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      )
    } else if (exception instanceof Error) {
      this.logger.error(`[${traceId}] 500 Unhandled Exception at ${request.url}`, exception.stack)
    } else {
      this.logger.error(`[${traceId}] 500 Unknown Exception at ${request.url}`, exception)
    }

    const errorResponse = new ApiResponseDto(status, message, data, traceId)
    response.status(status).json(errorResponse)
  }
}
