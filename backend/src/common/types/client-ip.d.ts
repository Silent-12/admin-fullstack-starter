/**
 * 客户端 IP 请求字段。
 * @description 定义 IP 解析工具所需的最小请求结构，兼容 Express 请求和限流追踪请求对象。
 */
export interface ClientIpSocket {
  /** 底层 TCP 连接地址 */
  remoteAddress?: unknown
}

/**
 * 客户端 IP 请求对象。
 * @description 提供 Express req.ip 与底层 socket 地址供统一客户端 IP 解析。
 */
export interface ClientIpRequest {
  /** Express 根据可信代理解析出的客户端 IP */
  ip?: unknown
  /** 底层 TCP socket */
  socket?: ClientIpSocket
}
