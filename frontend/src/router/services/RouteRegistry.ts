/**
 * 业务系统动态路由注册服务。
 */
import type { Router } from 'vue-router'
import type { AppRouteRecord } from '@/types/router'
import { RouteComponentLoader } from './RouteComponentLoader'
import { RouteConfigValidator } from './RouteConfigValidator'
import { RouteTransformer } from './RouteTransformer'

export class RouteRegistry {
  private readonly componentLoader = new RouteComponentLoader()
  private readonly validator = new RouteConfigValidator()
  private readonly transformer = new RouteTransformer(this.componentLoader)
  private removeRouteFns: Array<() => void> = []
  private registered = false

  /**
   * @description 初始化路由注册服务。
   * @param router Vue Router 实例。
   * @return 无返回值。
   */
  constructor(private readonly router: Router) {}

  /**
   * @description 校验并注册全部业务系统路由。
   * @param routes 一级业务系统路由列表。
   * @return 无返回值。
   */
  register(routes: AppRouteRecord[]): void {
    if (this.registered) return

    const reservedRouteNames = new Set(
      this.router
        .getRoutes()
        .map((route) => route.name)
        .filter((name): name is string | symbol => Boolean(name))
        .map((name) => String(name))
    )
    const result = this.validator.validate(routes, reservedRouteNames)
    if (!result.valid) throw new Error(`路由配置验证失败: ${result.errors.join(', ')}`)

    this.removeRouteFns = routes.map((route) =>
      this.router.addRoute(this.transformer.transform(route))
    )
    this.registered = true
  }

  /**
   * @description 注销本服务注册的全部业务系统路由。
   * @return 无返回值。
   */
  unregister(): void {
    this.removeRouteFns.forEach((removeRoute) => removeRoute())
    this.removeRouteFns = []
    this.registered = false
  }

  /**
   * @description 判断业务系统路由是否已经注册。
   * @return 是否已经注册。
   */
  isRegistered(): boolean {
    return this.registered
  }
}
