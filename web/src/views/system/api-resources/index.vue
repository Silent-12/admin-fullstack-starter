<template>
  <div class="ao-full-height page-flush-table">
    <AoTable
      class="page-main-table"
      v-model:search-form="searchForm"
      v-model:column-checks="columnChecks"
      :search-items="searchItems"
      :data="rows"
      :columns="columns"
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
        <span>接口由后端控制器自动登记，仅可维护标签和检索别名</span>
      </template>
      <template #access="{ row }">
        <ElTag :type="row.access === 'permission' ? 'success' : 'info'">
          {{ accessLabels[row.access as keyof typeof accessLabels] }}
        </ElTag>
      </template>
      <template #operation="{ row }">
        <ElButton v-auth="'system.api.update'" link @click="edit(row)">编辑标签</ElButton>
      </template>
    </AoTable>
    <AoForm
      ref="formRef"
      v-model="form"
      v-model:visible="visible"
      :loading="dialogBusy"
      title="编辑接口标签"
      width="560px"
      :items="items"
      :rules="rules"
      :disabled="dialogBusy"
      :disabled-submit="dialogBusy"
      @submit="save"
    >
      <template #footer>
        <ElButton :disabled="dialogBusy" @click="visible = false">取消</ElButton>
        <ElButton type="primary" :loading="dialogBusy" @click="formRef?.submit()">保存</ElButton>
      </template>
    </AoForm>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { AoForm, AoTable, useTableColumns } from '@ao/admin-components'
  import { useAuth } from '@/hooks/useAuth'
  import type { FormItem, SearchFormItem } from '@ao/admin-components'
  import { ElButton, ElTag } from 'element-plus'
  import { fetchApiResources, updateApiLabels } from '@/api/system-manage'
  import type { ApiResource, ApiLabelsInput } from '@/types/api/system-manage'
  import { usePagedList } from '@/hooks/usePagedList'
  import { useDialogForm } from '@/hooks/useDialogForm'

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
      props: { clearable: true, placeholder: '模块、功能、动作、路径或别名' }
    }
  ]

  const { columns, columnChecks } = useTableColumns<ApiResource>(() => [
    { prop: 'module', label: '模块' },
    { prop: 'feature', label: '功能' },
    { prop: 'action', label: '动作' },
    { prop: 'method', label: '方法', width: 90 },
    { prop: 'path', label: '路径', minWidth: 240 },
    { prop: 'code', label: '接口编码', minWidth: 220 },
    { prop: 'access', label: '访问级别', slotName: 'access', minWidth: 150 },
    {
      prop: 'aliases',
      label: '检索别名',
      minWidth: 160,
      formatter: (row) => row.aliases.join('、')
    },
    { prop: 'sort', label: '排序', width: 80 }
  ])

  /** 标签弹窗状态，只发送后端允许编辑的字段 */
  const formRef = ref<InstanceType<typeof AoForm>>()
  const open = ref(false)
  const selected = ref<ApiResource>()
  const selectedCode = ref('')

  /**
   * @description 复制当前行的可编辑标签，未选中行时使用空初值
   * @return 标签表单初值
   */
  const createLabels = (): ApiLabelsInput => ({
    module: selected.value?.module || '',
    feature: selected.value?.feature || '',
    action: selected.value?.action || '',
    aliases: selected.value ? [...selected.value.aliases] : [],
    sort: selected.value?.sort || 0
  })

  const {
    form,
    visible,
    busy: dialogBusy,
    save
  } = useDialogForm<ApiLabelsInput>({
    open: () => open.value,
    /**
     * @description 关闭标签弹窗
     */
    close: () => {
      open.value = false
    },
    createForm: createLabels,
    formRef,
    /**
     * @description 提交前校验接口标签与操作权限
     * @param value 当前标签表单
     * @return 是否允许提交
     */
    validate: (value) =>
      hasAuth('system.api.update') &&
      Boolean(value.module.trim() && value.feature.trim() && value.action.trim()),
    /**
     * @description 保存可编辑标签，别名去重去空，排序清空按 0 兜底
     * @param value 当前标签表单
     */
    submit: async (value) => {
      await updateApiLabels(selectedCode.value, {
        module: value.module.trim(),
        feature: value.feature.trim(),
        action: value.action.trim(),
        aliases: [...new Set(value.aliases.map((alias) => alias.trim()).filter(Boolean))],
        sort: Number(value.sort) || 0
      })
    },
    successMessage: '标签保存成功',
    /** @description 保存成功后刷新接口目录 */
    success: () => load()
  })

  /** 表单项配置 */
  const items: FormItem[] = [
    { key: 'module', label: '模块', type: 'input' },
    { key: 'feature', label: '功能', type: 'input' },
    { key: 'action', label: '动作', type: 'input' },
    { key: 'aliases', label: '检索别名', type: 'inputtag', props: { placeholder: '输入后按回车' } },
    {
      key: 'sort',
      label: '排序',
      type: 'number',
      props: { min: 0, precision: 0, valueOnClear: 0 }
    }
  ]

  /** 表单校验规则 */
  const rules = {
    module: [{ required: true, message: '请输入模块名称' }],
    feature: [{ required: true, message: '请输入功能名称' }],
    action: [{ required: true, message: '请输入动作名称' }],
    sort: [{ type: 'integer' as const, min: 0, message: '排序须为非负整数' }]
  }

  /**
   * @description 编辑真实接口的展示标签，不允许新增或修改注册信息
   * @param row 目标接口行数据
   */
  const edit = (row: ApiResource): void => {
    if (!hasAuth('system.api.update') || dialogBusy.value) return
    selected.value = row
    selectedCode.value = row.code
    open.value = true
  }
</script>
