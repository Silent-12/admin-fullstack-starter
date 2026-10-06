import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, IsInt, IsIn, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'

/**
 * 查询模板条目请求参数
 * @description 用于分页查询和筛选的 DTO，所有字段均为可选
 */
export class QueryTemplateItemDto {
  @ApiPropertyOptional({ description: '当前页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page 必须是整数' })
  @Min(1, { message: 'page 不能小于 1' })
  page?: number

  @ApiPropertyOptional({ description: '每页条数', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pageSize 必须是整数' })
  @Min(1, { message: 'pageSize 不能小于 1' })
  @Max(100, { message: 'pageSize 不能超过 100' })
  pageSize?: number

  @ApiPropertyOptional({ description: '名称筛选（模糊匹配）' })
  @IsOptional()
  @IsString({ message: 'name 必须是字符串' })
  name?: string

  @ApiPropertyOptional({ description: '状态筛选', enum: ['active', 'inactive'] })
  @IsOptional()
  @IsString({ message: 'status 必须是字符串' })
  @IsIn(['active', 'inactive'], { message: 'status 只能是 active 或 inactive' })
  status?: string
}
