<template>
  <div class="ao-full-height page-flush-table">
    <AoTable
      class="page-main-table"
      v-model:search-form="searchForm"
      v-model:column-checks="columnChecks"
      :search-items="searchItems"
      :data="filtered"
      :columns="columns"
      :loading="loading"
      row-key="id"
      :tree-props="{ children: 'children' }"
      @search="search"
      @reset="reset"
      @refresh="load"
    >
      <template #header-left>
        <ElButton v-auth="'system.menu.create'" :disabled="busy" @click="edit()">新增资源</ElButton>
      </template>
      <template #enabled="{ row }">
        <ElTag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '禁用' }}</ElTag>
      </template>
      <template #operation="{ row }">
        <ElButton
          v-if="row.type !== 'button'"
          v-auth="'system.menu.create'"
          link
          :disabled="busy"
          @click="addChild(row)"
        >
          新增子资源
        </ElButton>
        <ElButton v-auth="'system.menu.update'" link :disabled="busy" @click="edit(row)">
          编辑
        </ElButton>
        <ElButton
          v-auth="'system.menu.delete'"
          link
          type="danger"
          :disabled="busy || row.isBuiltin"
          @click="remove(row)"
        >
          删除
        </ElButton>
      </template>
    </AoTable>
    <MenuDialog
      v-model="dialogVisible"
      :resource-id="selectedId"
      :parent-id="parentId"
      :resources="resources"
      @success="load"
    />
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { AoTable, useTableColumns } from '@ao/admin-components'
  import { useAuth } from '@/hooks/useAuth'
  import type { SearchFormItem } from '@ao/admin-components'
  import { ElButton, ElMessage, ElMessageBox, ElTag } from 'element-plus'
  import { deleteMenu, fetchGetMenuTree } from '@/api/system-manage'
  import type { Resource } from '@/types/api/system-manage'
  import { useLatestRequest } from '@/hooks/useLatestRequest'
  import MenuDialog from './components/MenuDialog.vue'

  defineOptions({ name: 'Menus' })

  const { hasAuth } = useAuth()

  /** 资源数据、检索关键字与请求状态 */
  const resources = ref<Resource[]>([])
  const loading = ref(false)
  const busy = ref(false)
  const searchForm = ref({ keyword: '' })
  const keyword = ref('')

  // 请求代次，仅接受最后一次响应，卸载后旧响应自动失效
  const request = useLatestRequest()

  /** 检索项与表格列配置 */
  const searchItems: SearchFormItem[] = [
    {
      key: 'keyword',
      label: '关键字',
      type: 'input',
      props: { clearable: true, placeholder: '显示名称、路由或权限码' }
    }
  ]

  const { columns, columnChecks } = useTableColumns<Resource>(() => [
    { prop: 'title', label: '名称', minWidth: 180 },
    {
      prop: 'type',
      label: '类型',
      formatter: (row) => ({ directory: '目录', menu: '菜单', button: '按钮' })[row.type]
    },
    { prop: 'path', label: '路由', minWidth: 140 },
    { prop: 'permission', label: '操作权限码', minWidth: 160 },
    { prop: 'apiCodes', label: '绑定接口', formatter: (row) => `${row.apiCodes.length} 个` },
    { prop: 'sort', label: '排序', width: 80 },
    { prop: 'enabled', label: '状态', slotName: 'enabled' }
  ])

  /** 弹窗上下文 */
  const dialogVisible = ref(false)
  const selectedId = ref<string>()
  const parentId = ref<string>()

  /**
   * @description 过滤资源树，命中子节点时保留其完整祖先链
   * @param nodes 待过滤的资源节点
   * @return 过滤后的资源树
   */
  const filterNodes = (nodes: Resource[]): Resource[] =>
    nodes.flatMap((node) => {
      if (!keyword.value) return [node]
      const children = filterNodes(node.children || [])
      const match = [node.title, node.name, node.path, node.permission].some((value) =>
        value?.toLowerCase().includes(keyword.value)
      )
      return match ? [node] : children.length ? [{ ...node, children }] : []
    })

  const filtered = computed(() => filterNodes(resources.value))

  /**
   * @description 加载完整的管理资源树
   */
  const load = async (): Promise<void> => {
    const token = request.begin()
    loading.value = true
    try {
      const data = await fetchGetMenuTree()
      if (request.isCurrent(token)) resources.value = data
    } catch {
      /* 请求层显示错误 */
    } finally {
      if (request.isCurrent(token)) loading.value = false
    }
  }

  /**
   * @description 归一化关键字后应用资源检索
   */
  const search = (): void => {
    keyword.value = searchForm.value.keyword.trim().toLowerCase()
  }

  /**
   * @description 清空检索条件并重新加载资源树
   */
  const reset = (): void => {
    searchForm.value = { keyword: '' }
    keyword.value = ''
    void load()
  }

  /**
   * @description 打开新增或编辑资源弹窗
   * @param row 行数据，缺省表示新增
   */
  const edit = (row?: Resource): void => {
    if (!hasAuth(row ? 'system.menu.update' : 'system.menu.create')) return
    selectedId.value = row?.id
    parentId.value = undefined
    dialogVisible.value = true
  }

  /**
   * @description 在指定父节点下新增资源
   * @param row 父资源行数据
   */
  const addChild = (row: Resource): void => {
    if (!hasAuth('system.menu.create') || row.type === 'button') return
    selectedId.value = undefined
    parentId.value = row.id
    dialogVisible.value = true
  }

  /**
   * @description 二次确认后删除资源并刷新资源树
   * @param row 待删除的资源行数据
   */
  const remove = async (row: Resource): Promise<void> => {
    if (!hasAuth('system.menu.delete') || busy.value || row.isBuiltin) return
    try {
      await ElMessageBox.confirm(`确定删除资源“${row.title}”吗？请先清理子资源`, '删除资源', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消'
      })
      busy.value = true
      await deleteMenu(row.id)
      ElMessage.success('删除成功')
      await load()
    } catch {
      /* 取消与失败均不显示成功 */
    } finally {
      busy.value = false
    }
  }

  onMounted(load)
</script>
