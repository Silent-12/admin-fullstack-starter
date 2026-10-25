<template>
  <ElDrawer
    v-model="visible"
    class="menu-dialog"
    :title="resourceId ? '编辑' : '新增'"
    direction="rtl"
    size="min(650px, 100vw)"
    :close-on-click-modal="!busy"
    :close-on-press-escape="!busy"
  >
    <AoForm
      ref="formRef"
      v-model="form"
      :dialog="false"
      :loading="loading || busy"
      label-position="top"
      :gutter="24"
      :items="items"
      :rules="rules"
      :validate-on-rule-change="false"
      :disabled="busy || loading"
      @submit="save"
    >
      <template #parentId>
        <ElTreeSelect
          v-model="form.parentId"
          :data="parents"
          node-key="id"
          :props="{ label: 'title', children: 'children', disabled: 'disabled' }"
          check-strictly
          clearable
          :placeholder="parentPlaceholder"
          :disabled="busy || loading || builtin"
        />
      </template>
      <template #apiCodes>
        <ApiTreeSelector
          v-if="modelValue && ready && form.type !== 'directory'"
          :key="resourceId || 'new'"
          v-model="form.apiCodes"
          :disabled="busy || builtin"
          @ready="apiReady = $event"
        />
      </template>
    </AoForm>
    <template #footer>
      <div class="footer">
        <ElButton :disabled="busy" @click="visible = false">取消</ElButton>
        <ElButton
          type="primary"
          :loading="busy"
          :disabled="submitDisabled"
          @click="formRef?.submit()"
        >
          保存
        </ElButton>
      </div>
    </template>
  </ElDrawer>
</template>

