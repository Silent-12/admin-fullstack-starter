import { ApiProperty } from '@nestjs/swagger'
import { TemplateItem } from '../entities/template-item.entity.js'

/**
 * 模板条目响应体
 * @description 显式声明对外暴露的字段，避免直接序列化实体。新增字段必须同时在此声明，
 * 以保证「接口字段最小化」的约定不被绕过。
 */
export class TemplateItemResponseDto {
  @ApiProperty({ description: '模板条目 ID', example: 1 })
  id!: number

  @ApiProperty({ description: '名称', example: '示例条目' })
  name!: string

  @ApiProperty({ description: '描述', example: '这是一个示例描述', nullable: true })
  description!: string

  @ApiProperty({ description: '状态', example: 'active' })
  status!: string

  @ApiProperty({ description: '优先级', example: 0 })
  priority!: number

  @ApiProperty({ description: '是否启用', example: true })
  isEnabled!: boolean

  @ApiProperty({ description: '创建时间（Unix 时间戳）', example: 1779444000 })
  createdAt!: number

  @ApiProperty({ description: '更新时间（Unix 时间戳）', example: 1779444000 })
  updatedAt!: number

  /**
   * 由实体构造响应体
   * @description 逐个字段显式映射，实体新增字段不会被自动透出。
   * @param item 模板条目实体
   * @returns 对外响应体
   */
  static fromEntity(item: TemplateItem): TemplateItemResponseDto {
    const dto = new TemplateItemResponseDto()
    dto.id = item.id
    dto.name = item.name
    dto.description = item.description
    dto.status = item.status
    dto.priority = item.priority
    dto.isEnabled = item.isEnabled
    dto.createdAt = item.createdAt
    dto.updatedAt = item.updatedAt
    return dto
  }
}
