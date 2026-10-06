import { HttpStatus, Injectable, type NestMiddleware } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'
import { THROTTLE_POLICY } from '../constants/throttle.constant.js'
import { ApiResponseDto } from '../dto/api-response.dto.js'
import { RedisThrottlerStorageService } from '../throttle/redis-throttler-storage.service.js'
import { getClientIp } from '../utils/client-ip.util.js'
import { isMissingRouteThrottleRequest } from '../utils/throttle-request.util.js'

/**
 * 未知路由 404 限流中间件。
 * @description 在 Nest 路由匹配前检查 IP 封禁状态，并在响应完成后统计 API 未知路由 404。
 */
@Injectable()
export class MissingRouteThrottleMiddleware implements NestMiddleware {
  /**
   * 构造未知路由限流中间件。
   * @description 注入 Redis 限流存储服务，复用全局限流的原子计数与封禁实现。
   * @param storage Redis 限流存储服务
   * @returns 无返回值
   */
  constructor(private readonly storage: RedisThrottlerStorageService) {}

  /**
   * 处理未知路由限流。
   * @description 封禁中的 IP 直接返回统一 429；未封禁请求继续执行，并在响应完成后对未知路由 404 做原子计数。
   * @param request HTTP 请求
   * @param response HTTP 响应
   * @param next 下一个中间件
   * @returns 无返回值
   */
  async use(request: Request, response: Response, next: NextFunction): Promise<void> {
    const key = `${THROTTLE_POLICY.MISSING_ROUTE_KEY_PREFIX}${getClientIp(request)}`
    const remaining = await this.storage.getBlockRemaining(key)
    if (remaining > 0) {
      response.setHeader('Retry-After', remaining)
      response.status(HttpStatus.TOO_MANY_REQUESTS).json(ApiResponseDto.error(HttpStatus.TOO_MANY_REQUESTS, THROTTLE_POLICY.MESSAGE))
      return
    }
    response.on('finish', () => {
      if (response.statusCode === Number(HttpStatus.NOT_FOUND) && !request.route && isMissingRouteThrottleRequest(request)) {
        void this.storage.increment(
          key,
          THROTTLE_POLICY.MISSING_ROUTE_WINDOW_MS,
          THROTTLE_POLICY.MISSING_ROUTE_TRIGGER_HITS - 1,
          THROTTLE_POLICY.MISSING_ROUTE_BLOCK_SECONDS * 1000,
          THROTTLE_POLICY.MISSING_ROUTE_THROTTLER_NAME,
        )
      }
    })
    next()
  }
}
