<!-- 菜单管理页面 -->
<!-- 数据由页面自行请求后通过 data 传入 AoTable；需要自定义单元格内容的列通过 slotName 指定插槽 -->
<!-- 加载时机完全由页面决定：挂载、查询、重置、刷新各自调用页面自身的 getMenuList -->
<template>
  <div class="menu-page ao-full-height page-flush-table">
    <!-- 搜索栏 + 表格头部 + 表格 -->
    <AoTable
      class="page-main-table"
      ref="tableRef"
      v-model:search-form="formFilters"
      v-model:column-checks="columnChecks"
      :search-items="searchItems"
      :search-show-expand="false"
      :header-show-zebra="false"
      :loading="loading"
      :columns="columns"
      :data="filteredTableData"
      :stripe="false"
      rowKey="path"
      :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
      :default-expand-all="false"
      @search="handleSearch"
      @reset="handleReset"
      @refresh="getMenuList"
    >
      <!-- 表格头部左侧操作区 -->
      <template #header-left>
        <ElButton v-auth="'add'" @click="handleAddMenu"> 添加菜单 </ElButton>
        <ElButton @click="toggleExpand">
          {{ isExpanded ? '收起' : '展开' }}
        </ElButton>
      </template>

      <!-- 菜单类型列 -->
      <template #type="{ row }">
        <ElTag :type="getMenuTypeTag(row)">{{ getMenuTypeText(row) }}</ElTag>
      </template>

      <!-- 编辑时间列 -->
      <template #date>2022-3-12 12:00:00</template>

      <!-- 状态列 -->
      <template #status>
        <ElTag type="success">启用</ElTag>
      </template>

      <!-- 操作列 -->
      <template #operation="{ row }">
        <div style="text-align: right">
          <template v-if="row.meta?.isAuthButton">
            <AoButtonTable type="edit" @click="handleEditAuth(row)" />
            <AoButtonTable type="delete" @click="handleDeleteAuth()" />
          </template>
          <template v-else>
            <AoButtonTable type="add" title="新增权限" @click="handleAddAuth()" />
            <AoButtonTable type="edit" @click="handleEditMenu(row)" />
            <AoButtonTable type="delete" @click="handleDeleteMenu()" />
          </template>
        </div>
      </template>
    </AoTable>

    <!-- 菜单弹窗：与表格同级，弹窗不依赖表格上下文 -->
    <MenuDialog
      v-model="dialogVisible"
      :type="dialogType"
      :editData="editData"
      :lockType="lockMenuType"
      @submit="handleSubmit"
    />
  </div>
</template>

