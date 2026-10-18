import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm'
import { AuditEntity } from '../../../../common/entities/audit.entity.js'
import { AdminPermissionResource } from './admin-permission-resource.entity.js'

/**
 * 资源接口授权关联
 * @description 接口编码由运行时接口清单验证；资源删除时同步软删除关联。此处只保留 `api_code` 字符串而不声明到
 * `admin_api_resource` 的实体关系，因为初始化种子可能先于接口清单落库，接口存在性由业务层校验
 */
@Entity('admin_resource_api', { comment: '后台资源接口授权关联表' })
export class AdminResourceApi extends AuditEntity {
  /** 资源 UUID */
  @PrimaryColumn({ type: 'varchar', length: 36, comment: '权限资源 UUID' })
  resourceId!: string

  /** 稳定接口编码 */
  @PrimaryColumn({ type: 'varchar', length: 128, comment: '稳定接口编码' })
  apiCode!: string

  /** 资源外键 */
  @ManyToOne(() => AdminPermissionResource, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resource_id' })
  resource?: AdminPermissionResource
}
