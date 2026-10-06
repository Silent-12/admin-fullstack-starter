import { generateTraceId } from './trace-id.util.js'
import { ApiResponseDto } from '../dto/api-response.dto.js'

/**
 * 创建统一的错误响应对象
 * @description 生成标准化的错误响应格式，用于异常过滤器
 * @param status 错误状态码
 * @param message 错误消息
 * @returns ApiResponseDto 统一的错误响应
 */
export function createErrorResponse(status: number, message: string): ApiResponseDto<null> {
  const traceId = generateTraceId()
  return new ApiResponseDto(status, message || '请求处理失败', null, traceId)
}
