/** 本地系统管理调试菜单，操作权限仍取自当前用户 auth */
import type { AppRouteRecord } from '@/types/router'
import { RoutePath } from '@/router/constants'

// 与后端内置资源种子保持一致，避免静态调试路由与授权菜单漂移
export const systemRoutes: AppRouteRecord = {
  path: '/system',
  name: 'System',
  component: RoutePath.LayoutComponent,
  meta: { title: '系统管理' },
  children: [
    {
      path: 'user',
      name: 'SystemUser',
      component: () => import('@/views/system/user/index.vue'),
      meta: { title: '用户管理', keepAlive: false }
    },
    {
      path: 'role',
      name: 'SystemRole',
      component: () => import('@/views/system/role/index.vue'),
      meta: { title: '角色管理', keepAlive: false }
    },
    {
      path: 'menu',
      name: 'SystemMenu',
      component: () => import('@/views/system/menu/index.vue'),
      meta: { title: '菜单管理', keepAlive: false }
    },
    {
      path: 'api-resources',
      name: 'SystemApiResources',
      component: () => import('@/views/system/api-resources/index.vue'),
      meta: { title: '接口资源', keepAlive: false }
    }
  ]
}
