<!-- 角色管理页面 -->
<!-- 数据由页面自行请求后通过 data 传入 AoTable；需要自定义单元格内容的列通过 slotName 指定插槽 -->
<!-- 分页：分页状态由页面持有并通过 pagination 传入；AoTable 只渲染与上报交互，何时请求完全由页面决定 -->
<template>
  <div class="ao-full-height page-flush-table">
    <!-- 搜索栏 + 表格头部 + 表格 -->
    <AoTable
      class="page-main-table"
      v-model:search-form="searchForm"
      v-model:column-checks="columnChecks"
      v-model:show-search-bar="showSearchBar"
      :search-items="searchItems"
      :loading="loading"
      :data="tableData"
      :columns="columns"
      :pagination="pagination"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
      @search="handleSearch"
      @reset="handleReset"
      @refresh="fetchList"
    >
      <!-- 表格头部左侧操作区 -->
      <template #header-left>
        <ElSpace wrap>
          <ElButton @click="showDialog('add')">新增角色</ElButton>
        </ElSpace>
      </template>

      <!-- 角色状态列 -->
      <template #enabled="{ row }">
        <ElTag :type="row.enabled ? 'success' : 'warning'">
          {{ row.enabled ? '启用' : '禁用' }}
        </ElTag>
      </template>

      <!-- 操作列 -->
      <template #operation="{ row }">
        <AoButtonMore :list="OPERATION_LIST" @click="(item) => buttonMoreClick(item, row)" />
      </template>
    </AoTable>

    <!-- 角色编辑弹窗：与表格同级，弹窗不依赖表格上下文 -->
    <RoleEditDialog
      v-model="dialogVisible"
      :dialog-type="dialogType"
      :role-data="currentRoleData"
      @success="fetchList"
    />

    <!-- 菜单权限弹窗 -->
    <RolePermissionDialog
      v-model="permissionDialog"
      :role-data="currentRoleData"
      @success="fetchList"
    />
  </div>
</template>

