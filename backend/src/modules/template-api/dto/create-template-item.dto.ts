import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsInt, IsBoolean, IsOptional, IsIn, Min, Max, MaxLength } from 'class-validator'
import { Type } from 'class-transformer'

/**
 * 创建模板条目请求体
 * @description 新增模板数据时使用的 DTO，所有必填字段均进行严格校验
 */
export class CreateTemplateItemDto {
  @ApiProperty({ description: '名称', example: '示例条目' })
  @IsString({ message: '名称必须是字符串' })
  @MaxLength(255, { message: '名称最多 255 个字符' })
  name!: string

  @ApiPropertyOptional({ description: '描述', example: '这是一个示例描述' })
  @IsOptional()
  @IsString({ message: '描述必须是字符串' })
  @MaxLength(500, { message: '描述最多 500 个字符' })
  description?: string

  @ApiPropertyOptional({ description: '状态', enum: ['active', 'inactive'], default: 'active' })
  @IsOptional()
  @IsString({ message: '状态必须是字符串' })
  @IsIn(['active', 'inactive'], { message: '状态只能是 active 或 inactive' })
  status?: string

  @ApiPropertyOptional({ description: '优先级', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '优先级必须是整数' })
  @Min(0, { message: '优先级不能小于 0' })
  @Max(9999, { message: '优先级不能超过 9999' })
  priority?: number

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'isEnabled 必须是布尔值' })
  isEnabled?: boolean
}
