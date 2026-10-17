<!-- 数据展示示例页面 -->
<!-- 单页集中展示 AoForm 与 AoTable 的全部支持写法，mock 数据由页面内生成 -->
<!-- AoForm 部分：以弹窗承载，覆盖全部预定义表单项类型、分组标题项（type: 'title'）、render 自定义渲染、slots 插槽、hidden 隐藏项、span / labelWidth 覆盖、label 渲染函数、校验规则、提交输出清洗与 ref.getOutput；另演示默认弹窗表单模式与 span 行基准换行（:dialog="false" 时为内联模式） -->
<!-- AoTable 部分：集成布局（搜索栏 + 表格头部 + 分页）、selection / index / globalIndex / expand 特殊列、原生 formatter、点路径 prop、slotName 自定义单元格、列设置（columnChecks）、操作列与底部内容插槽，并在表格头部右侧演示 AoExcelExport / AoExcelImport 的导出与导入 -->
<template>
  <div class="data-showcase ao-full-height">
    <!-- ============ AoForm 展示区入口 ============ -->
    <ElCard shadow="never">
      <template #header>
        <div class="card-header">
          <span class="card-title">AoForm 表单写法展示</span>
          <ElSpace>
            <ElButton type="primary" @click="formDialogVisible = true"> 打开表单弹窗 </ElButton>
            <ElButton @click="quickFormVisible = true">弹窗表单模式</ElButton>
          </ElSpace>
        </div>
      </template>
      <p class="card-tip">
        覆盖全部表单项类型与自定义渲染方式（render / slots / 分组标题项 /
        隐藏项等），点击右上角按钮在弹窗中查看；「弹窗表单模式」演示 AoForm 内置 ElDialog 与 span
        行基准自动换行。
      </p>
    </ElCard>

    <!-- ============ AoTable 展示区：展示高度由页面样式给定（.table-section） ============ -->
    <AoTable
      v-model:search-form="searchForm"
      v-model:column-checks="columnChecks"
      :search-items="searchItems"
      :loading="loading"
      :data="tableData"
      :columns="columns"
      :pagination="pagination"
      empty-text="没有匹配的示例数据"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
      @search="handleSearch"
      @reset="handleReset"
      @refresh="fetchList"
      @selection-change="handleSelectionChange"
    >
      <!-- 表格头部左侧操作区 -->
      <template #header-left>
        <ElSpace wrap>
          <ElButton @click="showRowMessage('新增')">新增</ElButton>
        </ElSpace>
      </template>

      <!-- 表格头部右侧操作区 -->
      <template #header-right>
        <ElSpace>
          <AoExcelExport :data="excelData" filename="组件示例" />
          <AoExcelImport @import-success="handleExcelImport" @import-error="handleExcelError" />
        </ElSpace>
      </template>

      <!-- 成员列：头像 + 姓名 + 邮箱组合展示 -->
      <template #member="{ row }">
        <div class="member">
          <AoImage class="member-avatar" :src="row.avatar" :preview-teleported="true" />
          <div class="member-info">
            <p class="member-name">{{ row.name }}</p>
            <p class="member-email">{{ row.email }}</p>
          </div>
        </div>
      </template>

      <!-- 状态列：ElTag 展示 -->
      <template #status="{ row }">
        <ElTag :type="getStatusConfig(row.status).type">
          {{ getStatusConfig(row.status).text }}
        </ElTag>
      </template>

      <!-- 进度列：ElProgress 展示 -->
      <template #progress="{ row }">
        <ElProgress :percentage="row.progress" :stroke-width="8" />
      </template>

      <!-- 标签列：多 ElTag 展示 -->
      <template #tags="{ row }">
        <ElSpace wrap>
          <ElTag v-for="tag in row.tags" :key="tag" size="small" effect="plain">
            {{ tag }}
          </ElTag>
        </ElSpace>
      </template>

      <!-- 启用列：行内 ElSwitch 展示 -->
      <template #enabled="{ row }">
        <ElSwitch v-model="row.enabled" size="small" />
      </template>

      <!-- 展开行：整行数据的 JSON 展示 -->
      <template #expand="{ row }">
        <pre class="row-detail">{{ JSON.stringify(row, null, 2) }}</pre>
      </template>

      <!-- 操作列：声明即自动启用 -->
      <template #operation="{ row }">
        <AoButtonTable type="edit" @click="showRowMessage('编辑', row)" />
        <AoButtonTable type="delete" @click="showRowMessage('删除', row)" />
      </template>

      <!-- 表格底部左侧内容区：与右侧分页器同行 -->
      <template #footer>
        <span class="footer-tip">当前选中 {{ selectedRows.length }} 行</span>
      </template>
    </AoTable>

    <!-- ============ AoForm 内联模式：:dialog="false" 时为普通表单，由页面自行用 ElDialog 承载 ============ -->
    <!-- span=12 表示每行基准 12 格：表单项 span=6 时每行 2 个、span=12 时独占一行，任意组合都不会产生栅格余数 -->
    <ElDialog
      v-model="formDialogVisible"
      title="AoForm 表单写法展示"
      width="800px"
      align-center
      class="ao-form-dialog"
    >
      <!-- rules 经由 $attrs 透传给内部 ElForm；v-model 就地修改表单对象 -->
      <AoForm
        ref="formRef"
        v-model="formModel"
        :dialog="false"
        :items="formItems"
        :rules="formRules"
        :span="12"
        label-width="100px"
        @submit="handleFormSubmit"
      >
        <!-- 具名插槽兜底：AoForm 默认插槽按 key 覆盖单个表单项的渲染 -->
        <template #name="{ modelValue }">
          <ElInput :model-value="modelValue.name" placeholder="由 #name 插槽接管渲染" disabled />
        </template>
      </AoForm>

      <!-- 提交后清洗输出的 JSON 预览 -->
      <pre v-if="formOutputJson" class="form-output">{{ formOutputJson }}</pre>

      <!-- 内联模式不内置操作按钮，由页面自行提供；确定 = 校验通过后读取清洗输出 -->
      <template #footer>
        <div class="dialog-footer">
          <ElButton @click="readFormOutput">ref.getOutput 读取输出</ElButton>
          <ElSpace>
            <ElButton @click="formDialogVisible = false">取消</ElButton>
            <ElButton type="primary" @click="handleShowcaseConfirm">确定</ElButton>
          </ElSpace>
        </div>
      </template>
    </ElDialog>

    <!-- ============ AoForm 弹窗表单模式（默认）：内置 ElDialog，底部固定为 取消 / 确定，默认右对齐 ============ -->
    <!-- cancel-text / confirm-text 覆盖底部按钮文案；需要替换按钮时用 #footer 插槽整体接管 -->
    <!-- span=12 表示每行基准 12 格：三个 span=4 的表单项刚好占满一行，第四个宽度不够自动换行 -->
    <AoForm
      v-model="quickFormModel"
      v-model:visible="quickFormVisible"
      title="弹窗表单模式"
      width="720px"
      :span="12"
      :items="quickFormItems"
      :rules="quickFormRules"
      cancel-text="关闭"
      confirm-text="保存"
      @submit="handleQuickFormSubmit"
    />
  </div>
