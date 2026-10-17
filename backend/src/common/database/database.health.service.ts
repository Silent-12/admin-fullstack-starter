import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createPool } from 'mysql2/promise'

/**
 * 数据库健康检查服务
 * @description 用于在应用启动时验证 MySQL 连接是否可用
 */
@Injectable()
export class DatabaseHealthService {
  private readonly logger = new Logger(DatabaseHealthService.name)
  // 是否启用 MySQL 数据库
  private enabled = false
  // 最近一次启动连通性检查是否通过
  private available = false

  constructor(private readonly configService: ConfigService) {}

  /**
   * 检查数据库连接
   * @description MySQL 未启用时直接视为通过；启用时使用单连接池执行一次 ping，失败则抛出错误终止启动
   * @returns 连接是否成功
   * @throws Error 连接失败时抛出包含失败原因的异常
   */
  async checkConnection(): Promise<boolean> {
    this.enabled = this.configService.get('database.enabled') as boolean

    // 未启用 MySQL 时不建立连接，直接视为启动检查通过。
    if (!this.enabled) {
      this.available = false
      this.logger.log('MySQL is disabled, skipping connection check')
      return true
    }

    try {
      const dbConfig = this.configService.get('database') as {
        host: string
        port: number
        username: string
        password: string
        database: string
      }

      this.logger.log(`Attempting to connect to MySQL at ${dbConfig.host}:${dbConfig.port}`)

      // 使用单连接池做一次连通性检查，检查完成后立即释放。
      const pool = createPool({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.username,
        password: dbConfig.password,
        database: dbConfig.database,
        connectionLimit: 1,
      })

      const connection = await pool.getConnection()
      await connection.ping()
      connection.release()
      await pool.end()

      this.available = true
      this.logger.log('MySQL connection successful')
      return true
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.available = false
      this.logger.error(`MySQL connection failed: ${errorMessage}`)
      throw new Error(`Failed to connect to MySQL: ${errorMessage}`)
    }
  }

  /**
   * 获取 MySQL 连通性状态
   * @description 返回最近一次启动连通性检查结果，禁用数据库时不视为连接失败
   * @returns MySQL 是否已启用及通过启动检查
   */
  getStatus(): { enabled: boolean; available: boolean } {
    return { enabled: this.enabled, available: this.available }
  }
}
