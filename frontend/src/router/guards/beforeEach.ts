/**
 * 路由全局前置守卫。
 */
import type { NavigationGuardReturn, RouteLocationNormalized, Router } from 'vue-router'
import { nextTick } from 'vue'
import NProgress from 'nprogress'
import { useUserStore } from '@/store/modules/user'
import { useMenuStore } from '@/store/modules/menu'
import { useWorktabStore } from '@ao/admin-layout'
import { fetchGetUserInfo } from '@/api/auth'
import { setWorktab } from '@/utils/navigation'
import { setPageTitle } from '@/utils/router'
import { loadingService } from '@/utils/ui'
import { RoutePath } from '@/router/constants'
import { MenuRouteService, RouteRegistry } from '@/router/services'
import { ApiStatus } from '@/utils/http/status'
import { isHttpError } from '@/utils/http/error'

const publicRouteNames = new Set(['Login', 'Exception403', 'Exception500', 'Outside', 'Iframe'])
const menuRouteService = new MenuRouteService()
// 路由注册器实例
let routeRegistry: RouteRegistry | null = null
// 跟踪是否需要关闭 loading
let pendingLoading = false
// 路由初始化失败标记，防止死循环
// 一旦设置为 true，只有刷新页面或重新登录才能重置
let routeInitFailed = false
// 路由初始化进行中标记，防止并发请求
let routeInitInProgress = false

/**
 * @description 获取路由初始化期间的加载状态。
 * @return 是否仍需关闭全局加载状态。
 */
export function getPendingLoading(): boolean {
  return pendingLoading
}

/**
 * @description 重置路由初始化加载状态。
 * @return 无返回值。
 */
export function resetPendingLoading(): void {
  pendingLoading = false
}

/**
 * @description 重置路由初始化状态。
 * @return 无返回值。
 */
export function resetRouteInitState(): void {
  routeInitFailed = false
  routeInitInProgress = false
}

/**
 * @description 注册全局前置守卫。
 * @param router Vue Router 实例。
 * @return 无返回值。
 */
export function setupBeforeEachGuard(router: Router): void {
  // 初始化路由注册器
  routeRegistry = new RouteRegistry(router)
  router.beforeEach((to) => handleRouteGuard(to, router))
}

/**
 * @description 执行登录校验、业务系统路由注册与当前系统切换。
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

  if (!userStore.isLogin) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }
  if (routeInitFailed) return to.matched.length ? true : { name: 'Exception500', replace: true }

  if (!routeRegistry?.isRegistered()) {
    if (routeInitInProgress) return false
    return initializeApplicationRoutes(to, router)
  }

  if (to.path === RoutePath.Root) {
    const homePath = useMenuStore().getHomePath()
    return homePath ? { path: homePath, replace: true } : { name: 'Exception404', replace: true }
  }

  if (!to.matched.length) return { name: 'Exception404', replace: true }

  useMenuStore().activateApplication(to.path)
  setWorktab(to)
  setPageTitle(to)
  return true
}

/**
 * @description 初始化用户信息、业务系统路由与当前菜单状态。
 * @param to 初始化时的目标路由。
 * @param router Vue Router 实例。
 * @return 恢复目标地址的导航处理结果。
 */
async function initializeApplicationRoutes(
  to: RouteLocationNormalized,
  router: Router
): Promise<NavigationGuardReturn> {
  // 标记初始化进行中
  routeInitInProgress = true
  // 显示 loading
  pendingLoading = true
  loadingService.showLoading()

  try {
    await fetchUserInfo()
    const routes = await menuRouteService.getRoutes()
    if (!routes.length) throw new Error('未获取到业务系统路由')

    routeRegistry?.register(routes)
    useMenuStore().setApplicationList(routes, to.path)
    useWorktabStore().validateWorktabs(router)
    // 初始化成功，重置进行中标记
    routeInitInProgress = false

    return { path: to.path, query: to.query, hash: to.hash, replace: true }
  } catch (error) {
    console.error('[RouteGuard] 业务系统路由初始化失败:', error)
    // 关闭 loading
    closeLoading()
    routeInitInProgress = false

    if (isUnauthorizedError(error)) return false

    // 标记初始化失败，防止死循环
    routeInitFailed = true
    return { name: 'Exception500', replace: true }
  }
}

/**
 * @description 获取并保存登录用户信息。
 * @return 无返回值。
 */
async function fetchUserInfo(): Promise<void> {
  const userStore = useUserStore()
  userStore.setUserInfo(await fetchGetUserInfo())
  userStore.checkAndClearWorktabs()
}

/**
 * @description 判断目标路由是否为允许匿名访问的公共路由。
 * @param route 待判断的目标路由。
 * @return 是否为公共路由。
 */
function isPublicRoute(route: RouteLocationNormalized): boolean {
  return typeof route.name === 'string' && publicRouteNames.has(route.name)
}

/**
 * @description 判断路由初始化异常是否为未授权错误。
 * @param error 路由初始化捕获的异常。
 * @return 是否为 401 未授权错误。
 */
function isUnauthorizedError(error: unknown): boolean {
  return isHttpError(error) && error.code === ApiStatus.unauthorized
}

/**
 * @description 关闭路由初始化全局加载状态。
 * @return 无返回值。
 */
function closeLoading(): void {
  if (!pendingLoading) return
  nextTick(() => {
    loadingService.hideLoading()
    pendingLoading = false
  })
}

/**
 * @description 延迟清理业务系统动态路由与菜单状态。
 * @param delay 清理前的延迟时间，单位为毫秒。
 * @return 无返回值。
 */
export function resetRouterState(delay: number): void {
  setTimeout(() => {
    routeRegistry?.unregister()
    useMenuStore().clearApplications()
    resetRouteInitState()
  }, delay)
}
