import type { ThrottlerGetTrackerFunction } from '@nestjs/throttler'
import { getClientIp } from './client-ip.util.js'

/**
 * 获取 IP 限流追踪键。
 * @description 复用统一客户端 IP 解析逻辑作为限流追踪键，避免日志与限流使用不同地址。
 * @param request 限流追踪请求对象
 * @returns IP 维度限流追踪键
 */
export const getIpThrottleTracker: ThrottlerGetTrackerFunction = (request) => getClientIp(request)
