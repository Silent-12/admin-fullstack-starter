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
 * @description 在同一事务内初始化权限种子、创建账号并绑定内置管理员角色；初始密码取自 `ADMIN_INIT_PASSWORD`，不生成、不打印明文，不启动 HTTP 服务、不自动改表
 */
async function main(): Promise<void> {
  config({ path: resolve('.env'), quiet: true })
  config({ path: resolve('.env.local'), override: true, quiet: true })
  if (process.env.MYSQL_ENABLED !== 'true') throw new AdminInitError('请先启用 MySQL 并按实体准备表结构')
  const password = process.env.ADMIN_INIT_PASSWORD || undefined
  if (password !== undefined && (password.length < 12 || password.length > 128)) {
    throw new AdminInitError('ADMIN_INIT_PASSWORD 长度必须为 12 至 128 个字符')
  }
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
    const created = await source.transaction(async (manager) => {
      // 事务内先初始化权限种子并取得内置角色行锁，保持与 RBAC 写接口一致的“角色 → 用户”锁序。
      await ensureRbacSeed(manager)
      const { created, user } = await initializeAdmin(manager.getRepository(AdminUser), new PasswordService(), password)
      await bindBuiltinAdmin(manager, user.id)
      return created
    })
    process.stdout.write(
      created
        ? 'admin 已创建并绑定内置管理员角色，请使用 ADMIN_INIT_PASSWORD 配置的密码登录；密码不会输出到终端。\n'
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
