import { BadRequestException, Injectable, NotFoundException, RequestMethod } from '@nestjs/common'
import type { OnApplicationBootstrap, OnModuleInit } from '@nestjs/common'
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js'
import { DiscoveryService, MetadataScanner } from '@nestjs/core'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ADMIN_API_METADATA } from '../../../common/auth/admin-api.decorator.js'
import { isAdminControllerPath } from '../../../common/auth/admin-route.util.js'
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '../../../common/constants/pagination.constant.js'
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js'
import type { PaginatedData } from '../../../common/types/response.js'
import type { AdminApiMetadata, ApiDefinition, ApiResourceItem, ApiTreeNode } from '../../../types/api-resource.js'
import type { ApiResourceQueryDto, UpdateApiResourceDto } from './dto/api-resource.dto.js'
import { AdminApiResource } from './entities/admin-api-resource.entity.js'

/**
 * 接口清单服务
 * @description 从实际控制器处理方法登记接口；持久化配置仅影响展示，访问策略始终由代码决定
 */
@Injectable()
export class ApiResourceService implements OnModuleInit, OnApplicationBootstrap {
  private readonly definitions = new Map<string, ApiDefinition>()
  private readonly handlers = new Map<object, ApiDefinition>()

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly scanner: MetadataScanner,
    @InjectRepository(AdminApiResource) private readonly resources: Repository<AdminApiResource>,
  ) {}

  /**
   * 检查并登记实际接口
   * @description 后台接口必须使用 `AdminApi` 声明；缺少声明、编码重复或路由别名不明确时终止启动，避免漏保护接口
   */
  onModuleInit(): void {
    this.definitions.clear()
    this.handlers.clear()
    for (const wrapper of this.discovery.getControllers()) {
      if (!wrapper.metatype || !wrapper.instance) continue
      const controllerPaths = this.paths(Reflect.getMetadata(PATH_METADATA, wrapper.metatype) as unknown)
      const isAdmin = isAdminControllerPath(controllerPaths)
      const prototype = Object.getPrototypeOf(wrapper.instance) as object
      for (const name of this.scanner.getAllMethodNames(prototype)) {
        const handler = (wrapper.instance as Record<string, unknown>)[name]
        if (typeof handler !== 'function') continue
        const method = Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod | undefined
        if (method === undefined) continue
        const metadata = Reflect.getMetadata(ADMIN_API_METADATA, handler) as AdminApiMetadata | undefined
        if (isAdmin && !metadata) throw new Error(`后台接口缺少 AdminApi 声明：${wrapper.metatype.name}.${name}`)
        const access = metadata?.access ?? (isAdmin ? 'permission' : 'public')
        if (!['public', 'authenticated', 'permission'].includes(access)) throw new Error('接口访问策略无效')
        const handlerPaths = this.paths(Reflect.getMetadata(PATH_METADATA, handler) as unknown)
        if (controllerPaths.length !== 1 || handlerPaths.length !== 1 || method === RequestMethod.ALL) {
          throw new Error(`接口清单要求每个处理方法具有唯一方法和路由：${wrapper.metatype.name}.${name}`)
        }
        const definition: ApiDefinition = {
          code: metadata?.code ?? `${isAdmin ? 'session' : 'public'}.${wrapper.metatype.name}.${name}`,
          module: metadata?.module ?? (isAdmin ? '后台认证' : '公共接口'),
          feature: metadata?.feature ?? wrapper.metatype.name,
          action: metadata?.action ?? name,
          method: RequestMethod[method],
          path: `/${[controllerPaths[0], handlerPaths[0]].filter(Boolean).join('/')}`.replace(/\/+/g, '/').replace(/\/$/, '') || '/',
          access,
        }
        if (!/^[A-Za-z][A-Za-z0-9_.-]{0,127}$/.test(definition.code)) throw new Error('接口编码格式无效')
        if (this.definitions.has(definition.code)) throw new Error(`接口编码重复：${definition.code}`)
        this.definitions.set(definition.code, definition)
        this.handlers.set(handler, definition)
      }
    }
  }

  /**
   * 初始化接口展示配置
   * @description 只插入当前缺失记录并补齐审计字段；不覆盖人工展示配置，不删除其他运行版本仍可能使用的记录
   */
  async onApplicationBootstrap(): Promise<void> {
    const now = Math.floor(Date.now() / 1000)
    const rows = [...this.definitions.values()].map(({ code, module, feature, action }) => ({
      code,
      module,
      feature,
      action,
      aliases: [],
      sort: 0,
      createTime: now,
      updateTime: now,
      createdBy: 'system',
      updatedBy: 'system',
      isDeleted: 0,
    }))
    if (rows.length) await this.resources.createQueryBuilder().insert().values(rows).orIgnore().execute()
  }

  /**
   * 获取已匹配方法的安全定义
   * @description 不读取原始请求 URL，未登记方法返回 undefined 由守卫拒绝
   * @param handler Nest 已匹配的实际处理方法
   * @returns 当前版本接口定义
   */
  getDefinition(handler: object): ApiDefinition | undefined {
    return this.handlers.get(handler)
  }

  /**
   * 按编码获取已登记接口
   * @description 供启动校验与种子绑定核对使用，不读取数据库展示配置
   * @param code 稳定接口编码
   * @returns 当前版本接口定义，不存在时返回 undefined
   */
  getDefinitionByCode(code: string): ApiDefinition | undefined {
    return this.definitions.get(code)
  }

  /**
   * 验证接口绑定
   * @description 只接受当前版本可授权业务接口；公开、登录态及已下线接口禁止通过绑定取得
   * @param codes 拟绑定的接口编码
   */
  validateCodes(codes: string[]): void {
    for (const code of codes) {
      const definition = this.definitions.get(code)
      if (definition?.access !== 'permission') throw new BadRequestException('包含不可绑定或已下线的接口')
    }
  }

  /**
   * 查询接口清单
   * @description 仅展示当前运行版本实际存在的接口，按分组、操作及搜索别名筛选
   * @param query 公共分页与关键词
   * @returns 接口分页列表
   */
  async findAll(query: ApiResourceQueryDto): Promise<PaginatedData<ApiResourceItem>> {
    const items = (await this.items()).filter((item) => this.matches(item, query.keyword))
    const page = query.page ?? DEFAULT_PAGE
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE
    return { list: items.slice((page - 1) * pageSize, page * pageSize), pagination: new PaginationMetaDto(page, pageSize, items.length) }
  }

  /**
   * 查询可绑定接口树
   * @description 关键词命中功能或模块时保留其接口，命中单接口时补齐祖先分组；只返回需要接口授权的接口
   * @param keyword 可选搜索关键词
   * @returns 模块、功能与接口三级树
   */
  async getTree(keyword?: string): Promise<ApiTreeNode[]> {
    const items = (await this.items()).filter((item) => item.access === 'permission' && this.matches(item, keyword))
    const modules = new Map<string, ApiTreeNode>()
    const features = new Map<string, ApiTreeNode>()
    for (const item of items) {
      const moduleKey = `module:${encodeURIComponent(item.module)}`
      const featureKey = `${moduleKey}:feature:${encodeURIComponent(item.feature)}`
      let module = modules.get(moduleKey)
      if (!module) {
        module = { key: moduleKey, label: item.module, kind: 'module', selectable: false, children: [] }
        modules.set(moduleKey, module)
      }
      let feature = features.get(featureKey)
      if (!feature) {
        feature = { key: featureKey, label: item.feature, kind: 'feature', selectable: false, children: [] }
        features.set(featureKey, feature)
        module.children!.push(feature)
      }
      feature.children!.push({ key: item.code, label: item.action, kind: 'api', selectable: true, method: item.method, path: item.path })
    }
    return [...modules.values()]
  }

  /**
   * 修改接口展示配置
   * @description 仅接受当前接口的分组、别名与排序，同步记录最后操作人与更新时间，不改变任何安全定义
   * @param code 接口编码
   * @param dto 完整展示配置
   * @param actorId 当前操作人 UUID
   */
  async update(code: string, dto: UpdateApiResourceDto, actorId: string): Promise<void> {
    if (!this.definitions.has(code)) throw new NotFoundException('接口不存在或已下线')
    const module = dto.module.trim()
    const feature = dto.feature.trim()
    const action = dto.action.trim()
    if (!module || !feature || !action) throw new BadRequestException('接口分组和名称不能为空')
    await this.resources.update(
      { code, isDeleted: 0 },
      {
        module,
        feature,
        action,
        aliases: [...new Set(dto.aliases.map((alias) => alias.trim()).filter(Boolean))],
        sort: dto.sort,
        updatedBy: actorId,
        updateTime: Math.floor(Date.now() / 1000),
      },
    )
  }

  private paths(value: unknown): string[] {
    return (Array.isArray(value) ? value : [typeof value === 'string' ? value : '']).map((path: string) => path.replace(/^\/+|\/+$/g, ''))
  }

  private async items(): Promise<ApiResourceItem[]> {
    const labels = new Map((await this.resources.find({ where: { isDeleted: 0 } })).map((row) => [row.code, row]))
    return [...this.definitions.values()]
      .map((definition) => {
        const label = labels.get(definition.code)
        return {
          ...definition,
          module: label?.module ?? definition.module,
          feature: label?.feature ?? definition.feature,
          action: label?.action ?? definition.action,
          aliases: label?.aliases ?? [],
          sort: label?.sort ?? 0,
        }
      })
      .sort(
        (a, b) =>
          a.sort - b.sort ||
          a.module.localeCompare(b.module, 'zh-CN') ||
          a.feature.localeCompare(b.feature, 'zh-CN') ||
          a.code.localeCompare(b.code),
      )
  }

  private matches(item: ApiResourceItem, keyword?: string): boolean {
    const value = keyword?.trim().toLocaleLowerCase() ?? ''
    return (
      !value ||
      [item.module, item.feature, item.action, item.code, item.method, item.path, ...item.aliases].some((field) =>
        field.toLocaleLowerCase().includes(value),
      )
    )
  }
}
