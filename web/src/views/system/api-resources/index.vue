<template>
  <div class="api-resources ao-full-height page-flush-table">
    <AoTable
      class="page-main-table"
      v-model:search-form="searchForm"
      v-model:column-checks="columnChecks"
      :search-items="searchItems"
      :data="rows"
      :columns="columns"
      show-overflow-tooltip
      :operation-width="100"
      :loading="loading"
      :pagination="pagination"
      @search="search"
      @reset="reset"
      @refresh="load"
      @size-change="sizeChange"
      @current-change="pageChange"
    >
      <template #header-left>
        <span>接口由后端控制器自动登记，仅可维护展示标签和排序</span>
      </template>
      <template #access="{ row }">
        <span class="access" :class="{ 'is-authorized': row.access === 'permission' }">
          {{ accessLabels[row.access as keyof typeof accessLabels] }}
        </span>
      </template>
      <template #operation="{ row }">
        <ElButton v-auth="'system.api.update'" link @click="edit(row)">编辑</ElButton>
      </template>
    </AoTable>
    <ApiLabelsDialog v-model="open" :resource="selected" @success="load" />
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { AoTable, useTableColumns } from '@ao/admin-components'
  import { useAuth } from '@/hooks/useAuth'
  import type { SearchFormItem } from '@ao/admin-components'
  import { ElButton } from 'element-plus'
  import { fetchApiResources } from '@/api/system-manage'
  import type { ApiResource } from '@/types/api/system-manage'
  import { usePagedList } from '@/hooks/usePagedList'
  import ApiLabelsDialog from './components/ApiLabelsDialog.vue'

  defineOptions({ name: 'ApiResources' })

  const { hasAuth } = useAuth()

  /** 接口目录分页、筛选与加载状态 */
  const { searchForm, rows, loading, pagination, load, search, reset, sizeChange, pageChange } =
    usePagedList<ApiResource>({ fetcher: fetchApiResources })

  /** 访问级别展示文案 */
  const accessLabels = {
    public: '公开接口',
    authenticated: '登录即可访问',
    permission: '按角色授权'
  }

  /** 检索项与表格列配置 */
  const searchItems: SearchFormItem[] = [
    {
      key: 'keyword',
      label: '关键字',
      type: 'input',
      props: { clearable: true, placeholder: '模块、功能、动作、编码、方法或路径' }
    }
  ]

  const { columns, columnChecks } = useTableColumns<ApiResource>(() => [
    { prop: 'module', label: '模块', minWidth: 110 },
    { prop: 'feature', label: '功能', minWidth: 160 },
    { prop: 'action', label: '动作', minWidth: 150 },
    { prop: 'method', label: '方法', width: 90 },
    { prop: 'path', label: '路径', minWidth: 240 },
    { prop: 'code', label: '接口编码', minWidth: 220 },
    { prop: 'access', label: '访问级别', slotName: 'access', minWidth: 150 },
    { prop: 'sort', label: '排序', width: 80 }
  ])

  /** 标签弹窗显隐与当前接口 */
  const open = ref(false)
  const selected = ref<ApiResource>()

  /**
   * @description 编辑真实接口的展示标签，不允许新增或修改注册信息
   * @param row 目标接口行数据
   */
  const edit = (row: ApiResource): void => {
    if (!hasAuth('system.api.update') || open.value) return
    selected.value = row
    open.value = true
  }
</script>

<style scoped lang="scss">
  .api-resources {
    .access {
      color: var(--status-text-neutral);

      &.is-authorized {
        color: var(--status-text-success);
      }
    }
  }
</style>
