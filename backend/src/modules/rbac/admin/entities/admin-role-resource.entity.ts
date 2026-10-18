import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm'
import { AuditEntity } from '../../../../common/entities/audit.entity.js'
import { AdminRole } from './admin-role.entity.js'
import { AdminPermissionResource } from './admin-permission-resource.entity.js'

/**
 * 角色资源关联
 * @description 复合主键保证关联唯一，外键约束阻止悬挂授权；撤销授权时置 `is_deleted=1` 保留审计记录，
 * 重新授权时复用原行恢复为未删除状态
 */
@Entity('admin_role_resource', { comment: '后台角色资源关联表' })
export class AdminRoleResource extends AuditEntity {
  /** 关联主体 UUID */
  @PrimaryColumn({ type: 'varchar', length: 36, comment: '角色 UUID' })
  roleId!: string

  /** 授权目标 UUID */
  @PrimaryColumn({ type: 'varchar', length: 36, comment: '权限资源 UUID' })
  resourceId!: string

  /** 主体外键 */
  @ManyToOne(() => AdminRole, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  subject?: AdminRole

  /** 目标外键 */
  @ManyToOne(() => AdminPermissionResource, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resource_id' })
  target?: AdminPermissionResource
}
