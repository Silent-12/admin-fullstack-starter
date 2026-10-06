import type { ClientIpRequest } from '../types/client-ip.js'

/**
 * 标准化客户端 IP。
 * @description 清理首尾空格并去除 IPv4 映射 IPv6 前缀，确保日志和限流使用相同地址格式。
 * @param ip 原始 IP
 * @returns 标准化后的 IP；无法识别时返回空字符串
 */
export function normalizeClientIp(ip: unknown): string {
  if (typeof ip !== 'string') return ''
  const normalizedIp = ip.trim()
  if (!normalizedIp) return ''
  return normalizedIp.startsWith('::ffff:') ? normalizedIp.slice('::ffff:'.length) : normalizedIp
}

/**
 * 解析客户端 IP。
 * @description 优先使用 Express 在可信代理配置下解析出的 req.ip，只有缺失时才回退到底层 TCP 连接地址；不直接信任请求头原始值。
 * @param request 请求对象
 * @returns 标准化后的客户端 IP；全部缺失时返回 unknown-ip
 */
export function getClientIp(request: ClientIpRequest): string {
  return normalizeClientIp(request.ip) || normalizeClientIp(request.socket?.remoteAddress) || 'unknown-ip'
}
