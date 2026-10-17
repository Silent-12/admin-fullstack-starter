/**
 * 数据库配置接口
 * @description 描述 MySQL 连接、SQL 日志、自动同步与连接池的数据结构
 */
export interface DatabaseConfig {
  // 数据库主机地址
  host: string
  // 数据库端口号
  port: number
  // 数据库用户名
  username: string
  // 数据库密码
  password: string
  // 数据库名称
  database: string
  // 是否输出 SQL 查询日志
  logging: boolean
  // 是否按实体自动同步表结构
  synchronize: boolean
  // 数据库连接池额外配置
  extra: {
    // 连接池最大连接数
    connectionLimit: number
    // 连接池最大空闲连接数
    maxIdle: number
    // 连接池空闲连接超时时间（毫秒）
    idleTimeout: number
  }
}
