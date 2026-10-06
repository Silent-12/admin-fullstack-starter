/**
 * 健康检查响应接口
 */
export interface HealthResponse {
  // 服务状态，可选值：ok, error
  status: string
  // 服务启动时间戳 格式：YYYY-MM-DD HH:mm:ss.SSSZ
  timestamp?: string
  // 服务运行时间（秒）
  uptime?: number
  // 服务内存使用情况，包含堆内存、非堆内存、外部内存等
  memoryUsage?: NodeJS.MemoryUsage
  // 开发和测试环境的基础设施启动连通性
  services?: {
    mysql: { enabled: boolean; available: boolean }
    redis: { enabled: boolean; available: boolean }
  }
}
