/**
 * 存储配置管理模块
 *
 * 提供统一的本地存储配置和工具方法
 *
 * ## 主要功能
 *
 * - 主题存储键配置
 * - 上次登录用户 ID 存储键配置
 *
 * ## 使用场景
 *
 * - 应用启动前主题初始化
 * - 登录用户切换时的工作台状态处理
 */
export class StorageConfig {
  /** 主题键名（index.html中使用了，如果修改，需要同步修改） */
  static readonly THEME_KEY = 'sys-theme'

  /** 上次登录用户ID键名（用于判断是否为同一用户登录） */
  static readonly LAST_USER_ID_KEY = 'sys-last-user-id'
}
