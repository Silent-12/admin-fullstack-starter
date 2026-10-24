import { randomUUID } from 'node:crypto'
import type { Repository } from 'typeorm'
import { AdminInitError } from '../../../common/errors/admin-init.error.js'
import type { AdminUser } from './entities/admin-user.entity.js'
import type { PasswordService } from './password.service.js'

/** 内置管理员登录名 */
const BUILTIN_ADMIN_USERNAME = 'admin'

/**
 * 初始化内置账号
 * @description 明文密码由调用方传入，不在后端生成；账号已存在时不修改密码，唯一约束保证重复和并发执行不覆盖已有凭证
 * @param users 用户仓储
 * @param passwords 密码服务
 * @param password 内置账号初始明文密码，账号已存在时可省略
 * @returns 是否由本次调用新建账号与内置账号实体
 * @throws AdminInitError 账号不存在且未提供初始密码
 */
export async function initializeAdmin(
  users: Repository<AdminUser>,
  passwords: PasswordService,
  password?: string,
): Promise<{ created: boolean; user: AdminUser }> {
  const existing = await users.findOneBy({ username: BUILTIN_ADMIN_USERNAME })
  if (existing) return { created: false, user: existing }
  if (!password) throw new AdminInitError('首次初始化内置管理员必须通过 ADMIN_INIT_PASSWORD 提供初始密码')
  const now = Math.floor(Date.now() / 1000)
  const user = users.create({
    id: randomUUID(),
    username: BUILTIN_ADMIN_USERNAME,
    passwordHash: await passwords.hash(password),
    name: '管理员',
    createdBy: 'system',
    updatedBy: 'system',
    createTime: now,
    updateTime: now,
  })
  try {
    await users.insert(user)
    return { created: true, user }
  } catch (error: unknown) {
    // 并发插入失败时只接受“另一实例已完成初始化”，其他数据库错误交由调用方处理。
    if (error && typeof error === 'object' && 'driverError' in error) {
      const driver = error.driverError as { code?: string }
      if (driver.code === 'ER_DUP_ENTRY') {
        const concurrent = await users.findOneBy({ username: BUILTIN_ADMIN_USERNAME })
        if (concurrent) return { created: false, user: concurrent }
      }
    }
    throw error
  }
}
