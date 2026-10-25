<template>
  <div class="api-selector">
    <div class="toolbar">
      <ElInput
        v-model="keyword"
        class="search"
        clearable
        :disabled="disabled"
        placeholder="检索模块、功能、动作或路径"
      />
      <ElButton :disabled="disabled || loading" @click="checkAll">全选</ElButton>
      <ElButton :disabled="disabled || loading" @click="clearAll">清空</ElButton>
      <ElCheckbox v-model="onlySelected" :disabled="disabled || loading">仅看已选</ElCheckbox>
    </div>
    <div class="summary">
      已选择
      <b>{{ selectedCount }}</b>
      / {{ totalCount }} 个接口
    </div>
    <ElAlert
      v-if="invalidCodes.length && !failed"
      class="invalid"
      type="warning"
      :closable="false"
      show-icon
    >
      <template #title>
        <span class="head">
          <span>已绑定的 {{ invalidCodes.length }} 个接口已失效或不再允许分配，需移除后保存</span>
          <span class="actions">
            <ElButton link type="primary" @click="detailVisible = true">查看详情</ElButton>
            <ElButton link type="primary" :disabled="disabled || loading" @click="removeInvalid">
              移除失效接口
            </ElButton>
          </span>
        </span>
      </template>
    </ElAlert>
    <ElAlert v-if="failed" title="接口目录加载失败，请重试" type="error" :closable="false" />
    <AoDialog
      v-model:visible="detailVisible"
      title="失效接口编码"
      width="min(520px, calc(100vw - 32px))"
      cancel-text="关闭"
      confirm-text="移除失效接口"
      :confirm-disabled="disabled || loading || !catalogLoaded"
      @confirm="removeInvalid"
    >
      <div class="invalid-detail">
        <p class="tip"
          >以下编码不在当前可绑定接口目录中，可能已下线或不再允许分配，移除后才能保存。</p
        >
        <ul class="list">
          <li v-for="code in invalidCodes" :key="code">{{ code }}</li>
        </ul>
      </div>
    </AoDialog>
    <div v-loading="loading" class="panel">
      <ElTree
        ref="tree"
        :data="displayNodes"
        node-key="key"
        show-checkbox
        check-strictly
        default-expand-all
        :props="treeProps"
        @check="check"
      >
        <template #default="{ data }">
          <span class="node">
            <span class="label">{{ data.label }}</span>
            <small v-if="data.kind === 'api'" class="meta">{{ data.method }} {{ data.path }}</small>
            <small v-else-if="partial(data.key)" class="meta">{{ partial(data.key) }}</small>
          </span>
        </template>
      </ElTree>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, nextTick, onMounted, ref, watch } from 'vue'
  import { ElAlert, ElButton, ElCheckbox, ElInput, ElTree } from 'element-plus'
  import { AoDialog } from '@ao/admin-components'
  import { fetchBindableApiList } from '@/api/system-manage'
  import type { ApiBindableItem, ApiBindableTreeNode } from '@/types/api/system-manage'
  import { useLatestRequest } from '@/hooks/useLatestRequest'

  /** 分组节点始终持有子节点，避免组装时重复判空 */
  type GroupNode = ApiBindableTreeNode & { children: ApiBindableTreeNode[] }

  const props = defineProps<{ modelValue: string[]; disabled?: boolean }>()
  const emit = defineEmits<{ 'update:modelValue': [string[]]; ready: [boolean] }>()

  /** 检索关键字、仅看已选开关、接口目录与加载状态；选中集合始终由上层持有 */
  const keyword = ref('')
  const onlySelected = ref(false)
  const items = ref<ApiBindableItem[]>([])
  const tree = ref<InstanceType<typeof ElTree>>()
  const loading = ref(false)
  const failed = ref(false)
  /** 仅成功加载的完整目录可用于判断历史绑定是否失效 */
  const catalogLoaded = ref(false)
  /** 失效编码详情弹窗开关 */
  const detailVisible = ref(false)

  // 请求代次，仅接受最后一次响应，卸载后旧响应自动失效
  const request = useLatestRequest()

  /** 树节点字段映射 */
  const treeProps = { label: 'label', children: 'children', disabled: 'disabled' }

  /** 当前可绑定的全部接口编码，用于识别已失效的历史绑定 */
  const knownCodes = computed(() => new Set(items.value.map((item) => item.code)))

  const invalidCodes = computed(() =>
    catalogLoaded.value ? props.modelValue.filter((code) => !knownCodes.value.has(code)) : []
  )

  /** 有效选中数量，失效绑定不计入可绑定目录的选中进度 */
  const selectedCount = computed(() => props.modelValue.length - invalidCodes.value.length)

  /** 可分配接口总数 */
  const totalCount = computed(() => items.value.length)

  /**
   * @description 判断接口是否命中检索关键字，模块与功能名称同样参与匹配
   * @param item 接口目录项
   * @param text 归一化后的检索关键字
   * @return 命中模块、功能、动作、编码、方法或路径时为 true
   */
  const matches = (item: ApiBindableItem, text: string): boolean =>
    [item.module, item.feature, item.action, item.code, item.method, item.path].some((field) =>
      field.toLowerCase().includes(text)
    )

  /** 按检索关键字与「仅看已选」过滤后的接口目录 */
  const filteredItems = computed(() => {
    const text = keyword.value.trim().toLowerCase()
    // 仅在需要按选中集合过滤时读取选中项，避免勾选引发整棵树重建
    const selected = onlySelected.value ? new Set(props.modelValue) : null
    return items.value.filter(
      (item) => (!selected || selected.has(item.code)) && (!text || matches(item, text))
    )
  })

  /**
   * @description 生成模块分组键，编码避免分组名含分隔符时冲突
   * @param item 接口目录项
   * @return 模块分组键
   */
  const moduleKeyOf = (item: ApiBindableItem): string => `module:${encodeURIComponent(item.module)}`

  /**
   * @description 生成功能分组键，编码避免分组名含分隔符时冲突
   * @param item 接口目录项
   * @return 功能分组键
   */
  const featureKeyOf = (item: ApiBindableItem): string =>
    `${moduleKeyOf(item)}:feature:${encodeURIComponent(item.feature)}`

  /**
   * @description 按模块与功能组装可绑定接口树，保留后端返回顺序
   * @param list 过滤后的接口目录
   * @return 模块、功能与接口三级树
   */
  const buildTree = (list: ApiBindableItem[]): GroupNode[] => {
    const modules = new Map<string, GroupNode>()
    const features = new Map<string, GroupNode>()
    for (const item of list) {
      const moduleKey = moduleKeyOf(item)
      const featureKey = featureKeyOf(item)
      let module = modules.get(moduleKey)
      if (!module) {
        module = { key: moduleKey, label: item.module, kind: 'module', children: [] }
        modules.set(moduleKey, module)
      }
      let feature = features.get(featureKey)
      if (!feature) {
        feature = { key: featureKey, label: item.feature, kind: 'feature', children: [] }
        features.set(featureKey, feature)
        module.children.push(feature)
      }
      feature.children.push({
        key: item.code,
        label: item.action,
        kind: 'api',
        method: item.method,
        path: item.path
      })
    }
    return [...modules.values()]
  }

  /**
   * @description 显式禁用分组节点，接口叶子独立勾选，父子之间不联动
   * @param nodes 待处理的接口树节点
   * @return 带禁用状态的接口树节点
   */
  const withDisabled = (
    nodes: ApiBindableTreeNode[]
  ): (ApiBindableTreeNode & { disabled: boolean })[] =>
    nodes.map((node) => ({
      ...node,
      disabled: Boolean(props.disabled) || node.kind !== 'api',
      children: node.children ? withDisabled(node.children) : undefined
    }))

  const displayNodes = computed(() => withDisabled(buildTree(filteredItems.value)))

  /** 各分组的接口总数与已选数量，用于快速判断分组选中进度 */
  const stats = computed(() => {
    const selected = new Set(props.modelValue)
    const result = new Map<string, { selected: number; total: number }>()
    for (const item of filteredItems.value) {
      for (const key of [moduleKeyOf(item), featureKeyOf(item)]) {
        const current = result.get(key) ?? { selected: 0, total: 0 }
        current.total += 1
        if (selected.has(item.code)) current.selected += 1
        result.set(key, current)
      }
    }
    return result
  })

  /**
   * @description 生成分组的部分选中进度，由已选接口统计得出，全选与未选不重复展示
   * @param key 分组节点键
   * @return 形如 3/8 的进度文案，无需展示时返回空串
   */
  const partial = (key: string): string => {
    const current = stats.value.get(key)
    if (!current || current.selected === 0 || current.selected === current.total) return ''
    return `${current.selected}/${current.total}`
  }

  /**
   * @description 恢复当前可见节点的勾选，不从过滤结果重建完整选中集合
   */
  const restore = (): void => {
    tree.value?.setCheckedKeys(props.modelValue)
  }

  /**
   * @description 加载可绑定接口目录并恢复已选状态，失败时阻止保存
   */
  const load = async (): Promise<void> => {
    const token = request.begin()
    loading.value = true
    failed.value = false
    catalogLoaded.value = false
    emit('ready', false)
    try {
      const list = await fetchBindableApiList()
      if (!request.isCurrent(token)) return
      items.value = list
      catalogLoaded.value = true
      await nextTick()
      if (!request.isCurrent(token)) return
      restore()
      emit('ready', invalidCodes.value.length === 0)
    } catch {
      if (request.isCurrent(token)) failed.value = true
    } finally {
      if (request.isCurrent(token)) loading.value = false
    }
  }

  /**
   * @description 仅增减当前勾选的接口，分组节点不参与勾选
   * @param node 触发勾选的树节点
   * @param state 树实例上报的勾选状态
   */
  const check = (node: ApiBindableTreeNode, state: { checkedKeys: (string | number)[] }): void => {
    if (props.disabled || node.kind !== 'api') return
    const checked = state.checkedKeys.includes(node.key)
    const selected = new Set(props.modelValue)
    if (checked) selected.add(node.key)
    else selected.delete(node.key)
    emit('update:modelValue', [...selected])
  }

  /**
   * @description 全选当前过滤结果中的接口，保留过滤范围以外的已选接口
   */
  const checkAll = (): void => {
    if (props.disabled) return
    const selected = new Set(props.modelValue)
    for (const item of filteredItems.value) selected.add(item.code)
    emit('update:modelValue', [...selected])
  }

  /**
   * @description 清空全部已选接口
   */
  const clearAll = (): void => {
    if (props.disabled) return
    emit('update:modelValue', [])
  }

  /**
   * @description 移除已失效的历史绑定，恢复保存入口并关闭详情弹窗
   */
  const removeInvalid = (): void => {
    if (props.disabled || loading.value || failed.value || !catalogLoaded.value) return
    const invalid = new Set(invalidCodes.value)
    emit(
      'update:modelValue',
      props.modelValue.filter((code) => !invalid.has(code))
    )
    detailVisible.value = false
  }

  // 选中集合变化时同步树勾选并刷新就绪状态
  watch(
    () => props.modelValue,
    () => {
      void nextTick(restore)
      emit(
        'ready',
        catalogLoaded.value && !loading.value && !failed.value && invalidCodes.value.length === 0
      )
    },
    { deep: true }
  )

  onMounted(load)
