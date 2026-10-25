import type { PaginatedResponse } from './common'

/**
 * 后台分页筛选
 * @description 后台权限管理使用的后台分页筛选
 */
export interface ManagementQuery {
  // 可选页码
  page?: number
  // 可选每页条数
  pageSize?: number
  // 可选检索关键字
  keyword?: string
  // 可选启用状态
  enabled?: boolean
}

/**
 * 角色资料
 * @description 后台权限管理使用的角色资料，包含列表展示所需的更新时间与更新人
 */
export interface Role {
  // 角色 UUID
  id: string
  // 角色编码
  code: string
  // 角色名称
  name: string
  // 描述
  description: string
  // 是否启用
  enabled: boolean
  // 内置角色禁止修改或删除
  isBuiltin: boolean
  // 更新时间 Unix 秒
  updateTime: number
  // 最后操作人显示名，系统初始化写入的角色为「系统」
  updatedByName: string | null
}

/**
 * 角色写入
 * @description 后台权限管理使用的角色写入
 */
export interface RoleInput {
  // 角色编码
  code: string
  // 角色名称
  name: string
  // 描述
  description: string
  // 是否启用
  enabled: boolean
}

/**
 * 角色选项
 * @description 后端仅返回启用、非内置且不超出当前操作者授权范围的角色选项
 */
export interface RoleOption {
  // 角色 UUID
  id: string
  // 角色编码
  code: string
  // 角色名称
  name: string
}

/**
 * 用户资料
 * @description 后台权限管理使用的用户资料
 */
export interface ManagedUser {
  // 用户 UUID
  id: string
  // 登录名
  username: string
  // 姓名
  name: string
  // 手机号
  phone: string | null
  // 邮箱
  email: string | null
  // 头像地址
  avatar: string | null
  // 是否启用
  enabled: boolean
  // 角色主键
  roleIds: string[]
  // 角色名称
  roleNames: string[]
  // 是否内置账号，内置账号由系统创建且禁止删除
  isBuiltin: boolean
  // 创建时间 Unix 秒
  createTime: number
  // 最近登录时间 Unix 秒
  lastLoginTime: number | null
}

/**
 * 用户写入
 * @description 后台权限管理使用的用户写入
 */
export interface UserInput {
  // 登录名
  username: string
  // 姓名
  name: string
  // 新建时必填密码
  password?: string
  // 手机号
  phone: string | null
  // 邮箱
  email: string | null
  // 头像地址
  avatar: string | null
  // 是否启用
  enabled: boolean
  // 原子保存的角色主键
  roleIds: string[]
}

/**
 * 权限资源写入
 * @description 后台权限管理使用的权限资源写入
 */
export interface ResourceInput {
  // 父节点 UUID，根节点为 null
  parentId: string | null
  // 资源类型
  type: 'directory' | 'menu' | 'button'
  // 显示名称
  title: string
  // 路由名称
  name: string | null
  // 路由路径
  path: string | null
  // 页面组件
  component: string | null
  // 图标
  icon: string | null
  // 前端操作权限编码
  permission: string | null
  // 是否启用
  enabled: boolean
  // 排序
  sort: number
  // 是否隐藏
  hidden: boolean
  // 是否缓存
  keepAlive: boolean
  // 原子保存的接口编码
  apiCodes: string[]
}

/**
 * 权限资源
 * @description 资源详情响应，包含编辑所需的完整配置
 */
export interface Resource extends ResourceInput {
  // 内置资源身份和位置受保护
  isBuiltin: boolean
  // 资源 UUID
  id: string
}

/**
 * 权限资源列表项
 * @description 管理列表展示、搜索、操作与组树所需的精简字段
 */
export interface ResourceListItem extends Pick<
  Resource,
  | 'id'
  | 'parentId'
  | 'type'
  | 'title'
  | 'name'
  | 'path'
  | 'permission'
  | 'enabled'
  | 'sort'
  | 'isBuiltin'
> {
  // 绑定接口数量，具体编码从详情接口读取
  apiCount: number
}

/**
 * 权限资源树节点
 * @description 前端根据扁平资源列表构建的树节点，用于菜单管理与角色授权
 */
export interface ResourceTreeNode extends ResourceListItem {
  // 前端构建的子资源
  children: ResourceTreeNode[]
}

/**
 * 真实接口目录
 * @description 后台权限管理使用的真实接口目录
 */
export interface ApiResource {
  // 稳定接口编码
  code: string
  // 模块标签
  module: string
  // 功能标签
  feature: string
  // 动作标签
  action: string
  // HTTP 方法
  method: string
  // 注册路径
  path: string
  // 访问级别
  access: 'public' | 'authenticated' | 'permission'
  // 搜索别名
  aliases: string[]
  // 排序
  sort: number
}

/**
 * 可绑定接口目录项
 * @description 后端平铺返回的可绑定接口，由前端按模块与功能组装树形
 */
export interface ApiBindableItem {
  // 稳定接口编码
  code: string
  // 模块名称
  module: string
  // 功能名称
  feature: string
  // 操作名称
  action: string
  // HTTP 方法
  method: string
  // 注册路径
  path: string
}

/**
 * 可绑定接口树节点
 * @description 前端组装的选择树节点，仅接口叶子可绑定
 */
export interface ApiBindableTreeNode {
  // 模块、功能分组键或接口编码
  key: string
  // 节点名称
  label: string
  // 节点类型
  kind: 'module' | 'feature' | 'api'
  // 子节点，仅分组存在
  children?: ApiBindableTreeNode[]
  // HTTP 方法，仅接口存在
  method?: string
  // 注册路径，仅接口存在
  path?: string
}

/**
 * RoleList
 * @description 后台管理响应与写入类型
 */
export type RoleList = PaginatedResponse<Role>

/**
 * UserList
 * @description 后台管理响应与写入类型
 */
export type UserList = PaginatedResponse<ManagedUser>

/**
 * ApiResourceList
 * @description 后台管理响应与写入类型
 */
export type ApiResourceList = PaginatedResponse<ApiResource>

/**
 * ApiLabelsInput
 * @description 后台管理响应与写入类型
 */
export type ApiLabelsInput = Pick<ApiResource, 'module' | 'feature' | 'action' | 'aliases' | 'sort'>

/**
 * 用户资料更新
 * @description 用户名与密码不得通过资料接口修改
 */
export type UpdateUserInput = Omit<UserInput, 'username' | 'password'>

/**
 * 角色资料更新
 * @description 角色编码创建后不可变
 */
export type UpdateRoleInput = Omit<RoleInput, 'code'>
