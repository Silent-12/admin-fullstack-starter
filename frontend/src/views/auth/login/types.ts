/** 登录页私有类型定义 */

/** 账号标识类型 */
export type AccountKey = 'super' | 'admin' | 'user'

/** 账号信息接口 */
export interface Account {
  /** 账号标识 */
  key: AccountKey
  /** 显示标签 */
  label: string
  /** 用户名 */
  userName: string
  /** 密码 */
  password: string
  /** 角色列表 */
  roles: string[]
}
