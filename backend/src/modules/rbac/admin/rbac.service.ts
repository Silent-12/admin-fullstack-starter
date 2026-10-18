import { Injectable } from '@nestjs/common'
import type { PaginatedData } from '../../../common/types/response.js'
import type {
  AdminAuthorization,
  AdminMenuRoute,
  AdminResourceView,
  AdminRoleOption,
  AdminRoleView,
  AdminUserView,
} from '../../../types/rbac.js'
import type {
  CreateResourceDto,
  CreateRoleDto,
  CreateUserDto,
  RbacQueryDto,
  UpdateResourceDto,
  UpdateRoleDto,
  UpdateUserDto,
} from './dto/rbac.dto.js'
import { AdminAuthorizationService } from './services/admin-authorization.service.js'
import { AdminResourceService } from './services/admin-resource.service.js'
import { AdminRoleService } from './services/admin-role.service.js'
import { AdminUserService } from './services/admin-user.service.js'

/**
 * 后台权限门面服务
 * @description 按用户、角色、资源与授权领域委托具体服务，Controller 与认证模块只依赖该门面
 */
@Injectable()
export class RbacService {
  constructor(
    private readonly users: AdminUserService,
    private readonly roles: AdminRoleService,
    private readonly resources: AdminResourceService,
    private readonly authorization: AdminAuthorizationService,
  ) {}

  /**
   * 获取当前有效授权
   * @description 只合并启用角色明确绑定的有效资源，不存在超级管理员旁路
   * @param userId 用户 UUID
   * @returns 资源、接口与界面按钮权限
   */
  async getAuthorization(userId: string): Promise<AdminAuthorization> {
    return this.authorization.getAuthorization(userId)
  }

  /**
   * 获取当前用户授权菜单
   * @description 复用守卫已计算的授权快照，只返回导航字段
   * @param authorization 当前请求的授权快照
   * @returns 可直接供前端动态路由转换器使用的导航树
   */
  async getUserMenus(authorization: AdminAuthorization): Promise<AdminMenuRoute[]> {
    return this.authorization.getUserMenus(authorization)
  }

  /**
   * 查询用户列表
   * @description 分页返回未删除用户的公开资料与角色
   * @param query 分页与筛选参数
   * @returns 用户分页结果
   */
  async listUsers(query: RbacQueryDto): Promise<PaginatedData<AdminUserView>> {
    return this.users.listUsers(query)
  }

  /**
   * 查询用户详情
   * @description 返回未删除用户的公开资料与角色
   * @param id 用户 UUID
   * @returns 用户详情
   */
  async getUser(id: string): Promise<AdminUserView> {
    return this.users.getUser(id)
  }

  /**
   * 创建后台用户
   * @description 在事务内保存用户、角色绑定与审计字段，角色必须位于操作者授权范围内
   * @param dto 用户资料和角色
   * @param actorId 当前操作人 UUID
   * @param authorization 当前请求的授权快照
   */
  async createUser(dto: CreateUserDto, actorId: string, authorization: AdminAuthorization): Promise<void> {
    await this.users.createUser(dto, actorId, authorization)
  }

  /**
   * 更新后台用户
   * @description 资料和角色绑定原子更新，角色必须位于操作者授权范围内
   * @param id 用户 UUID
   * @param dto 需要变更的资料和可选角色列表
   * @param actorId 当前操作人 UUID
   * @param authorization 当前请求的授权快照
   */
  async updateUser(id: string, dto: UpdateUserDto, actorId: string, authorization: AdminAuthorization): Promise<void> {
    await this.users.updateUser(id, dto, actorId, authorization)
  }

  /**
   * 删除后台用户
   * @description 软删除用户并撤销令牌与角色绑定
   * @param id 用户 UUID
   * @param actorId 当前操作人 UUID
   */
  async deleteUser(id: string, actorId: string): Promise<void> {
    await this.users.deleteUser(id, actorId)
  }

  /**
   * 重置后台用户密码
   * @description 更新密码哈希并递增令牌版本
   * @param id 用户 UUID
   * @param password 新明文密码
   * @param actorId 当前操作人 UUID
   */
  async resetPassword(id: string, password: string, actorId: string): Promise<void> {
    await this.users.resetPassword(id, password, actorId)
  }

