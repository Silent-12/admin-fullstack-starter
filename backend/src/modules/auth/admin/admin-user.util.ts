import type { AdminUser } from './entities/admin-user.entity.js'

/**
 * 判断是否为系统内置管理员
 * @description 内置账号与普通用户结构一致，只以创建人固定为 `system` 作为身份标记，不额外维护保护字段
 * @param user 后台用户实体或最小用户信息
 * @returns 是否为内置管理员
 */
export function isBuiltinAdmin(user: Pick<AdminUser, 'createdBy'>): boolean {
  return user.createdBy === 'system'
}