</template>

<script setup lang="ts">
  import { computed, h, onMounted, reactive, ref } from 'vue'
  import {
    ElButton,
    ElCard,
    ElDialog,
    ElInput,
    ElMessage,
    ElProgress,
    ElRate,
    ElSpace,
    ElSwitch,
    ElTag
  } from 'element-plus'
  import type { FormRules } from 'element-plus'
  import { AoForm } from '@ao/admin-components'
  import type { FormItem } from '@ao/admin-components'
  import { AoTable } from '@ao/admin-components'
  import { AoButtonTable } from '@ao/admin-components'
  import { AoExcelExport, AoExcelImport } from '@ao/admin-components'
  import AoImage from '@/components/media/AoImage.vue'
  import { useTableColumns } from '@ao/admin-components'
  import type { SearchFormItem } from '@ao/admin-components'
  import type { TablePaginationState } from '@ao/admin-components'

  defineOptions({ name: 'DataShowcase' })

  /** 示例表格行数据结构 */
  interface ShowcaseRow {
    id: number
    name: string
    email: string
    avatar: string
    dept: { name: string }
    status: 'online' | 'busy' | 'offline'
    progress: number
    tags: string[]
    score: number
    amount: number
    enabled: boolean
    createTime: string
  }

  /** 搜索表单数据结构 */
  interface ShowcaseSearchForm {
    name?: string
    status?: string
    minScore?: number
    createTimeRange?: string[]
  }

  /** AoForm 对外暴露的实例方法（validate / reset / getOutput） */
  interface FormInstanceLike {
    validate: () => Promise<boolean>
    reset: () => void
    getOutput: () => Record<string, any>
  }

  // 组件引用
  const formRef = ref<FormInstanceLike | null>(null)

  // 弹窗相关
  const formDialogVisible = ref(false)

  // 状态数据
  const tableData = ref<ShowcaseRow[]>([])
  const loading = ref(false)
  const selectedRows = ref<ShowcaseRow[]>([])
  const formOutputJson = ref('')

  // Excel 示例仅导出当前页的基础字段，导入结果在本地展示行数。
  const excelData = computed(() =>
    tableData.value.map((row) => ({ 姓名: row.name, 邮箱: row.email, 积分: row.score }))
  )

  /**
   * @description 展示 Excel 本地解析结果，不写入业务数据。
   * @param rows 首个工作表解析出的数据行。
   */
  const handleExcelImport = (rows: Array<Record<string, unknown>>): void => {
    ElMessage.success(`Excel 解析成功，共 ${rows.length} 行`)
  }

  /**
   * @description 提示 Excel 解析失败原因。
   * @param error 文件解析错误。
   */
  const handleExcelError = (error: Error): void => {
    ElMessage.error(`Excel 解析失败：${error.message}`)
  }

  // 表单数据（v-model 就地修改，携带全部类型的默认值）
  const formModel = ref<Record<string, any>>({
    // 插槽接管渲染的字段
    name: '林清羽',
    tags: ['Vue'],
    count: 20,
    dept: 'rd',
    enabled: true,
    agree: true,
    roles: ['view'],
    gender: '1',
    date: '2026-10-04',
    daterange: ['2026-10-01', '2026-10-07'],
    datetime: '2026-10-04 12:30:00',
    datetimerange: ['2026-10-04 09:00:00', '2026-10-04 18:00:00'],
    rate: 4,
    percent: 60,
    region: ['zhejiang', 'hangzhou'],
    workTime: '09:30',
    breakfast: '08:30',
    leader: 'zhejiang-hangzhou',
    renderField: 3,
    slotField: '带插槽的输入',
    labelWidthField: '标签宽度覆盖',
    labelFnField: '标签函数',
    // hidden: true 的字段不会渲染，但会随提交输出
    secret: '隐藏字段的默认值'
  })

  // 表单校验规则（经 $attrs 透传给内部 ElForm）
  const formRules: FormRules = {
    tags: [{ required: true, message: '请至少输入一个标签', trigger: 'blur' }],
    dept: [{ required: true, message: '请选择部门', trigger: 'change' }]
  }

  /** 部门下拉 / 级联 / 树选择共用的选项数据 */
  const DEPT_OPTIONS = [
    { label: '研发部', value: 'rd' },
    { label: '产品部', value: 'pd' },
    { label: '运营部', value: 'op' }
  ]

  /** 级联与树选择共用的层级选项数据 */
  const REGION_OPTIONS = [
    {
      label: '浙江省',
      value: 'zhejiang',
      children: [
        { label: '杭州市', value: 'hangzhou' },
        { label: '宁波市', value: 'ningbo' }
      ]
    },
    {
      label: '江苏省',
      value: 'jiangsu',
      children: [{ label: '南京市', value: 'nanjing' }]
    }
  ]

  /**
   * @description 构造 AoForm 展示项：覆盖全部预定义类型及分组标题项 / render / slots / hidden / span 等扩展写法
   * @return 表单项配置列表
   */
  const buildFormItems = () => [
    // 分组标题项：type 为 'title' 时独占一行，只渲染标题文本，key 不会写入表单输出
    { key: 'section-basic', type: 'title', label: '基础信息' },
    // 具名插槽 #name 接管渲染（见模板）
    { key: 'name', label: '插槽接管', span: 6 },
    // 全部预定义表单项类型
    { key: 'tags', label: '标签输入', type: 'inputtag', span: 6 },
    { key: 'count', label: '数量', type: 'number', span: 6, props: { min: 0, max: 100 } },
    { key: 'dept', label: '部门', type: 'select', span: 6, options: DEPT_OPTIONS },
    { key: 'enabled', label: '启用', type: 'switch', span: 6 },
    { key: 'agree', label: '同意', type: 'checkbox', span: 6, props: { label: '同意协议' } },

    { key: 'section-choose', type: 'title', label: '选择与权限' },
    {
      key: 'roles',
      label: '角色',
      type: 'checkboxgroup',
      span: 6,
      options: [
        { label: '查看', value: 'view' },
        { label: '编辑', value: 'edit' }
      ]
    },
    {
      key: 'gender',
      label: '性别',
      type: 'radiogroup',
      span: 6,
      options: [
        { label: '男', value: '1' },
        { label: '女', value: '2' }
      ]
    },
    { key: 'region', label: '级联', type: 'cascader', span: 6, options: REGION_OPTIONS },
    {
      key: 'leader',
      label: '树选择',
      type: 'treeselect',
      span: 6,
      props: {
        data: REGION_OPTIONS,
        checkStrictly: true,
        renderAfterExpand: false,
        defaultExpandAll: true
      }
    },

    { key: 'section-datetime', type: 'title', label: '日期与时间' },
    {
      key: 'date',
      label: '日期',
      type: 'date',
      span: 6,
      props: { valueFormat: 'YYYY-MM-DD' }
    },
    {
      key: 'datetime',
      label: '日期时间',
      type: 'datetime',
      span: 6,
      props: { valueFormat: 'YYYY-MM-DD HH:mm:ss' }
    },
    // 范围类控件需要约两倍于单值的宽度，独占一行避免起止值被挤成逗号串
    {
      key: 'daterange',
      label: '日期范围',
      type: 'daterange',
      span: 12,
      props: { valueFormat: 'YYYY-MM-DD', startPlaceholder: '开始', endPlaceholder: '结束' }
    },
    {
      key: 'datetimerange',
      label: '时间范围',
      type: 'datetimerange',
      span: 12,
      props: {
        valueFormat: 'YYYY-MM-DD HH:mm:ss',
        startPlaceholder: '开始',
        endPlaceholder: '结束'
      }
    },
    {
      key: 'workTime',
      label: '时间',
      type: 'timepicker',
      span: 6,
      props: { valueFormat: 'HH:mm', format: 'HH:mm' }
    },
    { key: 'breakfast', label: '时刻', type: 'timeselect', span: 6 },

    { key: 'section-render', type: 'title', label: '评价与自定义渲染' },
    { key: 'rate', label: '评分', type: 'rate', span: 6, props: { allowHalf: true } },
    { key: 'percent', label: '滑块', type: 'slider', span: 6, props: { min: 0, max: 100 } },
    // render 自定义渲染：优先级高于 type，此处用 render 函数绑定评分组件
    {
      key: 'renderField',
      label: 'render 渲染',
      span: 6,
      render: () =>
        h(ElRate, {
          modelValue: formModel.value.renderField ?? 0,
          'onUpdate:modelValue': (value: number) => (formModel.value.renderField = value)
        })
    },
    // slots 配置：为预定义组件注入子插槽
    {
      key: 'slotField',
      label: '组件插槽',
      type: 'input',
      span: 6,
      slots: { append: () => h('span', null, '.com') }
    },

    { key: 'section-label', type: 'title', label: '标签写法' },
    // hidden: true 不渲染，但保留在提交输出中
    { key: 'secret', label: '隐藏字段', type: 'input', hidden: true },
    // labelWidth 覆盖：独占一行，便于对比覆盖前后的标签宽度
    {
      key: 'labelWidthField',
      label: '标签宽度覆盖',
      labelWidth: '110px',
      type: 'input',
      span: 12
    },
    // label 支持渲染函数
    {
      key: 'labelFnField',
      label: () => h('span', null, ['函数标签 ', h(ElTag, { size: 'small' }, () => 'label')]),
      labelWidth: '120px',
      type: 'input',
      span: 12
    }
  ]

  // 表单项配置（静态配置无需响应式包装）
  const formItems = buildFormItems()

  /**
   * @description 处理表单提交，展示清洗后的输出（空值已按策略移除）
   * @param output 清洗后的表单输出
   */
  const handleFormSubmit = (output: Record<string, any>): void => {
    formOutputJson.value = JSON.stringify(output, null, 2)
    ElMessage.success('提交成功，输出已展示在表单下方')
  }

  /**
   * @description 通过组件 ref 主动读取清洗后的表单输出（不触发提交事件）
   */
  const readFormOutput = (): void => {
    formOutputJson.value = JSON.stringify(formRef.value?.getOutput() ?? {}, null, 2)
  }

  /**
   * @description 确认示例表单：先校验，未通过时只展示行内错误且不上报；通过后读取清洗输出并关闭弹窗
   */
  const handleShowcaseConfirm = async (): Promise<void> => {
    if (!formRef.value) return

    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) return

    handleFormSubmit(formRef.value.getOutput())
    formDialogVisible.value = false
  }

  // ============ AoForm 弹窗表单模式演示 ============

  // 弹窗相关
  const quickFormVisible = ref(false)

  // 表单数据
  const quickFormModel = ref<Record<string, any>>({})

  /** 弹窗模式演示项：span=12 行基准下三个 span=4 占满一行，第四个自动换行 */
  const quickFormItems: FormItem[] = [
    { key: 'name', label: '姓名', type: 'input', span: 4 },
    { key: 'phone', label: '手机号', type: 'input', span: 4 },
    { key: 'email', label: '邮箱', type: 'input', span: 4 },
    { key: 'remark', label: '备注', type: 'input', span: 4 }
  ]

  /** 弹窗模式演示规则：留空时点击底部「保存」会展示行内错误且不上报 submit */
  const quickFormRules: FormRules = {
    name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
    phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }]
  }

  /**
   * @description 处理弹窗模式表单提交（确定按钮校验通过后触发），提交成功关闭弹窗
   * @param output 清洗后的表单输出
   */
  const handleQuickFormSubmit = (output: Record<string, any>): void => {
    ElMessage.success(`弹窗表单提交成功：${JSON.stringify(output)}`)
    quickFormVisible.value = false
  }

  // ============ AoTable 部分 ============

  /** 状态展示配置 */
  const STATUS_CONFIG = {
    online: { type: 'success' as const, text: '在线' },
    busy: { type: 'warning' as const, text: '忙碌' },
    offline: { type: 'info' as const, text: '离线' }
  } as const

  /** 生成示例行用的基础数据 */
  const SURNAMES = ['林', '苏', '沈', '顾', '陆', '江', '秦', '许', '韩', '杨']
  const GIVEN_NAMES = ['清羽', '望舒', '云舟', '疏影', '听澜', '知遥']
  const DEPT_NAMES = ['研发部', '产品部', '设计部', '运营部']
  const STATUS_CYCLE: ShowcaseRow['status'][] = ['online', 'online', 'busy', 'offline']
  const TAG_POOL = [['Vue', 'TypeScript'], ['Element Plus'], ['Vite', 'Pinia'], ['SCSS', 'Vue']]

  /**
   * @description 生成 60 条确定性的示例数据（无随机性，便于核对分页与筛选结果）
   * @return 示例行列表
   */
  const generateMockRows = (): ShowcaseRow[] => {
    return Array.from({ length: 60 }, (_, index) => {
      const name = SURNAMES[index % SURNAMES.length] + GIVEN_NAMES[Math.floor(index / 10) % 6]
      const pinyin = `user${index + 1}`
      return {
        id: index + 1,
        name,
        email: `${pinyin}@example.com`,
        avatar: 'https://dummyimage.com/80x80.png',
        dept: { name: DEPT_NAMES[index % DEPT_NAMES.length] },
        status: STATUS_CYCLE[index % STATUS_CYCLE.length],
        progress: (index * 13) % 101,
        tags: TAG_POOL[index % TAG_POOL.length],
        score: (index * 7) % 101,
        amount: Math.round((index + 1) * 123.45 * 100) / 100,
        enabled: index % 3 !== 0,
        createTime: `2026-${String((index % 9) + 1).padStart(2, '0')}-${String(
          (index % 27) + 1
        ).padStart(2, '0')} 10:30:00`
      }
    })
  }

  // 页面持有的完整示例数据，搜索与分页在其上做本地切片
  const allRows = generateMockRows()

  // 搜索表单（通过 v-model:search-form 与 AoTable 的搜索栏双向绑定）
  const searchForm = ref<ShowcaseSearchForm>({})

  // 分页状态：由页面持有并通过 pagination 传入 AoTable，组件只读取、不修改
  const pagination = reactive<TablePaginationState>({ currentPage: 1, pageSize: 10, total: 0 })

  // 搜索项配置（同 AoSearchBar 的 items）
  const searchItems: SearchFormItem[] = [
    {
      label: '姓名',
      key: 'name',
      type: 'input',
      props: { placeholder: '请输入姓名', clearable: true }
    },
    {
      label: '状态',
      key: 'status',
      type: 'select',
      props: {
        placeholder: '请选择状态',
        clearable: true,
        options: [
          { label: '在线', value: 'online' },
          { label: '忙碌', value: 'busy' },
          { label: '离线', value: 'offline' }
        ]
      }
    },
    {
      label: '最低积分',
      key: 'minScore',
      type: 'number',
      props: { min: 0, max: 100, placeholder: '请输入最低积分' }
    },
    {
      label: '创建时间',
      key: 'createTimeRange',
      type: 'daterange',
      props: { valueFormat: 'YYYY-MM-DD', startPlaceholder: '开始', endPlaceholder: '结束' }
    }
  ]

  /**
   * @description 获取状态展示配置
   * @param status 状态值
   * @return 状态对应的标签类型与文案
   */
  const getStatusConfig = (status: ShowcaseRow['status']) => {
    return STATUS_CONFIG[status] ?? { type: 'info' as const, text: '未知' }
  }

  /**
   * @description 金额列的原生 formatter 示例
   * @param row 当前行数据
   * @return 带货币符号的金额文本
   */
  const formatAmount = (row: ShowcaseRow): string => `¥${row.amount.toFixed(2)}`

  // 表格列配置：覆盖 selection / index / globalIndex / expand 特殊列、点路径 prop、
  // 原生 formatter、sortable、slotName 自定义单元格等全部列写法
  const { columns, columnChecks } = useTableColumns<ShowcaseRow>(() => [
    { type: 'selection', width: 50 },
    { type: 'index', label: '本页序号', width: 90 },
    { type: 'globalIndex', label: '全局序号', width: 90, columnKey: 'globalIndex' },
    { type: 'expand', label: 'JOSN', slotName: 'expand', width: 50 },
    { prop: 'name', label: '成员', minWidth: 200, slotName: 'member' },
    // 点路径 prop：沿用 Element Plus 原生取值
    { prop: 'dept.name', label: '部门', width: 100 },
    { prop: 'status', label: '状态', width: 90, slotName: 'status' },
    { prop: 'progress', label: '进度', width: 160, slotName: 'progress' },
    { prop: 'tags', label: '标签', minWidth: 160, slotName: 'tags' },
    { prop: 'score', label: '积分', width: 90, sortable: true },
    // 原生 formatter：简单格式化不走插槽
    { prop: 'amount', label: '金额', width: 120, sortable: true, formatter: formatAmount },
    { prop: 'enabled', label: '启用', width: 90, slotName: 'enabled' },
    { prop: 'createTime', label: '创建时间', width: 170, sortable: true }
  ])

  /**
   * @description 按当前搜索条件过滤数据并本地分页切片
   */
  const fetchList = async (): Promise<void> => {
    loading.value = true
    try {
      // 模拟接口耗时，便于观察 loading 状态
      await new Promise((resolve) => setTimeout(resolve, 300))
      const [startDate, endDate] = searchForm.value.createTimeRange ?? []
      const filtered = allRows.filter((row) => {
        if (searchForm.value.name && !row.name.includes(searchForm.value.name)) return false
        if (searchForm.value.status && row.status !== searchForm.value.status) return false
        if (
          searchForm.value.minScore !== undefined &&
          searchForm.value.minScore !== null &&
          row.score < searchForm.value.minScore
        ) {
          return false
        }
        if (startDate && row.createTime.slice(0, 10) < startDate) return false
        if (endDate && row.createTime.slice(0, 10) > endDate) return false
        return true
      })
      pagination.total = filtered.length
      const start = (pagination.currentPage - 1) * pagination.pageSize
      tableData.value = filtered.slice(start, start + pagination.pageSize)
    } finally {
      loading.value = false
    }
  }

  /**
   * @description 每页条数变化时由页面重置页码并重新切片
   * @param pageSize 每页条数
   */
  const handleSizeChange = (pageSize: number): void => {
    pagination.currentPage = 1
    pagination.pageSize = pageSize
    fetchList()
  }

  /**
   * @description 当前页码变化时同步状态并重新切片
   * @param currentPage 当前页码
   */
  const handleCurrentChange = (currentPage: number): void => {
    pagination.currentPage = currentPage
    fetchList()
  }

  /**
   * @description 处理搜索：回到第一页并按新条件过滤
   */
  const handleSearch = (): void => {
    pagination.currentPage = 1
    fetchList()
  }

  /**
   * @description 处理重置：清空条件、回到第一页并重新切片
   */
  const handleReset = (): void => {
    searchForm.value = {}
    pagination.currentPage = 1
    fetchList()
  }

  /**
   * @description 处理表格行选择变化
   * @param selection 当前选中行列表
   */
  const handleSelectionChange = (selection: ShowcaseRow[]): void => {
    selectedRows.value = selection
  }

  /**
   * @description 操作按钮的统一示例反馈
   * @param action 动作名称
   * @param row 动作对应的行，未选中时省略
   */
  const showRowMessage = (action: string, row?: ShowcaseRow): void => {
    ElMessage.success(`${action}${row ? `：${row.name}` : '（示例动作）'}`)
  }

  onMounted(() => {
    fetchList()
  })
