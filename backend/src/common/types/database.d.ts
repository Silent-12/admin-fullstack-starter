/**
 *  数据库配置接口
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
  // 数据库是否启用 SQL 日志
  logging: boolean
  // 数据库是否同步模式
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
