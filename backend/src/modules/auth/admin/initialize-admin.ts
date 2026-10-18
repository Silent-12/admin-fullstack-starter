import { randomUUID } from 'node:crypto'
import type { Repository } from 'typeorm'
import type { AdminUser } from './entities/admin-user.entity.js'
import type { PasswordService } from './password.service.js'

/** 内置管理员登录名 */
const BUILTIN_ADMIN_USERNAME = 'admin'

/**
 * 初始化内置账号
 * @description 仅首次成功插入返回明文密码；唯一约束保证重复和并发执行不覆盖已有凭证
 * @param users 用户仓储
 * @param passwords 密码服务
 * @returns 明文密码（账号已存在时为 `null`）与内置账号实体
 */
export async function initializeAdmin(
  users: Repository<AdminUser>,
  passwords: PasswordService,
): Promise<{ password: string | null; user: AdminUser }> {
  const existing = await users.findOneBy({ username: BUILTIN_ADMIN_USERNAME })
  if (existing) return { password: null, user: existing }
  const password = passwords.generate()
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
    return { password, user }
  } catch (error: unknown) {
    // 并发插入失败时只接受“另一实例已完成初始化”，其他数据库错误交由调用方处理。
    if (error && typeof error === 'object' && 'driverError' in error) {
      const driver = error.driverError as { code?: string }
      if (driver.code === 'ER_DUP_ENTRY') {
        const concurrent = await users.findOneBy({ username: BUILTIN_ADMIN_USERNAME })
        if (concurrent) return { password: null, user: concurrent }
      }
    }
    throw error
  }
}