<script setup lang="ts">
  import { computed, ref, watch, type Ref } from 'vue'
  import { AoForm } from '@ao/admin-components'
  import type { FormItem } from '@ao/admin-components'
  import { ElButton, ElDrawer, ElMessage, ElTreeSelect } from 'element-plus'
  import { createMenu, fetchGetMenu, updateMenu } from '@/api/system-manage'
  import type { ResourceInput, ResourceTreeNode } from '@/types/api/system-manage'
  import { validateBusinessRouteIdentity } from '@/router/services/RouteConfigValidator'
  import { useDialogForm } from '@/hooks/useDialogForm'
  import ApiTreeSelector from './ApiTreeSelector.vue'

  const props = defineProps<{
    modelValue: boolean
    resourceId?: string
    parentId?: string
    resources: ResourceTreeNode[]
  }>()
  const emit = defineEmits<{ 'update:modelValue': [boolean]; success: [] }>()

  /** 表单引用、接口检索就绪状态与内置资源标记 */
  const formRef = ref<InstanceType<typeof AoForm>>()
  const apiReady = ref(false)
  const builtin = ref(false)

  /**
   * @description 在完整资源树中查找指定节点
   * @param nodes 资源树节点
   * @param id 目标资源 ID
   * @return 命中的资源节点，未找到时返回 undefined
   */
  const findResource = (nodes: ResourceTreeNode[], id?: string): ResourceTreeNode | undefined => {
    for (const node of nodes) {
      if (node.id === id) return node
      const found = findResource(node.children || [], id)
      if (found) return found
    }
    return undefined
  }

  /**
   * @description 为新建资源创建完整初值，父节点类型决定子节点默认类型
   * @return 新建资源表单初值
   */
  const initial = (): ResourceInput => ({
    parentId: props.parentId || null,
    type: !props.parentId
      ? 'directory'
      : findResource(props.resources, props.parentId)?.type === 'menu'
        ? 'button'
        : 'menu',
    title: '',
    name: '',
    path: '',
    component: props.parentId ? '' : '/index/index',
    icon: '',
    permission: '',
    enabled: true,
    sort: 0,
    hidden: false,
    keepAlive: false,
    apiCodes: []
  })

  /**
   * @description 编辑时读取资源详情，仅将当前请求的响应写入表单
   * @param model 当前表单模型
   * @param isCurrent 当前请求是否仍属于最新一次打开
   * @return 详情加载完成时无返回值，请求失效或不允许编辑时返回 false
   */
  const load = async (
    model: Ref<ResourceInput>,
    isCurrent: () => boolean
  ): Promise<boolean | void> => {
    if (!props.resourceId) return
    const item = await fetchGetMenu(props.resourceId)
    if (!isCurrent()) return false
    builtin.value = item.isBuiltin
    model.value = {
      parentId: item.parentId,
      type: item.type,
      title: item.title,
      name: item.name,
      path: item.path,
      component: item.component,
      icon: item.icon,
      permission: item.permission,
      enabled: item.enabled,
      sort: item.sort,
      hidden: item.hidden,
      keepAlive: item.keepAlive,
      apiCodes: [...item.apiCodes]
    }
  }

  /** 弹窗表单状态与提交生命周期 */

  const { form, visible, loading, ready, busy, save } = useDialogForm<ResourceInput>({
    open: () => props.modelValue,
    close: () => emit('update:modelValue', false),
    createForm: initial,
    formRef,
    /**
     * @description 重置接口检索就绪状态与内置资源标记
     */
    reset: () => {
      apiReady.value = false
      builtin.value = false
    },
    load,
    validate,
    submit,
    /** @description 保存成功后通知资源树刷新 */
    success: () => emit('success')
  })

  /** 保存按钮禁用条件：数据未就绪或接口检索未就绪，保存中由按钮加载态接管 */
  const submitDisabled = computed(
    () => loading.value || !ready.value || (form.value.type !== 'directory' && !apiReady.value)
  )

  /**
   * @description 提交前校验资源层级与静态路由合法性
   * @param value 当前表单模型
   * @return 是否允许提交
   */
  function validate(value: ResourceInput): boolean {
    if (value.type !== 'directory' && !apiReady.value) return false
    if (!value.title.trim()) return false
    if (value.type !== 'directory' && !value.parentId) return false
    if (value.type !== 'button' && (!value.name?.trim() || !value.path?.trim())) return false
    if (value.type !== 'button') {
      const errors = validateBusinessRouteIdentity(value.name!.trim(), value.path!.trim())
      if (!value.parentId && !value.path!.trim().startsWith('/'))
        errors.push('根目录必须使用绝对路径')
      if (errors.length) {
        ElMessage.warning(errors[0])
        return false
      }
    }
    if (value.type === 'menu' && !value.component?.trim()) return false
    if (value.type === 'directory' && !value.parentId && value.component !== '/index/index') {
      ElMessage.warning('根目录组件必须为 /index/index')
      return false
    }
    if (value.type === 'button' && !value.permission?.trim()) return false
    return true
  }

  /**
   * @description 归一化各资源类型的可写字段后保存资源与全部接口绑定
   * @param value 当前表单模型
   */
  async function submit(value: ResourceInput): Promise<void> {
    const data: ResourceInput = {
      ...value,
      title: value.title.trim(),
      parentId: value.parentId || null,
      name: value.type === 'button' ? null : value.name?.trim() || null,
      path: value.type === 'button' ? null : value.path?.trim() || null,
      component: value.type === 'button' ? null : value.component?.trim() || null,
      icon: value.type === 'button' ? null : value.icon?.trim() || null,
      permission: value.type === 'directory' ? null : value.permission?.trim() || null,
      hidden: value.type === 'button' ? false : value.hidden,
      keepAlive: value.type === 'menu' && value.keepAlive,
      sort: Number(value.sort) || 0,
      apiCodes: value.type === 'directory' ? [] : [...value.apiCodes]
    }
    if (props.resourceId) await updateMenu(props.resourceId, data)
    else await createMenu(data)
  }

  /**
   * @description 生成父资源候选树，禁用按钮节点、自身及其后代
   * @param nodes 待处理的资源节点
   * @param blocked 祖先链是否已命中禁用节点
   * @return 带禁用状态的资源节点
   */
  const parentNodes = (
    nodes: ResourceTreeNode[],
    blocked = false
  ): (ResourceTreeNode & { disabled: boolean })[] =>
    nodes.map((node) => {
      const descendant = blocked || node.id === props.resourceId
      const disabled =
        descendant ||
        (form.value.type === 'button' ? node.type !== 'menu' : node.type !== 'directory')
      return { ...node, disabled, children: parentNodes(node.children || [], descendant) }
    })

  const parents = computed(() => parentNodes(props.resources))

  /** 父资源占位提示，随资源类型说明可选范围 */
  const parentPlaceholder = computed(() => {
    if (form.value.type === 'button') return '请选择所属菜单'
    if (form.value.type === 'menu') return '请选择所属目录'
    return '不选择表示根节点'
  })

  /** 表单项配置，按业务语义分组并按资源类型动态增减字段 */
  const items = computed<FormItem[]>(() => {
    const isButton = form.value.type === 'button'
    const isDirectory = form.value.type === 'directory'
    const isMenu = form.value.type === 'menu'

    const basic: FormItem[] = [
      { key: 'basicTitle', label: '基本信息', type: 'title' },
      {
        key: 'type',
        label: '资源类型',
        type: 'select',
        props: {
          disabled: Boolean(props.resourceId),
          options: [
            { label: '目录', value: 'directory' },
            { label: '菜单', value: 'menu' },
            { label: '按钮', value: 'button' }
          ]
        }
      },
      { key: 'parentId', label: '父资源' },
      {
        key: 'title',
        label: '显示名称',
        type: 'input',
        props: { maxlength: 64, placeholder: '请输入显示名称' }
      }
    ]
    if (!isButton)
      basic.push({
        key: 'icon',
        label: '图标',
        type: 'input',
        props: { placeholder: 'Iconify 图标名，如 ri:settings-3-line' }
      })
    basic.push(
      {
        key: 'sort',
        label: '排序',
        type: 'number',
        props: { min: 0, precision: 0, valueOnClear: 0 }
      },
      {
        key: 'enabled',
        label: '启用',
        type: 'switch',
        props: {
          disabled: builtin.value,
          inlinePrompt: true,
          activeText: '启用',
          inactiveText: '禁用',
          width: 64
        }
      }
    )

    const route: FormItem[] = isButton
      ? []
      : [
          { key: 'routeTitle', label: '路由配置', type: 'title' },
          {
            key: 'name',
            label: '路由名称',
            type: 'input',
            props: { disabled: builtin.value, placeholder: '唯一英文路由名称' }
          },
          {
            key: 'path',
            label: '路由路径',
            type: 'input',
            props: { disabled: builtin.value, placeholder: '根节点 /system，子节点 user' }
          }
        ]
    // 目录组件路径由父级关系自动决定，不提供编辑入口
    if (isMenu)
      route.push({
        key: 'component',
        label: '组件路径',
        type: 'input',
        span: 24,
        props: { disabled: builtin.value, placeholder: '页面组件路径，如 /system/user' }
      })

    const permission: FormItem[] = isDirectory
      ? []
      : [
          { key: 'permissionTitle', label: '权限与接口', type: 'title' },
          {
            key: 'permission',
            label: '操作权限码',
            type: 'input',
            span: 24,
            props: { disabled: builtin.value, placeholder: '如 system.users.create' }
          },
          { key: 'apiCodes', label: '绑定接口', span: 24 }
        ]

    const display: FormItem[] = isButton
      ? []
      : [
          { key: 'displayTitle', label: '显示设置', type: 'title' },
          {
            key: 'hidden',
            label: '隐藏菜单',
            type: 'switch',
            props: { inlinePrompt: true, activeText: '隐藏', inactiveText: '显示', width: 64 }
          }
        ]
    // 页面缓存仅对菜单生效，目录与按钮保存时固定为关闭
    if (isMenu)
      display.push({
        key: 'keepAlive',
        label: '缓存页面',
        type: 'switch',
        props: { inlinePrompt: true, activeText: '缓存', inactiveText: '不缓存', width: 80 }
      })

    return [...basic, ...route, ...permission, ...display]
  })

  /** 表单校验规则，必填项随资源类型变化 */
  const rules = computed(() => ({
    parentId: [
      { required: form.value.type !== 'directory', message: '请选择页面所属目录或按钮所属菜单' }
    ],
    title: [{ required: true, message: '请输入显示名称' }],
    name: [{ required: form.value.type !== 'button', message: '请输入路由名称' }],
    path: [{ required: form.value.type !== 'button', message: '请输入路由路径' }],
    component: [
      {
        required:
          form.value.type === 'menu' || (form.value.type === 'directory' && !form.value.parentId),
        message: '请输入页面组件，根目录使用 /index/index'
      }
    ],
    permission: [{ required: form.value.type === 'button', message: '请输入操作权限码' }],
    sort: [{ type: 'integer' as const, min: 0, message: '排序须为非负整数' }]
  }))

  // 父节点变化时归一化目录布局；新建资源同时清理不适用的层级
  watch(
    () => [form.value.type, form.value.parentId],
    () => {
      if (!ready.value) return
      if (!props.resourceId) {
        const parent = findResource(props.resources, form.value.parentId || undefined)
        const validParent =
          form.value.type === 'button' ? parent?.type === 'menu' : parent?.type === 'directory'
        if (parent && !validParent) form.value.parentId = null
      }
      if (form.value.type === 'directory')
        form.value.component = form.value.parentId ? null : '/index/index'
      else if (!props.resourceId && form.value.component === '/index/index')
        form.value.component = null
    }
  )
</script>

<style lang="scss">
  // 抽屉承载表单：内边距统一由抽屉主体提供，表单主体不再叠加留白
  .menu-dialog {
    .el-drawer__body {
      padding: 8px 24px 16px;
    }

    section.form-section {
      padding: 0;
    }

    .footer {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    @media (width <= 767px) {
      .el-drawer__body {
        padding: 8px 16px 16px;
      }

      .el-col {
        flex-basis: 100%;
        max-width: 100%;
      }
    }
  }
</style>
