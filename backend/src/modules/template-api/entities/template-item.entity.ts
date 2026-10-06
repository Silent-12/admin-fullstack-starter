import { Entity, Column, PrimaryGeneratedColumn, BeforeInsert, BeforeUpdate } from 'typeorm'
import dayjs from 'dayjs'

/**
 * 模板条目实体
 * @description 模板数据实体，用于演示 CRUD 操作，支持后续复制改名为新业务模块使用
 */
@Entity('template_items', { comment: '模板条目表' })
export class TemplateItem {
  /**
   * 主键 ID
   */
  @PrimaryGeneratedColumn({ type: 'bigint', comment: '主键 ID' })
  id!: number

  /**
   * 名称
   */
  @Column({ length: 255, comment: '名称' })
  name!: string

  /**
   * 描述
   */
  @Column({ length: 500, nullable: true, comment: '描述' })
  description!: string

  /**
   * 状态（active | inactive | archived）
   */
  @Column({ length: 50, default: 'active', comment: '状态（active | inactive | archived）' })
  status!: string

  /**
   * 优先级（数值越大优先级越高）
   */
  @Column({ type: 'int', default: 0, comment: '优先级（数值越大优先级越高）' })
  priority!: number

  /**
   * 是否启用
   */
  @Column({ type: 'boolean', default: true, comment: '是否启用' })
  isEnabled!: boolean

  /**
   * 创建时间（Unix 时间戳）
   */
  @Column({ type: 'int', comment: '创建时间（Unix 时间戳）' })
  createdAt!: number

  /**
   * 更新时间（Unix 时间戳）
   */
  @Column({ type: 'int', comment: '更新时间（Unix 时间戳）' })
  updatedAt!: number

  @BeforeInsert()
  setCreatedAt(): void {
    const now = dayjs().unix()
    this.createdAt = now
    this.updatedAt = now
  }

  @BeforeUpdate()
  setUpdatedAt(): void {
    this.updatedAt = dayjs().unix()
  }
}
