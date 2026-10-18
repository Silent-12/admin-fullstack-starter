import { Body, Controller, Get, Param, Patch, Query, Req } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AdminApi } from '../../../common/auth/admin-api.decorator.js'
import { ApiResponseDto } from '../../../common/dto/api-response.dto.js'
import type { PaginatedData } from '../../../common/types/response.js'
import type { AdminAuthRequest } from '../../../types/admin-auth.js'
import type { ApiResourceItem, ApiTreeNode } from '../../../types/api-resource.js'
import { ApiResourceService } from './api-resource.service.js'
import { ApiResourceQueryDto, ApiTreeQueryDto, UpdateApiResourceDto } from './dto/api-resource.dto.js'

/**
 * 后台接口清单
 * @description 维护接口展示配置并查询可绑定接口树，实际安全策略由路由声明维护
 */
@ApiTags('接口清单')
@ApiBearerAuth()
@Controller('v1/admin/api-resources')
export class ApiResourceController {
  constructor(private readonly apiResources: ApiResourceService) {}

  /**
   * 查询接口清单
   * @description 返回当前运行版本的实际接口与展示配置
   * @param query 公共分页和关键词
   * @returns 接口分页数据
   */
  @Get()
  @AdminApi({ code: 'system.apis.list', module: '系统管理', feature: '接口清单', action: '列表' })
  @ApiOperation({ summary: '查询接口清单' })
  async findAll(@Query() query: ApiResourceQueryDto): Promise<ApiResponseDto<PaginatedData<ApiResourceItem>>> {
    return ApiResponseDto.success(await this.apiResources.findAll(query))
  }

  /**
   * 查询可绑定接口树
   * @description 仅返回可由角色资源获得授权的接口，保留匹配节点的分组上下文
   * @param query 可选关键词
   * @returns 接口选择树
   */
  @Get('tree')
  @AdminApi({ code: 'system.apis.tree', module: '系统管理', feature: '接口清单', action: '接口树' })
  @ApiOperation({ summary: '查询可绑定接口树' })
  async tree(@Query() query: ApiTreeQueryDto): Promise<ApiResponseDto<ApiTreeNode[]>> {
    return ApiResponseDto.success(await this.apiResources.getTree(query.keyword))
  }

  /**
   * 修改接口展示配置
   * @description 调整分组名称、搜索别名和排序，不接受路径或权限策略修改
   * @param code 接口编码
   * @param dto 展示配置
   * @param request 当前已认证请求
   * @returns 空数据响应
   */
  @Patch(':code')
  @AdminApi({ code: 'system.apis.update', module: '系统管理', feature: '接口清单', action: '修改展示' })
  @ApiOperation({ summary: '修改接口展示配置' })
  async update(
    @Param('code') code: string,
    @Body() dto: UpdateApiResourceDto,
    @Req() request: AdminAuthRequest,
  ): Promise<ApiResponseDto<null>> {
    await this.apiResources.update(code, dto, request.adminUser.id)
    return ApiResponseDto.success(null)
  }
}
