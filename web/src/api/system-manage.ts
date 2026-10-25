import request from '@/utils/http'
import type {
  ApiBindableItem,
  ApiLabelsInput,
  ApiResourceList,
  ManagedUser,
  ManagementQuery,
  Resource,
  ResourceListItem,
  ResourceInput,
  Role,
  RoleInput,
  RoleList,
  RoleOption,
  UpdateRoleInput,
  UpdateUserInput,
  UserInput,
  UserList
} from '@/types/api/system-manage'

// 用户管理

/**
 * 获取用户分页
 * @description 获取后台管理端用户分页列表
 * @param {ManagementQuery} params 分页与筛选参数
 * @return {Promise<UserList>} 用户分页列表
 */
export const fetchGetUserList = (params: ManagementQuery) =>
  request.get<UserList>({
    url: '/v1/admin/users',
    params
  })

/**
 * 获取用户详情
 * @description 获取指定用户的详细信息
 * @param {string} id 用户 ID
 * @return {Promise<ManagedUser>} 用户详情
 */
export const fetchGetUser = (id: string) =>
  request.get<ManagedUser>({
    url: `/v1/admin/users/${id}`
  })

/**
 * 创建用户和角色绑定
 * @description 创建用户并绑定指定角色
 * @param {UserInput} data 用户及角色数据
 * @return {Promise<null>} 无返回数据
 */
export const createUser = (data: UserInput) =>
  request.post<null>({
    url: '/v1/admin/users',
    data
  })

/**
 * 原子更新用户与角色
 * @description 原子更新用户信息及角色绑定
 * @param {string} id 用户 ID
 * @param {UpdateUserInput} data 用户及角色更新数据
 * @return {Promise<null>} 无返回数据
 */
export const updateUser = (id: string, data: UpdateUserInput) =>
  request.request<null>({
    url: `/v1/admin/users/${id}`,
    method: 'PATCH',
    data
  })

/**
 * 删除用户
 * @description 删除指定用户
 * @param {string} id 用户 ID
 * @return {Promise<null>} 无返回数据
 */
export const deleteUser = (id: string) =>
  request.del<null>({
    url: `/v1/admin/users/${id}`
  })

/**
 * 重置用户密码
 * @description 重置指定用户的登录密码
 * @param {string} id 用户 ID
 * @param {string} password 新密码
 * @return {Promise<null>} 无返回数据
 */
export const resetUserPassword = (id: string, password: string) =>
  request.post<null>({
    url: `/v1/admin/users/${id}/reset-password`,
    data: { password }
  })

// 角色管理

/**
 * 获取角色分页
 * @description 获取后台管理端角色分页列表
 * @param {ManagementQuery} params 分页与筛选参数
 * @return {Promise<RoleList>} 角色分页列表
 */
export const fetchGetRoleList = (params: ManagementQuery) =>
  request.get<RoleList>({
    url: '/v1/admin/roles',
    params
  })

/**
 * 获取角色选项
 * @description 获取角色下拉选项
 * @return {Promise<RoleOption[]>} 角色选项列表
 */
export const fetchGetRoleOptions = () =>
  request.get<RoleOption[]>({
    url: '/v1/admin/roles/options'
  })

/**
 * 获取角色详情
 * @description 获取指定角色的详细信息
 * @param {string} id 角色 ID
 * @return {Promise<Role>} 角色详情
 */
export const fetchGetRole = (id: string) =>
  request.get<Role>({
    url: `/v1/admin/roles/${id}`
  })

/**
 * 新建角色
 * @description 创建角色
 * @param {RoleInput} data 角色数据
 * @return {Promise<null>} 无返回数据
 */
export const createRole = (data: RoleInput) =>
  request.post<null>({
    url: '/v1/admin/roles',
    data
  })

/**
 * 更新角色
 * @description 更新指定角色
 * @param {string} id 角色 ID
 * @param {UpdateRoleInput} data 角色更新数据
 * @return {Promise<null>} 无返回数据
 */
export const updateRole = (id: string, data: UpdateRoleInput) =>
  request.request<null>({
    url: `/v1/admin/roles/${id}`,
    method: 'PATCH',
    data
  })

