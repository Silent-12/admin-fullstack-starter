import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm'
import { AuditEntity } from '../../../../common/entities/audit.entity.js'
import { TINYINT_BOOLEAN_TRANSFORMER } from '../../../../common/entities/tinyint-boolean.transformer.js'

/**
 * 后台权限资源
 * @description directory 为目录，menu 为页面，button 为操作权限；父节点删除必须先处理子节点。软删除时释放全局唯一的
 * `name`、`path` 与 `permission` 并保留记录用于审计，关联授权同步软删除
 */
@Entity('admin_permission_resource', { comment: '后台权限资源表' })
@Index('uk_admin_resource_name', ['name'], { unique: true })
@Index('uk_admin_resource_permission', ['permission'], { unique: true })
@Index('uk_admin_resource_path', ['path'], { unique: true })
export class AdminPermissionResource extends AuditEntity {
  /** 资源 UUID */
  @PrimaryColumn({ type: 'varchar', length: 36, comment: '资源 UUID' })
  id!: string

  /** 父资源 UUID，根节点为空 */
  @Column({ type: 'varchar', length: 36, nullable: true, comment: '父资源 UUID，根节点为空' })
  parentId!: string | null

  /** 父资源外键 */
  @ManyToOne(() => AdminPermissionResource, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent?: AdminPermissionResource | null

  /** directory 目录、menu 页面、button 按钮 */
  @Column({ type: 'varchar', length: 16, comment: '资源类型：directory目录，menu页面，button按钮' })
  type!: 'directory' | 'menu' | 'button'

  /** 展示标题 */
  @Column({ type: 'varchar', length: 64, comment: '展示标题' })
  title!: string

  /** 全局唯一的前端路由名称 */
  @Column({ type: 'varchar', length: 64, nullable: true, comment: '全局唯一的前端路由名称，按钮为空' })
  name!: string | null

  /** 全局唯一的前端路由路径，按钮为空 */
  @Column({ type: 'varchar', length: 255, nullable: true, comment: '全局唯一的前端路由路径，按钮为空' })
  path!: string | null

  /** 前端组件标识 */
  @Column({ type: 'varchar', length: 255, nullable: true, comment: '前端组件标识，按钮与嵌套目录为空' })
  component!: string | null

  /** 菜单图标 */
  @Column({ type: 'varchar', length: 128, nullable: true, comment: '菜单图标' })
  icon!: string | null

  /** 全局唯一的界面权限标识 */
  @Column({ type: 'varchar', length: 128, nullable: true, comment: '全局唯一的界面权限标识，未配置时为空' })
  permission!: string | null

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

  /** 同级排序值 */
  @Column({ type: 'int', default: 0, comment: '同级排序值，数值越小越靠前' })
  sort!: number

  /** 是否隐藏导航 */
  @Column({
    name: 'is_hidden',
    type: 'tinyint',
    unsigned: true,
    default: 0,
    transformer: TINYINT_BOOLEAN_TRANSFORMER,
    comment: '是否隐藏导航：0否，1是',
  })
  hidden!: boolean

  /** 是否缓存页面 */
  @Column({
    name: 'is_keep_alive',
    type: 'tinyint',
    unsigned: true,
    default: 0,
    transformer: TINYINT_BOOLEAN_TRANSFORMER,
    comment: '是否缓存页面：0否，1是',
  })
  keepAlive!: boolean
}
