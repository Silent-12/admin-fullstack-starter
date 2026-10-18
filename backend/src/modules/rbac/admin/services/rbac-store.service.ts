import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common'
import { DataSource } from 'typeorm'
import type { EntityManager, EntityTarget, FindOptionsWhere, QueryDeepPartialEntity } from 'typeorm'
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '../../../../common/constants/pagination.constant.js'
import { PaginationMetaDto } from '../../../../common/dto/pagination-meta.dto.js'
import { isDependencyUnavailable } from '../../../../common/utils/dependency-unavailable.util.js'
import { getDefaultErrorMessage } from '../../../../common/utils/error-message.util.js'
import type { PaginatedData } from '../../../../common/types/response.js'
import type { AdminAuthorization } from '../../../../types/rbac.js'
import { AdminUser } from '../../../auth/admin/entities/admin-user.entity.js'
import { AdminRole } from '../entities/admin-role.entity.js'
import { AdminPermissionResource } from '../entities/admin-permission-resource.entity.js'
import { SUPER_ROLE_ID } from '../initialize-rbac.js'
import type { RbacQueryDto } from '../dto/rbac.dto.js'

/**
 * 写事务审计上下文
 * @description 单次写事务内统一生成审计字段，系统初始化使用 `system`，接口请求使用当前操作人 UUID
 */
export interface RbacAudit {
  // 当前操作人 UUID
  readonly actorId: string
  // 事务统一的 Unix 秒时间戳
  readonly now: number
  // 生成新增记录的审计字段
  create(): RbacCreateAudit
  // 生成更新记录的审计字段
  update(): RbacUpdateAudit
}

/**
 * 新增记录审计字段
 * @description 与实体审计列一一对应，避免各服务重复拼写字段名
 */
export interface RbacCreateAudit {
  createTime: number
  updateTime: number
  createdBy: string
  updatedBy: string
  isDeleted: number
}

/**
 * 更新记录审计字段
 * @description 仅更新最后操作人与更新时间，不修改创建信息
 */
export interface RbacUpdateAudit {
  updateTime: number
  updatedBy: string
}

/**
 * 校验资源是否位于操作者授权范围
 * @description 委派管理只能操作自身已获得的资源，避免通过角色分配或授权扩大权限
 * @param authorization 当前请求的授权快照
 * @param resourceIds 待校验资源 UUID 集合
 * @param message 校验失败提示
 */
export function assertResourcesAllowed(authorization: AdminAuthorization, resourceIds: string[], message: string): void {
  if (authorization.isBuiltin) return
  const allowed = new Set(authorization.resourceIds)
  if (resourceIds.some((resourceId) => !allowed.has(resourceId))) throw new ForbiddenException(message)
}

/**
 * 校验接口是否位于操作者授权范围
 * @description 资源接口绑定会直接影响角色有效权限，新增绑定必须限制在操作者自身可访问接口内
 * @param authorization 当前请求的授权快照
 * @param apiCodes 待校验接口编码
 * @param message 校验失败提示
 */
export function assertApisAllowed(authorization: AdminAuthorization, apiCodes: string[], message: string): void {
  if (authorization.isBuiltin) return
  const allowed = new Set(authorization.apiCodes)
  if (apiCodes.some((apiCode) => !allowed.has(apiCode))) throw new ForbiddenException(message)
}

/**
 * 替换软删除关联集合
 * @description 先读取包含软删除行的完整关联，按目标键恢复或撤销，再补齐缺失行；复合主键行不会被物理删除
 * @param manager 事务管理器
 * @param entity 关联实体
 * @param scope 关联所属范围，例如角色、用户或资源 UUID
 * @param keyField 目标集合对应的关联字段
 * @param targetKeys 目标关联键集合
 * @param audit 写事务审计上下文
 */
export async function replaceSoftDeleted<T extends Record<string, unknown> & { isDeleted: number }>(
  manager: EntityManager,
  entity: EntityTarget<T>,
  scope: FindOptionsWhere<T>,
  keyField: Extract<keyof T, string>,
  targetKeys: string[],
  audit: RbacAudit,
): Promise<void> {
  const existing = await manager.findBy(entity, scope)
  const keep = new Set(targetKeys)
  for (const row of existing) {
    const key = row[keyField] as string
    if (keep.has(key) === (row.isDeleted === 0)) continue
    await manager.update(entity, { ...scope, [keyField]: key }, {
      isDeleted: keep.has(key) ? 0 : 1,
      ...audit.update(),
    } as unknown as QueryDeepPartialEntity<T>)
  }
  const known = new Set(existing.map((row) => row[keyField] as string))
  const added = targetKeys.filter((key) => !known.has(key))
  if (!added.length) return
  await manager.insert(
    entity,
    added.map((key) => ({ ...scope, [keyField]: key, ...audit.create() })) as unknown as QueryDeepPartialEntity<T>[],
  )
}