  /**
   * 查询角色列表
   * @description 按名称或编码搜索未删除角色
   * @param query 分页与筛选参数
   * @returns 角色分页结果
   */
  async listRoles(query: RbacQueryDto): Promise<PaginatedData<AdminRoleView>> {
    return this.roles.listRoles(query)
  }

  /**
   * 查询角色选项
   * @description 只返回启用、未删除且资源范围不超出操作者授权的角色最小字段
   * @param authorization 当前请求的授权快照
   * @returns 角色选项列表
   */
  async roleOptions(authorization: AdminAuthorization): Promise<AdminRoleOption[]> {
    return this.roles.roleOptions(authorization)
  }

  /**
   * 查询角色详情
   * @description 返回角色的公开字段
   * @param id 角色 UUID
   * @returns 角色详情
   */
  async getRole(id: string): Promise<AdminRoleView> {
    return this.roles.getRole(id)
  }

  /**
   * 创建角色
   * @description 只能创建普通角色
   * @param dto 角色资料
   * @param actorId 当前操作人 UUID
   */
  async createRole(dto: CreateRoleDto, actorId: string): Promise<void> {
    await this.roles.createRole(dto, actorId)
  }

  /**
   * 更新角色
   * @description 角色编码不可变，内置角色基本资料禁止修改
   * @param id 角色 UUID
   * @param dto 更新资料
   * @param actorId 当前操作人 UUID
   */
  async updateRole(id: string, dto: UpdateRoleDto, actorId: string): Promise<void> {
    await this.roles.updateRole(id, dto, actorId)
  }

  /**
   * 删除角色
   * @description 软删除角色并释放唯一编码，内置角色禁止删除
   * @param id 角色 UUID
   * @param actorId 当前操作人 UUID
   */
  async deleteRole(id: string, actorId: string): Promise<void> {
    await this.roles.deleteRole(id, actorId)
  }

  /**
   * 查询角色资源授权
   * @description 返回未撤销的显式授权集合
   * @param id 角色 UUID
   * @returns 资源 UUID 集合
   */
  async getRoleResources(id: string): Promise<{ resourceIds: string[] }> {
    return this.roles.getRoleResources(id)
  }

  /**
   * 分配角色资源
   * @description 完整替换显式资源集合，内置角色授权固定，委派操作者只能管理自身授权范围内的资源
   * @param id 角色 UUID
   * @param resourceIds 资源 UUID 集合
   * @param actorId 当前操作人 UUID
   * @param authorization 当前请求的授权快照
   */
  async setRoleResources(id: string, resourceIds: string[], actorId: string, authorization: AdminAuthorization): Promise<void> {
    await this.roles.setRoleResources(id, resourceIds, actorId, authorization)
  }

  /**
   * 查询权限资源树
   * @description 管理页面返回全部未删除资源和接口绑定
   * @returns 层级资源列表
   */
  async resourceTree(): Promise<AdminResourceView[]> {
    return this.resources.resourceTree()
  }

  /**
   * 查询权限资源详情
   * @description 返回显式字段与接口绑定
   * @param id 资源 UUID
   * @returns 资源详情
   */
  async getResource(id: string): Promise<AdminResourceView> {
    return this.resources.getResource(id)
  }

  /**
   * 创建权限资源
   * @description 验证层级、路由、接口目录与操作者接口授权后原子保存资源与绑定
   * @param dto 资源资料及接口编码
   * @param actorId 当前操作人 UUID
   * @param authorization 当前请求的授权快照
   */
  async createResource(dto: CreateResourceDto, actorId: string, authorization: AdminAuthorization): Promise<void> {
    await this.resources.createResource(dto, actorId, authorization)
  }

  /**
   * 更新权限资源
   * @description 合并后的完整资源必须合法，新增接口绑定必须位于操作者接口授权内
   * @param id 资源 UUID
   * @param dto 需要更新的字段
   * @param actorId 当前操作人 UUID
   * @param authorization 当前请求的授权快照
   */
  async updateResource(id: string, dto: UpdateResourceDto, actorId: string, authorization: AdminAuthorization): Promise<void> {
    await this.resources.updateResource(id, dto, actorId, authorization)
  }

  /**
   * 删除权限资源
   * @description 含有未删除子节点时拒绝删除，软删除资源并释放唯一值
   * @param id 资源 UUID
   * @param actorId 当前操作人 UUID
   */
  async deleteResource(id: string, actorId: string): Promise<void> {
    await this.resources.deleteResource(id, actorId)
  }
}
