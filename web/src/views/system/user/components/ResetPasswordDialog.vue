<template>
  <AoForm
    ref="formRef"
    v-model="form"
    v-model:visible="visible"
    :loading="busy"
    :title="`重置 ${user?.username ?? ''} 密码`"
    width="450px"
    label-position="top"
    :items="items"
    :rules="rules"
    :validate-on-rule-change="false"
    :disabled="busy"
    :disabled-submit="busy"
    @submit="save"
  >
    <template #footer>
      <ElButton :disabled="busy" @click="visible = false">取消</ElButton>
      <ElButton type="primary" :loading="busy" :disabled="busy" @click="formRef?.submit()">
        重置密码
      </ElButton>
    </template>
  </AoForm>
</template>

<script setup lang="ts">
  import { h, ref } from 'vue'
  import { AoForm } from '@ao/admin-components'
  import type { FormItem } from '@ao/admin-components'
  import { ElButton } from 'element-plus'
  import { Refresh } from '@element-plus/icons-vue'
  import { resetUserPassword } from '@/api/system-manage'
  import type { ManagedUser } from '@/types/api/system-manage'
  import { useDialogForm } from '@/hooks/useDialogForm'
  import { generateStrongPassword } from '@/utils/form/validator'

  const props = defineProps<{ modelValue: boolean; user?: ManagedUser }>()
  const emit = defineEmits<{ 'update:modelValue': [boolean]; success: [] }>()

  /** 表单引用 */
  const formRef = ref<InstanceType<typeof AoForm>>()

  /** 弹窗表单状态与提交生命周期 */
  const { form, visible, busy, save } = useDialogForm({
    open: () => props.modelValue,
    close: () => emit('update:modelValue', false),
    /**
     * @description 创建空白重置密码表单
     * @return 重置密码表单初值
     */
    createForm: () => ({ password: '' }),
    formRef,
    /**
     * @description 提交前校验新密码非空
     * @param value 当前表单模型
     * @return 是否允许提交
     */
    validate: (value) => Boolean(value.password),
    /**
     * @description 提交新密码，失败保留输入
     * @param value 当前表单模型
     */
    submit: async (value) => {
      if (!props.user) return
      await resetUserPassword(props.user.id, value.password)
    },
    successMessage: '密码已重置',
    /** @description 重置成功后通知列表刷新 */
    success: () => emit('success')
  })

  /**
   * @description 使用安全随机源生成 16 位强密码并清除旧校验错误
   */
  const generatePassword = (): void => {
    if (!props.user || busy.value) return
    form.value.password = generateStrongPassword()
    formRef.value?.clearValidate('password')
  }

  /** 表单项配置 */
  const items: FormItem[] = [
    {
      key: 'password',
      label: '新密码',
      type: 'input',
      span: 24,
      props: {
        maxlength: 128,
        placeholder: '请输入 12 至 128 个字符的新密码',
        autocomplete: 'new-password'
      },
      slots: {
        append: () =>
          h(ElButton, {
            icon: Refresh,
            title: '生成随机密码',
            'aria-label': '生成随机密码',
            ghost: true,
            onClick: generatePassword
          })
      }
    }
  ]

  /** 表单校验规则 */
  const rules = {
    password: [
      { required: true, message: '请输入新密码' },
      { min: 12, max: 128, message: '密码长度为 12 至 128 个字符' }
    ]
  }
</script>
