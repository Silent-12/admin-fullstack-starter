import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger'
import { TemplateApiService } from './template-api.service.js'
import { CreateTemplateItemDto } from './dto/create-template-item.dto.js'
import { UpdateTemplateItemDto } from './dto/update-template-item.dto.js'
import { QueryTemplateItemDto } from './dto/query-template-item.dto.js'
import { ApiResponseDto } from '../../common/dto/api-response.dto.js'
import { TemplateItemResponseDto } from './dto/template-item-response.dto.js'
import type { PaginatedData } from '../../common/types/response.js'

/**
 * 模板 API 控制器
 * @description 提供模板条目的 RESTful 接口，演示 `POST` / `GET` / `PUT` / `DELETE` 标准用法，统一使用 `ApiResponseDto` 包装响应
 * 路径遵循后台管理端约定：`v1/admin/{资源}`
 */
@ApiTags('模板 API')
@ApiBearerAuth()
@Controller('v1/admin/template-api')
export class TemplateApiController {
  constructor(private readonly templateApiService: TemplateApiService) {}

  /**
   * 创建模板条目
   * @description 按请求体创建一条模板条目，成功后返回空数据响应
   * @param dto 创建模板条目请求体
   * @returns 创建成功的空数据响应，`data` 为 null
   */
  @Post()
  @ApiOperation({ summary: '创建模板条目' })
  @ApiResponse({ status: 200, description: '创建成功', type: ApiResponseDto })
  @ApiResponse({ status: 400, description: '参数校验失败' })
  async create(@Body() dto: CreateTemplateItemDto): Promise<ApiResponseDto<null>> {
    return this.templateApiService.create(dto)
  }

  /**
   * 分页查询模板条目列表
   * @description 支持按名称模糊匹配与状态筛选，返回 `{ list, pagination }` 结构的分页数据
   * @param query 分页与筛选参数
   * @returns 分页结果，`data` 含 `list` 与 `pagination`
   */
  @Get()
  @ApiOperation({ summary: '分页查询模板条目列表' })
  @ApiResponse({ status: 200, description: '查询成功', type: ApiResponseDto })
  async findAll(@Query() query: QueryTemplateItemDto): Promise<ApiResponseDto<PaginatedData<TemplateItemResponseDto>>> {
    return this.templateApiService.findAll(query)
  }

  /**
   * 根据 ID 查询单条模板条目
   * @description 查询指定 ID 的模板条目，不存在时由服务层抛出 404
   * @param id 模板条目 ID
   * @returns 模板条目详情，`data` 为响应体
   */
  @Get(':id')
  @ApiOperation({ summary: '根据 ID 查询单条模板条目' })
  @ApiParam({ name: 'id', description: '模板条目 ID', example: 1 })
  @ApiResponse({ status: 200, description: '查询成功', type: ApiResponseDto })
  @ApiResponse({ status: 404, description: '模板条目不存在' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ApiResponseDto<TemplateItemResponseDto>> {
    return this.templateApiService.findOne(id)
  }

  /**
   * 更新模板条目
   * @description 仅更新请求体中传入的字段，条目不存在时由服务层抛出 404
   * @param id 模板条目 ID
   * @param dto 更新模板条目请求体
   * @returns 更新成功的空数据响应，`data` 为 null
   */
  @Put(':id')
  @ApiOperation({ summary: '更新模板条目' })
  @ApiParam({ name: 'id', description: '模板条目 ID', example: 1 })
  @ApiResponse({ status: 200, description: '更新成功', type: ApiResponseDto })
  @ApiResponse({ status: 400, description: '参数校验失败' })
  @ApiResponse({ status: 404, description: '模板条目不存在' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTemplateItemDto): Promise<ApiResponseDto<null>> {
    return this.templateApiService.update(id, dto)
  }

  /**
   * 删除模板条目
   * @description 按 ID 物理删除模板条目，不存在时由服务层抛出 404
   * @param id 模板条目 ID
   * @returns 删除成功的空数据响应，`data` 为 null
   */
  @Delete(':id')
  @ApiOperation({ summary: '删除模板条目' })
  @ApiParam({ name: 'id', description: '模板条目 ID', example: 1 })
  @ApiResponse({ status: 200, description: '删除成功', type: ApiResponseDto })
  @ApiResponse({ status: 404, description: '模板条目不存在' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<ApiResponseDto<null>> {
    return this.templateApiService.remove(id)
  }
}
