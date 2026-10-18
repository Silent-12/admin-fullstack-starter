/** 本地调试菜单，不替代后端认证和接口权限校验 */
import type { AppRouteRecord } from '@/types/router'
import { exampleRoutes } from './example'
import { systemRoutes } from './system'

export const applicationRoutes: AppRouteRecord[] = [exampleRoutes, systemRoutes]
