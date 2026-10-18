/**
 * 认证接口类型
 * @description 定义登录、当前用户资料与授权接口使用的请求、响应数据结构
 */
import type { AppRouteRecord } from '@/types/router'

/**
 * 登录参数
 * @description 定义用户登录接口所需的账号和密码
 */
export interface LoginParams {
  // 用户名
  userName: string
  // 用户密码
  password: string
}

/**
 * 登录响应
 * @description 定义登录接口返回的访问令牌和绝对到期时间
 */
export interface LoginResponse {
  // 访问令牌
  accessToken: string
  // 到期时间，Unix 秒
  expiresAt: number
}

/**
 * 用户信息
 * @description 定义当前登录用户的基础展示资料
 */
export interface UserInfo {
  // 用户唯一标识
  userId: string
  // 用户登录名
  userName: string
  // 用户姓名
  name: string
  // 用户邮箱地址
  email: string | null
  // 可选的用户头像地址
  avatar: string | null
}

/**
 * 当前用户授权
 * @description 定义独立授权接口返回的按钮权限和可访问菜单
 */
export interface UserAuthorization {
  // 后端返回的有效按钮权限标识列表
  auth: string[]
  // 当前可访问路由树
  menu: AppRouteRecord[]
}
