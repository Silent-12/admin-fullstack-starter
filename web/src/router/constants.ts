/**
 * 路由公共常量
 */

export const RoutePath = {
  Login: '/auth/login',
  Root: '/',
  LayoutComponent: '/index/index'
} as const

/** 业务菜单仅支持规范化静态路径，与后端菜单契约一致 */
export const BUSINESS_ROUTE_PATH_PATTERN = /^\/?[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/

/**
 * @description 获取菜单路由来源，仅显式 static 启用本地调试路由
 * @return 路由来源，缺失或非法配置默认使用后端授权菜单
 */
export function getRouteSource(): 'static' | 'dynamic' {
  return import.meta.env.VITE_ROUTE_SOURCE === 'static' ? 'static' : 'dynamic'
}
