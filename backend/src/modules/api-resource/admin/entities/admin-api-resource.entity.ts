import { Column, Entity, PrimaryColumn } from 'typeorm'
import { AuditEntity } from '../../../../common/entities/audit.entity.js'

/**
 * 接口清单展示配置
 * @description 持久化展示信息并复用审计字段；实际路径、方法和访问策略始终以当前路由元数据为准
 */
@Entity('admin_api_resource', { comment: '接口清单展示配置' })
export class AdminApiResource extends AuditEntity {
  /** 稳定接口编码 */
  @PrimaryColumn({ type: 'varchar', length: 128, comment: '稳定接口编码' })
  code!: string

  /** 模块名称 */
  @Column({ type: 'varchar', length: 64, comment: '模块名称' })
  module!: string

  /** 功能名称 */
  @Column({ type: 'varchar', length: 64, comment: '功能名称' })
  feature!: string

  /** 操作名称 */
  @Column({ type: 'varchar', length: 64, comment: '操作名称' })
  action!: string

  /** 展示顺序 */
  @Column({ type: 'int', default: 0, comment: '展示顺序' })
  sort!: number
}
