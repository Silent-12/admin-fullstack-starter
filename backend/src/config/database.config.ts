import { registerAs } from '@nestjs/config'

/**
 * 数据库配置
 * @description 从环境变量加载数据库配置，支持 MySQL 开关控制
 */
export default registerAs('database', () => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_DATABASE || 'demo',
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true',
  enabled: process.env.MYSQL_ENABLED === 'true',
  extra: {
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 60000,
  },
}))
