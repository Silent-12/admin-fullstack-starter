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
  private enabled = false
  private available = false

  constructor(private readonly configService: ConfigService) {}

  /**
   * 检查数据库连接
   * @description 如果 MYSQL_ENABLED 为 true，则尝试连接数据库
   * @returns Promise<boolean> 连接是否成功
   * @throws Error 如果连接失败则抛出错误
   */
  async checkConnection(): Promise<boolean> {
    this.enabled = this.configService.get('database.enabled') as boolean

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
   * 获取 MySQL 连通性状态。
   * @description 返回最近一次启动连通性检查结果，禁用数据库时不视为连接失败。
   * @returns MySQL 是否已启用及通过启动检查
   */
  getStatus(): { enabled: boolean; available: boolean } {
    return { enabled: this.enabled, available: this.available }
  }
}
