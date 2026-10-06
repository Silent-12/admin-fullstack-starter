import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AccessLog } from './entities/access-log.entity.js'
import type { AccessLogSource } from '../../common/types/access-log.js'

/**
 * 访问日志服务
 * @description 提供 HTTP 请求日志的持久化写入能力，异步非阻塞操作
 */
@Injectable()
export class AccessLogService {
  private readonly logger = new Logger(AccessLogService.name)

  constructor(
    @InjectRepository(AccessLog)
    private readonly accessLogRepository: Repository<AccessLog>,
  ) {}

  /**
   * 创建访问日志记录
   * @description 异步写入数据库，失败仅记录错误日志，不抛出异常
   * @param data 访问日志数据（不含 id 和 createdAt）
   */
  async create(data: {
    traceId: string
    method: string
    url: string
    statusCode: number
    duration: number
    ip: string
    source: AccessLogSource
    userAgent?: string
    referer?: string
    requestBody?: string
    responseBody?: string
  }): Promise<void> {
    try {
      const logData: Parameters<typeof this.accessLogRepository.create>[0] = { ...data }
      const userAgent = this.truncateString(data.userAgent, 255)
      const referer = this.truncateString(data.referer, 255)
      if (userAgent !== undefined) logData.userAgent = userAgent
      if (referer !== undefined) logData.referer = referer
      const log = this.accessLogRepository.create(logData)
      await this.accessLogRepository.insert(log)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(`Failed to write access log: ${message}`)
    }
  }

  /**
   * 截断字符串至数据库字段长度。
   * @description 防止客户端请求头或 Referer 超长导致访问日志写入失败。
   * @param value 原始字符串
   * @param maxLength 最大长度
   * @returns 截断后的字符串
   */
  private truncateString(value: string | undefined, maxLength: number): string | undefined {
    if (!value || value.length <= maxLength) return value
    return value.slice(0, maxLength)
  }
}
