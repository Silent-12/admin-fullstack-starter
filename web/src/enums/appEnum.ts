/**
 * 系统级别枚举定义模块
 *
 * ## 主要功能
 *
 * - 主题类型枚举（亮色、暗色、自动）
 * - 菜单主题枚举（设计、亮色、暗色）
 * - 语言类型枚举（中文、英文）
 */

/**
 * 系统主题
 */
export enum SystemThemeEnum {
  /** 暗色主题 */
  DARK = 'dark',
  /** 亮色主题 */
  LIGHT = 'light',
  /** 自动主题（跟随系统） */
  AUTO = 'auto'
}

/**
 * 菜单主题
 */
export enum MenuThemeEnum {
  /** 暗色主题 */
  DARK = 'dark',
  /** 亮色主题 */
  LIGHT = 'light',
  /** 设计主题 */
  DESIGN = 'design'
}

/**
 * 语言类型
 */
export enum LanguageEnum {
  /** 中文 */
  ZH = 'zh',
  /** 英文 */
  EN = 'en'
}
