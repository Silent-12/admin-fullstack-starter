import { Column, Entity, Index, PrimaryColumn } from 'typeorm'
import { AuditEntity } from '../../../../common/entities/audit.entity.js'
import { TINYINT_BOOLEAN_TRANSFORMER } from '../../../../common/entities/tinyint-boolean.transformer.js'

/**
 * 后台角色
 * @description 角色编码全局唯一且不可修改，内置角色权限固定且不可编辑；软删除时把编码改写为 `deleted_<id>` 释放唯一值，
 * 避免历史记录阻塞同码新建，且业务层不再执行物理删除
 */
@Entity('admin_role', { comment: '后台角色表' })
@Index('uk_admin_role_code', ['code'], { unique: true })
export class AdminRole extends AuditEntity {
  /** 角色 UUID */
  @PrimaryColumn({ type: 'varchar', length: 36, comment: '角色 UUID' })
  id!: string

  /** 不可变角色编码，业务层只在软删除时改写一次以释放唯一值 */
  @Column({ type: 'varchar', length: 64, comment: '全局唯一的角色编码，业务层创建后不允许修改，软删除时释放' })
  code!: string

  /** 角色名称 */
  @Column({ type: 'varchar', length: 64, comment: '角色名称' })
  name!: string

  /** 角色说明 */
  @Column({ type: 'varchar', length: 255, default: '', comment: '角色说明' })
  description!: string

  /** 是否启用 */
  @Column({
    name: 'is_enabled',
    type: 'tinyint',
    unsigned: true,
    default: 1,
    transformer: TINYINT_BOOLEAN_TRANSFORMER,
    comment: '是否启用：0否，1是',
  })
  enabled!: boolean

  /** 是否为内置角色 */
  @Column({
    name: 'is_builtin',
    type: 'tinyint',
    unsigned: true,
    default: 0,
    transformer: TINYINT_BOOLEAN_TRANSFORMER,
    comment: '是否为内置角色：0否，1是',
  })
  isBuiltin!: boolean
}
