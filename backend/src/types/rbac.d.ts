/**
 * 当前用户有效授权
 * @description 由启用且未删除角色显式绑定的有效资源实时合并，导航祖先不会扩大接口或按钮权限，也不存在超级管理员旁路
 */
export interface AdminAuthorization {
  // 显式授权且祖先有效的资源 ID
  resourceIds: string[]
  // 有效接口权限编码
  apiCodes: string[]
  // 界面按钮权限编码
  permissions: string[]
  // 是否为系统内置管理员；仅用于服务端跳过委派范围限制，不返回给前端
  isBuiltin: boolean
}

/**
 * 后台动态路由
 * @description 仅包含前端路由转换器所需的导航字段，按钮权限由 `auth/profile` 单独下发
 */
export interface AdminMenuRoute {
  // 资源 UUID
  id: string
  // 路由名称
  name: string
  // 路由路径
  path: string
  // 可选组件标识，嵌套目录无需组件
  component?: string
  // 页面展示与缓存元信息
  meta: { title: string; icon?: string; isHide: boolean; keepAlive: boolean }
  // 子级导航
  children: AdminMenuRoute[]
}

/**
 * 后台用户公开资料
 * @description 用户列表和详情共用最小展示字段，内置身份由创建人标记推导，不暴露审计字段
 */
export interface AdminUserView {
  // 用户 UUID
  id: string
  // 不可变登录名
  username: string
  // 展示姓名
  name: string
  // 手机号
  phone: string | null
  // 邮箱
  email: string | null
  // 头像地址
  avatar: string | null
  // 是否启用
  enabled: boolean
  // 当前绑定角色 UUID
  roleIds: string[]
  // 当前绑定角色名称
  roleNames: string[]
  // 是否为系统内置管理员
  isBuiltin: boolean
  // 创建时间，Unix 秒
  createTime: number
  // 最近登录时间，Unix 秒
  lastLoginTime: number | null
}

/**
 * 后台角色公开资料
 * @description 角色展示和编辑流程所需字段，内置标记只读
 */
export interface AdminRoleView {
  // 角色 UUID
  id: string
  // 不可变角色编码
  code: string
  // 角色名称
  name: string
  // 角色说明
  description: string
  // 是否启用
  enabled: boolean
  // 是否内置角色
  isBuiltin: boolean
}

/**
 * 后台角色选项
 * @description 仅返回启用、非内置且资源范围不超出操作者授权的角色最小字段，供用户角色绑定选择使用
 */
export interface AdminRoleOption {
  // 角色 UUID
  id: string
  // 角色编码
  code: string
  // 角色名称
  name: string
}

/**
 * 资源管理响应
 * @description 显式列举可对外返回的字段，子节点使用同一结构
 */
export interface AdminResourceView {
  // 资源 UUID
  id: string
  // 父资源 UUID
  parentId: string | null
  // directory 目录、menu 页面、button 按钮
  type: 'directory' | 'menu' | 'button'
  // 资源标题
  title: string
  // 路由名称
  name: string | null
  // 路由路径
  path: string | null
  // 组件标识
  component: string | null
  // 菜单图标
  icon: string | null
  // 界面权限标识
  permission: string | null
  // 是否启用
  enabled: boolean
  // 同级排序
  sort: number
  // 是否隐藏导航
  hidden: boolean
  // 是否缓存页面
  keepAlive: boolean
  // 是否受保护的内置资源
  isBuiltin: boolean
  // 绑定的接口编码
  apiCodes: string[]
  // 子资源
  children: AdminResourceView[]
}
