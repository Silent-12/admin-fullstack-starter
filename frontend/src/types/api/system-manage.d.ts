import type { CommonSearchParams, PaginatedResponse } from './common'

/**
 * 用户列表
 * @description 定义系统管理用户分页列表响应。
 */
export type UserList = PaginatedResponse<UserListItem>

/**
 * 用户列表项
 * @description 定义系统管理用户列表中的用户信息。
 */
export interface UserListItem {
  // 用户 ID
  id: number
  // 用户头像
  avatar: string
  // 用户状态
  status: string
  // 用户名
  userName: string
  // 用户性别
  userGender: string
  // 用户昵称
  nickName: string
  // 用户手机号
  userPhone: string
  // 用户邮箱
  userEmail: string
  // 用户角色
  userRoles: string[]
  // 创建人
  createBy: string
  // 创建时间
  createTime: string
  // 更新人
  updateBy: string
  // 更新时间
  updateTime: string
}

/**
 * 用户搜索参数
 * @description 定义系统管理用户列表的筛选和分页参数。
 */
export type UserSearchParams = Partial<
  Pick<UserListItem, 'id' | 'userName' | 'userGender' | 'userPhone' | 'userEmail' | 'status'> &
    CommonSearchParams
>

/**
 * 角色列表
 * @description 定义系统管理角色分页列表响应。
 */
export type RoleList = PaginatedResponse<RoleListItem>

/**
 * 角色列表项
 * @description 定义系统管理角色列表中的角色信息。
 */
export interface RoleListItem {
  /** 角色 ID */
  roleId: number
  /** 角色名称 */
  roleName: string
  /** 角色编码 */
  roleCode: string
  /** 角色描述 */
  description: string
  /** 是否启用 */
  enabled: boolean
  /** 创建时间 */
  createTime: string
}

/**
 * 角色搜索参数
 * @description 定义系统管理角色列表的筛选和分页参数。
 */
export type RoleSearchParams = Partial<
  Pick<RoleListItem, 'roleId' | 'roleName' | 'roleCode' | 'description' | 'enabled'> &
    CommonSearchParams & {
      // 开始时间
      startTime: string | null
      // 结束时间
      endTime: string | null
    }
>

/**
 * 角色搜索表单参数
 * @description 在角色查询参数基础上补充表单日期区间，提交查询时拆分为起止时间。
 */
export type RoleSearchFormParams = RoleSearchParams & {
  // 可选的创建日期区间
  daterange?: string[]
}