/**
 * 权限配置存储服务
 * @description 提供串行化写事务、实体读取校验、分页与审计字段能力，供用户、角色、资源与授权领域服务复用
 */
@Injectable()
export class RbacStoreService {
  private readonly logger = new Logger(RbacStoreService.name)

  constructor(private readonly source: DataSource) {}

  /**
   * 在权限配置互斥锁内执行写事务
   * @description 固定锁定内置角色行使移树、删除与授权串行执行；已知业务异常直接抛出，数据库异常收敛为安全提示
   * @param actorId 当前操作人 UUID，写入全部受影响记录的审计字段
   * @param operation 在事务管理器与审计上下文中执行的写操作
   */
  async mutate(actorId: string, operation: (manager: EntityManager, audit: RbacAudit) => Promise<void>): Promise<void> {
    try {
      await this.source.transaction(async (manager) => {
        const mutex = await manager.findOne(AdminRole, { where: { id: SUPER_ROLE_ID }, lock: { mode: 'pessimistic_write' } })
        if (!mutex) throw new ServiceUnavailableException(getDefaultErrorMessage(HttpStatus.SERVICE_UNAVAILABLE))
        await operation(manager, this.audit(actorId))
      })
    } catch (error) {
      if (error instanceof HttpException) throw error
      const driver = error && typeof error === 'object' && 'driverError' in error ? (error.driverError as { code?: string }) : undefined
      if (driver?.code === 'ER_DUP_ENTRY') throw new ConflictException('用户名、角色编码、路由名称、菜单路径或权限标识已存在')
      // 不记录数据库异常对象或 SQL 参数，写入参数可能包含密码哈希和用户资料。
      this.logger.error('权限配置事务失败')
      if (isDependencyUnavailable(error)) throw new ServiceUnavailableException(getDefaultErrorMessage(HttpStatus.SERVICE_UNAVAILABLE))
      throw new InternalServerErrorException(getDefaultErrorMessage(HttpStatus.INTERNAL_SERVER_ERROR))
    }
  }

  /**
   * 读取未删除用户
   * @description 事务内使用悲观锁，避免认证并发更新令牌版本时读到旧记录
   * @param manager 事务管理器
   * @param id 用户 UUID
   * @returns 未删除的用户实体
   */
  async requireUser(manager: EntityManager, id: string): Promise<AdminUser> {
    const user = await manager.findOne(AdminUser, {
      where: { id, isDeleted: 0 },
      ...(manager.queryRunner?.isTransactionActive ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    })
    if (!user) throw new NotFoundException('用户不存在')
    return user
  }

  /**
   * 读取未删除角色
   * @description 软删除角色与未记录角色统一按不存在处理
   * @param manager 事务管理器
   * @param id 角色 UUID
   * @returns 未删除的角色实体
   */
  async requireRole(manager: EntityManager, id: string): Promise<AdminRole> {
    const role = await manager.findOneBy(AdminRole, { id, isDeleted: 0 })
    if (!role) throw new NotFoundException('角色不存在')
    return role
  }

  /**
   * 读取未删除权限资源
   * @description 软删除资源与未记录资源统一按不存在处理
   * @param manager 事务管理器
   * @param id 资源 UUID
   * @returns 未删除的权限资源实体
   */
  async requireResource(manager: EntityManager, id: string): Promise<AdminPermissionResource> {
    const resource = await manager.findOneBy(AdminPermissionResource, { id, isDeleted: 0 })
    if (!resource) throw new NotFoundException('资源不存在')
    return resource
  }

  /**
   * 解析分页参数
   * @description 未传时使用公共默认值，上限由 `RbacQueryDto` 继承的分页 DTO 校验
   * @param query 分页与筛选参数
   * @returns 规范化后的页码与每页条数
   */
  pagination(query: RbacQueryDto): { page: number; pageSize: number } {
    return { page: query.page ?? DEFAULT_PAGE, pageSize: query.pageSize ?? DEFAULT_PAGE_SIZE }
  }

  /**
   * 组装分页响应
   * @description 统一使用公共分页元信息 DTO
   * @param list 当前页数据
   * @param page 页码
   * @param pageSize 每页条数
   * @param total 总条数
   * @returns 标准分页数据
   */
  paginated<T>(list: T[], page: number, pageSize: number, total: number): PaginatedData<T> {
    return { list, pagination: new PaginationMetaDto(page, pageSize, total) }
  }

  /**
   * 创建写事务审计上下文
   * @description 同一次事务共用更新时间，避免同一操作写入的记录时间不一致
   * @param actorId 当前操作人 UUID
   * @returns 审计上下文
   */
  private audit(actorId: string): RbacAudit {
    const now = Math.floor(Date.now() / 1000)
    return {
      actorId,
      now,
      create: () => ({ createTime: now, updateTime: now, createdBy: actorId, updatedBy: actorId, isDeleted: 0 }),
      update: () => ({ updateTime: now, updatedBy: actorId }),
    }
  }
}
