import type { ExecutionContext } from '@nestjs/common'
import type { ThrottlerGenerateKeyFunction } from '@nestjs/throttler'
import type { Request } from 'express'
import { THROTTLE_POLICY } from '../constants/throttle.constant.js'

/**
 * 获取 API 前缀后的请求路径。
 * @description 去除查询字符串、首尾斜杠和全局 API_PREFIX；当请求不属于 API 前缀时返回 null。
 * @param request HTTP 请求
 * @returns API 相对路径或 null
 */
export function getApiRelativePath(request: Pick<Request, 'originalUrl' | 'url'>): string | null {
  const pathname = ((request.originalUrl || request.url).split('?')[0] ?? '').replace(/^\/+|\/+$/g, '')
  const prefix = (process.env.API_PREFIX ?? '').trim().replace(/^\/+|\/+$/g, '')
  if (!prefix) return pathname
  if (pathname === prefix) return ''
  return pathname.startsWith(`${prefix}/`) ? pathname.slice(prefix.length + 1) : null
}

/**
 * 去除接口版本前缀。
 * @description 将 API 路径首段的 v1、v2 等版本标识移除，便于按业务来源判断限流范围。
 * @param apiRelativePath API 前缀后的路径
 * @returns 去除版本前缀后的业务路径
 */
export function stripRouteVersionPrefix(apiRelativePath: string): string {
  return apiRelativePath.replace(/^v\d+(?=\/|$)\/?/, '')
}

/**
 * 判断基础设施路径。
 * @description 识别静态资源和开发文档路径，这些路径不参与用户端接口限流和未知路由扫描统计。
 * @param businessPath 去除 API 前缀和版本号后的业务路径
 * @returns 是否为静态资源或开发文档路径
 */
export function isInfrastructureThrottlePath(businessPath: string): boolean {
  const firstSegment = businessPath.split('/')[0] ?? ''
  if (firstSegment === 'uploads') return true
  if (businessPath === 'doc.html' || businessPath === 'api-json' || businessPath === 'services.json') return true
  return ['swagger-resources', 'webjars', 'assets', 'api'].includes(firstSegment)
}

/**
 * 判断是否跳过用户端全局限流。
 * @description 仅允许用户端业务 API 进入全局限流；后台、Webhook、健康检查、静态资源和开发文档全部跳过。
 * @param context Nest 请求上下文
 * @returns 是否跳过限流
 */
export function shouldSkipUserApiThrottle(context: ExecutionContext): boolean {
  const path = getApiRelativePath(context.switchToHttp().getRequest<Request>())
  if (!path) return true
  const businessPath = stripRouteVersionPrefix(path)
  if (!businessPath || isInfrastructureThrottlePath(businessPath)) return true
  const firstSegment = businessPath.split('/')[0] ?? ''
  return ['health', 'admin', 'webhooks'].includes(firstSegment)
}

/**
 * 生成用户端全局限流 Redis key。
 * @description 使用 IP 作为唯一追踪维度，使不同用户端接口共享同一个限流窗口。
 * @param context Nest 请求上下文
 * @param trackerString 客户端追踪值
 * @param throttlerName 限流器名称
 * @returns 用户端全局限流 key
 */
export const generateUserApiThrottleKey: ThrottlerGenerateKeyFunction = (context, trackerString, throttlerName) => {
  void context
  void throttlerName
  return `${THROTTLE_POLICY.USER_API_KEY_PREFIX}${trackerString}`
}

/**
 * 判断是否统计未知路由。
 * @description 仅统计 API 前缀下的未知业务路径，后台和 Webhook 的探测同样纳入 404 封禁；静态资源与开发文档除外。
 * @param request HTTP 请求
 * @returns 是否计入未知路由探测
 */
export function isMissingRouteThrottleRequest(request: Request): boolean {
  const path = getApiRelativePath(request)
  if (!path) return false
  return !isInfrastructureThrottlePath(stripRouteVersionPrefix(path))
}
