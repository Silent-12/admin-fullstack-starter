import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm'
import { AuditEntity } from '../../../../common/entities/audit.entity.js'
import { AdminUser } from '../../../auth/admin/entities/admin-user.entity.js'
import { AdminRole } from './admin-role.entity.js'

/**
 * 用户角色关联
 * @description 复合主键保证关联唯一，外键约束阻止悬挂授权；解除关联时置 `is_deleted=1` 保留审计记录，
 * 重新分配时复用原行恢复为未删除状态
 */
@Entity('admin_user_role', { comment: '后台用户角色关联表' })
export class AdminUserRole extends AuditEntity {
  /** 关联主体 UUID */
  @PrimaryColumn({ type: 'varchar', length: 36, comment: '用户 UUID' })
  userId!: string

  /** 授权目标 UUID */
  @PrimaryColumn({ type: 'varchar', length: 36, comment: '角色 UUID' })
  roleId!: string

  /** 主体外键 */
  @ManyToOne(() => AdminUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  subject?: AdminUser

  /** 目标外键 */
  @ManyToOne(() => AdminRole, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  target?: AdminRole
}
