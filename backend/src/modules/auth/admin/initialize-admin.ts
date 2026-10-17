import { randomUUID } from 'node:crypto'
import type { Repository } from 'typeorm'
import type { AdminUser } from './entities/admin-user.entity.js'
import type { PasswordService } from './password.service.js'

/**
 * 初始化内置账号
 * @description 仅首次成功插入返回明文密码；唯一约束保证重复和并发执行不覆盖已有凭证
 * @param users 用户仓储
 * @param passwords 密码服务
 * @returns 新密码；账号已存在时返回 null
 */
export async function initializeAdmin(users: Repository<AdminUser>, passwords: PasswordService): Promise<string | null> {
  if (await users.existsBy({ username: 'admin' })) return null
  const password = passwords.generate()
  const now = Math.floor(Date.now() / 1000)
  const user = users.create({
    id: randomUUID(),
    username: 'admin',
    passwordHash: await passwords.hash(password),
    name: '管理员',
    isDeletable: 0,
    createdBy: 'system',
    createTime: now,
    updateTime: now,
  })
  try {
    await users.insert(user)
    return password
  } catch (error: unknown) {
    // 并发插入失败时只接受“另一实例已完成初始化”，其他数据库错误交由调用方处理。
    if (error && typeof error === 'object' && 'driverError' in error) {
      const driver = error.driverError as { code?: string }
      if (driver.code === 'ER_DUP_ENTRY' && (await users.existsBy({ username: 'admin' }))) return null
    }
    throw error
  }
}
