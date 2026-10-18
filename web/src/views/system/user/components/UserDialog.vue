<template>
  <AoForm
    ref="formRef"
    v-model="form"
    v-model:visible="visible"
    :title="userId ? '编辑用户' : '新增用户'"
    width="600px"
    :items="items"
    :rules="rules"
    :validate-on-rule-change="false"
    :disabled="busy || loading"
    :disabled-submit="busy || loading || !ready"
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
  import { computed, h, ref } from 'vue'
  import { AoForm } from '@ao/admin-components'
  import type { FormItem } from '@ao/admin-components'
  import { ElAlert, ElButton } from 'element-plus'
  import { createUser, fetchGetRoleOptions, fetchGetUser, updateUser } from '@/api/system-manage'
  import type { RoleOption } from '@/types/api/system-manage'
  import { useDialogForm } from '@/hooks/useDialogForm'

  const props = defineProps<{ modelValue: boolean; userId?: string }>()
  const emit = defineEmits<{ 'update:modelValue': [boolean]; success: [] }>()

  /** 表单引用、可分配角色与内置账号标记 */
  const formRef = ref<InstanceType<typeof AoForm>>()
  const roles = ref<RoleOption[]>([])
  const builtinUser = ref(false)

  /** 弹窗表单状态与提交生命周期 */

  const { form, visible, loading, ready, busy, save } = useDialogForm({
    open: () => props.modelValue,
    close: () => emit('update:modelValue', false),
    /**
     * @description 创建空白用户表单
     * @return 用户表单初值
     */
    createForm: () => ({
      username: '',
      name: '',
      password: '',
      phone: '',
      email: '',
      avatar: '',
      enabled: true,
      roleIds: [] as string[]
    }),
    formRef,
    /**
     * @description 清理上一次打开残留的角色选项与内置账号标记
     */
    reset: () => {
      roles.value = []
      builtinUser.value = false
    },
    /**
     * @description 打开时加载用户资料与可分配角色，忽略已失效的响应
     * @param model 当前表单模型
     * @param isCurrent 当前请求是否仍属于最新一次打开
     * @return 资料加载完成时无返回值，请求失效时返回 false
     */
    load: async (model, isCurrent) => {
      const [options, user] = await Promise.all([
        fetchGetRoleOptions(),
        props.userId ? fetchGetUser(props.userId) : Promise.resolve(null)
      ])
      if (!isCurrent()) return false
      roles.value = options
      if (!user) return
      builtinUser.value = user.isBuiltin
      model.value = {
        username: user.username,
        name: user.name,
        password: '',
        phone: user.phone || '',
        email: user.email || '',
        avatar: user.avatar || '',
        enabled: user.enabled,
        roleIds: [...user.roleIds]
      }
    },
    /**
     * @description 提交前校验用户名、姓名与新建密码
     * @param value 当前表单模型
     * @return 是否允许提交
     */
    validate: (value) => {
      if (!value.username.trim() || !value.name.trim()) return false
      return Boolean(props.userId || value.password)
    },
    /**
     * @description 保存基础资料及角色绑定，失败保留所有输入
     * @param value 当前表单模型
     */
    submit: async (value) => {
      const data = {
        name: value.name.trim(),
        phone: value.phone.trim() || null,
        email: value.email.trim() || null,
        avatar: value.avatar.trim() || null,
        enabled: value.enabled,
        roleIds: [...value.roleIds]
      }
      if (props.userId) await updateUser(props.userId, data)
      else await createUser({ ...data, username: value.username.trim(), password: value.password })
    },
    /** @description 保存成功后通知列表刷新 */
    success: () => emit('success')
  })

  // 为已绑定但不在可分配选项中的角色补齐展示文案，避免下拉框直接显示 UUID
  const roleOptions = computed(() => {
    const options = roles.value.map((role) => ({ label: role.name, value: role.id }))
    const known = new Set(roles.value.map((role) => role.id))
    const missing = form.value.roleIds.filter((roleId) => !known.has(roleId))
    return [
      ...options,
      ...missing.map((roleId) => ({ label: '已停用或不可用角色', value: roleId }))
    ]
  })

  /** 表单项配置 */
  const items = computed<FormItem[]>(() => [
    {
      key: 'username',
      label: '用户名',
      type: 'input',
      props: {
        maxlength: 64,
        disabled: Boolean(props.userId),
        placeholder: '仅小写字母，同名时自动追加数字后缀'
      }
    },
    { key: 'name', label: '姓名', type: 'input', props: { maxlength: 64 } },
    ...(!props.userId
      ? [
          {
            key: 'password',
            label: '初始密码',
            type: 'input' as const,
            props: { type: 'password', showPassword: true, autocomplete: 'new-password' }
          }
        ]
      : []),
    { key: 'phone', label: '手机号', type: 'input' },
    { key: 'email', label: '邮箱', type: 'input' },
    { key: 'avatar', label: '头像地址', type: 'input' },
    // 内置账号的角色绑定与启用开关固定，仅允许维护基础资料
    {
      key: 'roleIds',
      label: '角色',
      type: 'select',
      props: {
        multiple: true,
        disabled: builtinUser.value,
        options: roleOptions.value
      }
    },
    ...(builtinUser.value
      ? [
          {
            key: 'roleHint',
            label: '',
            span: 24,
            render: () =>
              h(ElAlert, {
                title: '内置管理员权限固定，不可修改',
                type: 'info',
                closable: false
              })
          }
        ]
      : []),
    { key: 'enabled', label: '启用', type: 'switch', props: { disabled: builtinUser.value } }
  ])

  /** 表单校验规则 */
  const rules = computed(() => ({
    username: [
      { required: true, pattern: /^[a-z]{1,64}$/, message: '用户名仅可使用 1 至 64 位小写字母' }
    ],
    name: [{ required: true, message: '请输入姓名' }],
    password: [
      { required: !props.userId, min: 12, max: 128, message: '密码长度为 12 至 128 个字符' }
    ],
    email: [{ type: 'email' as const, message: '请输入有效邮箱' }]
  }))
</script>
