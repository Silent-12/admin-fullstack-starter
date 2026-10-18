import { BadRequestException, ConflictException, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { In, Like } from 'typeorm'
import type { EntityManager } from 'typeorm'
import { DataSource } from 'typeorm'
import type { PaginatedData } from '../../../../common/types/response.js'
import type { AdminAuthorization, AdminUserView } from '../../../../types/rbac.js'
import { isBuiltinAdmin } from '../../../auth/admin/admin-user.util.js'
import { AdminUser } from '../../../auth/admin/entities/admin-user.entity.js'
import { PasswordService } from '../../../auth/admin/password.service.js'
import { AdminRole } from '../entities/admin-role.entity.js'
import { AdminRoleResource } from '../entities/admin-role-resource.entity.js'
import { AdminUserRole } from '../entities/admin-user-role.entity.js'
import { RbacStoreService, assertResourcesAllowed, replaceSoftDeleted } from './rbac-store.service.js'
import type { RbacAudit } from './rbac-store.service.js'
import type { CreateUserDto, RbacQueryDto, UpdateUserDto } from '../dto/rbac.dto.js'

/**
 * 后台用户管理服务
 * @description 维护用户资料、角色绑定与密码重置；所有写操作在互斥事务内执行并记录审计字段
 */
@Injectable()
export class AdminUserService {
  constructor(
    private readonly source: DataSource,
    private readonly store: RbacStoreService,
    private readonly passwords: PasswordService,
  ) {}

  /**
   * 查询用户列表
   * @description 分页返回未删除用户的公开资料、角色与启用状态，不读取密码或令牌
   * @param query 分页与筛选参数
   * @returns 用户分页结果
   */
  async listUsers(query: RbacQueryDto): Promise<PaginatedData<AdminUserView>> {
    const { page, pageSize } = this.store.pagination(query)
    const builder = this.source.getRepository(AdminUser).createQueryBuilder('user').where('user.isDeleted = 0')
    if (query.keyword) builder.andWhere('(user.username LIKE :keyword OR user.name LIKE :keyword)', { keyword: '%' + query.keyword + '%' })
    if (query.enabled !== undefined) builder.andWhere('user.enabled = :enabled', { enabled: query.enabled })
    const [users, total] = await builder
      .orderBy('user.createTime', 'DESC')
      .addOrderBy('user.id', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount()
    return this.store.paginated(await this.userViews(this.source.manager, users), page, pageSize, total)
  }

  /**
   * 查询用户详情
   * @description 返回未删除用户的公开资料与角色
   * @param id 用户 UUID
   * @returns 用户详情
   */
  async getUser(id: string): Promise<AdminUserView> {
    const user = await this.store.requireUser(this.source.manager, id)
    return (await this.userViews(this.source.manager, [user]))[0]!
  }

  /**
   * 创建后台用户
   * @description 先生成密码哈希，再在事务内分配唯一用户名并保存用户与全部角色绑定；同名用户自动追加数字后缀
   * @param dto 用户资料和角色
   * @param actorId 当前操作人 UUID
   * @param authorization 当前请求的授权快照
   */
  async createUser(dto: CreateUserDto, actorId: string, authorization: AdminAuthorization): Promise<void> {
    const passwordHash = await this.passwords.hash(dto.password)
    await this.store.mutate(actorId, async (manager, audit) => {
      const user = manager.create(AdminUser, {
        id: randomUUID(),
        username: await this.allocateUsername(manager, dto.username),
        name: dto.name,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        avatar: dto.avatar ?? null,
        enabled: dto.enabled,
        passwordHash,
        tokenVersion: 1,
        token: null,
        lastLoginTime: null,
        lastLoginIp: null,
        ...audit.create(),
      })
      await manager.insert(AdminUser, user)
      await this.replaceUserRoles(manager, user, dto.roleIds, audit, authorization)
    })
  }

  /**
   * 更新后台用户
   * @description 资料和角色绑定原子更新；内置管理员禁止停用和修改角色绑定，普通用户只能分配操作者授权范围内的角色
   * @param id 用户 UUID
   * @param dto 需要变更的资料和可选角色列表
   * @param actorId 当前操作人 UUID
   * @param authorization 当前请求的授权快照
   */
  async updateUser(id: string, dto: UpdateUserDto, actorId: string, authorization: AdminAuthorization): Promise<void> {
    await this.store.mutate(actorId, async (manager, audit) => {
      const user = await this.store.requireUser(manager, id)
      if (this.protectedUser(user) && dto.enabled === false) throw new BadRequestException('内置管理员不能停用')
      if (dto.roleIds !== undefined) await this.replaceUserRoles(manager, user, dto.roleIds, audit, authorization)
      for (const key of ['name', 'phone', 'email', 'avatar'] as const) {
        if (dto[key] !== undefined) Object.assign(user, { [key]: dto[key] })
      }
      if (dto.enabled !== undefined && dto.enabled !== user.enabled) {
        user.enabled = dto.enabled
        user.tokenVersion += 1
        user.token = null
      }
      Object.assign(user, audit.update())
      await manager.save(AdminUser, user)
    })
  }

  /**
   * 删除后台用户
   * @description 软删除用户并撤销令牌、软删除角色绑定，禁止删除内置管理员
   * @param id 用户 UUID
   * @param actorId 当前操作人 UUID
   */
  async deleteUser(id: string, actorId: string): Promise<void> {
    await this.store.mutate(actorId, async (manager, audit) => {
      const user = await this.store.requireUser(manager, id)
      if (this.protectedUser(user)) throw new BadRequestException('内置管理员不能删除')
      await manager.update(AdminUserRole, { userId: id, isDeleted: 0 }, { isDeleted: 1, ...audit.update() })
      await manager.update(AdminUser, id, {
        isDeleted: 1,
        enabled: false,
        token: null,
        tokenVersion: () => 'token_version + 1',
        ...audit.update(),
      })
    })
  }

  /**
   * 重置后台用户密码
   * @description 更新密码哈希并递增令牌版本，旧会话立即失效
   * @param id 用户 UUID
   * @param password 新明文密码
   * @param actorId 当前操作人 UUID
   */
  async resetPassword(id: string, password: string, actorId: string): Promise<void> {
    const passwordHash = await this.passwords.hash(password)
    await this.store.mutate(actorId, async (manager, audit) => {
      await this.store.requireUser(manager, id)
      await manager.update(AdminUser, id, {
        passwordHash,
        token: null,
        tokenVersion: () => 'token_version + 1',
        ...audit.update(),
      })
    })
  }

  private protectedUser(user: AdminUser): boolean {
    return isBuiltinAdmin(user)
  }

  /**
   * 分配唯一用户名
   * @description 包含软删除记录判断占用，同名时依次尝试 `hlh1`、`hlh2`；事务互斥已保证并发创建不会产生相同后缀
   * @param manager 事务管理器
   * @param requested 客户端提交的用户名
   * @returns 可直接写入的唯一用户名
   */
  private async allocateUsername(manager: EntityManager, requested: string): Promise<string> {
    // 使用较短公共前缀查询，覆盖 64 位用户名追加数字后被截断的候选值。
    const prefix = requested.slice(0, Math.min(requested.length, 32))
    const rows = await manager.find(AdminUser, {
      select: { username: true },
      where: { username: Like(`${prefix}%`) },
    })
    const taken = new Set(rows.map((row) => row.username))
    if (!taken.has(requested)) return requested
    for (let index = 1; index < Number.MAX_SAFE_INTEGER; index++) {
      const suffix = String(index)
      const candidate = `${requested.slice(0, 64 - suffix.length)}${suffix}`
      if (!taken.has(candidate)) return candidate
    }
    throw new ConflictException('用户名可用后缀已用尽，请更换用户名')
  }

  /**
   * 替换用户角色绑定
   * @description 内置管理员的角色绑定固定；普通用户只能新分配启用、未删除且资源范围不超出操作者授权的角色，
   * 已生效的禁用角色绑定允许保留，避免编辑资料时静默改授权。关联行按现有记录（含软删除）恢复或撤销，不执行物理删除
   * @param manager 事务管理器
   * @param user 用户实体
   * @param roleIds 目标角色 UUID 集合
   * @param audit 写事务审计上下文
   * @param authorization 当前请求的授权快照
   */
  private async replaceUserRoles(
    manager: EntityManager,
    user: AdminUser,
    roleIds: string[],
    audit: RbacAudit,
    authorization: AdminAuthorization,
  ): Promise<void> {
    if (new Set(roleIds).size !== roleIds.length) throw new BadRequestException('角色不能重复')
    // 这里必须包含软删除记录，才能复用原复合主键行恢复绑定而不是插入重复行。
    const existing = await manager.findBy(AdminUserRole, { userId: user.id })
    const activeRoleIds = existing.filter((row) => row.isDeleted === 0).map((row) => row.roleId)
    // 内置管理员的角色固定为初始化绑定，不允许通过用户接口增删。
    if (this.protectedUser(user)) {
      if ([...activeRoleIds].sort().join(',') !== [...roleIds].sort().join(',')) throw new BadRequestException('内置管理员角色不能修改')
      return
    }
    const active = new Set(activeRoleIds)
    const newRoleIds = roleIds.filter((roleId) => !active.has(roleId))
    if (newRoleIds.length) {
      const roles = await manager.findBy(AdminRole, { id: In(newRoleIds), isDeleted: 0 })
      if (roles.length !== newRoleIds.length) throw new BadRequestException('包含不存在的角色')
      if (roles.some((role) => role.isBuiltin)) throw new BadRequestException('不能分配内置角色')
      if (roles.some((role) => !role.enabled)) throw new BadRequestException('包含已停用的角色')
      const grants = await manager.findBy(AdminRoleResource, { roleId: In(newRoleIds), isDeleted: 0 })
      assertResourcesAllowed(
        authorization,
        grants.map((grant) => grant.resourceId),
        '不能分配超出自身权限范围的角色',
      )
    }
    await replaceSoftDeleted(manager, AdminUserRole, { userId: user.id }, 'roleId', roleIds, audit)
  }

  private async userViews(manager: EntityManager, users: AdminUser[]): Promise<AdminUserView[]> {
    const assignments = users.length ? await manager.findBy(AdminUserRole, { userId: In(users.map((user) => user.id)), isDeleted: 0 }) : []
    const roleIds = [...new Set(assignments.map((item) => item.roleId))]
    const roles = roleIds.length ? await manager.findBy(AdminRole, { id: In(roleIds), isDeleted: 0 }) : []
    const roleMap = new Map(roles.map((role) => [role.id, role.code]))
    return users.map((user) => {
      const userRoles = assignments.filter((item) => item.userId === user.id)
      return {
        id: user.id,
        username: user.username,
        name: user.name,
        phone: user.phone,
        email: user.email,
        avatar: user.avatar,
        enabled: user.enabled,
        roleIds: userRoles.map((item) => item.roleId).sort(),
        roleCodes: userRoles
          .map((item) => roleMap.get(item.roleId))
          .filter((code): code is string => !!code)
          .sort(),
        isBuiltin: isBuiltinAdmin(user),
        createTime: user.createTime,
        lastLoginTime: user.lastLoginTime,
      }
    })
  }
}
