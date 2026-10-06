/**
 * 业务系统菜单路由来源与规范化服务。
 */
import type { AppRouteRecord } from '@/types/router'
import { fetchGetMenuList } from '@/api/system-manage'
import { getFirstMenuPath } from '@/utils/navigation/route'
import { getRouteSource } from '@/router/constants'
import { applicationRoutes } from '@/router/routes/applications'

export class MenuRouteService {
  /**
   * @description 按环境配置获取并规范化业务系统路由。
   * @return 完整的一级业务系统路由列表。
   */
  async getRoutes(): Promise<AppRouteRecord[]> {
    const routes = getRouteSource() === 'dynamic' ? await fetchGetMenuList() : applicationRoutes

    return this.normalizeRoutes(routes)
  }

  /**
   * @description 将嵌套路由路径规范化为完整路径，并为目录推导默认跳转地址。
   * @param routes 待规范化的路由列表。
   * @param parentPath 父级完整路径。
   * @param applicationPath 当前一级业务系统完整路径。
   * @return 规范化后的路由列表。
   */
  private normalizeRoutes(
    routes: AppRouteRecord[],
    parentPath = '',
    applicationPath = ''
  ): AppRouteRecord[] {
    return routes.map((route) => {
      let currentApplicationPath = applicationPath
      if (!parentPath) {
        currentApplicationPath = this.resolvePath(route.path || '', parentPath)
      }

      const path = this.resolvePath(
        route.path || '',
        parentPath,
        currentApplicationPath,
        route.meta.isIframe === true
      )

      let children: AppRouteRecord[] | undefined
      if (route.children?.length) {
        children = this.normalizeRoutes(route.children, path, currentApplicationPath)
      }

      const redirect = route.redirect || getFirstMenuPath(children || [])
      const normalizedRoute = {
        ...route,
        path,
        children
      }

      if (redirect) normalizedRoute.redirect = redirect
      return normalizedRoute
    })
  }

  /**
   * @description 拼接父子路由路径。
   * @param path 当前路由路径。
   * @param parentPath 父级完整路径。
   * @param applicationPath 当前一级业务系统完整路径。
   * @param isIframe 是否为 iframe 页面路由。
   * @return 规范化后的完整路径。
   */
  private resolvePath(
    path: string,
    parentPath: string,
    applicationPath = '',
    isIframe = false
  ): string {
    if (!path || path.startsWith('http://') || path.startsWith('https://')) return path
    if (isIframe && this.isSharedIframePath(path) && applicationPath) {
      return `${applicationPath.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
    }
    if (path.startsWith('/')) return path
    if (!parentPath) return `/${path}`
    return `${parentPath.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
  }

  /**
   * @description 判断是否为需要归入当前业务系统的公共 iframe 路径。
   * @param path 待判断的路由路径。
   * @return 是否为公共 iframe 路径。
   */
  private isSharedIframePath(path: string): boolean {
    return path === '/outside/iframe' || path.startsWith('/outside/iframe/')
  }
}
