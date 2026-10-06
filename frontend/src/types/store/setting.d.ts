import { MenuThemeEnum, SystemThemeEnum } from '@/enums'

/**
 * 系统主题样式
 * @description 定义系统主题对应的 CSS 类名。
 */
export interface SystemThemeType {
  // 主题类名
  className: string
}

/**
 * 系统主题样式集合
 * @description 定义除自动模式外的系统主题配置。
 */
export type SystemThemeTypes = {
  [key in Exclude<SystemThemeEnum, SystemThemeEnum.AUTO>]: SystemThemeType
}

/**
 * 菜单主题样式
 * @description 定义侧边菜单的颜色和背景配置。
 */
export interface MenuThemeType {
  // 主题类型
  theme: MenuThemeEnum
  // 背景颜色
  background: string
  // 系统名称颜色
  systemNameColor: string
  // 文本颜色
  textColor: string
  // 图标颜色
  iconColor: string
  // 背景图片
  img?: string
}

/**
 * 设置状态
 * @description 定义设置中心持久化的基础状态。
 */
export interface SettingState {
  // 主题
  theme: string
  // 是否只保持一个子菜单的展开
  uniqueOpened: boolean
  // 是否显示菜单按钮
  menuButton: boolean
  // 是否显示工作标签页
  showWorkTab: boolean
  // 是否显示语言切换
  showLanguage: boolean
  // 主题模式
  themeModel: string
}

/**
 * 设置 Store 状态
 * @description 定义设置 Store 中包含的完整运行时状态。
 */
export interface SettingStoreState extends SettingState {
  // 菜单是否折叠
  collapsed: boolean
  // 设备类型
  device: 'desktop' | 'mobile'
  // 当前语言
  language: string
}
