import request from '@/utils/http'
import type { LoginParams, LoginResponse, UserAuthorization, UserInfo } from '@/types/api/auth'

/**
 * 登录
 * @description 后台认证端点统一使用 `/v1/admin/auth/*`；全局前缀由请求实例提供，请求头使用 `Authorization: Bearer <token>`
 * @param params 登录参数
 * @returns 登录响应
 */
export function fetchLogin(params: LoginParams) {
  return request.post<LoginResponse>({
    url: '/v1/admin/auth/login',
    data: params,
    anonymous: true
    // showSuccessMessage: true // 显示成功消息
    // showErrorMessage: false // 不显示错误消息
  })
}

/**
 * @description 撤销当前账号所有设备的旧令牌
 */
export function fetchLogout() {
  return request.post<null>({ url: '/v1/admin/auth/logout' })
}

/**
 * 获取当前登录用户信息
 * @description 只返回当前会话的基础展示资料
 * @returns 用户信息
 */
export function fetchGetUserInfo() {
  return request.get<UserInfo>({
    url: '/v1/admin/auth/profile'
  })
}

/**
 * 获取当前用户授权
 * @description 为动态路由模式独立获取按钮权限与可访问菜单
 * @returns 当前用户按钮权限和可访问菜单
 */
export function fetchGetUserAuthorization() {
  return request.get<UserAuthorization>({
    url: '/v1/admin/auth/authorization'
  })
}
