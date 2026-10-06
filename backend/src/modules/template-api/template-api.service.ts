import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Like } from 'typeorm'
import { TemplateItem } from './entities/template-item.entity.js'
import { CreateTemplateItemDto } from './dto/create-template-item.dto.js'
import { UpdateTemplateItemDto } from './dto/update-template-item.dto.js'
import { QueryTemplateItemDto } from './dto/query-template-item.dto.js'
import { ApiResponseDto } from '../../common/dto/api-response.dto.js'
import { PaginationMetaDto } from './dto/pagination-meta.dto.js'
import { TemplateItemResponseDto } from './dto/template-item-response.dto.js'

/**
 * 模板 API 服务
 * @description 提供模板条目的增删改查能力，作为新业务模块开发的基础模板，所有接口均返回统一响应结构
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
   * @description 根据 DTO 创建新的模板数据并持久化，返回统一响应包装
   * @param dto 创建模板条目请求体
   * @returns 创建成功的空数据响应
   */
  async create(dto: CreateTemplateItemDto): Promise<ApiResponseDto<null>> {
    const item = this.templateItemRepository.create(dto)
    await this.templateItemRepository.save(item)
    return new ApiResponseDto(200, '创建成功', null)
  }

  /**
   * 分页查询模板条目列表
   * @description 支持分页和按名称、状态筛选，返回统一响应包装
   * @param query 查询参数（分页 + 筛选）
   * @returns 统一响应包装的分页数据（包含数据列表和分页元信息）
   */
  async findAll(query: QueryTemplateItemDto): Promise<ApiResponseDto<{ list: TemplateItemResponseDto[]; pagination: PaginationMetaDto }>> {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 10
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
   * @description 查询指定 ID 的模板数据，不存在则抛出 404，返回统一响应包装
   * @param id 模板条目 ID
   * @returns 统一响应包装的模板条目数据
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
   * @description 根据 ID 更新模板数据，不存在则抛出 404，返回统一响应包装
   * @param id 模板条目 ID
   * @param dto 更新模板条目请求体
   * @returns 更新成功的空数据响应
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
   * @description 根据 ID 删除模板数据，不存在则抛出 404，返回统一响应包装
   * @param id 模板条目 ID
   * @returns 统一响应包装的空数据
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
