import 'reflect-metadata'
import { config } from 'dotenv'
import { resolve } from 'node:path'
import { DataSource } from 'typeorm'
import databaseConfig from './config/database.config.js'
import { SnakeNamingStrategy } from './config/database-naming-strategy.js'
import { AdminInitError } from './common/errors/admin-init.error.js'
import { AdminUser } from './modules/auth/admin/entities/admin-user.entity.js'
import { PasswordService } from './modules/auth/admin/password.service.js'
import { initializeAdmin } from './modules/auth/admin/initialize-admin.js'
import { bindBuiltinAdmin, ensureRbacSeed } from './modules/rbac/admin/initialize-rbac.js'
import { RBAC_ENTITIES } from './modules/rbac/admin/rbac.entities.js'

/**
 * 内置账号初始化入口
 * @description 在同一事务内初始化权限种子、创建账号并绑定内置管理员角色，不启动 HTTP 服务、不自动改表、不将密码写入日志
 */
async function main(): Promise<void> {
  config({ path: resolve('.env'), quiet: true })
  config({ path: resolve('.env.local'), override: true, quiet: true })
  if (process.env.MYSQL_ENABLED !== 'true') throw new AdminInitError('请先启用 MySQL 并按实体准备表结构')
  const database = databaseConfig()
  const source = new DataSource({
    type: 'mysql',
    host: database.host,
    port: database.port,
    username: database.username,
    password: database.password,
    database: database.database,
    entities: [AdminUser, ...RBAC_ENTITIES],
    namingStrategy: new SnakeNamingStrategy(),
    synchronize: false,
    logging: false,
  })
  try {
    await source.initialize()
    const password = await source.transaction(async (manager) => {
      // 事务内先初始化权限种子并取得内置角色行锁，保持与 RBAC 写接口一致的“角色 → 用户”锁序。
      await ensureRbacSeed(manager)
      const { password, user } = await initializeAdmin(manager.getRepository(AdminUser), new PasswordService())
      await bindBuiltinAdmin(manager, user.id)
      return password
    })
    process.stdout.write(
      password
        ? `admin 已创建并绑定内置管理员角色。请立即安全保存密码，此密码只显示一次：\n${password}\n`
        : 'admin 已存在，未修改密码，已核验内置管理员角色绑定与资源授权。\n',
    )
  } finally {
    if (source.isInitialized) await source.destroy()
  }
}

void main().catch((error: unknown) => {
  // 仅输出可安全展示的初始化原因；数据库原始异常可能包含 SQL、连接地址与凭证。
  if (error instanceof AdminInitError) console.error(`admin 初始化失败：${error.message}`)
  else console.error('admin 初始化失败，请检查数据库开关、连接和后台权限表结构。')
  process.exitCode = 1
})
