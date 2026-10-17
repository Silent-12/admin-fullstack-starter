/**
 * 存储配置管理模块
 *
 * 提供统一的本地存储配置和工具方法
 *
 * ## 主要功能
 *
 * - 主题存储键配置
 * - 当前标签页工作区所属用户 ID 存储键配置
 *
 * ## 使用场景
 *
 * - 应用启动前主题初始化
 * - 登录用户切换时的工作台状态处理
 */
export class StorageConfig {
  /** 用户凭证与偏好持久化键名 */
  static readonly USER_KEY = 'user'
  /** 主题键名（index.html中使用了，如果修改，需要同步修改） */
  static readonly THEME_KEY = 'sys-theme'

  /** sessionStorage 中的标签页归属 UUID，重载或清理会话时保留，profile 验证后更新 */
  static readonly WORKTAB_OWNER_KEY = 'sys-worktab-owner'
}
