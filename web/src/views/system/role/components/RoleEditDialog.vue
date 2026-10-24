<template>
  <AoForm
    ref="formRef"
    v-model="form"
    v-model:visible="visible"
    :title="roleId ? '编辑角色' : '新增角色'"
    width="500px"
    :items="items"
    :span="24"
    label-position="right"
    label-width="90px"
    :rules="rules"
    :validate-on-rule-change="false"
    :disabled-submit="busy || loading || !ready"
    :disabled="busy || loading"
    @submit="save"
  >
    <template #footer>
      <ElButton :disabled="busy" @click="visible = false">取消</ElButton>
      <ElButton
        type="primary"
        :loading="busy"
        :disabled="loading || !ready"
        @click="formRef?.submit()"
      >
        保存
      </ElButton>
    </template>
  </AoForm>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { AoForm } from '@ao/admin-components'
  import type { FormItem } from '@ao/admin-components'
  import { ElButton, ElMessage } from 'element-plus'
  import { createRole, fetchGetRole, updateRole } from '@/api/system-manage'
  import { useDialogForm } from '@/hooks/useDialogForm'

  const props = defineProps<{ modelValue: boolean; roleId?: string }>()
  const emit = defineEmits<{ 'update:modelValue': [boolean]; success: [] }>()

  /** 表单引用 */
  const formRef = ref<InstanceType<typeof AoForm>>()

  /** 弹窗表单状态与提交生命周期 */

  const { form, visible, loading, ready, busy, save } = useDialogForm({
    open: () => props.modelValue,
    close: () => emit('update:modelValue', false),
    /**
     * @description 创建空白角色表单
     * @return 角色表单初值
     */
    createForm: () => ({ code: '', name: '', description: '', enabled: true }),
    formRef,
    /**
     * @description 打开时重新读取角色详情，关闭使旧请求失效
     * @param model 当前表单模型
     * @param isCurrent 当前请求是否仍属于最新一次打开
     * @return 详情加载完成时无返回值，请求失效或不允许编辑时返回 false
     */
    load: async (model, isCurrent) => {
      if (!props.roleId) return
      const role = await fetchGetRole(props.roleId)
      if (!isCurrent()) return false
      if (role.isBuiltin) {
        ElMessage.warning('内置角色不可修改')
        emit('update:modelValue', false)
        return false
      }
      model.value = {
        code: role.code,
        name: role.name,
        description: role.description || '',
        enabled: role.enabled
      }
    },
    /**
     * @description 提交前校验角色编码与名称
     * @param value 当前表单模型
     * @return 是否允许提交
     */
    validate: (value) => Boolean(value.code.trim() && value.name.trim()),
    /**
     * @description 保存角色资料，编码创建后不可修改
     * @param value 当前表单模型
     */
    submit: async (value) => {
      const data = {
        code: value.code.trim(),
        name: value.name.trim(),
        description: value.description.trim(),
        enabled: value.enabled
      }
      if (props.roleId)
        await updateRole(props.roleId, {
          name: data.name,
          description: data.description,
          enabled: data.enabled
        })
      else await createRole(data)
    },
    /** @description 保存成功后通知列表刷新 */
    success: () => emit('success')
  })

  /** 表单项配置 */
  const items = computed<FormItem[]>(() => [
    {
      key: 'code',
      label: '角色编码',
      type: 'input',
      span: 24,
      props: { maxlength: 64, disabled: Boolean(props.roleId) }
    },
    { key: 'name', label: '角色名称', type: 'input', span: 24, props: { maxlength: 64 } },
    {
      key: 'description',
      label: '描述',
      type: 'input',
      span: 24,
      props: { type: 'textarea', maxlength: 255 }
    },
    { key: 'enabled', label: '启用', type: 'switch', span: 24 }
  ])

  /** 表单校验规则 */
  const rules = {
    code: [
      {
        required: true,
        pattern: /^[a-z][a-z0-9_]{1,63}$/,
        message: '编码为 2 至 64 位小写字母、数字或下划线，以字母开头'
      }
    ],
    name: [{ required: true, message: '请输入角色名称' }]
  }
</script>
