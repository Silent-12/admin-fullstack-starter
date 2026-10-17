/**
 * 业务系统路由配置校验服务。
 */
import type { AppRouteRecord } from '@/types/router'
import { RoutePath } from '@/router/constants'

export interface RouteValidationResult {
  valid: boolean
  errors: string[]
}

export class RouteConfigValidator {
  /**
   * @description 校验业务系统路由树的基础结构与全局路由名称唯一性。
   * @param routes 一级业务系统路由列表。
   * @param reservedRouteNames 已由公共路由占用的名称集合。
   * @return 校验结果。
   */
  validate(
    routes: AppRouteRecord[],
    reservedRouteNames: Set<string> = new Set()
  ): RouteValidationResult {
    const errors: string[] = []
    const routeNames = new Set(reservedRouteNames)

    routes.forEach((route) => this.validateRoute(route, 0, routeNames, errors))
    return { valid: errors.length === 0, errors }
  }

  /**
   * @description 递归校验单个业务路由节点。
   * @param route 当前路由节点。
   * @param depth 当前节点深度。
   * @param routeNames 已出现的路由名称集合。
   * @param errors 校验错误集合。
   * @return 无返回值。
   */
  private validateRoute(
    route: AppRouteRecord,
    depth: number,
    routeNames: Set<string>,
    errors: string[]
  ): void {
    const routeLabel = String(route.name || route.path || 'unknown')
    if (!route.path) errors.push(`路由 ${routeLabel} 缺少 path`)
    if (!route.name) errors.push(`路由 ${routeLabel} 缺少 name`)

    if (route.name) {
      const name = String(route.name)
      if (routeNames.has(name)) {
        const error = `路由名称重复: ${name}`
        errors.push(error)
        console.error(`[RouteConfigValidator] ${error}`)
      }
      routeNames.add(name)
    }

    if (depth === 0) {
      if (route.component !== RoutePath.LayoutComponent) {
        errors.push(`业务系统 ${routeLabel} 必须使用 ${RoutePath.LayoutComponent} 作为布局组件`)
      }
      if (!route.children?.length) errors.push(`业务系统 ${routeLabel} 必须包含可访问子路由`)
    } else if (route.component === RoutePath.LayoutComponent) {
      errors.push(`非一级路由 ${routeLabel} 不可使用 ${RoutePath.LayoutComponent}，避免嵌套布局`)
    }

    if (!route.component && !route.meta.link && !route.meta.isIframe && !route.children?.length) {
      errors.push(`路由 ${routeLabel} 缺少 component`)
    }

    route.children?.forEach((child) => this.validateRoute(child, depth + 1, routeNames, errors))
  }
}
