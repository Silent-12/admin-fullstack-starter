<template>
  <ElDrawer
    v-model="visible"
    class="role-permission"
    title="资源授权"
    size="min(520px, 100vw)"
    direction="rtl"
    :close-on-click-modal="!busy"
    :close-on-press-escape="!busy"
  >
    <div v-loading="loading" class="body">
      <ElAlert
        title="目录、菜单与按钮独立授权，勾选父节点不会自动授权子节点"
        type="info"
        :closable="false"
      />
      <div class="toolbar">
        <ElInput
          v-model="keyword"
          class="search"
          clearable
          :prefix-icon="Search"
          placeholder="搜索名称、路由或权限码"
        />
        <ElButton :disabled="busy || loading" @click="checkAll">全选</ElButton>
        <ElButton :disabled="busy || loading" @click="clearAll">清空</ElButton>
      </div>
      <div class="panel">
        <ElTree
          ref="tree"
          :data="resources"
          :props="treeProps"
          :filter-node-method="matchNode"
          node-key="id"
          show-checkbox
          check-strictly
          default-expand-all
          check-on-click-node
          :expand-on-click-node="false"
          @check="syncCheckedCount"
        >
          <template #default="{ data }">
            <span class="node">
              <span class="title">{{ data.title }}</span>
              <span class="meta">
                {{ resourceTypeLabel(data.type) }}
                <template v-if="data.permission">· {{ data.permission }}</template>
              </span>
            </span>
          </template>
        </ElTree>
      </div>
    </div>
    <template #footer>
      <div class="footer">
        <span class="summary">
          已选 <b>{{ checkedCount }}</b> / {{ totalCount }} 项
        </span>
        <div class="actions">
          <ElButton :disabled="busy" @click="visible = false">取消</ElButton>
          <ElButton type="primary" :loading="busy" :disabled="loading || !ready" @click="save">
            保存
          </ElButton>
        </div>
      </div>
    </template>
  </ElDrawer>
</template>

