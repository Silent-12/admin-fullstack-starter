/**
 * API 响应类型定义模块
 *
 * 提供统一的 API 响应结构类型定义
 *
 * ## 主要功能
 *
 * - 基础响应结构定义
 * - 泛型支持（适配不同数据类型）
 * - 统一的响应格式约束
 *
 * ## 使用场景
 *
 * - API 请求响应类型约束
 * - 接口数据类型定义
 * - 响应数据解析
 */

/**
 * 基础 API 响应结构
 * @description 描述后端统一返回的响应包装，字段与后端 ApiResponseDto 保持一致；成功与失败由 HTTP 状态码判定。
 */
export interface BaseResponse<T = unknown> {
  // 状态码，与 HTTP 状态码同值
  code: number
  // 提示消息，错误响应中为后端返回的具体错误原因
  message: string
  // 业务数据
  data: T
  // 响应生成时间，ISO 8601 字符串
  timestamp: string
  // 可选的错误追踪 ID，仅错误响应返回
  traceId?: string
}
