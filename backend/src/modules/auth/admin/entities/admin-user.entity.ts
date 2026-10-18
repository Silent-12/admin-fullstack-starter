import { Column, Entity, Index, PrimaryColumn } from 'typeorm'
import { TINYINT_BOOLEAN_TRANSFORMER } from '../../../../common/entities/tinyint-boolean.transformer.js'

/**
 * 后台用户实体
 * @description 用户名创建后不可变；密码与最近登录令牌默认不参与查询
 */
@Entity('admin_user', { comment: '后台用户表' })
@Index('uk_admin_user_username', ['username'], { unique: true })
export class AdminUser {
  /** 用户 UUID 主键 */
  @PrimaryColumn({ type: 'varchar', length: 36, comment: '用户 UUID' })
  id!: string

  /** 唯一登录名，小写字母开头并可带数字后缀，创建后不可修改 */
  @Column({ type: 'varchar', length: 64, update: false, comment: '唯一登录名，小写字母开头并可带数字后缀，创建后不可修改' })
  username!: string

  /** 带参数和随机盐的密码哈希，默认不参与查询 */
  @Column({ type: 'varchar', length: 255, select: false, comment: '带参数和随机盐的密码哈希' })
  passwordHash!: string

  /** 手机号 */
  @Column({ type: 'varchar', length: 32, nullable: true, comment: '手机号' })
  phone!: string | null

  /** 姓名 */
  @Column({ type: 'varchar', length: 64, comment: '姓名' })
  name!: string

  /** 邮箱 */
  @Column({ type: 'varchar', length: 254, nullable: true, comment: '邮箱' })
  email!: string | null

  /** 头像地址 */
  @Column({ type: 'varchar', length: 2048, nullable: true, comment: '头像地址' })
  avatar!: string | null

  /** 是否启用，停用后所有请求立即失效 */
  @Column({
    name: 'is_enabled',
    type: 'tinyint',
    unsigned: true,
    default: 1,
    transformer: TINYINT_BOOLEAN_TRANSFORMER,
    comment: '是否启用：0否，1是',
  })
  enabled!: boolean

  /** 软删除标记：0 未删除，1 已删除 */
  @Column({ type: 'tinyint', unsigned: true, default: 0, comment: '是否删除：0否，1是' })
  isDeleted!: number

  /** 创建人 UUID，系统初始化为 `system`；固定为 system 的记录即内置管理员 */
  @Column({ type: 'varchar', length: 36, default: 'system', update: false, comment: '创建人 UUID，系统初始化为 system' })
  createdBy!: string

  /** 最后操作人 UUID，系统初始化为 `system` */
  @Column({ name: 'updated_by', type: 'varchar', length: 36, default: 'system', comment: '最后操作人 UUID，系统初始化为 system' })
  updatedBy!: string

  /** 创建时间，Unix 秒 */
  @Column({ type: 'int', comment: '创建时间，Unix 秒' })
  createTime!: number

  /** 记录更新时间，Unix 秒 */
  @Column({ type: 'int', comment: '记录更新时间，Unix 秒' })
  updateTime!: number

  /** 最近一次成功登录时间，Unix 秒 */
  @Column({ type: 'int', nullable: true, comment: '最近一次成功登录时间，Unix 秒' })
  lastLoginTime!: number | null

  /** 最近一次成功登录 IP */
  @Column({ type: 'varchar', length: 45, nullable: true, comment: '最近一次成功登录 IP' })
  lastLoginIp!: string | null

  /** 最近一次成功登录的原始 JWT，仅记录，不参与令牌比对，默认不参与查询 */
  @Column({ type: 'varchar', length: 2048, nullable: true, select: false, comment: '最近一次成功登录的原始 JWT，仅记录，不参与令牌比对' })
  token!: string | null

  /** 令牌版本号，登出或重置密码时递增 */
  @Column({ type: 'int', unsigned: true, default: 1, comment: '令牌版本号，登出或重置密码时递增' })
  tokenVersion!: number
}
