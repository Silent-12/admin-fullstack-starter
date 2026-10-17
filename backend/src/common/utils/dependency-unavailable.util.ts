import { ServiceUnavailableException } from '@nestjs/common'

/** 基础依赖不可用的网络与连接错误码前缀 */
const DEPENDENCY_ERROR_CODE_PATTERN = /^(?:ECONN|ETIMEDOUT|EHOST|ENOTFOUND|EAI_AGAIN|PROTOCOL_|POOL_|EPIPE)/

/** 基础依赖不可用的提示文本特征 */
const DEPENDENCY_MESSAGE_PATTERN = /redis|mysql|mariadb|postgres|typeorm|queryfailed|connection pool|database|连接池|数据库|缓存|队列/i

/**
 * 判断异常是否表示基础依赖暂不可用
 * @description 识别数据库、缓存、队列等硬依赖的连接或可用性故障，供全局异常过滤器统一收敛为 503；
 * 判定覆盖 `ServiceUnavailableException`、常见网络错误码、TypeORM `driverError` 与依赖相关提示文本
 * @param error 待判断的异常值
 * @returns 异常是否属于基础依赖不可用
 */
export function isDependencyUnavailable(error: unknown): boolean {
  if (error instanceof ServiceUnavailableException) return true
  if (!(error instanceof Error)) return false

  const code = (error as Error & { code?: unknown }).code
  if (typeof code === 'string' && DEPENDENCY_ERROR_CODE_PATTERN.test(code)) return true
  if (DEPENDENCY_MESSAGE_PATTERN.test(error.message)) return true

  const driverError = (error as Error & { driverError?: unknown }).driverError
  return driverError !== undefined && driverError !== error && isDependencyUnavailable(driverError)
}
