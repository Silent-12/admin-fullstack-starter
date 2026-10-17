/**
 * 分页与列表接口通用类型
 * @description 与后端 `PaginationQueryDto`、`PaginationMetaDto`、`PaginatedData<T>` 一一对应，
 * 是前后端分页契约在前端侧的唯一真源
 */

/**
 * 分页查询参数
 * @description 与后端 `PaginationQueryDto` 一致的分页查询参数
 */
export interface PaginationQuery {
  // 当前页码，从 1 开始
  page: number
  // 每页条数，取值范围 1-100
  pageSize: number
}

/**
 * 分页搜索参数
 * @description 查询接口可选携带的分页参数，业务查询参数在此基础上扩展自身筛选条件
 */
export type CommonSearchParams = Partial<PaginationQuery>

/**
 * 分页元信息
 * @description 与后端 `PaginationMetaDto` 一致的分页元信息
 */
export interface PaginationMeta {
  // 当前页码
  page: number
  // 每页条数
  pageSize: number
  // 总记录数
  total: number
  // 总页数
  totalPages: number
}

/**
 * 分页响应
 * @description 分页列表接口返回的数据体，与后端 `PaginatedData<T>` 一致
 */
export interface PaginatedResponse<T = unknown> {
  // 当前页记录
  list: T[]
  // 分页元信息
  pagination: PaginationMeta
}
