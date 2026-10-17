/**
 * 分页请求参数
 * @description 定义所有分页查询接口共用的页码、页大小和总数参数。
 */
export interface PaginationParams {
  // 当前页码
  current: number
  // 每页条数
  size: number
  // 总条数
  total: number
}

/**
 * 分页搜索参数
 * @description 提取分页请求中查询接口实际需要的页码和页大小字段。
 */
export type CommonSearchParams = Pick<PaginationParams, 'current' | 'size'>

/**
 * 分页响应
 * @description 定义分页列表接口返回的记录集合及分页信息。
 */
export interface PaginatedResponse<T = unknown> {
  // 当前页记录
  records: T[]
  // 当前页码
  current: number
  // 每页条数
  size: number
  // 总记录数
  total: number
}
