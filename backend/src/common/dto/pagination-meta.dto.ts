import { ApiProperty } from '@nestjs/swagger'

/**
 * 分页元信息 DTO
 * @description 分页列表接口统一的元信息结构，固定包装在 `ApiResponseDto.data.pagination` 中，
 * 与前端 `PaginationMeta` 一一对应
 */
export class PaginationMetaDto {
  @ApiProperty({ description: '当前页码' })
  page: number

  @ApiProperty({ description: '每页条数' })
  pageSize: number

  @ApiProperty({ description: '总记录数' })
  total: number

  @ApiProperty({ description: '总页数' })
  totalPages: number

  /**
   * 构造分页元信息
   * @description 总页数在此统一计算，避免各模块重复实现取整逻辑
   * @param page 当前页码
   * @param pageSize 每页条数
   * @param total 总记录数
   */
  constructor(page: number, pageSize: number, total: number) {
    this.page = page
    this.pageSize = pageSize
    this.total = total
    this.totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0
  }
}
