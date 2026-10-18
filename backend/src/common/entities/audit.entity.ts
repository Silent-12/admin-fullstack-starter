import { Column } from 'typeorm'

/**
 * 审计字段基类
 * @description 统一维护业务表的创建、更新、最后操作人与软删除字段，避免各实体重复声明
 */
export abstract class AuditEntity {
  /** 创建时间，Unix 秒 */
  @Column({ name: 'create_time', type: 'int', comment: '创建时间，Unix 秒' })
  createTime!: number

  /** 更新时间，Unix 秒 */
  @Column({ name: 'update_time', type: 'int', comment: '更新时间，Unix 秒' })
  updateTime!: number

  /** 创建人 UUID，系统初始化为 `system` */
  @Column({ name: 'created_by', type: 'varchar', length: 36, default: 'system', comment: '创建人 UUID，系统初始化为 system' })
  createdBy!: string

  /** 最后操作人 UUID，系统初始化为 `system` */
  @Column({ name: 'updated_by', type: 'varchar', length: 36, default: 'system', comment: '最后操作人 UUID，系统初始化为 system' })
  updatedBy!: string

  /** 软删除标记：0 未删除，1 已删除 */
  @Column({ name: 'is_deleted', type: 'tinyint', unsigned: true, default: 0, comment: '是否删除：0否，1是' })
  isDeleted!: number
}
