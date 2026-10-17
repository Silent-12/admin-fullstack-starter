/**
 * 菜单路径与业务系统路由工具。
 */
import type { AppRouteRecord } from '@/types/router'

/**
 * @description 判断菜单项是否可作为默认导航落点。
 * @param menuItem 菜单路由项。
 * @return 是否可以跳转到该菜单项。
 */
export function isNavigableMenuItem(menuItem: AppRouteRecord): boolean {
  if (!menuItem.path?.trim()) return false
  if (menuItem.path.startsWith('http://') || menuItem.path.startsWith('https://')) return false
  if (menuItem.meta.isHide && menuItem.meta.isFullPage !== true) return false
  if (menuItem.meta.link && !menuItem.meta.isIframe) return false
  if (menuItem.children?.length) return true
  return Boolean(menuItem.component || menuItem.meta.isIframe === true)
}

/**
 * @description 递归获取菜单树中第一个可访问页面路径。
 * @param menuList 菜单路由列表。
 * @return 第一个可访问页面的完整路径，无结果时返回空字符串。
 */
export function getFirstMenuPath(menuList: AppRouteRecord[]): string {
  for (const menuItem of menuList) {
    if (!isNavigableMenuItem(menuItem)) continue

    if (menuItem.children?.length) {
      const childPath = getFirstMenuPath(menuItem.children)
      if (childPath) return childPath
      continue
    }

    return menuItem.path.startsWith('/') ? menuItem.path : `/${menuItem.path}`
  }

  return ''
}

/**
 * @description 根据当前地址查找所属业务系统。
 * @param applicationList 一级业务系统路由列表。
 * @param path 当前访问路径。
 * @return 匹配的业务系统，无匹配时返回 undefined。
 */
export function findApplicationByPath(
  applicationList: AppRouteRecord[],
  path: string
): AppRouteRecord | undefined {
  return [...applicationList]
    .sort((left, right) => right.path.length - left.path.length)
    .find((application) => path === application.path || path.startsWith(`${application.path}/`))
}
