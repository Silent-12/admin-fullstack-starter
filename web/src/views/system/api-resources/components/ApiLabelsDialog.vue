<template>
  <AoForm
    ref="formRef"
    v-model="form"
    v-model:visible="visible"
    :loading="busy"
    title="编辑接口标签"
    width="min(640px, calc(100vw - 32px))"
    label-position="top"
    :gutter="24"
    :items="items"
    :rules="rules"
    :disabled="busy"
    :disabled-submit="busy"
    @submit="save"
  >
    <template #footer>
      <ElButton :disabled="busy" @click="visible = false">取消</ElButton>
      <ElButton type="primary" :loading="busy" @click="formRef?.submit()">保存修改</ElButton>
    </template>
  </AoForm>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { useMediaQuery } from '@vueuse/core'
  import { AoForm } from '@ao/admin-components'
  import type { FormItem } from '@ao/admin-components'
  import { ElButton } from 'element-plus'
  import { updateApiLabels } from '@/api/system-manage'
  import type { ApiResource, ApiLabelsInput } from '@/types/api/system-manage'
  import { useAuth } from '@/hooks/useAuth'
  import { useDialogForm } from '@/hooks/useDialogForm'

  const props = defineProps<{ modelValue: boolean; resource?: ApiResource }>()
  const emit = defineEmits<{ 'update:modelValue': [boolean]; success: [] }>()
  const { hasAuth } = useAuth()

  /** 表单引用与窄屏布局 */
  const formRef = ref<InstanceType<typeof AoForm>>()
  const isNarrow = useMediaQuery('(max-width: 767px)')
  const fieldSpan = computed(() => (isNarrow.value ? 24 : 12))

  /** 标签表单与提交状态，只发送后端允许编辑的字段 */
  const { form, visible, busy, save } = useDialogForm<ApiLabelsInput>({
    open: () => props.modelValue,
    /** @description 关闭标签弹窗 */
    close: () => emit('update:modelValue', false),
    /**
     * @description 复制当前接口的可编辑标签，未选中时使用空初值
     * @return 标签表单初值
     */
    createForm: () => ({
      module: props.resource?.module || '',
      feature: props.resource?.feature || '',
      action: props.resource?.action || '',
      sort: props.resource?.sort || 0
    }),
    formRef,
    /**
     * @description 提交前校验目标接口、标签与操作权限
     * @param value 当前标签表单
     * @return 是否允许提交
     */
    validate: (value) =>
      Boolean(props.resource) &&
      hasAuth('system.api.update') &&
      Boolean(value.module.trim() && value.feature.trim() && value.action.trim()),
    /**
     * @description 保存可编辑标签，排序清空按 0 兜底
     * @param value 当前标签表单
     */
    submit: async (value) => {
      if (!props.resource) return
      await updateApiLabels(props.resource.code, {
        module: value.module.trim(),
        feature: value.feature.trim(),
        action: value.action.trim(),
        sort: Number(value.sort) || 0
      })
    },
    successMessage: '标签保存成功',
    /** @description 保存成功后通知列表刷新 */
    success: () => emit('success')
  })

  /** 表单项配置 */
  const items = computed<FormItem[]>(() => [
    {
      key: 'module',
      label: '模块',
      type: 'input',
      span: fieldSpan.value,
      props: { placeholder: '请输入模块名称' }
    },
    {
      key: 'feature',
      label: '功能',
      type: 'input',
      span: fieldSpan.value,
      props: { placeholder: '请输入功能名称' }
    },
    {
      key: 'action',
      label: '动作',
      type: 'input',
      span: fieldSpan.value,
      props: { placeholder: '请输入动作名称' }
    },
    {
      key: 'sort',
      label: '排序',
      type: 'number',
      span: fieldSpan.value,
      props: { min: 0, precision: 0, valueOnClear: 0 }
    }
  ])

  /** 表单校验规则 */
  const rules = {
    module: [{ required: true, message: '请输入模块名称' }],
    feature: [{ required: true, message: '请输入功能名称' }],
    action: [{ required: true, message: '请输入动作名称' }],
    sort: [{ type: 'integer' as const, min: 0, message: '排序须为非负整数' }]
  }
</script>
