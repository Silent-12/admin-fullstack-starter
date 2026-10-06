/**
 * 统一 API 响应接口
 * @description 所有接口的成功和错误响应都使用相同的基础结构，减少前端适配难度
 */
export interface ApiResponse<T = unknown> {
  /** 响应状态码（200 成功，400+ 错误） */
  code: number
  /** 响应消息 */
  message: string
  /** 响应数据（泛型支持任意数据结构） */
  data: T
  /** 时间戳 */
  timestamp: string
  /** 错误追踪 ID（仅错误响应时返回） */
  traceId?: string
}
