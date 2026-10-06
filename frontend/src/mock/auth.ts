import type { LoginParams, LoginResponse, UserInfo } from '@/types/api/auth'

/**
 * 模拟登录接口
 * @description 返回本地开发使用的登录令牌
 * @param params 登录参数
 * @return 登录响应
 */
export function fetchLogin(params: LoginParams): Promise<LoginResponse> {
  if (!params.userName || !params.password) {
    return Promise.reject(new Error('登录参数不能为空'))
  }

  return Promise.resolve({
    token: 'mock-access-token',
    refreshToken: 'mock-refresh-token'
  })
}

/**
 * 模拟获取用户信息接口
 * @description 返回本地开发使用的当前用户信息
 * @return 用户信息
 */
export function fetchGetUserInfo(): Promise<UserInfo> {
  return Promise.resolve({
    auth: ['equipment:info', 'baseStationDetail:delete'],
    roles: ['R_SUPER'],
    userId: 1,
    userName: 'admin',
    email: 'admin@company.com',
    avatar: 'https://dummyimage.com/80x80.png'
  })
}