<script setup lang="ts">
  import { onMounted, reactive, ref } from 'vue'
  import { ElButton, ElMessage, ElMessageBox, ElSpace, ElTag } from 'element-plus'
  import { AoTable } from '@ao/admin-components'
  import { AoButtonMore } from '@ao/admin-components'
  import type { ButtonMoreItem } from '@ao/admin-components'
  import type { SearchFormItem } from '@ao/admin-components'
  import type { TablePaginationState } from '@ao/admin-components'
  import { useTableColumns } from '@ao/admin-components'
  import { fetchGetRoleList } from '@/api/system-manage'
  import RoleEditDialog from './components/RoleEditDialog.vue'
  import RolePermissionDialog from './components/RolePermissionDialog.vue'
  import type {
    RoleListItem,
    RoleSearchFormParams,
    RoleSearchParams
  } from '@/types/api/system-manage'

  defineOptions({ name: 'Role' })

  /** 搜索表单初始值 */
  const INITIAL_SEARCH_FORM: RoleSearchFormParams = {
    roleName: undefined,
    roleCode: undefined,
    description: undefined,
    enabled: undefined,
    daterange: undefined,
    startTime: undefined,
    endTime: undefined
  }

  // 搜索表单（通过 v-model:search-form 与 AoTable 的搜索栏双向绑定）
  const searchForm = ref<RoleSearchFormParams>({ ...INITIAL_SEARCH_FORM })

  // 已提交的查询条件，日期区间仅在查询时转换为接口参数
  const appliedFilters = ref<RoleSearchParams>({})

  const showSearchBar = ref(false)

  // 列表数据（由页面自行维护）
  const tableData = ref<RoleListItem[]>([])
  const loading = ref(false)

  // 分页状态：由页面持有并通过 pagination 传入 AoTable，组件只读取、不修改
  const pagination = reactive<TablePaginationState>({ currentPage: 1, pageSize: 10, total: 0 })

  // 角色状态选项
  const statusOptions = [
    { label: '启用', value: true },
    { label: '禁用', value: false }
  ]

  // 搜索项配置（同 AoSearchBar 的 items）
  const searchItems: SearchFormItem[] = [
    {
      label: '角色名称',
      key: 'roleName',
      type: 'input',
      props: { placeholder: '请输入角色名称', clearable: true }
    },
    {
      label: '角色编码',
      key: 'roleCode',
      type: 'input',
      props: { placeholder: '请输入角色编码', clearable: true }
    },
    {
      label: '角色描述',
      key: 'description',
      type: 'input',
      props: { placeholder: '请输入角色描述', clearable: true }
    },
    {
      label: '角色状态',
      key: 'enabled',
      type: 'select',
      props: {
        placeholder: '请选择状态',
        options: statusOptions,
        clearable: true
      }
    },
    {
      label: '创建日期',
      key: 'daterange',
      type: 'datetime',
      props: {
        style: { width: '100%' },
        placeholder: '请选择日期范围',
        type: 'daterange',
        rangeSeparator: '至',
        startPlaceholder: '开始日期',
        endPlaceholder: '结束日期',
        valueFormat: 'YYYY-MM-DD',
        shortcuts: [
          { text: '今日', value: [new Date(), new Date()] },
          { text: '最近一周', value: [new Date(Date.now() - 604800000), new Date()] },
          { text: '最近一个月', value: [new Date(Date.now() - 2592000000), new Date()] }
        ]
      }
    }
  ]

  const dialogVisible = ref(false)
  const permissionDialog = ref(false)
  const currentRoleData = ref<RoleListItem | undefined>(undefined)

  /** 操作列按钮配置 */
  const OPERATION_LIST: ButtonMoreItem[] = [
    { key: 'permission', label: '菜单权限', icon: 'ri:user-3-line' },
    { key: 'edit', label: '编辑角色', icon: 'ri:edit-2-line' },
    { key: 'delete', label: '删除角色', icon: 'ri:delete-bin-4-line', color: '#f56c6c' }
  ]

  // 表格列配置（沿用原生 formatter，需要自定义单元格内容的列通过 slotName 指定插槽）
  const { columns, columnChecks } = useTableColumns<RoleListItem>(() => [
    { prop: 'roleId', label: '角色ID', width: 100 },
    { prop: 'roleName', label: '角色名称', minWidth: 120 },
    { prop: 'roleCode', label: '角色编码', minWidth: 120 },
    { prop: 'description', label: '角色描述', minWidth: 150, showOverflowTooltip: true },
    { prop: 'enabled', label: '角色状态', width: 100, slotName: 'enabled' },
    { prop: 'createTime', label: '创建日期', width: 180, sortable: true }
  ])

  /**
   * @description 加载角色列表数据
   */
  const fetchList = async (): Promise<void> => {
    loading.value = true
    try {
      const params: RoleSearchParams = {
        ...appliedFilters.value,
        startTime: appliedFilters.value.startTime ?? null,
        endTime: appliedFilters.value.endTime ?? null,
        current: pagination.currentPage,
        size: pagination.pageSize
      }
      const res = await fetchGetRoleList(params)
      tableData.value = res.records
      pagination.total = res.total
    } finally {
      loading.value = false
    }
  }

  /**
   * @description 每页条数变化时由页面重置页码并重新请求
   * @param pageSize 每页条数
   */
  const handleSizeChange = (pageSize: number): void => {
    pagination.currentPage = 1
    pagination.pageSize = pageSize
    fetchList()
  }

  /**
   * @description 当前页码变化时同步状态并重新请求
   * @param currentPage 当前页码
   */
  const handleCurrentChange = (currentPage: number): void => {
    pagination.currentPage = currentPage
    fetchList()
  }

  /**
   * @description 处理搜索：把日期区间拆分为起止时间、回到第一页并重新请求
   * @param params 搜索栏输出的查询条件
   */
  const handleSearch = (params: RoleSearchFormParams): void => {
    const { daterange, ...filters } = params
    const [startTime, endTime] = Array.isArray(daterange) ? daterange : [null, null]

    appliedFilters.value = { ...filters, startTime, endTime }
    pagination.currentPage = 1
    fetchList()
  }

  /**
   * @description 重置搜索条件、回到第一页并重新请求
   */
  const handleReset = (): void => {
    searchForm.value = { ...INITIAL_SEARCH_FORM }
    appliedFilters.value = {}
    pagination.currentPage = 1
    fetchList()
  }

  onMounted(() => {
    fetchList()
  })

  const dialogType = ref<'add' | 'edit'>('add')

  const showDialog = (type: 'add' | 'edit', row?: RoleListItem) => {
    dialogVisible.value = true
    dialogType.value = type
    currentRoleData.value = row
  }

  const buttonMoreClick = (item: ButtonMoreItem, row: RoleListItem) => {
    switch (item.key) {
      case 'permission':
        showPermissionDialog(row)
        break
      case 'edit':
        showDialog('edit', row)
        break
      case 'delete':
        deleteRole(row)
        break
    }
  }

  const showPermissionDialog = (row?: RoleListItem) => {
    permissionDialog.value = true
    currentRoleData.value = row
  }

  const deleteRole = (row: RoleListItem) => {
    ElMessageBox.confirm(`确定删除角色"${row.roleName}"吗？此操作不可恢复！`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(() => {
        // TODO: 调用删除接口
        ElMessage.success('删除成功')
        fetchList()
      })
      .catch(() => {
        ElMessage.info('已取消删除')
      })
  }
</script>
