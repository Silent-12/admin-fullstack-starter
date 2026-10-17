import type { App } from 'vue'
import { setupAuthDirective, type AuthDirective } from './auth'
import { setupHighlightDirective, type HighlightDirective } from './highlight'

/**
 * @description 注册应用内置的全局自定义指令
 * @param app - Vue 应用实例
 * @return 无返回值
 */
export function setupGlobDirectives(app: App): void {
  setupAuthDirective(app) // 权限指令
  setupHighlightDirective(app) // 高亮指令
}

export type { AuthDirective, HighlightDirective }
