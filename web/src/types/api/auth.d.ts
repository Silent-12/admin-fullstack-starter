/**
 * 认证接口类型
 * @description 定义登录和当前用户信息接口使用的请求、响应数据结构
 */

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
 * @description 定义当前登录用户的基础资料和后端授权标识
 */
export interface UserInfo {
  // 后端返回的操作权限标识列表
  auth: string[]
  // 用户所属角色标识列表
  roles: string[]
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
