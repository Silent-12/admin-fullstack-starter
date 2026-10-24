import type { ResourceListItem, ResourceTreeNode } from '@/types/api/system-manage'

/**
 * @description 根据父资源 UUID 构建树，保留列表顺序，缺失父节点的资源作为根节点展示
 * @param resources 完整的扁平资源列表
 * @return 菜单管理与角色授权使用的资源树
 */
export function buildResourceTree(resources: ResourceListItem[]): ResourceTreeNode[] {
  const nodes = new Map<string, ResourceTreeNode>(
    resources.map((resource) => [resource.id, { ...resource, children: [] }])
  )
  const roots: ResourceTreeNode[] = []
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return roots
}
