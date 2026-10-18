/**
 * v-auth 按钮权限指令
 *
 * @description 动态模式根据 auth/authorization 的 auth 标识控制按钮显示，静态调试模式放行
 * @example <ElButton v-auth="'system.user.create'">新增用户</ElButton>
 * 权限变化后由用户刷新页面，重新获取授权并渲染按钮；接口权限仍由后端校验。
 */
import type { App, Directive, DirectiveBinding } from 'vue'
import { useUserStore } from '@/store/modules/user'
import { getRouteSource } from '@/router/constants'

export type AuthDirective = Directive<HTMLElement, string>

/**
 * @description 静态调试模式放行，动态模式根据后端授权校验指令权限，无效标识默认拒绝
 * @param el 指令绑定的 DOM 元素。
 * @param binding 指令绑定信息。
 */
function checkAuthPermission(el: HTMLElement, binding: DirectiveBinding<string>): void {
  if (getRouteSource() === 'static') return
  if (
    typeof binding.value === 'string' &&
    binding.value.trim().length > 0 &&
    useUserStore().auth.includes(binding.value)
  )
    return
  el.parentNode?.removeChild(el)
}

const authDirective: AuthDirective = {
  mounted: checkAuthPermission,
  updated: checkAuthPermission
}

/**
 * @description 注册全局按钮权限指令
 * @param app Vue 应用实例。
 */
export function setupAuthDirective(app: App): void {
  app.directive('auth', authDirective)
}
