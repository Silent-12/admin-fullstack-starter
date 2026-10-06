import { HttpStatus } from '@nestjs/common'

/**
 * 默认错误消息映射表
 * @description 各 HTTP 状态码对应的默认对外提示消息
 */
const DEFAULT_ERROR_MESSAGES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: '参数校验失败',
  [HttpStatus.UNAUTHORIZED]: '未授权',
  [HttpStatus.FORBIDDEN]: '权限不足',
  [HttpStatus.NOT_FOUND]: '资源不存在',
  [HttpStatus.CONFLICT]: '数据冲突',
  [HttpStatus.UNPROCESSABLE_ENTITY]: '请求数据无法处理',
  [HttpStatus.SERVICE_UNAVAILABLE]: '服务暂时不可用，请稍后再试',
  [HttpStatus.GATEWAY_TIMEOUT]: '服务响应超时，请稍后再试',
  [HttpStatus.TOO_MANY_REQUESTS]: '请求过于频繁，请稍后再试',
  [HttpStatus.INTERNAL_SERVER_ERROR]: '服务器内部错误',
}

/**
 * 根据状态码获取默认错误消息
 * @description 用于异常过滤器在未提供自定义消息时，返回通用对外提示
 * @param statusCode HTTP 状态码
 * @returns 默认错误消息
 */
export function getDefaultErrorMessage(statusCode: number): string {
  return DEFAULT_ERROR_MESSAGES[statusCode] || '请求处理失败'
}