<script setup lang="ts">
  import { computed, nextTick, onMounted, reactive, ref } from 'vue'
  import { ElButton, ElMessage } from 'element-plus'
  import { formatMenuTitle } from '@/utils/router'
  import { AoTable } from '@ao/admin-components'
  import { AoButtonTable } from '@ao/admin-components'
  import type { SearchFormItem } from '@ao/admin-components'
  import { useTableColumns } from '@ao/admin-components'
  import type { AppRouteRecord } from '@/types/router'
  import MenuDialog from './components/MenuDialog.vue'
  import { fetchGetMenuList } from '@/api/system-manage'
  import { ElTag, ElMessageBox } from 'element-plus'
  import type { MenuDialogFormData, AuthEditData } from './types'

  defineOptions({ name: 'Menus' })

  // 状态管理
  const loading = ref(false)
  const isExpanded = ref(false)
  const tableRef = ref()

  // 弹窗相关
  const dialogVisible = ref(false)
  const dialogType = ref<'menu' | 'button'>('menu')
  const editData = ref<AppRouteRecord | AuthEditData>()
  const lockMenuType = ref(false)

  // 搜索相关
  const initialSearchState = {
    name: '',
    route: ''
  }

  // 搜索表单（通过 v-model:search-form 与 AoTable 双向绑定）
  const formFilters = ref({ ...initialSearchState })
  const appliedFilters = reactive({ ...initialSearchState })

  // 搜索项配置（同 AoSearchBar 的 items）
  const searchItems: SearchFormItem[] = [
    {
      label: '菜单名称',
      key: 'name',
      type: 'input',
      props: { clearable: true }
    },
    {
      label: '路由地址',
      key: 'route',
      type: 'input',
      props: { clearable: true }
    }
  ]

  onMounted(() => {
    getMenuList()
  })

  /**
   * 获取菜单列表数据
   */
  const getMenuList = async (): Promise<void> => {
    loading.value = true

    try {
      const list = await fetchGetMenuList()
      tableData.value = list
    } catch (error) {
      throw error instanceof Error ? error : new Error('获取菜单失败')
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取菜单类型标签颜色
   * @param row 菜单行数据
   * @returns 标签颜色类型
   */
  const getMenuTypeTag = (
    row: AppRouteRecord
  ): 'primary' | 'success' | 'warning' | 'info' | 'danger' => {
    if (row.meta?.isAuthButton) return 'danger'
    if (row.children?.length) return 'info'
    if (row.meta?.link && row.meta?.isIframe) return 'success'
    if (row.path) return 'primary'
    if (row.meta?.link) return 'warning'
    return 'info'
  }

  /**
   * 获取菜单类型文本
   * @param row 菜单行数据
   * @returns 菜单类型文本
   */
  const getMenuTypeText = (row: AppRouteRecord): string => {
    if (row.meta?.isAuthButton) return '按钮'
    if (row.children?.length) return '目录'
    if (row.meta?.link && row.meta?.isIframe) return '内嵌'
    if (row.path) return '菜单'
    if (row.meta?.link) return '外链'
    return '未知'
  }

  /**
   * 获取路由列展示文本
   * @param row 菜单行数据
   * @returns 路由地址
   */
  const getPathText = (row: AppRouteRecord): string => {
    if (row.meta?.isAuthButton) return ''
    return row.meta?.link || row.path || ''
  }

  /**
   * 获取权限标识列展示文本
   * @param row 菜单行数据
   * @returns 权限标识文本
   */
  const getAuthListText = (row: AppRouteRecord): string => {
    if (row.meta?.isAuthButton) {
      return row.meta?.authMark || ''
    }
    if (!row.meta?.authList?.length) return ''
    return `${row.meta.authList.length} 个权限标识`
  }

  // 表格列配置（沿用原生 formatter，需要自定义单元格内容的列通过 slotName 指定插槽）
  const { columnChecks, columns } = useTableColumns<AppRouteRecord>(() => [
    {
      prop: 'meta.title',
      label: '菜单名称',
      minWidth: 120,
      formatter: (_row, _column, cellValue) => formatMenuTitle(cellValue)
    },
    {
      columnKey: 'type',
      label: '菜单类型',
      slotName: 'type'
    },
    {
      prop: 'path',
      label: '路由',
      formatter: getPathText
    },
    {
      prop: 'meta.authList',
      label: '权限标识',
      formatter: getAuthListText
    },
    {
      columnKey: 'date',
      label: '编辑时间',
      slotName: 'date'
    },
    {
      columnKey: 'status',
      label: '状态',
      slotName: 'status'
    }
  ])

  // 数据相关
  const tableData = ref<AppRouteRecord[]>([])

  /**
   * 重置搜索条件
   */
  const handleReset = (): void => {
    Object.assign(formFilters.value, { ...initialSearchState })
    Object.assign(appliedFilters, { ...initialSearchState })
    getMenuList()
  }

  /**
   * 执行搜索
   */
  const handleSearch = (): void => {
    Object.assign(appliedFilters, { ...formFilters.value })
    getMenuList()
  }

  /**
   * 深度克隆对象
   * @param obj 要克隆的对象
   * @returns 克隆后的对象
   */
  const deepClone = <T,>(obj: T): T => {
    if (obj === null || typeof obj !== 'object') return obj
    if (obj instanceof Date) return new Date(obj) as T
    if (Array.isArray(obj)) return obj.map((item) => deepClone(item)) as T

    const cloned = {} as T
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = deepClone(obj[key])
      }
    }
    return cloned
  }

  /**
   * 将权限列表转换为子节点
   * @param items 菜单项数组
   * @returns 转换后的菜单项数组
   */
  const convertAuthListToChildren = (items: AppRouteRecord[]): AppRouteRecord[] => {
    return items.map((item) => {
      const clonedItem = deepClone(item)

      if (clonedItem.children?.length) {
        clonedItem.children = convertAuthListToChildren(clonedItem.children)
      }

      if (item.meta?.authList?.length) {
        const authChildren: AppRouteRecord[] = item.meta.authList.map(
          (auth: { title: string; authMark: string }) => ({
            path: `${item.path}_auth_${auth.authMark}`,
            name: `${String(item.name)}_auth_${auth.authMark}`,
            meta: {
              title: auth.title,
              authMark: auth.authMark,
              isAuthButton: true,
              parentPath: item.path
            }
          })
        )

        clonedItem.children = clonedItem.children?.length
          ? [...clonedItem.children, ...authChildren]
          : authChildren
      }

      return clonedItem
    })
  }

  /**
   * 搜索菜单
   * @param items 菜单项数组
   * @returns 搜索结果数组
   */
  const searchMenu = (items: AppRouteRecord[]): AppRouteRecord[] => {
    const results: AppRouteRecord[] = []

    for (const item of items) {
      const searchName = appliedFilters.name?.toLowerCase().trim() || ''
      const searchRoute = appliedFilters.route?.toLowerCase().trim() || ''
      const menuTitle = formatMenuTitle(item.meta?.title || '').toLowerCase()
      const menuPath = (item.path || '').toLowerCase()
      const nameMatch = !searchName || menuTitle.includes(searchName)
      const routeMatch = !searchRoute || menuPath.includes(searchRoute)

      if (item.children?.length) {
        const matchedChildren = searchMenu(item.children)
        if (matchedChildren.length > 0) {
          const clonedItem = deepClone(item)
          clonedItem.children = matchedChildren
          results.push(clonedItem)
          continue
        }
      }

      if (nameMatch && routeMatch) {
        results.push(deepClone(item))
      }
    }

    return results
  }

  // 过滤后的表格数据
  const filteredTableData = computed(() => {
    const searchedData = searchMenu(tableData.value)
    return convertAuthListToChildren(searchedData)
  })

  /**
   * 添加菜单
   */
  const handleAddMenu = (): void => {
    dialogType.value = 'menu'
    editData.value = undefined
    lockMenuType.value = true
    dialogVisible.value = true
  }

  /**
   * 添加权限按钮
   */
  const handleAddAuth = (): void => {
    dialogType.value = 'menu'
    editData.value = undefined
    lockMenuType.value = false
    dialogVisible.value = true
  }

  /**
   * 编辑菜单
   * @param row 菜单行数据
   */
  const handleEditMenu = (row: AppRouteRecord): void => {
    dialogType.value = 'menu'
    editData.value = row
    lockMenuType.value = true
    dialogVisible.value = true
  }

  /**
   * 编辑权限按钮
   * @param row 权限行数据
   */
  const handleEditAuth = (row: AppRouteRecord): void => {
    dialogType.value = 'button'
    editData.value = {
      title: row.meta?.title || '',
      authMark: row.meta?.authMark || ''
    }
    lockMenuType.value = false
    dialogVisible.value = true
  }

  /**
   * 提交表单数据
   * @param formData 表单数据
   */
  const handleSubmit = (formData: MenuDialogFormData): void => {
    console.log('提交数据:', formData)
    // TODO: 调用API保存数据
    getMenuList()
  }

  /**
   * 删除菜单
   */
  const handleDeleteMenu = async (): Promise<void> => {
    try {
      await ElMessageBox.confirm('确定要删除该菜单吗？删除后无法恢复', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      ElMessage.success('删除成功')
      getMenuList()
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('删除失败')
      }
    }
  }

  /**
   * 删除权限按钮
   */
  const handleDeleteAuth = async (): Promise<void> => {
    try {
      await ElMessageBox.confirm('确定要删除该权限吗？删除后无法恢复', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      ElMessage.success('删除成功')
      getMenuList()
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('删除失败')
      }
    }
  }

  /**
   * 切换展开/收起所有菜单
   */
  const toggleExpand = (): void => {
    isExpanded.value = !isExpanded.value
    nextTick(() => {
      if (tableRef.value?.elTableRef && filteredTableData.value) {
        const processRows = (rows: AppRouteRecord[]) => {
          rows.forEach((row) => {
            if (row.children?.length) {
              tableRef.value.elTableRef.toggleRowExpansion(row, isExpanded.value)
              processRows(row.children)
            }
          })
        }
        processRows(filteredTableData.value)
      }
    })
  }
</script>
