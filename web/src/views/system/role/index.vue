<template>
  <div class="ao-full-height page-flush-table">
    <AoTable
      class="page-main-table"
      v-model:search-form="searchForm"
      v-model:column-checks="columnChecks"
      :search-items="searchItems"
      :data="rows"
      :columns="columns"
      :loading="loading"
      :pagination="pagination"
      @search="search"
      @reset="reset"
      @refresh="load"
      @size-change="sizeChange"
      @current-change="pageChange"
    >
      <template #header-left>
        <ElButton v-auth="'system.role.create'" :disabled="busy" @click="edit()">新增角色</ElButton>
      </template>
      <template #enabled="{ row }">
        <span class="role-status" :class="{ 'is-enabled': row.enabled }">
          {{ row.enabled ? '启用' : '禁用' }}
        </span>
      </template>
      <template #operation="{ row }">
        <ElButton
          v-auth="'system.role.grant'"
          link
          :disabled="busy || row.isBuiltin"
          :title="row.isBuiltin ? '内置角色权限固定' : undefined"
          @click="grant(row)"
        >
          资源授权
        </ElButton>
        <ElButton
          v-auth="'system.role.update'"
          link
          :disabled="busy || row.isBuiltin"
          @click="edit(row)"
        >
          编辑
        </ElButton>
        <ElButton
          v-auth="'system.role.delete'"
          link
          type="danger"
          :disabled="busy || row.isBuiltin"
          @click="remove(row)"
        >
          删除
        </ElButton>
      </template>
    </AoTable>
    <RoleEditDialog v-model="dialogVisible" :role-id="selectedId" @success="load" />
    <RolePermissionDialog v-model="permissionVisible" :role-id="selectedId" @success="load" />
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { AoTable, useTableColumns } from '@ao/admin-components'
  import { useAuth } from '@/hooks/useAuth'
  import type { SearchFormItem } from '@ao/admin-components'
  import { ElButton, ElMessage, ElMessageBox } from 'element-plus'
  import { fetchGetRoleList, deleteRole } from '@/api/system-manage'
  import type { Role } from '@/types/api/system-manage'
  import { usePagedList } from '@/hooks/usePagedList'
  import RoleEditDialog from './components/RoleEditDialog.vue'
  import RolePermissionDialog from './components/RolePermissionDialog.vue'

  defineOptions({ name: 'Role' })

  const { hasAuth } = useAuth()

  /** 搜索、分页与列表状态 */
  const {
    searchForm,
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
  } = usePagedList<Role>({ fetcher: fetchGetRoleList })

  /** 检索项与表格列配置 */
  const searchItems: SearchFormItem[] = [
    {
      key: 'keyword',
      label: '关键字',
      type: 'input',
      props: { clearable: true, placeholder: '名称或编码' }
    },
    {
      key: 'enabled',
      label: '状态',
      type: 'select',
      props: {
        clearable: true,
        options: [
          { label: '启用', value: true },
          { label: '禁用', value: false }
        ]
      }
    }
  ]

  const { columns, columnChecks } = useTableColumns<Role>(() => [
    { prop: 'code', label: '角色编码' },
    { prop: 'name', label: '角色名称' },
    { prop: 'description', label: '描述', minWidth: 260, showOverflowTooltip: true },
    {
      prop: 'isBuiltin',
      label: '内置角色',
      width: 100,
      formatter: (row) => (row.isBuiltin ? '是' : '否'),
      showOverflowTooltip: true
    },
    { prop: 'enabled', label: '状态', width: 100, slotName: 'enabled', showOverflowTooltip: true }
  ])

  /** 编辑与资源授权弹窗状态 */
  const dialogVisible = ref(false)
  const permissionVisible = ref(false)
  const selectedId = ref<string>()

  /**
   * @description 打开新增或编辑角色弹窗，禁止编辑内置角色
   * @param row 行数据，缺省表示新增
   */
  const edit = (row?: Role): void => {
    if (!hasAuth(row ? 'system.role.update' : 'system.role.create') || row?.isBuiltin) return
    selectedId.value = row?.id
    dialogVisible.value = true
  }

  /**
   * @description 二次确认后删除角色并刷新列表
   * @param row 待删除的角色行数据
   */
  const remove = async (row: Role): Promise<void> => {
    if (!hasAuth('system.role.delete') || busy.value || row.isBuiltin) return
    try {
      await ElMessageBox.confirm(`确定删除角色“${row.name}”吗？`, '删除角色', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消'
      })
    } catch {
      return
    }
    await removeAndReload(async () => {
      await deleteRole(row.id)
      ElMessage.success('删除成功')
    })
  }

  /**
   * @description 打开指定角色的资源授权弹窗，内置角色权限固定不允许调整
   * @param row 目标角色行数据
   */
  const grant = (row: Role): void => {
    if (!hasAuth('system.role.grant') || row.isBuiltin) return
    selectedId.value = row.id
    permissionVisible.value = true
  }
</script>

<style scoped lang="scss">
  .role-status {
    color: var(--status-text-neutral);

    &.is-enabled {
      color: var(--status-text-success);
    }
  }
</style>
