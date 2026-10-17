import request from '@/utils/http'
import type { LoginParams, LoginResponse, UserInfo } from '@/types/api/auth'

/**
 * 登录
 * @description 后台认证端点统一使用 `/v1/admin/auth/*`；全局前缀由请求实例提供，请求头使用 `Authorization: Bearer <token>`。
 * @param params 登录参数
 * @returns 登录响应
 */
export function fetchLogin(params: LoginParams) {
  return request.post<LoginResponse>({
    url: '/v1/admin/auth/login',
    params
    // showSuccessMessage: true // 显示成功消息
    // showErrorMessage: false // 不显示错误消息
  })
}

/**
 * 获取当前登录用户信息
 * @description 返回当前会话的身份与授权标识，是后端 `v-auth` 按钮级权限的数据来源。
 * @returns 用户信息
 */
export function fetchGetUserInfo() {
  return request.get<UserInfo>({
    url: '/v1/admin/auth/profile'
    // 自定义请求头
    // headers: {
    //   'X-Custom-Header': 'your-custom-value'
    // }
  })
}
