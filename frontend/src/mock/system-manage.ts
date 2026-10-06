import { applicationRoutes } from '@/router/routes/applications'
import type { AppRouteRecord } from '@/types/router'
import type {
  RoleList,
  RoleListItem,
  RoleSearchParams,
  UserList,
  UserListItem,
  UserSearchParams
} from '@/types/api/system-manage'

const USER_AVATAR_SIZES = [160, 160, 160, 80, 80, 80, 160, 160, 160, 160]

/**
 * 生成占位头像地址
 * @description 根据原始 mock 图片尺寸生成 dummyimage.com 地址
 * @param size 占位图边长
 * @return 占位图地址
 */
function getPlaceholderAvatar(size: number): string {
  return `https://dummyimage.com/${size}x${size}.png`
}

const MOCK_USER_NAMES = [
  'alexmorgan',
  'sophiabaker',
  'liampark',
  'oliviagrant',
  'emmawilson',
  'noahevan',
  'avamartin',
  'jacoblee',
  'miaclark',
  'ethanharris',
  'isabellamoore',
  'masonwhite',
  'charlottehall',
  'benjaminscott',
  'ameliaking'
]

/** 角色 mock 数据 */
export const ROLE_LIST_DATA: RoleListItem[] = [
  ['超级管理员', 'R_SUPER', '拥有系统全部权限', true],
  ['管理员', 'R_ADMIN', '拥有系统管理权限', true],
  ['普通用户', 'R_USER', '拥有系统普通权限', true],
  ['财务管理员', 'R_FINANCE', '管理财务相关权限', true],
  ['数据分析师', 'R_ANALYST', '拥有数据分析权限', false],
  ['客服专员', 'R_SUPPORT', '处理客户支持请求', true],
  ['营销经理', 'R_MARKETING', '管理营销活动权限', true],
  ['访客用户', 'R_GUEST', '仅限浏览权限', false],
  ['系统维护员', 'R_MAINTAINER', '负责系统维护和更新', true],
  ['项目经理', 'R_PM', '管理项目相关权限', true]
].map(([roleName, roleCode, description, enabled], index) => ({
  roleId: index + 1,
  roleName: roleName as string,
  roleCode: roleCode as string,
  description: description as string,
  enabled: enabled as boolean,
  createTime: `2025-05-${String(index + 15).padStart(2, '0')} 12:30:45`
}))

/** 用户 mock 数据 */
export const ACCOUNT_TABLE_DATA: UserListItem[] = MOCK_USER_NAMES.map((userName, index) => ({
  id: index + 1,
  avatar: getPlaceholderAvatar(USER_AVATAR_SIZES[index % USER_AVATAR_SIZES.length]),
  status: index === 6 ? '2' : index === 7 ? '3' : index === 8 ? '4' : '1',
  userName,
  userGender: index === 3 || index === 4 || index === 8 || index === 13 ? '女' : '男',
  nickName: userName,
  userPhone: `186700015${String(91 - index).padStart(2, '0')}`,
  userEmail: `${userName}@company.com`,
  userRoles: [index === 0 ? 'R_SUPER' : 'R_USER'],
  createBy: 'admin',
  createTime: `2020-${String((index % 6) + 5).padStart(2, '0')}-14 12:01:20`,
  updateBy: 'admin',
  updateTime: '2025-05-19 12:01:20'
}))

/**
 * 模拟获取用户列表接口
 * @description 按搜索条件和分页参数返回本地用户数据
 * @param params 用户搜索和分页参数
 * @return 分页用户列表
 */
export function fetchGetUserList(params: UserSearchParams): Promise<UserList> {
  const records = ACCOUNT_TABLE_DATA.filter((item) => {
    if (params.userName && !item.userName.includes(params.userName)) return false
    if (params.userPhone && !item.userPhone.includes(params.userPhone)) return false
    if (params.userEmail && !item.userEmail.includes(params.userEmail)) return false
    if (params.status && item.status !== params.status) return false
    return true
  })
  const current = params.current || 1
  const size = params.size || 10
  const start = (current - 1) * size

  return Promise.resolve({
    records: records.slice(start, start + size),
    current,
    size,
    total: records.length
  })
}

/**
 * 模拟获取角色列表接口
 * @description 按搜索条件和分页参数返回本地角色数据
 * @param params 角色搜索和分页参数
 * @return 分页角色列表
 */
export function fetchGetRoleList(params: RoleSearchParams): Promise<RoleList> {
  const records = ROLE_LIST_DATA.filter((item) => {
    if (params.roleName && !item.roleName.includes(params.roleName)) return false
    if (params.roleCode && !item.roleCode.includes(params.roleCode)) return false
    if (typeof params.enabled === 'boolean' && item.enabled !== params.enabled) return false
    return true
  })
  const current = params.current || 1
  const size = params.size || 10
  const start = (current - 1) * size

  return Promise.resolve({
    records: records.slice(start, start + size),
    current,
    size,
    total: records.length
  })
}

/**
 * 模拟获取菜单列表接口
 * @description 返回前端定义的业务系统路由作为本地菜单数据
 * @return 菜单路由列表
 */
export function fetchGetMenuList(): Promise<AppRouteRecord[]> {
  return Promise.resolve([...applicationRoutes])
}
