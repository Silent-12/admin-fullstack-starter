<template>
  <div class="api-selector">
    <ElInput
      v-model="keyword"
      :disabled="disabled || loading"
      clearable
      placeholder="检索模块、功能、动作、路径或别名"
      @keyup.enter="load"
      @clear="load"
    >
      <template #append>
        <ElButton :loading="loading" :disabled="disabled" @click="load">搜索</ElButton>
      </template>
    </ElInput>
    <div class="selection">
      <span>已选择 {{ modelValue.length }} 个接口</span>
      <ElButton link :disabled="disabled" @click="emit('update:modelValue', [])">清空选择</ElButton>
    </div>
    <ElSpace wrap class="selected-codes">
      <ElTag
        v-for="code in modelValue"
        :key="code"
        :closable="!disabled"
        :type="invalidCodes.includes(code) ? 'danger' : 'info'"
        @close="remove(code)"
      >
        {{ code }}
      </ElTag>
    </ElSpace>
    <ElAlert
      v-if="invalidCodes.length"
      title="部分已绑定接口已失效或不再允许分配，请移除红色接口后保存"
      type="warning"
      :closable="false"
    />
    <ElAlert v-if="failed" title="接口目录加载失败，请重试" type="error" :closable="false" />
    <ElScrollbar height="280px" v-loading="loading">
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
          <span>
            {{ data.label }}
            <small v-if="data.kind === 'api'">{{ data.method }} {{ data.path }}</small>
          </span>
        </template>
      </ElTree>
    </ElScrollbar>
  </div>
</template>

<script setup lang="ts">
  import { computed, nextTick, onMounted, ref, watch } from 'vue'
  import { ElAlert, ElButton, ElInput, ElScrollbar, ElSpace, ElTag, ElTree } from 'element-plus'
  import { fetchApiTree } from '@/api/system-manage'
  import type { ApiTreeNode } from '@/types/api/system-manage'
  import { useLatestRequest } from '@/hooks/useLatestRequest'

  const props = defineProps<{ modelValue: string[]; disabled?: boolean }>()
  const emit = defineEmits<{ 'update:modelValue': [string[]]; ready: [boolean] }>()

  /** 检索关键字、检索结果与加载状态；选中集合始终由上层持有 */
  const keyword = ref('')
  const nodes = ref<ApiTreeNode[]>([])
  const tree = ref<InstanceType<typeof ElTree>>()
  const loading = ref(false)
  const failed = ref(false)

  // 全量目录只用于判断已有绑定是否失效，不受检索结果影响
  const knownCodes = ref<Set<string> | null>(null)
  const invalidCodes = computed(() =>
    knownCodes.value ? props.modelValue.filter((code) => !knownCodes.value?.has(code)) : []
  )

  // 请求代次，仅接受最后一次响应，卸载后旧响应自动失效
  const request = useLatestRequest()

  /** 树节点字段映射 */
  const treeProps = { label: 'label', children: 'children', disabled: 'disabled' }

  /**
   * @description 显式禁用分支节点，独立勾选允许选择分支下的有效叶子
   * @param items 待处理的接口树节点
   * @return 带禁用状态的接口树节点
   */
  const withDisabled = (items: ApiTreeNode[]): (ApiTreeNode & { disabled: boolean })[] =>
    items.map((node) => ({
      ...node,
      disabled: props.disabled || node.kind !== 'api' || !node.selectable,
      children: withDisabled(node.children || [])
    }))

  const displayNodes = computed(() => withDisabled(nodes.value))

  /**
   * @description 恢复当前可见节点勾选，不从搜索结果重建完整选中集合
   */
  const restore = (): void => {
    tree.value?.setCheckedKeys(props.modelValue)
  }

  /**
   * @description 检索接口目录，忽略已失效的响应并恢复当前选中状态
   */
  const load = async (): Promise<void> => {
    const token = request.begin()
    loading.value = true
    failed.value = false
    emit('ready', false)
    try {
      const result = await fetchApiTree(keyword.value.trim() || undefined)
      if (!request.isCurrent(token)) return
      nodes.value = result
      if (!keyword.value.trim()) {
        const codes = new Set<string>()
        /**
         * @description 收集完整可分配目录叶子以校验历史绑定
         * @param items 接口树节点
         */
        const collect = (items: ApiTreeNode[]): void =>
          items.forEach((item) => {
            if (item.kind === 'api' && item.selectable) codes.add(item.key)
            if (item.children) collect(item.children)
          })
        collect(result)
        knownCodes.value = codes
      }
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
   * @description 仅增减操作叶子，保留本次检索以外的授权
   * @param node 触发勾选的树节点
   * @param state 勾选状态
   */
  const check = (node: ApiTreeNode, state: { checkedKeys: (string | number)[] }): void => {
    if (props.disabled || node.kind !== 'api' || !node.selectable) return
    const selected = new Set(props.modelValue)
    if (state.checkedKeys.includes(node.key)) selected.add(node.key)
    else selected.delete(node.key)
    emit('update:modelValue', [...selected])
  }

  /**
   * @description 从完整选中集合移除指定接口，支持移除已失效接口
   * @param code 待移除的接口编码
   */
  const remove = (code: string): void => {
    if (!props.disabled)
      emit(
        'update:modelValue',
        props.modelValue.filter((item) => item !== code)
      )
  }

  // 选中集合变化时同步树勾选并刷新就绪状态
  watch(
    () => props.modelValue,
    () => {
      void nextTick(restore)
      emit('ready', !loading.value && !failed.value && invalidCodes.value.length === 0)
    },
    { deep: true }
  )

  onMounted(load)
</script>

<style scoped lang="scss">
  .api-selector {
    width: 100%;

    .selection {
      display: flex;
      justify-content: space-between;
      margin: 8px 0;
    }

    .selected-codes {
      margin-bottom: 8px;
    }

    small {
      color: var(--el-text-color-secondary);
    }
  }
</style>
