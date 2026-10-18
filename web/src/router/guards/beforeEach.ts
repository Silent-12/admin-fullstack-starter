/**
 * 路由全局前置守卫
 */
import type { NavigationGuardReturn, RouteLocationNormalized, Router } from 'vue-router'
import NProgress from 'nprogress'
import { useUserStore } from '@/store/modules/user'
import { useMenuStore } from '@/store/modules/menu'
import { useWorktabStore } from '@ao/admin-layout'
import { fetchGetUserAuthorization, fetchGetUserInfo } from '@/api/auth'
import { setWorktab } from '@/utils/navigation'
import { setPageTitle } from '@/utils/router'
import { loadingService } from '@/utils/ui'
import { getRouteSource, RoutePath } from '@/router/constants'
import { MenuRouteService, RouteRegistry } from '@/router/services'
import { ApiStatus } from '@/utils/http/status'
import { isHttpError } from '@/utils/http/error'

const publicRouteNames = new Set(['Login', 'Exception403', 'Exception500', 'Outside', 'Iframe'])
const menuRouteService = new MenuRouteService()
// 路由注册器实例
let routeRegistry: RouteRegistry | null = null
// 跟踪是否需要关闭 loading
let pendingLoading = false
// 路由初始化进行中标记，防止并发请求
let routeInitInProgress = false
// 每次重置使此前的异步初始化失效，包括同一会话内主动清理路由
let routeInitVersion = 0

/**
 * @description 获取路由初始化期间的加载状态
 * @return 是否仍需关闭全局加载状态。
 */
export function getPendingLoading(): boolean {
  return pendingLoading
}

/**
 * @description 重置路由初始化加载状态
 * @return 无返回值。
 */
export function resetPendingLoading(): void {
  pendingLoading = false
}

/**
 * @description 重置路由初始化状态
 * @return 无返回值。
 */
export function resetRouteInitState(): void {
  routeInitVersion++
  routeInitInProgress = false
}

/**
 * @description 注册全局前置守卫
 * @param router Vue Router 实例。
 * @return 无返回值。
 */
export function setupBeforeEachGuard(router: Router): void {
  // 初始化路由注册器
  routeRegistry = new RouteRegistry(router)
  router.beforeEach((to) => handleRouteGuard(to, router))
}

/**
 * @description 执行登录校验、业务系统路由注册与当前系统切换
 * @param to 即将进入的目标路由。
 * @param router Vue Router 实例。
 * @return 导航处理结果。
 */
async function handleRouteGuard(
  to: RouteLocationNormalized,
  router: Router
): Promise<NavigationGuardReturn> {
  NProgress.start()

  const userStore = useUserStore()
  if (isPublicRoute(to)) return true

  if (!userStore.hasValidSession()) {
    // 仅清凭证，登录跳转与回跳地址统一由守卫返回值负责。
    if (userStore.accessToken) userStore.resetCredentials()
    return { name: 'Login', query: { redirect: to.fullPath } }
  }

  if (!routeRegistry?.isRegistered()) {
    if (routeInitInProgress) return false
    return initializeApplicationRoutes(to, router)
  }

  if (to.path === RoutePath.Root) {
    const homePath = useMenuStore().getHomePath()
    return homePath ? { path: homePath, replace: true } : { name: 'Exception403', replace: true }
  }

  if (!to.matched.length) return { name: 'Exception404', replace: true }

  useMenuStore().activateApplication(to.path)
  setWorktab(to)
  setPageTitle(to)
  return true
}

/**
 * @description 独立加载用户资料与授权后初始化业务路由，401清理会话，其他失败保留凭证并进入异常页恢复
 * @param to 初始化时的目标路由。
 * @param router Vue Router 实例。
 * @return 恢复目标地址、进入异常页或取消原导航并跳转登录页的处理结果。
 */
async function initializeApplicationRoutes(
  to: RouteLocationNormalized,
  router: Router
): Promise<NavigationGuardReturn> {
  const userStore = useUserStore()
  const sessionVersion = userStore.getSessionVersion()
  const initializationVersion = routeInitVersion
  // 标记初始化进行中
  routeInitInProgress = true
  // 显示 loading
  pendingLoading = true
  loadingService.showLoading()

  try {
    const info = await fetchGetUserInfo()
    if (
      sessionVersion !== userStore.getSessionVersion() ||
      initializationVersion !== routeInitVersion
    )
      return false
    const authorization =
      getRouteSource() === 'dynamic' ? await fetchGetUserAuthorization() : { auth: [], menu: [] }
    if (
      sessionVersion !== userStore.getSessionVersion() ||
      initializationVersion !== routeInitVersion
    )
      return false

    userStore.setUserInfo(info)
    userStore.setAuth(authorization.auth)
    userStore.checkAndClearWorktabs()
    const routes = menuRouteService.getRoutes(authorization.menu)

    // 空授权菜单不注册路由，否则 registered 会被置为 true，后续无法重新初始化
    if (!routes.length) {
      useMenuStore().clearApplications()
      closeLoading()
      routeInitInProgress = false
      return { name: 'Exception403', replace: true }
    }

    routeRegistry?.register(routes)
    useMenuStore().setApplicationList(routes, to.path)
    useWorktabStore().validateWorktabs(router)
    // 初始化成功，重置进行中标记
    routeInitInProgress = false
    return { path: to.path, query: to.query, hash: to.hash, replace: true }
  } catch (error) {
    if (
      sessionVersion !== userStore.getSessionVersion() ||
      initializationVersion !== routeInitVersion
    )
      return false
    console.error('[RouteGuard] 业务系统路由初始化失败:', error)
    // 关闭 loading
    closeLoading()
    routeInitInProgress = false

    if (isUnauthorizedError(error)) {
      if (userStore.accessToken) userStore.clearSession()
      return false
    }
    // 保留凭证与原目标地址，由异常页提供初始化恢复入口。
    resetRouterState()
    return { name: 'Exception500', query: { redirect: to.fullPath }, replace: true }
  }
}

/**
 * @description 判断目标路由是否为允许匿名访问的公共路由
 * @param route 待判断的目标路由。
 * @return 是否为公共路由。
 */
function isPublicRoute(route: RouteLocationNormalized): boolean {
  return typeof route.name === 'string' && publicRouteNames.has(route.name)
}

/**
 * @description 判断路由初始化异常是否为未授权错误
 * @param error 路由初始化捕获的异常。
 * @return 是否为 401 未授权错误。
 */
function isUnauthorizedError(error: unknown): boolean {
  return isHttpError(error) && error.code === ApiStatus.unauthorized
}

/**
 * @description 关闭路由初始化全局加载状态
 * @return 无返回值。
 */
function closeLoading(): void {
  if (!pendingLoading) return
  loadingService.hideLoading()
  pendingLoading = false
}

/**
 * @description 立即清理业务系统动态路由、菜单与初始化状态，避免影响后续登录
 * @return 无返回值。
 */
export function resetRouterState(): void {
  closeLoading()
  routeRegistry?.unregister()
  useMenuStore().clearApplications()
  resetRouteInitState()
}