<script setup lang="ts">
  import { computed, nextTick, ref, watch } from 'vue'
  import { ElAlert, ElButton, ElDrawer, ElInput, ElTree } from 'element-plus'
  import type { TreeNodeData } from 'element-plus'
  import { Search } from '@element-plus/icons-vue'
  import { fetchGetMenuList, fetchRoleResources, updateRoleResources } from '@/api/system-manage'
  import type { ResourceTreeNode } from '@/types/api/system-manage'
  import { useDialogForm } from '@/hooks/useDialogForm'
  import { buildResourceTree, resourceTypeLabel } from '@/utils/resource'

  const props = defineProps<{ modelValue: boolean; roleId?: string }>()
  const emit = defineEmits<{ 'update:modelValue': [boolean]; success: [] }>()

  /** 完整资源树、检索关键字与树实例引用 */
  const resources = ref<ResourceTreeNode[]>([])
  const keyword = ref('')
  const tree = ref<InstanceType<typeof ElTree>>()

  /** 已勾选数量，勾选状态始终以树实例为准 */
  const checkedCount = ref(0)

  /**
   * @description 统计资源树节点总数
   * @param nodes 待统计的资源树节点
   * @return 节点总数
   */
  const countNodes = (nodes: ResourceTreeNode[]): number =>
    nodes.reduce((total, node) => total + 1 + countNodes(node.children), 0)

  /** 资源节点总数，用于底部授权统计 */
  const totalCount = computed(() => countNodes(resources.value))

  /**
   * @description 判断资源节点是否命中检索关键字
   * @param value 检索关键字
   * @param data 待匹配的树节点数据
   * @return 关键字为空或名称、路由、权限码命中时为 true
   */
  const matchNode = (value: string, data: TreeNodeData): boolean => {
    const text = value.trim().toLowerCase()
    if (!text) return true
    const node = data as ResourceTreeNode
    return [node.title, node.name, node.path, node.permission].some((item) =>
      item?.toLowerCase().includes(text)
    )
  }

  /**
   * @description 收集资源 UUID，可选择只收集命中检索关键字的节点
   * @param nodes 待收集的资源树节点
   * @param matchedOnly 是否只收集命中检索关键字的节点
   * @return 资源 UUID 列表
   */
  const collectIds = (nodes: ResourceTreeNode[], matchedOnly = false): string[] =>
    nodes.flatMap((node) => [
      ...(matchedOnly && !matchNode(keyword.value, node) ? [] : [node.id]),
      ...collectIds(node.children, matchedOnly)
    ])

  /**
   * @description 同步已勾选数量，勾选状态以树实例为准
   */
  const syncCheckedCount = (): void => {
    checkedCount.value = tree.value?.getCheckedKeys().length ?? 0
  }

  /** 授权抽屉状态与提交生命周期 */
  const { visible, loading, ready, busy, save } = useDialogForm({
    open: () => props.modelValue,
    close: () => emit('update:modelValue', false),
    /**
     * @description 创建空白授权模型
     * @return 授权表单初值
     */
    createForm: () => ({ resourceIds: [] as string[] }),
    /**
     * @description 重置抽屉时清空上一次加载的资源树与检索条件
     */
    reset: () => {
      resources.value = []
      keyword.value = ''
      checkedCount.value = 0
    },
    /**
     * @description 从完整资源列表构建树并恢复角色勾选，关闭时使请求失效
     * @param model 当前授权模型
     * @param isCurrent 当前请求是否仍属于最新一次打开
     * @return 详情加载完成时无返回值，请求失效或不允许编辑时返回 false
     */
    load: async (model, isCurrent) => {
      if (!props.roleId) return false
      const [nodes, grants] = await Promise.all([
        fetchGetMenuList(),
        fetchRoleResources(props.roleId)
      ])
      if (!isCurrent()) return false
      resources.value = buildResourceTree(nodes)
      model.value = { resourceIds: [...grants.resourceIds] }
      await nextTick()
      if (!isCurrent()) return false
      tree.value?.setCheckedKeys(model.value.resourceIds)
      syncCheckedCount()
    },
    /**
     * @description 提交前确认已选中角色
     * @return 是否允许提交
     */
    validate: () => Boolean(props.roleId),
    /**
     * @description 保存独立勾选的资源 UUID
     */
    submit: async () => {
      await updateRoleResources(props.roleId!, (tree.value?.getCheckedKeys() || []).map(String))
    },
    successMessage: '授权保存成功',
    /** @description 保存成功后通知角色列表刷新 */
    success: () => emit('success')
  })

  /** 资源树字段映射，保存期间禁止继续勾选 */
  const treeProps = { label: 'title', children: 'children', disabled: () => busy.value }

  /**
   * @description 全选当前检索结果，未检索时选中全部资源，保留已勾选的其他资源
   */
  const checkAll = (): void => {
    const selected = tree.value?.getCheckedKeys() ?? []
    const targets = collectIds(resources.value, Boolean(keyword.value))
    tree.value?.setCheckedKeys([...new Set([...selected, ...targets])].map(String))
    syncCheckedCount()
  }

  /**
   * @description 清空全部勾选
   */
  const clearAll = (): void => {
    tree.value?.setCheckedKeys([])
    syncCheckedCount()
  }

  // 检索关键字变化时过滤资源树，命中节点自动展开且不影响已有勾选
  watch(keyword, (value) => {
    tree.value?.filter(value)
  })
</script>

<style scoped lang="scss">
  .role-permission {
    .body {
      display: flex;
      flex-direction: column;
      gap: 12px;
      height: 100%;
    }

    .toolbar {
      display: flex;
      flex: none;
      gap: 8px;
      align-items: center;

      .search {
        flex: 1;
      }
    }

    .panel {
      flex: 1;
      min-height: 0;
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

      .title {
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

    .footer {
      display: flex;
      gap: 12px;
      align-items: center;
      justify-content: space-between;

      .summary {
        color: var(--ao-gray-600);

        b {
          font-weight: 600;
          color: var(--ao-primary);
        }
      }

      .actions {
        display: flex;
        gap: 8px;
      }
    }
  }
</style>
