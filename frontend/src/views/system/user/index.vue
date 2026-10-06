<!-- 用户管理页面 -->
<!-- ao-full-height 自动计算出页面剩余高度 -->
<!-- 数据由页面自行请求后通过 data 传入 AoTable；需要自定义单元格内容的列通过 slotName 指定插槽 -->
<!-- 分页：分页状态由页面持有并通过 pagination 传入；AoTable 只渲染与上报交互，何时请求完全由页面决定 -->
<!-- AoTable 已集成搜索栏与表格头部：传入 searchItems 即可渲染搜索栏，#header-left / #header-right 插槽内容自动渲染到表格头部 -->
<template>
  <div class="user-page ao-full-height page-flush-table">
    <!-- 搜索栏 + 表格头部 + 表格 -->
    <AoTable
      class="page-main-table"
      v-model:search-form="searchForm"
      v-model:column-checks="columnChecks"
      :search-items="searchItems"
      :search-rules="searchRules"
      :loading="loading"
      :data="tableData"
      :columns="columns"
      :pagination="pagination"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
      @search="handleSearch"
      @reset="handleReset"
      @refresh="fetchList"
      @selection-change="handleSelectionChange"
    >
      <!-- 表格头部左侧操作区 -->
      <template #header-left>
        <ElSpace wrap>
          <ElButton @click="showDialog('add')">新增用户</ElButton>
        </ElSpace>
      </template>

      <!-- 用户名列：头像 + 用户名 + 邮箱 -->
      <template #userInfo="{ row }">
        <div class="user">
          <AoImage class="user-avatar" :src="row.avatar" :preview-teleported="true" />
          <div class="user-info">
            <p class="user-name">{{ row.userName }}</p>
            <p class="email">{{ row.userEmail }}</p>
          </div>
        </div>
      </template>

      <!-- 状态列 -->
      <template #status="{ row }">
        <ElTag :type="getUserStatusConfig(row.status).type">
          {{ getUserStatusConfig(row.status).text }}
        </ElTag>
      </template>

      <!-- 操作列 -->
      <template #operation="{ row }">
        <div>
          <AoButtonTable type="edit" @click="showDialog('edit', row)" />
          <AoButtonTable type="delete" @click="deleteUser(row)" />
        </div>
      </template>
    </AoTable>

    <!-- 用户弹窗：与表格同级，弹窗不依赖表格上下文 -->
    <UserDialog
      v-model="dialogVisible"
      :type="dialogType"
      :user-data="currentUserData"
      @submit="handleDialogSubmit"
    />
  </div>
</template>

