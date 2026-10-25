import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { ArrayMaxSize, ArrayUnique, IsArray, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator'
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto.js'

/**
 * 接口清单查询参数
 * @description 复用公共分页并按关键词筛选当前运行版本的接口
 */
export class ApiResourceQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '模块、功能或接口关键词', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string
}

/**
 * 接口展示配置
 * @description 仅允许调整展示分组、别名与排序，不接受路径、方法或访问策略
 */
export class UpdateApiResourceDto {
  @ApiProperty({ description: '模块名称', maxLength: 64 })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  module!: string

  @ApiProperty({ description: '功能名称', maxLength: 64 })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  feature!: string

  @ApiProperty({ description: '操作名称', maxLength: 64 })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  action!: string

  @ApiProperty({ description: '搜索别名', type: [String], maxItems: 20 })
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  aliases!: string[]

  @ApiProperty({ description: '展示顺序' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  sort!: number
}
