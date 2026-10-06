import { ApiProperty } from '@nestjs/swagger'

/**
 * 分页元信息 DTO
 * @description 分页查询返回的分页元信息，用于包装在 ApiResponseDto.data 中
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

  constructor(page: number, pageSize: number, total: number) {
    this.page = page
    this.pageSize = pageSize
    this.total = total
    this.totalPages = Math.ceil(total / pageSize)
  }
}
