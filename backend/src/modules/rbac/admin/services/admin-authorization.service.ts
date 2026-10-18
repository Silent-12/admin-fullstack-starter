import { Injectable, UnauthorizedException } from '@nestjs/common'
import { In } from 'typeorm'
import type { EntityManager } from 'typeorm'
import { DataSource } from 'typeorm'
import type { AdminAuthorization, AdminMenuRoute } from '../../../../types/rbac.js'
import { isBuiltinAdmin } from '../../../auth/admin/admin-user.util.js'
import { AdminUser } from '../../../auth/admin/entities/admin-user.entity.js'
import { AdminPermissionResource } from '../entities/admin-permission-resource.entity.js'
import { AdminResourceApi } from '../entities/admin-resource-api.entity.js'
import { AdminRole } from '../entities/admin-role.entity.js'
import { AdminRoleResource } from '../entities/admin-role-resource.entity.js'
import { AdminUserRole } from '../entities/admin-user-role.entity.js'

/**
 * 后台授权查询服务
 * @description 每次从数据库合并启用且未删除角色显式绑定的有效资源；不存在超级管理员旁路，父节点不隐式授予子节点权限
 */
@Injectable()
export class AdminAuthorizationService {
  constructor(private readonly source: DataSource) {}

  /**
   * 获取当前有效授权
   * @description 只合并启用角色明确绑定的有效资源，禁用、软删除祖先与环形数据一律阻断授权
   * @param userId 用户 UUID
   * @returns 资源、接口与界面按钮权限
   */
  async getAuthorization(userId: string): Promise<AdminAuthorization> {
    return this.source.transaction('REPEATABLE READ', async (manager) => (await this.resolve(manager, userId)).authorization)
  }

  /**
   * 生成当前用户授权菜单
   * @description 直接复用守卫已计算的授权快照，只查询有效资源表建树并补齐目录祖先，不重复计算完整授权
   * @param authorization 当前请求的授权快照
   * @returns 可直接供前端动态路由转换器使用的导航树
   */
  async getUserMenus(authorization: AdminAuthorization): Promise<AdminMenuRoute[]> {
    const resources = await this.source
      .getRepository(AdminPermissionResource)
      .find({ where: { enabled: true, isDeleted: 0 }, order: { sort: 'ASC', id: 'ASC' } })
    const byId = new Map(resources.map((resource) => [resource.id, resource]))
    const explicit = new Set(authorization.resourceIds)
    const visible = new Set<string>()
    for (const id of explicit) {
      let resource = byId.get(id)
      // 按钮的授权只控制按钮，不凭按钮授权额外显示未获授权页面。
      if (!resource || resource.type === 'button') continue
      while (resource) {
        visible.add(resource.id)
        resource = resource.parentId ? byId.get(resource.parentId) : undefined
      }
    }
    const nodes = new Map<string, AdminMenuRoute>()
    for (const resource of resources) {
      if (!visible.has(resource.id) || resource.type === 'button' || !resource.name || !resource.path) continue
      nodes.set(resource.id, {
        id: resource.id,
        name: resource.name,
        path: resource.path,
        ...(resource.component ? { component: resource.component } : {}),
        meta: {
          title: resource.title,
          ...(resource.icon ? { icon: resource.icon } : {}),
          isHide: resource.hidden,
          keepAlive: resource.keepAlive,
        },
        children: [],
      })
    }
    const roots: AdminMenuRoute[] = []
    for (const resource of resources) {
      const node = nodes.get(resource.id)
      if (!node) continue
      if (!resource.parentId) roots.push(node)
      else nodes.get(resource.parentId)?.children.push(node)
    }
    const prune = (routes: AdminMenuRoute[]): AdminMenuRoute[] =>
      routes.filter((route) => {
        route.children = prune(route.children)
        return byId.get(route.id)?.type !== 'directory' || route.children.length > 0
      })
    return prune(roots)
  }

  /**
   * 计算用户有效授权
   * @description 未删除且启用的用户按启用角色合并显式资源，逐级校验祖先有效性后读取接口绑定
   * @param manager 事务管理器
   * @param userId 用户 UUID
   * @returns 当前授权与全部有效资源
   */
  private async resolve(
    manager: EntityManager,
    userId: string,
  ): Promise<{ authorization: AdminAuthorization; resources: AdminPermissionResource[] }> {
    const user = await manager.findOneBy(AdminUser, { id: userId, isDeleted: 0, enabled: true })
    if (!user) throw new UnauthorizedException('登录已失效，请重新登录')
    const empty: AdminAuthorization = { resourceIds: [], apiCodes: [], permissions: [], isBuiltin: isBuiltinAdmin(user) }
    const assignments = await manager.findBy(AdminUserRole, { userId, isDeleted: 0 })
    if (!assignments.length) return { authorization: empty, resources: [] }
    const roles = await manager.findBy(AdminRole, { id: In(assignments.map((row) => row.roleId)), enabled: true, isDeleted: 0 })
    if (!roles.length) return { authorization: empty, resources: [] }
    const resources = await manager.find(AdminPermissionResource, { where: { isDeleted: 0 }, order: { sort: 'ASC', id: 'ASC' } })
    const byId = new Map(resources.map((resource) => [resource.id, resource]))
    const grants = (await manager.findBy(AdminRoleResource, { roleId: In(roles.map((role) => role.id)), isDeleted: 0 })).map(
      (row) => row.resourceId,
    )
    const effective = [...new Set(grants)].filter((id) => {
      const seen = new Set<string>()
      let resource = byId.get(id)
      while (resource) {
        if (!resource.enabled || seen.has(resource.id)) return false
        seen.add(resource.id)
        if (!resource.parentId) return true
        resource = byId.get(resource.parentId)
      }
      return false
    })
    const bindings = effective.length ? await manager.findBy(AdminResourceApi, { resourceId: In(effective), isDeleted: 0 }) : []
    const permissions = effective.map((id) => byId.get(id)?.permission).filter((permission): permission is string => !!permission)
    return {
      authorization: {
        resourceIds: effective.sort(),
        apiCodes: [...new Set(bindings.map((binding) => binding.apiCode))].sort(),
        permissions: [...new Set(permissions)].sort(),
        isBuiltin: isBuiltinAdmin(user),
      },
      resources,
    }
  }
}
