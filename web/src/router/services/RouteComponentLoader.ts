/**
 * 路由组件加载服务。
 */
import type { Component } from 'vue'
import { h } from 'vue'

type AsyncComponentLoader = () => Promise<Component>

export class RouteComponentLoader {
  private readonly modules: Record<string, AsyncComponentLoader>

  /**
   * @description 初始化视图组件映射。
   * @return 无返回值。
   */
  constructor() {
    this.modules = import.meta.glob('../../views/**/*.vue') as Record<string, AsyncComponentLoader>
  }

  /**
   * @description 根据约定的视图路径加载页面组件。
   * @param componentPath 不含扩展名的视图路径。
   * @return 异步 Vue 组件加载函数。
   */
  load(componentPath: string): AsyncComponentLoader {
    if (!componentPath) return this.createEmptyComponent()

    const component =
      this.modules[`../../views${componentPath}.vue`] ||
      this.modules[`../../views${componentPath}/index.vue`]

    if (component) return component
    console.error(`[RouteComponentLoader] 未找到组件: ${componentPath}`)
    return this.createErrorComponent(componentPath)
  }

  /**
   * @description 加载后台布局组件。
   * @return 异步 Vue 组件加载函数。
   */
  loadLayout(): AsyncComponentLoader {
    return () => import('@/components/layouts/AoAdminLayout/index.vue')
  }

  /**
   * @description 加载公共 iframe 组件。
   * @return 异步 Vue 组件加载函数。
   */
  loadIframe(): AsyncComponentLoader {
    return () => import('@/views/outside/Iframe.vue')
  }

  /**
   * @description 创建空白路由组件。
   * @return 异步 Vue 组件加载函数。
   */
  private createEmptyComponent(): AsyncComponentLoader {
    return () => Promise.resolve({ render: () => h('div') })
  }

  /**
   * @description 创建组件路径错误提示组件。
   * @param componentPath 未找到的组件路径。
   * @return 异步 Vue 组件加载函数。
   */
  private createErrorComponent(componentPath: string): AsyncComponentLoader {
    return () =>
      Promise.resolve({
        render: () => h('div', { class: 'route-error' }, `组件未找到: ${componentPath}`)
      })
  }
}
