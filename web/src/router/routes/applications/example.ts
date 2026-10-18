/** 本地工作台与组件示例菜单 */
import type { AppRouteRecord } from '@/types/router'
import { RoutePath } from '@/router/constants'

export const exampleRoutes: AppRouteRecord = {
  path: '/example',
  name: 'Example',
  component: RoutePath.LayoutComponent,
  meta: { title: '示例系统', icon: 'ri:apps-line' },
  children: [
    {
      path: 'dashboard',
      name: 'Dashboard',
      meta: { title: '仪表盘', icon: 'ri:pie-chart-line' },
      children: [
        {
          path: 'console',
          name: 'Console',
          component: () => import('@/views/dashboard/console/index.vue'),
          meta: { title: '工作台', keepAlive: false, fixedTab: true }
        },
        {
          path: 'docs',
          name: 'Docs',
          meta: { title: '文档', link: 'https://element-plus.org/', isIframe: true }
        }
      ]
    },
    {
      path: 'data-showcase',
      name: 'DataShowcase',
      component: () => import('@/views/example/data-showcase/index.vue'),
      meta: { title: '组件示例', keepAlive: true }
    }
  ]
}
