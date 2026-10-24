import { BadRequestException, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { In } from 'typeorm'
import type { EntityManager } from 'typeorm'
import { DataSource } from 'typeorm'
import type { PaginatedData } from '../../../../common/types/response.js'
import type { AdminAuthorization, AdminRoleOption, AdminRoleView } from '../../../../types/rbac.js'
import { AdminUser } from '../../../auth/admin/entities/admin-user.entity.js'
import { AdminPermissionResource } from '../entities/admin-permission-resource.entity.js'
import { AdminRole } from '../entities/admin-role.entity.js'
import { AdminRoleResource } from '../entities/admin-role-resource.entity.js'
import { AdminUserRole } from '../entities/admin-user-role.entity.js'
import { RbacStoreService, assertResourcesAllowed, replaceSoftDeleted } from './rbac-store.service.js'
import type { RbacAudit } from './rbac-store.service.js'
import type { CreateRoleDto, RbacQueryDto, UpdateRoleDto } from '../dto/rbac.dto.js'

/**
 * 后台角色管理服务
 * @description 维护角色资料与资源授权；内置角色权限固定且不可编辑，删除采用软删除并释放唯一编码
 */
@Injectable()
export class AdminRoleService {
  constructor(
    private readonly source: DataSource,
    private readonly store: RbacStoreService,
  ) {}

  /**
   * 查询角色列表
   * @description 按名称或编码搜索未删除角色并返回标准分页，附带更新时间与最后操作人显示名
   * @param query 分页与筛选参数
   * @returns 角色分页结果
   */
  async listRoles(query: RbacQueryDto): Promise<PaginatedData<AdminRoleView>> {
    const { page, pageSize } = this.store.pagination(query)
    const builder = this.source.getRepository(AdminRole).createQueryBuilder('role').where('role.isDeleted = 0')
    if (query.keyword) builder.andWhere('(role.code LIKE :keyword OR role.name LIKE :keyword)', { keyword: '%' + query.keyword + '%' })
    if (query.enabled !== undefined) builder.andWhere('role.enabled = :enabled', { enabled: query.enabled })
    const [roles, total] = await builder
      .orderBy('role.code', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount()
    return this.store.paginated(await this.roleViews(this.source.manager, roles), page, pageSize, total)
  }

  /**
   * 查询角色选项
   * @description 只返回启用、未删除、非内置且资源范围不超出操作者授权的角色；内置角色不能用于新的用户绑定
   * @param authorization 当前请求的授权快照
   * @returns 角色选项列表
   */
  async roleOptions(authorization: AdminAuthorization): Promise<AdminRoleOption[]> {
    const roles = await this.source
      .getRepository(AdminRole)
      .find({ where: { enabled: true, isDeleted: 0, isBuiltin: false }, order: { code: 'ASC' } })
    if (!roles.length) return []
    // 系统兜底账号可分配全部启用角色，不受其当前资源快照限制。
    if (authorization.isBuiltin) return roles.map((role) => ({ id: role.id, code: role.code, name: role.name }))
    const grants = await this.source.getRepository(AdminRoleResource).findBy({
      roleId: In(roles.map((role) => role.id)),
      isDeleted: 0,
    })
    const allowed = new Set(authorization.resourceIds)
    return roles
      .filter((role) => grants.every((grant) => grant.roleId !== role.id || allowed.has(grant.resourceId)))
      .map((role) => ({ id: role.id, code: role.code, name: role.name }))
  }

  /**
   * 查询角色详情
   * @description 返回角色的公开字段、更新时间与最后操作人显示名
   * @param id 角色 UUID
   * @returns 角色详情
   */
  async getRole(id: string): Promise<AdminRoleView> {
    const role = await this.store.requireRole(this.source.manager, id)
    return (await this.roleViews(this.source.manager, [role]))[0]!
  }

  /**
   * 创建角色
   * @description 只能创建普通角色，内置标记由服务器固定
   * @param dto 角色资料
   * @param actorId 当前操作人 UUID
   */
  async createRole(dto: CreateRoleDto, actorId: string): Promise<void> {
    await this.store.mutate(actorId, async (manager, audit) => {
      await manager.insert(AdminRole, {
        id: randomUUID(),
        code: dto.code,
        name: dto.name,
        description: dto.description ?? '',
        enabled: dto.enabled,
        isBuiltin: false,
        ...audit.create(),
      })
    })
  }

  /**
   * 更新角色
   * @description 角色编码不可变，内置角色的基本资料仍禁止修改
   * @param id 角色 UUID
   * @param dto 更新资料
   * @param actorId 当前操作人 UUID
   */
  async updateRole(id: string, dto: UpdateRoleDto, actorId: string): Promise<void> {
    await this.store.mutate(actorId, async (manager, audit) => {
      const role = await this.store.requireRole(manager, id)
      this.assertMutableRole(role)
      for (const key of ['name', 'description', 'enabled'] as const) {
        if (dto[key] !== undefined) Object.assign(role, { [key]: dto[key] })
      }
      Object.assign(role, audit.update())
      await manager.save(AdminRole, role)
    })
  }

  /**
   * 删除角色
   * @description 内置角色禁止删除；软删除角色并改写编码释放唯一值，同时软删除该角色的资源授权与用户绑定
   * @param id 角色 UUID
   * @param actorId 当前操作人 UUID
   */
  async deleteRole(id: string, actorId: string): Promise<void> {
    await this.store.mutate(actorId, async (manager, audit) => {
      const role = await this.store.requireRole(manager, id)
      this.assertMutableRole(role)
      // 唯一索引无法表达软删除，删除时改写编码以允许重新创建同码角色。
      role.code = `deleted_${role.id}`
      role.enabled = false
      role.isDeleted = 1
      Object.assign(role, audit.update())
      await manager.save(AdminRole, role)
      await manager.update(AdminRoleResource, { roleId: id, isDeleted: 0 }, { isDeleted: 1, ...audit.update() })
      await manager.update(AdminUserRole, { roleId: id, isDeleted: 0 }, { isDeleted: 1, ...audit.update() })
    })
  }

  /**
   * 查询角色资源授权
   * @description 返回未撤销的显式授权集合，不自动展开后代
   * @param id 角色 UUID
   * @returns 资源 UUID 集合
   */
  async getRoleResources(id: string): Promise<{ resourceIds: string[] }> {
    await this.store.requireRole(this.source.manager, id)
    const rows = await this.source.getRepository(AdminRoleResource).findBy({ roleId: id, isDeleted: 0 })
    return { resourceIds: rows.map((row) => row.resourceId).sort() }
  }

  /**
   * 分配角色资源
   * @description 完整替换显式资源集合并校验资源未删除；内置角色授权固定，委派操作者只能管理自身授权范围内的资源
   * @param id 角色 UUID
   * @param resourceIds 资源 UUID 集合
   * @param actorId 当前操作人 UUID
   * @param authorization 当前请求的授权快照
   */
  async setRoleResources(id: string, resourceIds: string[], actorId: string, authorization: AdminAuthorization): Promise<void> {
    await this.store.mutate(actorId, async (manager, audit) => {
      const role = await this.store.requireRole(manager, id)
      this.assertMutableRole(role)
      if (new Set(resourceIds).size !== resourceIds.length) throw new BadRequestException('资源不能重复')
      const count = resourceIds.length ? await manager.countBy(AdminPermissionResource, { id: In(resourceIds), isDeleted: 0 }) : 0
      if (count !== resourceIds.length) throw new BadRequestException('包含不存在的资源')
      const current = await manager.findBy(AdminRoleResource, { roleId: id, isDeleted: 0 })
      assertResourcesAllowed(authorization, [...current.map((grant) => grant.resourceId), ...resourceIds], '不能授权超出自身权限范围的资源')
      await this.replaceRoleResources(manager, id, resourceIds, audit)
    })
  }

  private assertMutableRole(role: AdminRole): void {
    if (role.isBuiltin) throw new BadRequestException('内置角色不能修改或删除')
  }

  /**
   * 替换角色资源授权
   * @description 先读取全部关联（含软删除），按目标集合恢复或撤销，不执行物理删除
   * @param manager 事务管理器
   * @param roleId 角色 UUID
   * @param resourceIds 目标资源 UUID 集合
   * @param audit 写事务审计上下文
   */
  private async replaceRoleResources(manager: EntityManager, roleId: string, resourceIds: string[], audit: RbacAudit): Promise<void> {
    await replaceSoftDeleted(manager, AdminRoleResource, { roleId }, 'resourceId', resourceIds, audit)
  }

  /**
   * 组装角色公开视图
   * @description 一次性解析本页最后操作人姓名，系统初始化写入的 `system` 统一展示为「系统」；
   * 账号已删除时仍按历史记录展示姓名，仅在查不到账号时返回 `null`
   * @param manager 查询管理器
   * @param roles 角色实体列表
   * @returns 角色公开视图列表
   */
  private async roleViews(manager: EntityManager, roles: AdminRole[]): Promise<AdminRoleView[]> {
    const actorIds = [...new Set(roles.map((role) => role.updatedBy))].filter((id) => id !== 'system')
    const actors = actorIds.length ? await manager.find(AdminUser, { select: { id: true, name: true }, where: { id: In(actorIds) } }) : []
    const actorNames = new Map(actors.map((actor) => [actor.id, actor.name]))
    return roles.map((role) => ({
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      enabled: role.enabled,
      isBuiltin: role.isBuiltin,
      updateTime: role.updateTime,
      updatedByName: role.updatedBy === 'system' ? '系统' : (actorNames.get(role.updatedBy) ?? null),
    }))
  }
}
