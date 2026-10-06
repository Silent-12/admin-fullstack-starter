/**
 * 配置图片资源
 *
 * 统一管理设置中心使用的预览图片资源。
 * 包含主题样式、菜单风格的预览图。
 *
 * - themeStyles: 系统主题预览图（亮色/暗色/自动）
 * - menuStyles: 菜单风格预览图（设计/暗色/亮色）
 */

import lightTheme from '@imgs/settings/theme_styles/light.png'
import darkTheme from '@imgs/settings/theme_styles/dark.png'
import systemTheme from '@imgs/settings/theme_styles/system.png'

import designStyle from '@imgs/settings/menu_styles/design.png'
import darkStyle from '@imgs/settings/menu_styles/dark.png'
import lightStyle from '@imgs/settings/menu_styles/light.png'

/**
 * 配置中心图片资源对象
 */
export const configImages = {
  /** 系统主题预览图 */
  themeStyles: {
    /** 亮色主题 */
    light: lightTheme,
    /** 暗色主题 */
    dark: darkTheme,
    /** 自动主题（跟随系统） */
    system: systemTheme
  },
  /** 菜单风格预览图 */
  menuStyles: {
    /** 设计风格 */
    design: designStyle,
    /** 暗色风格 */
    dark: darkStyle,
    /** 亮色风格 */
    light: lightStyle
  }
}
