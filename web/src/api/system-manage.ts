import request from '@/utils/http'
import type { AppRouteRecord } from '@/types/router'
import type {
  RoleList,
  RoleOption,
  RoleSearchParams,
  UserList,
  UserSearchParams
} from '@/types/api/system-manage'

/**
 * 获取用户列表
 * @description 后台管理端用户资源
 * @param params 分页与筛选参数
 * @returns 用户分页列表
 */
export function fetchGetUserList(params: UserSearchParams) {
  return request.get<UserList>({
    url: '/v1/admin/users',
    params
  })
}

/**
 * 获取角色列表
 * @description 后台管理端角色资源
 * @param params 分页与筛选参数
 * @returns 角色分页列表
 */
export function fetchGetRoleList(params: RoleSearchParams) {
  return request.get<RoleList>({
    url: '/v1/admin/roles',
    params
  })
}

/**
 * 获取角色下拉选项
 * @description 角色下拉专用的精简接口
 * @returns 角色选项列表
 */
export function fetchGetRoleOptions() {
  return request.get<RoleOption[]>({
    url: '/v1/admin/roles/options'
  })
}

/**
 * @description 获取后台管理端的完整菜单与权限树，供菜单管理页维护菜单与按钮权限
 * @return 完整菜单树。
 */
export function fetchGetMenuTree(): Promise<AppRouteRecord[]> {
  return request.get<AppRouteRecord[]>({
    url: '/v1/admin/menus/tree'
  })
}

/**
 * @description 通过后台认证端点获取当前登录用户有权访问的菜单，供 `VITE_ROUTE_SOURCE=dynamic` 时注册动态路由
 * @return 当前用户可见的菜单树。
 */
export function fetchGetUserMenus(): Promise<AppRouteRecord[]> {
  return request.get<AppRouteRecord[]>({
    url: '/v1/admin/auth/menus'
  })
}