</script>

<style scoped lang="scss">
  .api-selector {
    width: 100%;

    .toolbar {
      display: flex;
      gap: 8px;
      align-items: center;

      .search {
        flex: 1;
      }
    }

    .summary {
      margin: 8px 0;
      color: var(--el-text-color-secondary);

      b {
        font-weight: 600;
        color: var(--ao-primary);
      }
    }

    .invalid {
      margin-bottom: 8px;

      .head {
        display: flex;
        gap: 12px;
        align-items: center;
        justify-content: space-between;
        width: 100%;
      }

      .actions {
        display: flex;
        flex: none;
        gap: 8px;
        align-items: center;
      }
    }

    .panel {
      height: 420px;
      padding: 4px 8px;
      overflow: auto;
      border: 1px solid var(--default-border);
      border-radius: var(--el-border-radius-base);
    }

    .node {
      display: flex;
      flex: 1;
      gap: 12px;
      align-items: center;
      min-width: 0;

      .label {
        min-width: 0;
        @include ellipsis;
      }

      .meta {
        flex: none;
        max-width: 55%;
        margin-left: auto;
        font-size: 12px;
        color: var(--ao-gray-600);
        @include ellipsis;
      }
    }

    @media (width <= 767px) {
      .panel {
        height: 320px;
      }
    }
  }

  .invalid-detail {
    .tip {
      margin-bottom: 12px;
      color: var(--el-text-color-secondary);
    }

    .list {
      max-height: 280px;
      padding: 8px 12px;
      margin: 0;
      overflow: auto;
      list-style: none;
      background: var(--ao-gray-200);
      border: 1px solid var(--default-border);
      border-radius: var(--el-border-radius-base);

      li {
        line-height: 24px;
        color: var(--el-text-color-regular);
        @include ellipsis;
      }
    }
  }
</style>
