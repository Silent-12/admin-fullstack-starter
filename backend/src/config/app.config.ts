import { registerAs } from '@nestjs/config'
import { parse } from 'dotenv'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// 启动时记录 `.env` 中已声明的变量名，用于区分必须显式配置与可回退的变量
const declaredEnvKeys = (() => {
  const envPath = resolve(process.cwd(), '.env')
  if (!existsSync(envPath)) return new Set<string>()
  return new Set(Object.keys(parse(readFileSync(envPath, 'utf8'))))
})()

/**
 * 读取环境变量
 * @description 已在 `.env` 中声明的变量必须配置非空值，其他变量使用运行时值或回退值
 * @param name 环境变量名称
 * @param fallback 默认值
 * @returns 解析后的环境变量值
 */
function readEnv(name: string, fallback = ''): string {
  const value = process.env[name]?.trim()
  if (declaredEnvKeys.has(name) && !value) {
    throw new Error(`环境变量 ${name} 未配置`)
  }
  return value ?? fallback
}

/**
 * 应用配置
 * @description 从环境变量加载应用基础配置，未在 `.env` 声明时使用默认值
 */
export default registerAs('app', () => ({
  nodeEnv: readEnv('NODE_ENV', 'development'),
  port: parseInt(readEnv('PORT', '3000'), 10),
  apiPrefix: readEnv('API_PREFIX', 'backend'),
  throttleEnabled: readEnv('THROTTLE_ENABLED', 'false') === 'true',
  knife4jAuthEnabled: readEnv('KNIFE4J_AUTH_ENABLED', 'false') === 'true',
  knife4jUsername: readEnv('KNIFE4J_USERNAME'),
  knife4jPassword: readEnv('KNIFE4J_PASSWORD'),
  uploadDir: readEnv('UPLOAD_DIR', 'uploads'),
  jwtSecret: readEnv('JWT_SECRET'),
  jwtExpiresSeconds: parseInt(readEnv('JWT_EXPIRES_SECONDS', '2592000'), 10),
}))
