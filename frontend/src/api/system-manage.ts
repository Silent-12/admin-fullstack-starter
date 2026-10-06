import request from '@/utils/http'
import { AppRouteRecord } from '@/types/router'
import type {
  RoleList,
  RoleSearchParams,
  UserList,
  UserSearchParams
} from '@/types/api/system-manage'

// 获取用户列表
export function fetchGetUserList(params: UserSearchParams) {
  return request.get<UserList>({
    url: '/api/user/list',
    params
  })
}

// 获取角色列表
export function fetchGetRoleList(params: RoleSearchParams) {
  return request.get<RoleList>({
    url: '/api/role/list',
    params
  })
}

// 获取菜单列表
/**
 * @description 获取当前用户可访问的全部业务系统路由。
 * @return 一级业务系统路由列表。
 */
export function fetchGetMenuList(): Promise<AppRouteRecord[]> {
  return request.get<AppRouteRecord[]>({
    url: '/api/v3/system/menus/simple'
  })
}
