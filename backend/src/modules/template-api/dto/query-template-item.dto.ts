import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, IsIn } from 'class-validator'
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js'
import { TEMPLATE_ITEM_STATUS_VALUES } from '../constants/template-item.constant.js'

/**
 * 查询模板条目请求参数
 * @description 在公共分页参数之上追加筛选条件，所有字段均为可选
 */
export class QueryTemplateItemDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '名称筛选（模糊匹配）' })
  @IsOptional()
  @IsString({ message: 'name 必须是字符串' })
  name?: string

  @ApiPropertyOptional({ description: '状态筛选', enum: TEMPLATE_ITEM_STATUS_VALUES })
  @IsOptional()
  @IsString({ message: 'status 必须是字符串' })
  @IsIn(TEMPLATE_ITEM_STATUS_VALUES, { message: `status 只能是 ${TEMPLATE_ITEM_STATUS_VALUES.join('、')}` })
  status?: string
}