</script>

<style scoped lang="scss">
  .data-showcase {
    gap: 12px;
    padding: 12px;
    overflow-y: auto;

    // 卡片按内容自然高度展示，超出部分由本容器滚动，避免被 flex 压缩裁剪
    > * {
      flex-shrink: 0;
    }

    // 集成模式的 AoTable 按确定高度布局（内部 flex 撑满），
    // 此处给定固定展示高度，行数多时表格内部滚动
    :deep(.ao-table-root) {
      height: 660px;
    }
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .card-title {
    font-weight: 600;
  }

  .card-tip {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  // 弹窗底部：演示按钮靠左，操作按钮靠右
  .dialog-footer {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
  }

  .form-output {
    max-height: 220px;
    padding: 10px 12px;
    margin: 0 1rem 1rem;
    overflow: auto;
    font-size: 12px;
    line-height: 1.6;
    color: var(--el-text-color-regular);
    background: var(--el-fill-color-light);
    border-radius: 6px;
  }

  // 插槽内容在 AoTable/ElTableColumn 内部渲染，scoped 属性无法传递，需 :deep() 穿透
  :deep(.member) {
    display: flex;
    align-items: center;
  }

  :deep(.member-avatar) {
    width: 2rem;
    height: 2rem;
    border-radius: 0.375rem;
  }

  :deep(.member-info) {
    margin-left: 0.5rem;
  }

  :deep(.member-name),
  :deep(.member-email) {
    margin: 0;
    font-size: 12px;
    line-height: 1.4;
  }

  :deep(.member-name) {
    color: var(--el-text-color-primary);
  }

  :deep(.member-email) {
    color: var(--el-text-color-secondary);
  }

  :deep(.row-detail) {
    max-height: 200px;
    padding: 8px 12px;
    margin: 0;
    overflow: auto;
    font-size: 12px;
    color: var(--el-text-color-regular);
    background: var(--el-fill-color-light);
    border-radius: 6px;
  }

  .footer-tip {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
</style>
