import { Entity, Column, Index, PrimaryGeneratedColumn, BeforeInsert } from 'typeorm'
import dayjs from 'dayjs'

/**
 * 访问日志实体
 * @description 记录所有 HTTP 请求的访问信息，用于生产环境请求审计与性能分析
 */
@Entity('access_logs', { comment: '访问日志表' })
@Index('idx_created_at', ['createdAt'])
@Index('idx_status_code', ['statusCode'])
@Index('idx_trace_id', ['traceId'])
@Index('idx_source_created_at', ['source', 'createdAt'])
export class AccessLog {
  /**
   * 主键 ID
   */
  @PrimaryGeneratedColumn({ type: 'bigint', comment: '主键 ID' })
  id!: number

  /**
   * 请求追踪 ID
   */
  @Column({ length: 255, comment: '请求追踪 ID' })
  traceId!: string

  /**
   * HTTP 请求方法
   */
  @Column({ length: 255, comment: 'HTTP 请求方法' })
  method!: string

  /**
   * 请求 URL
   */
  @Column({ length: 255, comment: '请求 URL' })
  url!: string

  /**
   * HTTP 状态码
   */
  @Column({ type: 'int', comment: 'HTTP 状态码' })
  statusCode!: number

  /**
   * 请求处理耗时（毫秒）
   */
  @Column({ type: 'int', comment: '请求处理耗时（毫秒）' })
  duration!: number

  /**
   * 客户端 IP 地址
   */
  @Column({ length: 255, comment: '客户端 IP 地址' })
  ip!: string

  /**
   * 请求来源。
   * @description 1=用户端，2=后台管理，3=外部回调或系统接口。
   */
  @Column({ type: 'tinyint', default: 1, comment: '请求来源：1=用户端 2=后台管理 3=外部回调/系统接口' })
  source!: number

  /**
   * 用户代理字符串
   */
  @Column({ length: 255, nullable: true, comment: '用户代理字符串' })
  userAgent!: string

  /**
   * 请求来源 URL
   */
  @Column({ length: 255, nullable: true, comment: '请求来源 URL' })
  referer!: string

  /**
   * 请求体内容（JSON 格式）
   */
  @Column({ type: 'longtext', nullable: true, comment: '请求体内容（JSON 格式）' })
  requestBody!: string

  /**
   * 响应体内容（JSON 格式）
   */
  @Column({ type: 'longtext', nullable: true, comment: '响应体内容（JSON 格式）' })
  responseBody!: string

  /**
   * 创建时间（Unix 时间戳）
   */
  @Column({ type: 'int', comment: '创建时间（Unix 时间戳）' })
  createdAt!: number

  @BeforeInsert()
  setCreatedAt(): void {
    this.createdAt = dayjs().unix()
  }
}
