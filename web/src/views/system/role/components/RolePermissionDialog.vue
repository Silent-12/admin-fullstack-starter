<template>
  <ElDrawer
    v-model="visible"
    title="资源授权"
    size="min(640px, 100vw)"
    direction="rtl"
    :close-on-click-modal="false"
    :close-on-press-escape="!busy"
  >
    <ElAlert
      title="目录、菜单与按钮独立授权，勾选父节点不会自动授权子节点"
      type="info"
      :closable="false"
    />
    <ElTree
      ref="tree"
      v-loading="loading"
      :data="resources"
      node-key="id"
      show-checkbox
      check-strictly
      default-expand-all
      :props="{ label: 'title', children: 'children', disabled: () => busy }"
    />
    <template #footer>
      <ElButton :disabled="busy" @click="visible = false">取消</ElButton>
      <ElButton type="primary" :loading="busy" :disabled="loading || !ready" @click="save">
        保存
      </ElButton>
    </template>
  </ElDrawer>
</template>

<script setup lang="ts">
  import { nextTick, ref } from 'vue'
  import { ElAlert, ElButton, ElDrawer, ElTree } from 'element-plus'
  import { fetchGetMenuList, fetchRoleResources, updateRoleResources } from '@/api/system-manage'
  import type { ResourceTreeNode } from '@/types/api/system-manage'
  import { useDialogForm } from '@/hooks/useDialogForm'
  import { buildResourceTree } from '@/utils/resource'

  const props = defineProps<{ modelValue: boolean; roleId?: string }>()
  const emit = defineEmits<{ 'update:modelValue': [boolean]; success: [] }>()

  /** 完整资源树与树实例引用 */
  const resources = ref<ResourceTreeNode[]>([])
  const tree = ref<InstanceType<typeof ElTree>>()

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
     * @description 重置抽屉时清空上一次加载的资源树
     */
    reset: () => {
      resources.value = []
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
</script>
