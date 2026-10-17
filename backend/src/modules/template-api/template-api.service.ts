import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Like } from 'typeorm'
import { TemplateItem } from './entities/template-item.entity.js'
import { CreateTemplateItemDto } from './dto/create-template-item.dto.js'
import { UpdateTemplateItemDto } from './dto/update-template-item.dto.js'
import { QueryTemplateItemDto } from './dto/query-template-item.dto.js'
import { ApiResponseDto } from '../../common/dto/api-response.dto.js'
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto.js'
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '../../common/constants/pagination.constant.js'
import { TemplateItemResponseDto } from './dto/template-item-response.dto.js'
import type { PaginatedData } from '../../common/types/response.js'

/**
 * 模板 API 服务
 * @description 提供模板条目的增删改查能力，作为新业务模块开发的基础模板，所有方法均返回 `ApiResponseDto` 统一响应结构
 */
@Injectable()
export class TemplateApiService {
  private readonly logger = new Logger(TemplateApiService.name)

  constructor(
    @InjectRepository(TemplateItem)
    private readonly templateItemRepository: Repository<TemplateItem>,
  ) {}

  /**
   * 创建模板条目
   * @description 按请求体创建并持久化模板条目，返回统一响应包装
   * @param dto 创建模板条目请求体
   * @returns 创建成功的空数据响应，`data` 为 null
   */
  async create(dto: CreateTemplateItemDto): Promise<ApiResponseDto<null>> {
    const item = this.templateItemRepository.create(dto)
    await this.templateItemRepository.save(item)
    return new ApiResponseDto(200, '创建成功', null)
  }

  /**
   * 分页查询模板条目列表
   * @description 支持按名称模糊匹配与状态筛选，未传分页参数时使用全局默认页码与每页条数
   * @param query 分页与筛选参数
   * @returns 分页结果，`data` 含 `list` 与 `pagination`
   */
  async findAll(query: QueryTemplateItemDto): Promise<ApiResponseDto<PaginatedData<TemplateItemResponseDto>>> {
    const page = query.page ?? DEFAULT_PAGE
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = {}
    if (query.name) {
      where.name = Like(`%${query.name}%`)
    }
    if (query.status) {
      where.status = query.status
    }

    const [list, total] = await this.templateItemRepository.findAndCount({
      where,
      skip,
      take: pageSize,
      order: { createdAt: 'DESC' },
    })

    const pagination = new PaginationMetaDto(page, pageSize, total)
    const records = list.map((item) => TemplateItemResponseDto.fromEntity(item))
    return new ApiResponseDto(200, '查询成功', { list: records, pagination })
  }

  /**
   * 根据 ID 查询单条模板条目
   * @description 查询指定 ID 的模板条目，不存在时抛出 404
   * @param id 模板条目 ID
   * @returns 模板条目详情，`data` 为响应体
   */
  async findOne(id: number): Promise<ApiResponseDto<TemplateItemResponseDto>> {
    const item = await this.templateItemRepository.findOneBy({ id })
    if (!item) {
      throw new NotFoundException(`模板条目 ID=${id} 不存在`)
    }
    return new ApiResponseDto(200, '查询成功', TemplateItemResponseDto.fromEntity(item))
  }

  /**
   * 更新模板条目
   * @description 按 ID 更新模板条目并持久化，不存在时抛出 404
   * @param id 模板条目 ID
   * @param dto 更新模板条目请求体
   * @returns 更新成功的空数据响应，`data` 为 null
   */
  async update(id: number, dto: UpdateTemplateItemDto): Promise<ApiResponseDto<null>> {
    const item = await this.templateItemRepository.findOneBy({ id })
    if (!item) {
      throw new NotFoundException(`模板条目 ID=${id} 不存在`)
    }
    Object.assign(item, dto)
    await this.templateItemRepository.save(item)
    return new ApiResponseDto(200, '更新成功', null)
  }

  /**
   * 删除模板条目
   * @description 按 ID 删除模板条目，不存在时抛出 404
   * @param id 模板条目 ID
   * @returns 删除成功的空数据响应，`data` 为 null
   */
  async remove(id: number): Promise<ApiResponseDto<null>> {
    const item = await this.templateItemRepository.findOneBy({ id })
    if (!item) {
      throw new NotFoundException(`模板条目 ID=${id} 不存在`)
    }
    await this.templateItemRepository.remove(item)
    return new ApiResponseDto(200, '删除成功', null)
  }
}
