/**
 * 无需业务菜单注册的公共路由。
 */
import type { RouteRecordRaw } from 'vue-router'

export const publicRoutes: RouteRecordRaw[] = [
  {
    path: '/auth/login',
    name: 'Login',
    component: () => import('@views/auth/login/index.vue'),
    meta: { title: '登录', isHideTab: true }
  },
  {
    path: '/403',
    name: 'Exception403',
    component: () => import('@views/exception/403/index.vue'),
    meta: { title: '403', isHideTab: true }
  },
  {
    path: '/500',
    name: 'Exception500',
    component: () => import('@views/exception/500/index.vue'),
    meta: { title: '500', isHideTab: true }
  },
  {
    path: '/outside',
    name: 'Outside',
    component: () => import('@/components/layouts/AoAdminLayout/index.vue'),
    meta: { title: '内嵌页面' },
    children: [
      {
        path: 'iframe/:path(.*)*',
        name: 'Iframe',
        component: () => import('@views/outside/Iframe.vue'),
        meta: { title: 'iframe', isIframe: true, isHideTab: true }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'Exception404',
    component: () => import('@views/exception/404/index.vue'),
    meta: { title: '404', isHideTab: true }
  }
]
