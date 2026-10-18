/**
 * 分页列表状态骨架
 */
import { onMounted, reactive, ref, type Ref } from 'vue'
import type { TablePaginationState } from '@ao/admin-components'
import type { PaginatedResponse } from '@/types/api/common'
import type { ManagementQuery } from '@/types/api/system-manage'
import { useLatestRequest } from './useLatestRequest'

/**
 * 分页列表状态
 * @description 集中暴露搜索、分页、加载与行操作状态，页面只保留业务特有的权限与操作逻辑
 */
export interface PagedList<T> {
  // 当前搜索条件
  searchForm: Ref<ManagementQuery>
  // 已生效的筛选条件
  applied: Ref<ManagementQuery>
  // 当前页数据
  rows: Ref<T[]>
  // 列表加载状态
  loading: Ref<boolean>
  // 行操作提交状态
  busy: Ref<boolean>
  // 分页状态
  pagination: TablePaginationState
  // 加载当前筛选分页
  load: () => Promise<void>
  // 提交筛选并回到首页
  search: () => void
  // 清空筛选并重新请求
  reset: () => void
  // 切换每页数量
  sizeChange: (size: number) => void
  // 切换当前页
  pageChange: (page: number) => void
  // 执行删除后刷新列表
  removeAndReload: (action: () => Promise<void>) => Promise<void>
}

/**
 * 分页列表配置
 * @description 定义分页数据加载函数与初始分页大小
 */
export interface UsePagedListOptions<T> {
  // 按筛选与分页参数请求分页数据
  fetcher: (query: ManagementQuery) => Promise<PaginatedResponse<T>>
  // 初始每页条数
  pageSize?: number
}

/**
 * @description 创建分页列表状态，仅接受最后一次请求响应，并在卸载后使未完成请求失效
 * @param options 分页数据加载函数与初始分页大小。
 * @return 列表状态与搜索、分页、删除后刷新方法。
 */
export function usePagedList<T>(options: UsePagedListOptions<T>): PagedList<T> {
  /** 搜索、分页与请求状态 */
  const searchForm = ref<ManagementQuery>({})
  const applied = ref<ManagementQuery>({})
  const rows = ref<T[]>([]) as Ref<T[]>
  const loading = ref(false)
  const busy = ref(false)
  const pagination = reactive<TablePaginationState>({
    currentPage: 1,
    pageSize: options.pageSize ?? 10,
    total: 0
  })
  // 请求代次，仅接受最后一次响应，卸载后旧响应自动失效
  const request = useLatestRequest()

  /**
   * @description 加载当前筛选分页，仅接受最后一次响应
   * @return 无返回值。
   */
  const load = async (): Promise<void> => {
    const token = request.begin()
    loading.value = true
    try {
      const data = await options.fetcher({
        ...applied.value,
        page: pagination.currentPage,
        pageSize: pagination.pageSize
      })
      if (!request.isCurrent(token)) return
      rows.value = data.list
      pagination.total = data.pagination.total
    } catch {
      /* 请求层统一显示错误 */
    } finally {
      if (request.isCurrent(token)) loading.value = false
    }
  }

  /**
   * @description 提交筛选并回到首页
   * @return 无返回值。
   */
  const search = (): void => {
    applied.value = { ...searchForm.value }
    pagination.currentPage = 1
    void load()
  }

  /**
   * @description 清空筛选并重新请求
   * @return 无返回值。
   */
  const reset = (): void => {
    searchForm.value = {}
    search()
  }

  /**
   * @description 切换每页数量并回到首页
   * @param size 新的每页条数。
   * @return 无返回值。
   */
  const sizeChange = (size: number): void => {
    pagination.pageSize = size
    pagination.currentPage = 1
    void load()
  }

  /**
   * @description 切换当前页
   * @param page 目标页码。
   * @return 无返回值。
   */
  const pageChange = (page: number): void => {
    pagination.currentPage = page
    void load()
  }

  /**
   * @description 执行删除请求后刷新列表，删除末页唯一记录时回退一页
   * @param action 删除请求，成功提示由调用方在请求成功后自行展示。
   * @return 无返回值。
   */
  const removeAndReload = async (action: () => Promise<void>): Promise<void> => {
    busy.value = true
    try {
      await action()
      if (rows.value.length === 1 && pagination.currentPage > 1) pagination.currentPage--
      await load()
    } catch {
      /* 取消与请求失败均不显示成功提示，也不刷新列表 */
    } finally {
      busy.value = false
    }
  }

  onMounted(load)

  return {
    searchForm,
    applied,
    rows,
    loading,
    busy,
    pagination,
    load,
    search,
    reset,
    sizeChange,
    pageChange,
    removeAndReload
  }
}
