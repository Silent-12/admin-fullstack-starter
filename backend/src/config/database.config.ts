import { registerAs } from '@nestjs/config'

/**
 * 校验自动同步开关的使用环境。
 * @description `synchronize` 会按实体与库表的差异直接执行 DROP / ALTER：删除实体字段即删除对应列且数据
 * 不可恢复，MySQL 的 DDL 隐式提交也无法回滚。因此只允许在 development / test 环境开启，其余环境在启动
 * 阶段直接失败，避免带着自动改表的开关部署。
 * @param synchronize 是否开启自动同步
 * @param nodeEnv 当前运行环境
 * @returns 无返回值
 */
function assertSynchronizeAllowed(synchronize: boolean, nodeEnv: string): void {
  if (!synchronize) return
  if (nodeEnv === 'development' || nodeEnv === 'test') return
  throw new Error(
    `DB_SYNCHRONIZE 不允许在 ${nodeEnv} 环境开启：synchronize 会按实体差异直接执行 DROP / ALTER，` +
      '删除实体字段将删除对应列且数据不可恢复。请关闭该开关，并按 README 的「数据库结构策略」以人工 SQL 变更表结构。',
  )
}

/**
 * 数据库配置
 * @description 从环境变量加载数据库配置，支持 MySQL 开关控制
 */
export default registerAs('database', () => {
  const nodeEnv = process.env.NODE_ENV?.trim() || 'development'
  const mysqlEnabled = process.env.MYSQL_ENABLED === 'true'
  const synchronize = process.env.DB_SYNCHRONIZE === 'true'
  // 仅在 MySQL 实际启用时校验：未启用时 synchronize 不生效，不必因误配阻断启动。
  if (mysqlEnabled) assertSynchronizeAllowed(synchronize, nodeEnv)

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_DATABASE || 'demo',
    synchronize,
    logging: process.env.DB_LOGGING === 'true',
    enabled: mysqlEnabled,
    extra: {
      connectionLimit: 10,
      maxIdle: 10,
      idleTimeout: 60000,
    },
  }
})
