import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

/**
 * 统一响应 DTO
 * @description 全局通用响应结构，所有接口统一使用此格式返回。支持成功响应、错误响应、分页响应
 */
export class ApiResponseDto<T = unknown> {
  @ApiProperty({ description: '状态码', example: 200 })
  code: number

  @ApiProperty({ description: '消息', example: '成功' })
  message: string

  @ApiProperty({ description: '响应数据' })
  data: T

  @ApiProperty({ description: '时间戳' })
  timestamp: string

  @ApiPropertyOptional({ description: '错误追踪 ID（仅错误响应时返回）' })
  traceId?: string

  constructor(code: number, message: string, data: T, traceId?: string) {
    this.code = code
    this.message = message
    this.data = data
    this.timestamp = new Date().toISOString()
    if (traceId !== undefined) this.traceId = traceId
  }

  /**
   * 创建成功响应
   * @description 快捷创建 200 成功响应
   * @param data 响应数据
   * @param message 提示消息，默认 '成功'
   * @returns 成功响应实例
   */
  static success<T>(data: T, message = '成功'): ApiResponseDto<T> {
    return new ApiResponseDto(200, message, data)
  }

  /**
   * 创建错误响应
   * @description 快捷创建错误响应
   * @param code HTTP 状态码
   * @param message 错误消息
   * @param traceId 错误追踪 ID
   * @returns 错误响应实例
   */
  static error(code: number, message: string, traceId?: string): ApiResponseDto<null> {
    return new ApiResponseDto(code, message, null, traceId)
  }
}
