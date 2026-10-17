/**
 * 路由公共常量与来源配置。
 */

export const RoutePath = {
  Login: '/auth/login',
  Root: '/',
  LayoutComponent: '/index/index'
} as const

export type RouteSource = 'static' | 'dynamic'

/**
 * @description 获取当前环境配置的路由来源。
 * @return 有效的路由来源，非法值回退为 static。
 */
export function getRouteSource(): RouteSource {
  if (import.meta.env.VITE_ROUTE_SOURCE === 'dynamic') return 'dynamic'
  return 'static'
}
