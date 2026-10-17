/**
 * 配置类型定义模块
 *
 * 提供系统配置相关的类型定义
 *
 * ## 主要功能
 *
 * - 主题设置类型
 * - 系统基础配置类型
 * - 顶部栏功能配置类型
 * - 环境配置类型
 * - 应用配置类型
 *
 * ## 使用场景
 *
 * - 系统配置文件类型约束
 * - 配置项类型定义
 * - 配置数据验证
 */

import { SystemThemeEnum } from '@/enums'
import { MenuThemeType, SystemThemeTypes } from '@/types/store/setting'

// 主题设置
export interface ThemeSetting {
  /** 主题名称 */
  name: string
  /** 系统主题类型 */
  theme: SystemThemeEnum
  /** 主题颜色数组 */
  color: string[]
  /** 左侧线条颜色 */
  leftLineColor: string
  /** 右侧线条颜色 */
  rightLineColor: string
  /** 主题图片 */
  img: string
}

/**
 * 系统基础配置接口
 * @description 定义系统名称、版本及其他基础信息。
 */
export interface SystemBasicConfig {
  // 系统名称
  name: string
  // 系统版本
  version: string
  // 系统描述
  description?: string
  // 系统logo
  logo?: string
  // 系统favicon
  favicon?: string
  // 版权信息
  copyright?: string
}

// 系统配置
export interface SystemConfig {
  // 系统基础信息
  systemInfo: SystemBasicConfig
  // 系统主题样式
  systemThemeStyles: SystemThemeTypes
  // 设置主题列表
  settingThemeList: ThemeSetting[]
  // 主题列表
  themeList: MenuThemeType[]
  // 暗色菜单样式
  darkMenuStyles: MenuThemeType[]
  // 系统主色调
  systemMainColor: readonly string[]
  // 顶部栏功能配置
  headerBar?: HeaderBarFeatureConfig
}

/**
 * 环境配置接口
 * @description 定义 Vite 构建和运行时读取的环境变量。
 */
export interface EnvConfig {
  // 环境名称
  NODE_ENV: string
  // 应用名称
  VITE_APP_NAME: string
  // 应用版本
  VITE_APP_VERSION: string
  // 应用端口
  VITE_PORT: string
  // 应用基础路径
  VITE_BASE_URL: string
  // API 地址
  VITE_API_URL: string
  // 路由来源
  VITE_ROUTE_SOURCE: 'static' | 'dynamic'
  // 跨域请求是否携带 Cookie
  VITE_WITH_CREDENTIALS: string
}

// 应用配置
export interface AppConfig extends SystemConfig {
  // 环境配置
  env: EnvConfig
  // 开发模式
  isDev: boolean
  // 生产模式
  isProd: boolean
  // 测试模式
  isTest: boolean
}

// 功能配置项基础接口
export interface FeatureConfigItem {
  enabled: boolean
  description: string
}

// 顶部栏功能配置接口
export interface HeaderBarFeatureConfig {
  /** 菜单按钮 */
  menuButton: FeatureConfigItem
  /** 快速入口 */
  fastEnter: FeatureConfigItem
  /** 全局搜索 */
  globalSearch: FeatureConfigItem
  /** 全屏功能 */
  fullscreen: FeatureConfigItem
  /** 通知功能 */
  notification: FeatureConfigItem
  /** 多语言切换 */
  language: FeatureConfigItem
  /** 设置面板 */
  settings: FeatureConfigItem
  /** 主题切换 */
  themeToggle: FeatureConfigItem
}
