import { randomBytes } from 'crypto'

/**
 * 生成 32 位随机唯一 ID
 * @description 用于请求追踪和错误日志关联，由 16 字节随机数转为十六进制字符串
 * @returns 32 位十六进制字符串
 */
export function generateTraceId(): string {
  return randomBytes(16).toString('hex')
}
