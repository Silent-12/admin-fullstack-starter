import type { Request } from 'express'
import type { AdminUser } from '../modules/auth/admin/entities/admin-user.entity.js'

/**
 * 后台 JWT 声明
 * @description 仅包含身份与撤销所需字段，用户状态由数据库验证
 */
export interface AdminTokenClaims {
  // 用户 UUID
  sub: string
  // 令牌版本
  ver: number
  // 单次签发标识
  jti: string
  // 签发时间，Unix 秒
  iat: number
  // 到期时间，Unix 秒
  exp: number
}

/**
 * 后台认证请求
 * @description `AdminAuthGuard` 写入经过完整验证的当前用户与令牌声明
 */
export interface AdminAuthRequest extends Request {
  // 已验证的用户
  adminUser: AdminUser
  // 已验证的声明
  adminClaims: AdminTokenClaims
}
