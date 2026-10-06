<template>
  <!-- AoForm 默认弹窗表单模式：底部为 取消 / 确定，确定 = 校验 + submit；表单重置在 closed 回调中处理 -->
  <AoForm
    ref="formRef"
    v-model="form"
    v-model:visible="visible"
    :title="dialogTitle"
    width="860px"
    align-center
    :items="formItems"
    :rules="rules"
    :span="width > 640 ? 12 : 24"
    :gutter="20"
    label-width="100px"
    @submit="handleSubmit"
    @closed="handleClosed"
  >
    <template #menuType>
      <ElRadioGroup v-model="form.menuType" :disabled="disableMenuType">
        <ElRadioButton value="menu" label="menu">菜单</ElRadioButton>
        <ElRadioButton value="button" label="button">按钮</ElRadioButton>
      </ElRadioGroup>
    </template>
  </AoForm>
</template>

<script setup lang="ts">
  import { computed, h, nextTick, reactive, ref, watch } from 'vue'
  import { ElMessage, ElRadioButton, ElRadioGroup } from 'element-plus'
  import type { FormRules } from 'element-plus'
  import { ElIcon, ElTooltip } from 'element-plus'
  import { QuestionFilled } from '@element-plus/icons-vue'
  import { formatMenuTitle } from '@/utils/router'
  import type { FormItem } from '@ao/admin-components'
  import { AoForm } from '@ao/admin-components'
  import { useWindowSize } from '@vueuse/core'
  import type { MenuDialogProps, MenuDialogEmits, MenuDialogFormData } from '../types'
  import type { AppRouteRecord } from '@/types/router'
  import type { AuthEditData } from '../types'

  const { width } = useWindowSize()

  /**
   * @description 创建带 tooltip 的表单标签
   * @param label 标签文本
   * @param tooltip 提示文本
   * @returns 渲染函数
   */
  const createLabelTooltip = (label: string, tooltip: string) => {
    return () =>
      h('span', { class: 'label-tooltip' }, [
        h('span', label),
        h(
          ElTooltip,
          {
            content: tooltip,
            placement: 'top'
          },
          () => h(ElIcon, { class: 'help-icon' }, () => h(QuestionFilled))
        )
      ])
  }

  const props = withDefaults(defineProps<MenuDialogProps>(), {
    modelValue: false,
    type: 'menu',
    lockType: false
  })

  const emit = defineEmits<MenuDialogEmits>()

  const formRef = ref()

  /**
   * @description 弹窗显示状态双向绑定
   */
  const visible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })
  const isEdit = ref(false)

  const form = reactive<MenuDialogFormData>({
    menuType: 'menu',
    id: 0,
    name: '',
    path: '',
    label: '',
    component: '',
    icon: '',
    isEnable: true,
    sort: 1,
    isMenu: true,
    keepAlive: true,
    isHide: false,
    isHideTab: false,
    link: '',
    isIframe: false,
    showBadge: false,
    showTextBadge: '',
    fixedTab: false,
    activePath: '',
    roles: [],
    isFullPage: false,
    authName: '',
    authLabel: '',
    authIcon: '',
    authSort: 1
  })

  const rules = reactive<FormRules>({
    name: [
      { required: true, message: '请输入菜单名称', trigger: 'blur' },
      { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
    ],
    path: [{ required: true, message: '请输入路由地址', trigger: 'blur' }],
    label: [{ required: true, message: '输入权限标识', trigger: 'blur' }],
    authName: [{ required: true, message: '请输入权限名称', trigger: 'blur' }],
    authLabel: [{ required: true, message: '请输入权限标识', trigger: 'blur' }]
  })

  /**
   * @description 表单项配置
   */
  const formItems = computed<FormItem[]>(() => {
    const baseItems: FormItem[] = [{ label: '菜单类型', key: 'menuType', span: 24 }]

    // Switch 组件的格数（相对行基准）：小屏幕 12（半行），大屏幕 3（四分之一行）
    const switchSpan = width.value < 640 ? 12 : 3

    if (form.menuType === 'menu') {
      return [
        ...baseItems,
        {
          label: '菜单名称',
          key: 'name',
          type: 'input',
          span: 6,
          props: { placeholder: '菜单名称' }
        },
        {
          label: createLabelTooltip(
            '路由地址',
            '一级菜单：以 / 开头的绝对路径（如 /dashboard）\n二级及以下：相对路径（如 console、user）'
          ),
          key: 'path',
          type: 'input',
          span: 6,
          props: { placeholder: '如：/dashboard 或 console' }
        },
        {
          label: '权限标识',
          key: 'label',
          type: 'input',
          span: 6,
          props: { placeholder: '如：User' }
        },
        {
          label: createLabelTooltip(
            '组件路径',
            '一级父级菜单：填写 /index/index\n具体页面：填写组件路径（如 /system/user）\n目录菜单：留空'
          ),
          key: 'component',
          type: 'input',
          span: 6,
          props: { placeholder: '如：/system/user 或留空' }
        },
        {
          label: '图标',
          key: 'icon',
          type: 'input',
          span: 6,
          props: { placeholder: '如：ri:user-line' }
        },
        {
          label: createLabelTooltip(
            '角色权限',
            '仅用于前端权限模式：配置角色标识（如 R_SUPER、R_ADMIN）\n后端权限模式：无需配置'
          ),
          key: 'roles',
          type: 'inputtag',
          span: 6,
          props: { placeholder: '输入角色标识后按回车，如：R_SUPER' }
        },
        {
          label: '菜单排序',
          key: 'sort',
          type: 'number',
          span: 6,
          props: { min: 1, controlsPosition: 'right', style: { width: '100%' } }
        },
        {
          label: '外部链接',
          key: 'link',
          type: 'input',
          span: 6,
          props: { placeholder: '如：https://www.example.com' }
        },
        {
          label: '文本徽章',
          key: 'showTextBadge',
          type: 'input',
          span: 6,
          props: { placeholder: '如：New、Hot' }
        },
        {
          label: createLabelTooltip(
            '激活路径',
            '用于详情页等隐藏菜单，指定高亮显示的父级菜单路径\n例如：用户详情页高亮显示"用户管理"菜单'
          ),
          key: 'activePath',
          type: 'input',
          span: 6,
          props: { placeholder: '如：/system/user' }
        },
        { label: '是否启用', key: 'isEnable', type: 'switch', span: switchSpan },
        { label: '页面缓存', key: 'keepAlive', type: 'switch', span: switchSpan },
        { label: '隐藏菜单', key: 'isHide', type: 'switch', span: switchSpan },
        { label: '是否内嵌', key: 'isIframe', type: 'switch', span: switchSpan },
        { label: '显示徽章', key: 'showBadge', type: 'switch', span: switchSpan },
        { label: '固定标签', key: 'fixedTab', type: 'switch', span: switchSpan },
        { label: '标签隐藏', key: 'isHideTab', type: 'switch', span: switchSpan },
        { label: '全屏页面', key: 'isFullPage', type: 'switch', span: switchSpan }
      ]
    } else {
      return [
        ...baseItems,
        {
          label: '权限名称',
          key: 'authName',
          type: 'input',
          span: 6,
          props: { placeholder: '如：新增、编辑、删除' }
        },
        {
          label: '权限标识',
          key: 'authLabel',
          type: 'input',
          span: 6,
          props: { placeholder: '如：add、edit、delete' }
        },
        {
          label: '权限排序',
          key: 'authSort',
          type: 'number',
          span: 6,
          props: { min: 1, controlsPosition: 'right', style: { width: '100%' } }
        }
      ]
    }
  })

  const dialogTitle = computed(() => {
    const type = form.menuType === 'menu' ? '菜单' : '按钮'
    return isEdit.value ? `编辑${type}` : `新建${type}`
  })

  /**
   * @description 是否禁用菜单类型切换
   */
  const disableMenuType = computed(() => {
    if (isEdit.value) return true
    if (!isEdit.value && form.menuType === 'menu' && props.lockType) return true
    return false
  })

  /**
   * @description 重置表单数据
   */
  const resetForm = (): void => {
    formRef.value?.reset()
    form.menuType = 'menu'
  }

  /**
   * @description 加载表单数据（编辑模式）
   */
  const loadFormData = (): void => {
    if (!props.editData) return

    isEdit.value = true

    if (form.menuType === 'menu') {
      const row = props.editData as AppRouteRecord
      form.id = row.id || 0
      form.name = formatMenuTitle(row.meta?.title || '')
      form.path = row.path || ''
      form.label = typeof row.name === 'string' ? row.name : ''
      form.component = typeof row.component === 'string' ? row.component : ''
      form.icon = row.meta?.icon || ''
      form.sort = typeof row.meta?.sort === 'number' ? row.meta.sort : 1
      form.isMenu = typeof row.meta?.isMenu === 'boolean' ? row.meta.isMenu : true
      form.keepAlive = row.meta?.keepAlive ?? false
      form.isHide = row.meta?.isHide ?? false
      form.isHideTab = row.meta?.isHideTab ?? false
      form.isEnable = typeof row.meta?.isEnable === 'boolean' ? row.meta.isEnable : true
      form.link = row.meta?.link || ''
      form.isIframe = row.meta?.isIframe ?? false
      form.showBadge = row.meta?.showBadge ?? false
      form.showTextBadge = row.meta?.showTextBadge || ''
      form.fixedTab = row.meta?.fixedTab ?? false
      form.activePath = row.meta?.activePath || ''
      form.roles = row.meta?.roles || []
      form.isFullPage = row.meta?.isFullPage ?? false
    } else {
      const row = props.editData as AuthEditData
      form.authName = row.title || ''
      form.authLabel = row.authMark || ''
    }
  }

  /**
   * @description 提交表单（AoForm 弹窗模式在触发 submit 前已完成校验）
   */
  const handleSubmit = (): void => {
    emit('submit', { ...form })
    ElMessage.success(`${isEdit.value ? '编辑' : '新增'}成功`)
    visible.value = false
  }

  /**
   * @description 对话框关闭后的回调
   */
  const handleClosed = (): void => {
    resetForm()
    isEdit.value = false
  }

  /**
   * @description 监听对话框显示状态
   */
  watch(
    () => props.modelValue,
    (newVal) => {
      if (newVal) {
        form.menuType = props.type
        nextTick(() => {
          if (props.editData) {
            loadFormData()
          }
        })
      }
    }
  )

  /**
   * @description 监听菜单类型变化
   */
  watch(
    () => props.type,
    (newType) => {
      if (props.modelValue) {
        form.menuType = newType
      }
    }
  )
</script>

<style scoped lang="scss">
  // 带 tooltip 的表单标签容器
  .label-tooltip {
    display: flex;
    align-items: center;
  }

  // 帮助图标
  .help-icon {
    margin-left: 0.125rem;
    cursor: help;
  }
</style>
