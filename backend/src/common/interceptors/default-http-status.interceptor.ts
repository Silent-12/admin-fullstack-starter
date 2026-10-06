import { CallHandler, ExecutionContext, HttpStatus, Injectable, NestInterceptor } from '@nestjs/common'
import type { Response } from 'express'
import type { Observable } from 'rxjs'

const HTTP_CODE_METADATA = '__httpCode__'

/**
 * 默认 HTTP 成功状态码拦截器
 * @description 将未显式声明 HTTP 状态码的 POST 默认 201 统一调整为 200，保持响应体 code 与 HTTP 状态码一致。
 */
@Injectable()
export class DefaultHttpStatusInterceptor implements NestInterceptor {
  /**
   * 处理请求并统一默认成功状态码
   * @description 仅调整 Nest 自动设置的 201，显式使用 @HttpCode 的路由保持原状态码。
   * @param context 当前执行上下文
   * @param next 下一个处理器
   * @returns 请求处理结果流
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse<Response>()
    const explicitStatusCode = Reflect.getMetadata(HTTP_CODE_METADATA, context.getHandler()) as number | undefined
    if (explicitStatusCode === undefined && response.statusCode === Number(HttpStatus.CREATED)) {
      response.status(HttpStatus.OK)
    }
    return next.handle()
  }
}
