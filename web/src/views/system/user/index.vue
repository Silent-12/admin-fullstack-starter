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
        <ElButton v-auth="'system.user.create'" :disabled="busy" @click="edit()">新增用户</ElButton>
      </template>
      <template #enabled="{ row }">
        <ElTag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '禁用' }}</ElTag>
      </template>
      <template #operation="{ row }">
        <ElButton
          v-auth="'system.user.resetPassword'"
          link
          :disabled="busy"
          @click="resetPassword(row)"
        >
          重置密码
        </ElButton>
        <ElButton v-auth="'system.user.update'" link :disabled="busy" @click="edit(row)">
          编辑
        </ElButton>
        <ElButton
          v-auth="'system.user.delete'"
          link
          type="danger"
          :disabled="busy || row.isBuiltin"
          @click="remove(row)"
        >
          删除
        </ElButton>
      </template>
    </AoTable>
    <UserDialog v-model="dialogVisible" :user-id="selectedId" @success="load" />
    <ResetPasswordDialog v-model="resetVisible" :user="resetTarget" @success="load" />
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { AoTable, useTableColumns } from '@ao/admin-components'
  import { useAuth } from '@/hooks/useAuth'
  import type { SearchFormItem } from '@ao/admin-components'
  import { ElButton, ElMessage, ElMessageBox, ElTag } from 'element-plus'
  import { fetchGetUserList, deleteUser } from '@/api/system-manage'
  import type { ManagedUser } from '@/types/api/system-manage'
  import { usePagedList } from '@/hooks/usePagedList'
  import UserDialog from './components/UserDialog.vue'
  import ResetPasswordDialog from './components/ResetPasswordDialog.vue'

  defineOptions({ name: 'User' })

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
  } = usePagedList<ManagedUser>({ fetcher: fetchGetUserList })

  /** 检索项与表格列配置 */
  const searchItems: SearchFormItem[] = [
    {
      key: 'keyword',
      label: '关键字',
      type: 'input',
      span: 6,
      props: { clearable: true, placeholder: '名称或编码' }
    },
    {
      key: 'enabled',
      label: '状态',
      type: 'select',
      span: 6,
      props: {
        clearable: true,
        options: [
          { label: '启用', value: true },
          { label: '禁用', value: false }
        ]
      }
    }
  ]

  const { columns, columnChecks } = useTableColumns<ManagedUser>(() => [
    { prop: 'username', label: '用户名', minWidth: 140 },
    { prop: 'name', label: '姓名' },
    { prop: 'phone', label: '手机号' },
    { prop: 'email', label: '邮箱', minWidth: 180 },
    { prop: 'roleCodes', label: '角色', formatter: (row) => row.roleCodes.join('、') },
    {
      prop: 'createTime',
      label: '创建时间',
      minWidth: 170,
      formatter: (row) => new Date(row.createTime * 1000).toLocaleString()
    },
    { prop: 'enabled', label: '状态', slotName: 'enabled' }
  ])

  /** 编辑弹窗状态 */
  const dialogVisible = ref(false)
  const selectedId = ref<string>()

  /** 重置密码弹窗状态 */
  const resetVisible = ref(false)
  const resetTarget = ref<ManagedUser>()

  /**
   * @description 打开新增或编辑用户弹窗
   * @param row 行数据，缺省表示新增
   */
  const edit = (row?: ManagedUser): void => {
    if (!hasAuth(row ? 'system.user.update' : 'system.user.create')) return
    selectedId.value = row?.id
    dialogVisible.value = true
  }

  /**
   * @description 二次确认后删除用户并刷新列表
   * @param row 待删除的用户行数据
   */
  const remove = async (row: ManagedUser): Promise<void> => {
    if (!hasAuth('system.user.delete') || busy.value || row.isBuiltin) return
    try {
      await ElMessageBox.confirm(`确定删除用户“${row.username}”吗？`, '删除用户', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消'
      })
    } catch {
      return
    }
    await removeAndReload(async () => {
      await deleteUser(row.id)
      ElMessage.success('删除成功')
    })
  }

  /**
   * @description 打开重置密码弹窗
   * @param row 目标用户行数据
   */
  const resetPassword = (row: ManagedUser): void => {
    if (!hasAuth('system.user.resetPassword') || busy.value) return
    resetTarget.value = row
    resetVisible.value = true
  }
</script>