<script setup lang="ts">
  import { computed, nextTick, onMounted, reactive, ref } from 'vue'
  import { ElButton, ElMessage, ElMessageBox, ElSpace, ElTag } from 'element-plus'
  import type { FormRules } from 'element-plus'
  import { AoTable } from '@ao/admin-components'
  import { AoButtonTable } from '@ao/admin-components'
  import AoImage from '@/components/media/AoImage.vue'
  import { fetchGetUserList } from '@/mock'
  import { useTableColumns } from '@ao/admin-components'
  import UserDialog from './components/UserDialog.vue'
  import type { SearchFormItem } from '@ao/admin-components'
  import type { TablePaginationState } from '@ao/admin-components'
  import type { UserSearchParams } from '@/types/api/system-manage'
  import type { DialogType, UserListItem } from './types'

  defineOptions({ name: 'User' })

  // 弹窗相关
  const dialogType = ref<DialogType>('add')
  const dialogVisible = ref(false)
  const currentUserData = ref<Partial<UserListItem>>({})

  // 选中行
  const selectedRows = ref<UserListItem[]>([])

  /** 搜索表单初始值 */
  const INITIAL_SEARCH_FORM: UserSearchParams = { status: '1' }

  // 搜索表单（通过 v-model:search-form 与 AoTable 的搜索栏双向绑定）
  const searchForm = ref<UserSearchParams>({ ...INITIAL_SEARCH_FORM })

  // 已提交的查询条件，避免翻页和刷新应用尚未查询的表单修改
  const appliedFilters = ref<UserSearchParams>({ ...INITIAL_SEARCH_FORM })

  // 搜索表单校验规则
  const searchRules: FormRules = {
    userName: [{ required: true, message: '请输入用户名', trigger: 'blur' }]
  }

  // 用户状态选项
  const statusOptions = ref<{ label: string; value: string; disabled?: boolean }[]>([])

  // 列表数据（由页面自行维护）
  const tableData = ref<UserListItem[]>([])
  const loading = ref(false)

  // 分页状态：由页面持有并通过 pagination 传入 AoTable，组件只读取、不修改
  const pagination = reactive<TablePaginationState>({ currentPage: 1, pageSize: 10, total: 0 })

  /**
   * @description 模拟接口返回用户状态选项
   * @return 用户状态选项列表
   */
  const fetchStatusOptions = (): Promise<typeof statusOptions.value> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          { label: '在线', value: '1' },
          { label: '离线', value: '2' },
          { label: '异常', value: '3' },
          { label: '注销', value: '4' }
        ])
      }, 1000)
    })
  }

  onMounted(async () => {
    statusOptions.value = await fetchStatusOptions()
  })

  // 搜索项配置（同 AoSearchBar 的 items）
  const searchItems = computed<SearchFormItem[]>(() => [
    {
      label: '用户名',
      key: 'userName',
      type: 'input',
      props: { placeholder: '请输入用户名', clearable: true }
    },
    {
      label: '手机号',
      key: 'userPhone',
      type: 'input',
      props: { placeholder: '请输入手机号', maxlength: '11' }
    },
    {
      label: '邮箱',
      key: 'userEmail',
      type: 'input',
      props: { placeholder: '请输入邮箱' }
    },
    {
      label: '状态',
      key: 'status',
      type: 'select',
      props: {
        placeholder: '请选择状态',
        options: statusOptions.value
      }
    },
    {
      label: '性别',
      key: 'userGender',
      type: 'radiogroup',
      props: {
        options: [
          { label: '男', value: '1' },
          { label: '女', value: '2' }
        ]
      }
    }
  ])

  // 用户状态配置
  const USER_STATUS_CONFIG = {
    '1': { type: 'success' as const, text: '在线' },
    '2': { type: 'info' as const, text: '离线' },
    '3': { type: 'warning' as const, text: '异常' },
    '4': { type: 'danger' as const, text: '注销' }
  } as const

  /**
   * 获取用户状态配置
   * @param status 用户状态值
   * @return 状态对应的标签类型与文案
   */
  const getUserStatusConfig = (status: string) => {
    return (
      USER_STATUS_CONFIG[status as keyof typeof USER_STATUS_CONFIG] || {
        type: 'info' as const,
        text: '未知'
      }
    )
  }

  // 表格列配置（沿用原生 formatter，需要自定义单元格内容的列通过 slotName 指定插槽）
  const { columns, columnChecks } = useTableColumns<UserListItem>(() => [
    { type: 'selection' },
    { type: 'index', width: 60, label: '序号' },
    { prop: 'userName', label: '用户名', width: 280, slotName: 'userInfo' },
    { prop: 'userGender', label: '性别', sortable: true },
    { prop: 'userPhone', label: '手机号' },
    { prop: 'status', label: '状态', slotName: 'status' },
    { prop: 'createTime', label: '创建日期', sortable: true }
  ])

  /**
   * @description 加载用户列表数据
   */
  const fetchList = async (): Promise<void> => {
    loading.value = true
    try {
      const params: UserSearchParams = {
        ...appliedFilters.value,
        current: pagination.currentPage,
        size: pagination.pageSize
      }
      const res = await fetchGetUserList(params)
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
   * @description 处理搜索：保存清洗后的查询条件、回到第一页并重新请求
   * @param params 搜索栏输出的查询条件
   */
  const handleSearch = (params: UserSearchParams): void => {
    appliedFilters.value = { ...params }
    pagination.currentPage = 1
    fetchList()
  }

  /**
   * @description 重置搜索条件、回到第一页并重新请求
   */
  const handleReset = (): void => {
    searchForm.value = { ...INITIAL_SEARCH_FORM }
    appliedFilters.value = { ...INITIAL_SEARCH_FORM }
    pagination.currentPage = 1
    fetchList()
  }

  onMounted(() => {
    fetchList()
  })

  /**
   * 显示用户弹窗
   */
  const showDialog = (type: DialogType, row?: UserListItem): void => {
    dialogType.value = type
    currentUserData.value = row || {}
    nextTick(() => {
      dialogVisible.value = true
    })
  }

  /**
   * 删除用户
   */
  const deleteUser = (row: UserListItem): void => {
    ElMessageBox.confirm(`确定要注销用户"${row.userName}"吗？`, '注销用户', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'error'
    }).then(() => {
      ElMessage.success('注销成功')
    })
  }

  /**
   * 处理弹窗提交事件
   */
  const handleDialogSubmit = async () => {
    dialogVisible.value = false
    currentUserData.value = {}
  }

  /**
   * 处理表格行选择变化
   */
  const handleSelectionChange = (selection: UserListItem[]): void => {
    selectedRows.value = selection
  }
</script>

<style scoped lang="scss">
  :deep(.user) {
    display: flex;
    align-items: center;
  }

  // 用户头像
  // 使用 :deep() 穿透子组件，因为插槽内容在 AoTable/ElTableColumn 内部渲染，
  // scoped 属性可能无法正确传递到 AoImage 根元素，导致 .user-avatar 样式不生效
  :deep(.user-avatar) {
    width: 2rem;
    height: 2rem;
    border-radius: 0.375rem;
  }

  // 用户名与邮箱容器
  // 同样使用 :deep() 穿透，原因同上：插槽内容在子组件内渲染
  :deep(.user-info) {
    margin-left: 0.5rem;
  }
</style>
