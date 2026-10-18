/**
 * 业务菜单路由到 Vue Router 路由的转换服务
 */
import type { RouteRecordRaw } from 'vue-router'
import { defineComponent, h } from 'vue'
import type { AppRouteRecord } from '@/types/router'
import { RoutePath } from '@/router/constants'
import { RouteComponentLoader } from './RouteComponentLoader'

export class RouteTransformer {
  /**
   * @description 初始化路由转换服务
   * @param componentLoader 路由组件加载服务。
   * @return 无返回值。
   */
  constructor(private readonly componentLoader: RouteComponentLoader) {}

  /**
   * @description 将业务菜单路由转换为 Vue Router 可注册路由
   * @param route 业务菜单路由。
   * @return Vue Router 路由配置。
   */
  transform(route: AppRouteRecord): RouteRecordRaw {
    const { component, children, ...routeConfig } = route
    const converted = { ...routeConfig } as RouteRecordRaw

    if (route.meta.isIframe) {
      converted.component = this.componentLoader.loadIframe()
    } else if (component === RoutePath.LayoutComponent) {
      converted.component = this.componentLoader.loadLayout()
    } else if (component) {
      const load = typeof component === 'string' ? this.componentLoader.load(component) : component
      // 布局按路由名排除缓存；每条路由使用独立具名包装，避免依赖业务组件的 defineOptions 名称。
      converted.component = async () => {
        const loaded = await load()
        const page = loaded.default ?? loaded
        return defineComponent({
          name: String(route.name),
          inheritAttrs: false,
          setup:
            (_props, { attrs, slots }) =>
            () =>
              h(page, attrs, slots)
        })
      }
    }

    if (children?.length) {
      converted.children = children.map((child) => this.transform(child))
    }

    return converted
  }
}
