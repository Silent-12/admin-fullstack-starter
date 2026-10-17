import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsOptional, Max, Min } from 'class-validator'
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants/pagination.constant.js'

/**
 * 分页查询参数
 * @description 所有分页列表接口共用的页码与每页条数。业务查询 DTO 继承本类即可获得统一的校验、
 * 默认值与 Swagger 文档，不得在模块内重复声明 `page` / `pageSize`。
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({ description: '当前页码', default: DEFAULT_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page 必须是整数' })
  @Min(1, { message: 'page 不能小于 1' })
  page?: number

  @ApiPropertyOptional({ description: '每页条数', default: DEFAULT_PAGE_SIZE, maximum: MAX_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pageSize 必须是整数' })
  @Min(1, { message: 'pageSize 不能小于 1' })
  @Max(MAX_PAGE_SIZE, { message: `pageSize 不能超过 ${MAX_PAGE_SIZE}` })
  pageSize?: number
}
