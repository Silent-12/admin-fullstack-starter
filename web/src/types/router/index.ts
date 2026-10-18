/**
 * 路由类型定义模块
 *
 * 提供路由相关的类型定义
 *
 * ## 主要功能
 *
 * - 路由元数据类型（标题、图标、权限等）
 * - 应用路由记录类型
 * - 路由配置扩展
 *
 * ## 使用场景
 *
 * - 路由配置类型约束
 * - 路由元数据定义
 * - 菜单生成
 * - 权限控制
 */

import { RouteRecordRaw } from 'vue-router'

/**
 * 路由元数据接口
 * @description 定义服务端授权路由使用的布局和菜单配置
 */
export interface RouteMeta extends Record<string | number | symbol, unknown> {
  // 路由标题
  title: string
  // 路由图标
  icon?: string
  // 是否显示徽章
  showBadge?: boolean
  // 文本徽章
  showTextBadge?: string
  // 是否在菜单中隐藏
  isHide?: boolean
  // 是否在标签页中隐藏
  isHideTab?: boolean
  // 外部链接
  link?: string
  // 是否为iframe
  isIframe?: boolean
  // 是否缓存
  keepAlive?: boolean
  // 是否固定标签页
  fixedTab?: boolean
  // 激活菜单路径
  activePath?: string
  // 是否为全屏页面
  isFullPage?: boolean
}

/**
 * 应用路由记录接口
 * @description 扩展 Vue Router 的路由记录，使用资源 UUID
 */
export interface AppRouteRecord extends Omit<RouteRecordRaw, 'meta' | 'children' | 'component'> {
  // 可选权限资源 UUID
  id?: string
  // 菜单与展示元数据
  meta: RouteMeta
  // 可选子路由
  children?: AppRouteRecord[]
  // 可选组件标识或异步组件
  component?: string | (() => Promise<any>)
}
