import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'
import { TemplateApiService } from './template-api.service.js'
import { CreateTemplateItemDto } from './dto/create-template-item.dto.js'
import { UpdateTemplateItemDto } from './dto/update-template-item.dto.js'
import { QueryTemplateItemDto } from './dto/query-template-item.dto.js'
import { ApiResponseDto } from '../../common/dto/api-response.dto.js'
import { PaginationMetaDto } from './dto/pagination-meta.dto.js'
import { TemplateItemResponseDto } from './dto/template-item-response.dto.js'

/**
 * 模板 API 控制器
 * @description 提供模板条目的 RESTful 接口，演示 POST / GET / PUT / DELETE 标准用法，统一使用 ApiResponseDto 返回结构
 */
@ApiTags('模板 API')
@Controller('v1/template-api')
export class TemplateApiController {
  constructor(private readonly templateApiService: TemplateApiService) {}

  /**
   * 创建模板条目
   * @description POST 请求，支持请求体参数校验
   * @param dto 创建模板条目请求体
   * @returns 创建成功的空数据响应
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
   * @description GET 请求，支持 Query 参数分页和筛选
   * @param query 查询参数
   * @returns 统一响应包装的分页数据
   */
  @Get()
  @ApiOperation({ summary: '分页查询模板条目列表' })
  @ApiResponse({ status: 200, description: '查询成功', type: TemplateItemResponseDto })
  async findAll(
    @Query() query: QueryTemplateItemDto,
  ): Promise<ApiResponseDto<{ list: TemplateItemResponseDto[]; pagination: PaginationMetaDto }>> {
    return this.templateApiService.findAll(query)
  }

  /**
   * 根据 ID 查询单条模板条目
   * @description GET 请求，支持 Path 参数
   * @param id 模板条目 ID
   * @returns 统一响应包装的模板条目数据
   */
  @Get(':id')
  @ApiOperation({ summary: '根据 ID 查询单条模板条目' })
  @ApiParam({ name: 'id', description: '模板条目 ID', example: 1 })
  @ApiResponse({ status: 200, description: '查询成功', type: TemplateItemResponseDto })
  @ApiResponse({ status: 404, description: '模板条目不存在' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ApiResponseDto<TemplateItemResponseDto>> {
    return this.templateApiService.findOne(id)
  }

  /**
   * 更新模板条目
   * @description PUT 请求，支持 Path 参数 + Body 参数校验
   * @param id 模板条目 ID
   * @param dto 更新模板条目请求体
   * @returns 更新成功的空数据响应
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
   * @description DELETE 请求，根据 ID 删除模板数据
   * @param id 模板条目 ID
   * @returns 统一响应包装的空数据
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
