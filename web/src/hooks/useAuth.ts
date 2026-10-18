import { useAuth as useComponentAuth } from '@ao/admin-components'
import { getRouteSource } from '@/router/constants'

/**
 * 获取宿主按钮权限策略
 * @description 静态调试模式放行按钮操作入口，动态模式复用公共组件包的后端权限判断
 * @returns 当前模式的按钮权限判断方法
 */
export function useAuth() {
  const { hasAuth } = useComponentAuth()
  return {
    /**
     * @description 按路由来源判断是否显示或启用对应按钮操作
     * @param auth 后端按钮权限标识
     * @returns 是否放行按钮操作
     */
    hasAuth: (auth: string): boolean => getRouteSource() === 'static' || hasAuth(auth)
  }
}
