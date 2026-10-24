import { BadRequestException, ConflictException, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { DataSource } from 'typeorm'
import type { EntityManager } from 'typeorm'
import { ADMIN_ROUTE_POLICY } from '../../../../common/constants/admin-route.constant.js'
import type { AdminAuthorization, AdminResourceListItem, AdminResourceView } from '../../../../types/rbac.js'
import { ApiResourceService } from '../../../api-resource/admin/api-resource.service.js'
import { AdminPermissionResource } from '../entities/admin-permission-resource.entity.js'
import { AdminResourceApi } from '../entities/admin-resource-api.entity.js'
import { AdminRoleResource } from '../entities/admin-role-resource.entity.js'
import { BUILTIN_RESOURCE_IDS, SUPER_ROLE_ID } from '../initialize-rbac.js'
import { RbacStoreService, assertApisAllowed, replaceSoftDeleted } from './rbac-store.service.js'
import type { RbacAudit } from './rbac-store.service.js'
import type { CreateResourceDto, UpdateResourceDto } from '../dto/rbac.dto.js'

/**
 * 权限资源管理服务
 * @description 维护目录、页面与按钮三级结构及接口绑定；路由结构由服务端校验，删除采用软删除并释放唯一值
 */
@Injectable()
export class AdminResourceService {
  constructor(
    private readonly source: DataSource,
    private readonly store: RbacStoreService,
    private readonly apiResources: ApiResourceService,
  ) {}

  /**
   * 查询权限资源列表
   * @description 只返回列表展示、检索、操作与组树需要的字段，接口绑定仅返回数量，包含停用节点
   * @returns 按排序值与 UUID 排列的扁平资源列表
   */
  async listResources(): Promise<AdminResourceListItem[]> {
    const resources = await this.source.getRepository(AdminPermissionResource).find({
      select: { id: true, parentId: true, type: true, title: true, name: true, path: true, permission: true, enabled: true, sort: true },
      where: { isDeleted: 0 },
      order: { sort: 'ASC', id: 'ASC' },
    })
    const bindings = await this.source.getRepository(AdminResourceApi).find({ select: { resourceId: true }, where: { isDeleted: 0 } })
    const apiCounts = new Map<string, number>()
    for (const { resourceId } of bindings) apiCounts.set(resourceId, (apiCounts.get(resourceId) ?? 0) + 1)
    return resources.map((resource) => ({
      id: resource.id,
      parentId: resource.parentId,
      type: resource.type,
      title: resource.title,
      name: resource.name,
      path: resource.path,
      permission: resource.permission,
      enabled: resource.enabled,
      sort: resource.sort,
      isBuiltin: BUILTIN_RESOURCE_IDS.includes(resource.id),
      apiCount: apiCounts.get(resource.id) ?? 0,
    }))
  }

  /**
   * 查询权限资源详情
   * @description 返回显式字段与接口绑定，避免暴露实体关系
   * @param id 资源 UUID
   * @returns 资源详情
   */
  async getResource(id: string): Promise<AdminResourceView> {
    const resource = await this.store.requireResource(this.source.manager, id)
    const bindings = await this.source.getRepository(AdminResourceApi).findBy({ resourceId: id, isDeleted: 0 })
    return this.resourceView(resource, bindings)
  }

  /**
   * 创建权限资源
   * @description 验证层级、路由、接口目录与操作者授权后原子保存资源与绑定；新资源自动加入内置角色，保证系统兜底账号始终拥有全部资源
   * @param dto 资源资料及接口编码
   * @param actorId 当前操作人 UUID
   * @param authorization 当前请求的授权快照
   */
  async createResource(dto: CreateResourceDto, actorId: string, authorization: AdminAuthorization): Promise<void> {
    await this.store.mutate(actorId, async (manager, audit) => {
      const resource = manager.create(AdminPermissionResource, {
        id: randomUUID(),
        parentId: dto.parentId ?? null,
        type: dto.type,
        title: dto.title,
        name: dto.name ?? null,
        path: dto.path ?? null,
        component: dto.component ?? null,
        icon: dto.icon ?? null,
        permission: dto.permission ?? null,
        enabled: dto.enabled,
        sort: dto.sort ?? 0,
        hidden: dto.hidden ?? false,
        keepAlive: dto.keepAlive ?? false,
        ...audit.create(),
      })
      await this.validateResource(manager, resource)
      if (resource.type === 'directory' && dto.apiCodes?.length) throw new BadRequestException('目录不能绑定接口')
      this.apiResources.validateCodes(dto.apiCodes ?? [])
      assertApisAllowed(authorization, dto.apiCodes ?? [], '不能绑定未获授权的接口')
      await manager.insert(AdminPermissionResource, resource)
      await manager.insert(AdminRoleResource, { roleId: SUPER_ROLE_ID, resourceId: resource.id, ...audit.create() })
      await this.replaceResourceApis(manager, resource.id, dto.apiCodes ?? [], audit)
    })
  }

  /**
   * 更新权限资源
   * @description 合并后的完整资源必须合法，省略接口编码保持原绑定，空数组显式清除；内置资源只允许调整展示、
   * 排序、隐藏与缓存，路由结构、权限标识和接口绑定均由服务端固定。新增绑定必须位于操作者自身接口授权内
   * @param id 资源 UUID
   * @param dto 需要更新的字段
   * @param actorId 当前操作人 UUID
   * @param authorization 当前请求的授权快照
   */
  async updateResource(id: string, dto: UpdateResourceDto, actorId: string, authorization: AdminAuthorization): Promise<void> {
    await this.store.mutate(actorId, async (manager, audit) => {
      const resource = await this.store.requireResource(manager, id)
      if (BUILTIN_RESOURCE_IDS.includes(id)) {
        // 内置按钮的 permission 对应前端按钮权限标识，改写会导致按钮消失或权限码漂移。
        for (const key of ['parentId', 'type', 'name', 'path', 'component', 'permission'] as const) {
          if (dto[key] !== undefined && dto[key] !== resource[key])
            throw new BadRequestException('内置系统资源的路由结构与权限标识不能修改')
        }
        if (dto.enabled === false) throw new BadRequestException('内置系统资源不能停用')
        if (dto.apiCodes !== undefined) {
          const current = (await manager.findBy(AdminResourceApi, { resourceId: id, isDeleted: 0 }))
            .map((binding) => binding.apiCode)
            .sort()
          if (current.join(',') !== [...dto.apiCodes].sort().join(',')) throw new BadRequestException('内置系统资源的接口绑定不能修改')
        }
      }
      for (const key of [
        'parentId',
        'type',
        'title',
        'name',
        'path',
        'component',
        'icon',
        'permission',
        'enabled',
        'sort',
        'hidden',
        'keepAlive',
      ] as const) {
        if (dto[key] !== undefined) Object.assign(resource, { [key]: dto[key] })
      }
      await this.validateResource(manager, resource)
      if (resource.type === 'directory') {
        const hasBindings =
          dto.apiCodes === undefined
            ? (await manager.countBy(AdminResourceApi, { resourceId: id, isDeleted: 0 })) > 0
            : dto.apiCodes.length > 0
        if (hasBindings) throw new BadRequestException('目录不能绑定接口')
      }
      if (dto.apiCodes !== undefined) {
        this.apiResources.validateCodes(dto.apiCodes)
        const existing = await manager.findBy(AdminResourceApi, { resourceId: id, isDeleted: 0 })
        const current = new Set(existing.map((binding) => binding.apiCode))
        assertApisAllowed(
          authorization,
          dto.apiCodes.filter((apiCode) => !current.has(apiCode)),
          '不能绑定未获授权的接口',
        )
      }
      Object.assign(resource, audit.update())
      await manager.save(AdminPermissionResource, resource)
      if (dto.apiCodes !== undefined) await this.replaceResourceApis(manager, id, dto.apiCodes, audit)
    })
  }

  /**
   * 删除权限资源
   * @description 含有未删除子节点时拒绝删除；软删除资源并释放唯一的路由名称、路径与权限标识，同时软删除关联
   * @param id 资源 UUID
   * @param actorId 当前操作人 UUID
   */
  async deleteResource(id: string, actorId: string): Promise<void> {
    await this.store.mutate(actorId, async (manager, audit) => {
      const resource = await this.store.requireResource(manager, id)
      this.assertMutableResource(id)
      if (await manager.existsBy(AdminPermissionResource, { parentId: id, isDeleted: 0 })) {
        throw new BadRequestException('请先删除子资源')
      }
      // 唯一索引无法表达软删除，删除时清空可空唯一值以允许重新创建同名资源。
      resource.isDeleted = 1
      resource.enabled = false
      resource.name = null
      resource.path = null
      resource.permission = null
      Object.assign(resource, audit.update())
      await manager.save(AdminPermissionResource, resource)
      await manager.update(AdminRoleResource, { resourceId: id, isDeleted: 0 }, { isDeleted: 1, ...audit.update() })
      await manager.update(AdminResourceApi, { resourceId: id, isDeleted: 0 }, { isDeleted: 1, ...audit.update() })
    })
  }

  private assertMutableResource(id: string): void {
    if (BUILTIN_RESOURCE_IDS.includes(id)) throw new BadRequestException('内置系统资源不能修改或删除')
  }

  /**
   * 替换资源接口绑定
   * @description 先读取全部绑定（含软删除），按目标集合恢复或撤销；接口编码由接口清单服务校验
   * @param manager 事务管理器
   * @param id 资源 UUID
   * @param codes 目标接口编码集合
   * @param audit 写事务审计上下文
   */
  private async replaceResourceApis(manager: EntityManager, id: string, codes: string[], audit: RbacAudit): Promise<void> {
    if (new Set(codes).size !== codes.length) throw new BadRequestException('接口编码不能重复')
    await replaceSoftDeleted(manager, AdminResourceApi, { resourceId: id }, 'apiCode', codes, audit)
  }

  private async validateResource(manager: EntityManager, resource: AdminPermissionResource): Promise<void> {
    const resources = await manager.find(AdminPermissionResource, { where: { isDeleted: 0 } })
    const byId = new Map(resources.map((item) => [item.id, item]))
    byId.set(resource.id, resource)
    const seen = new Set([resource.id])
    let parentId = resource.parentId
    while (parentId) {
      if (seen.has(parentId)) throw new BadRequestException('资源不能形成循环层级')
      seen.add(parentId)
      const parent = byId.get(parentId)
      if (!parent) throw new BadRequestException('父资源不存在')
      parentId = parent.parentId
    }
    const parent = resource.parentId ? byId.get(resource.parentId) : undefined
    if (resource.type === 'button') {
      if (parent?.type !== 'menu') throw new BadRequestException('按钮必须归属页面')
      if (!resource.permission) throw new BadRequestException('按钮必须填写权限标识')
      if (resource.name !== null || resource.path !== null || resource.component !== null)
        throw new BadRequestException('按钮不能配置路由名称、路径或组件')
    } else {
      if (parent && parent.type !== 'directory') throw new BadRequestException('目录和页面只能归属目录')
      if (resource.type === 'menu' && !parent) throw new BadRequestException('页面必须归属目录')
      if (!resource.name || !resource.path) throw new BadRequestException('目录和页面必须填写路由名称与路径')
      if (ADMIN_ROUTE_POLICY.reservedNames.includes(resource.name)) throw new BadRequestException('路由名称与系统公共路由冲突')
      if (resource.type === 'menu' && (!resource.component || resource.component === '/index/index'))
        throw new BadRequestException('页面必须填写有效的页面组件标识')
      if (resource.type === 'directory' && !parent && resource.component !== '/index/index')
        throw new BadRequestException('根目录必须使用布局组件')
      if (resource.type === 'directory' && parent && resource.component) throw new BadRequestException('嵌套目录不配置组件')
      if ((!parent && !resource.path.startsWith('/')) || !ADMIN_ROUTE_POLICY.pathPattern.test(resource.path))
        throw new BadRequestException('路由路径格式不正确')
      if (
        resource.component &&
        (!resource.component.startsWith('/') || resource.component.includes('..') || resource.component.includes('://'))
      )
        throw new BadRequestException('组件标识格式不正确')
      const path = resource.path.toLowerCase()
      if (resources.some((item) => item.id !== resource.id && item.path?.toLowerCase() === path))
        throw new ConflictException('菜单路径不能重复')
    }
    for (const child of resources.filter((item) => item.parentId === resource.id)) {
      if (
        resource.type === 'button' ||
        (resource.type === 'menu' && child.type !== 'button') ||
        (resource.type === 'directory' && child.type === 'button')
      ) {
        throw new BadRequestException('资源类型与现有子资源不匹配')
      }
    }
    // 绝对与相对路径可能指向同一路由；移动目录后还需检查全部后代的最终路径。
    const routePaths = new Map<string, string>()
    for (const candidate of byId.values()) {
      if (candidate.type === 'button' || !candidate.path) continue
      const segments: string[] = []
      const ancestors = new Set<string>()
      let current: AdminPermissionResource | undefined = candidate
      while (current) {
        if (ancestors.has(current.id)) throw new BadRequestException('资源不能形成循环层级')
        ancestors.add(current.id)
        segments.unshift(current.path ?? '')
        if (current.path?.startsWith('/')) break
        current = current.parentId ? byId.get(current.parentId) : undefined
      }
      // Vue Router 默认不区分路径大小写，唯一性检查必须使用相同口径。
      const fullPath = ('/' + segments.join('/').split('/').filter(Boolean).join('/')).toLowerCase()
      if (routePaths.has(fullPath)) throw new ConflictException('路由完整路径不能重复')
      routePaths.set(fullPath, candidate.id)
    }
  }

  private resourceView(resource: AdminPermissionResource, bindings: AdminResourceApi[]): AdminResourceView {
    return {
      id: resource.id,
      parentId: resource.parentId,
      type: resource.type,
      title: resource.title,
      name: resource.name,
      path: resource.path,
      component: resource.component,
      icon: resource.icon,
      permission: resource.permission,
      enabled: resource.enabled,
      sort: resource.sort,
      hidden: resource.hidden,
      keepAlive: resource.keepAlive,
      isBuiltin: BUILTIN_RESOURCE_IDS.includes(resource.id),
      apiCodes: bindings
        .filter((binding) => binding.resourceId === resource.id)
        .map((binding) => binding.apiCode)
        .sort(),
    }
  }
}
