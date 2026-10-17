/**
 * Example 应用路由。
 */
import type { AppRouteRecord } from '@/types/router'
import { RoutePath } from '@/router/constants'

export const exampleRoutes: AppRouteRecord = {
  path: '/example',
  name: 'Example',
  component: RoutePath.LayoutComponent,
  meta: { title: 'Example 系统', icon: 'ri:shopping-cart-2-line' },
  children: [
    {
      name: 'Dashboard',
      path: 'dashboard',
      meta: {
        title: '仪表盘',
        icon: 'ri:pie-chart-line'
      },
      children: [
        {
          path: 'console',
          name: 'Console',
          component: '/dashboard/console',
          meta: {
            title: '工作台',
            keepAlive: false,
            fixedTab: true
          }
        },
        {
          path: 'docs',
          name: 'Docs',
          meta: {
            title: '文档',
            link: 'https://element-plus.org/',
            isIframe: true
          }
        }
      ]
    },
    {
      path: 'system',
      name: 'System',
      meta: {
        title: 'menus.system.title',
        icon: 'ri:user-3-line'
      },
      children: [
        {
          path: 'user',
          name: 'User',
          component: '/system/user',
          meta: { title: 'menus.system.user', keepAlive: true }
        },
        {
          path: 'role',
          name: 'Role',
          component: '/system/role',
          meta: { title: 'menus.system.role', keepAlive: true }
        },
        {
          path: 'menu',
          name: 'Menus',
          component: '/system/menu',
          meta: { title: 'menus.system.menu', keepAlive: true }
        },
        {
          path: 'data-showcase',
          name: 'DataShowcase',
          component: '/example/data-showcase',
          meta: { title: '组件示例', keepAlive: true }
        }
      ]
    }
  ]
}