/**
 * 删除角色
 * @description 删除指定角色
 * @param {string} id 角色 ID
 * @return {Promise<null>} 无返回数据
 */
export const deleteRole = (id: string) =>
  request.del<null>({
    url: `/v1/admin/roles/${id}`
  })

/**
 * 获取角色资源
 * @description 获取指定角色关联的资源 ID
 * @param {string} id 角色 ID
 * @return {Promise<{ resourceIds: string[] }>} 角色关联的资源 ID
 */
export const fetchRoleResources = (id: string) =>
  request.get<{ resourceIds: string[] }>({
    url: `/v1/admin/roles/${id}/resources`
  })

/**
 * 保存角色资源
 * @description 更新指定角色关联的资源
 * @param {string} id 角色 ID
 * @param {string[]} resourceIds 资源 ID 列表
 * @return {Promise<null>} 无返回数据
 */
export const updateRoleResources = (id: string, resourceIds: string[]) =>
  request.put<null>({
    url: `/v1/admin/roles/${id}/resources`,
    data: { resourceIds }
  })

// 菜单与资源管理

/**
 * 获取完整资源列表
 * @description 获取不分页的精简资源列表，接口绑定仅返回数量，由调用方根据 parentId 构建树
 * @return {Promise<ResourceListItem[]>} 精简资源列表
 */
export const fetchGetMenuList = () =>
  request.get<ResourceListItem[]>({
    url: '/v1/admin/menus'
  })

/**
 * 获取资源详情
 * @description 获取指定资源的详细信息
 * @param {string} id 资源 ID
 * @return {Promise<Resource>} 资源详情
 */
export const fetchGetMenu = (id: string) =>
  request.get<Resource>({
    url: `/v1/admin/menus/${id}`
  })

/**
 * 原子创建资源和接口绑定
 * @description 创建资源并绑定接口
 * @param {ResourceInput} data 资源及接口绑定数据
 * @return {Promise<null>} 无返回数据
 */
export const createMenu = (data: ResourceInput) =>
  request.post<null>({
    url: '/v1/admin/menus',
    data
  })

/**
 * 原子更新资源和接口绑定
 * @description 更新资源并同步接口绑定
 * @param {string} id 资源 ID
 * @param {ResourceInput} data 资源及接口绑定数据
 * @return {Promise<null>} 无返回数据
 */
export const updateMenu = (id: string, data: ResourceInput) =>
  request.request<null>({
    url: `/v1/admin/menus/${id}`,
    method: 'PATCH',
    data
  })

/**
 * 删除资源
 * @description 删除指定资源
 * @param {string} id 资源 ID
 * @return {Promise<null>} 无返回数据
 */
export const deleteMenu = (id: string) =>
  request.del<null>({
    url: `/v1/admin/menus/${id}`
  })

// 接口资源管理

/**
 * 获取真实接口目录
 * @description 获取后台已注册接口的分页目录
 * @param {ManagementQuery} params 分页与筛选参数
 * @return {Promise<ApiResourceList>} 接口分页目录
 */
export const fetchApiResources = (params: ManagementQuery) =>
  request.get<ApiResourceList>({
    url: '/v1/admin/api-resources',
    params
  })

/**
 * 获取可绑定接口目录
 * @description 获取不分页的可绑定接口扁平列表，由调用方按模块与功能组装树形
 * @return {Promise<ApiBindableItem[]>} 可绑定接口扁平列表
 */
export const fetchBindableApiList = () =>
  request.get<ApiBindableItem[]>({
    url: '/v1/admin/api-resources/tree'
  })

/**
 * 更新接口检索标签
 * @description 更新指定接口的展示标签
 * @param {string} code 接口编码
 * @param {ApiLabelsInput} data 接口标签数据
 * @return {Promise<null>} 无返回数据
 */
export const updateApiLabels = (code: string, data: ApiLabelsInput) =>
  request.request<null>({
    url: `/v1/admin/api-resources/${encodeURIComponent(code)}`,
    method: 'PATCH',
    data
  })
