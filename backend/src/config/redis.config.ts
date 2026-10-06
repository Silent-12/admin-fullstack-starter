import { registerAs } from '@nestjs/config'

/**
 * Redis 配置
 * @description 从环境变量加载 Redis 配置，支持开关控制
 */
export default registerAs('redis', () => ({
  enabled: process.env.REDIS_ENABLED === 'true',
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
}))
