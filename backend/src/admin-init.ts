import 'reflect-metadata'
import { config } from 'dotenv'
import { resolve } from 'node:path'
import { DataSource } from 'typeorm'
import databaseConfig from './config/database.config.js'
import { SnakeNamingStrategy } from './config/database-naming-strategy.js'
import { AdminUser } from './modules/auth/admin/entities/admin-user.entity.js'
import { PasswordService } from './modules/auth/admin/password.service.js'
import { initializeAdmin } from './modules/auth/admin/initialize-admin.js'

/**
 * 内置账号初始化入口
 * @description 仅写入缺失的 admin，不启动 HTTP 服务、不自动改表、不将密码写入日志
 */
async function main(): Promise<void> {
  config({ path: resolve('.env'), quiet: true })
  config({ path: resolve('.env.local'), override: true, quiet: true })
  if (process.env.MYSQL_ENABLED !== 'true') throw new Error('请先启用 MySQL 并按实体准备表结构')
  const database = databaseConfig()
  const source = new DataSource({
    type: 'mysql',
    host: database.host,
    port: database.port,
    username: database.username,
    password: database.password,
    database: database.database,
    entities: [AdminUser],
    namingStrategy: new SnakeNamingStrategy(),
    synchronize: false,
    logging: false,
  })
  try {
    await source.initialize()
    const password = await initializeAdmin(source.getRepository(AdminUser), new PasswordService())
    process.stdout.write(password ? `admin 已创建。请立即安全保存密码，此密码只显示一次：\n${password}\n` : 'admin 已存在，未修改密码。\n')
  } finally {
    if (source.isInitialized) await source.destroy()
  }
}

void main().catch(() => {
  // 不输出原始 SQL 错误或连接配置，避免参数与凭证进入终端日志。
  console.error('admin 初始化失败，请检查 MySQL 开关、连接和 admin_user 表结构。')
  process.exitCode = 1
})
