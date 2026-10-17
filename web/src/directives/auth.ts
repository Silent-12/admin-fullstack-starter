/**
 * v-auth 权限指令
 *
 * 适用于后端权限控制模式，基于权限标识控制 DOM 元素的显示和隐藏。
 * 如果用户没有对应权限，元素将从 DOM 中移除。
 *
 * ## 主要功能
 *
 * - 权限验证 - 根据路由 meta 中的权限列表验证用户权限
 * - DOM 控制 - 无权限时自动移除元素，而非隐藏
 * - 响应式更新 - 权限变化时自动更新元素状态
 *
 * ## 使用示例
 *
 * ```vue
 * <!-- 只有拥有 'add' 权限的用户才能看到新增按钮 -->
 * <ElButton v-auth="'add'">新增</ElButton>
 *
 * <!-- 只有拥有 'edit' 权限的用户才能看到编辑按钮 -->
 * <ElButton v-auth="'edit'">编辑</ElButton>
 *
 * <!-- 只有拥有 'delete' 权限的用户才能看到删除按钮 -->
 * <ElButton v-auth="'delete'">删除</ElButton>
 * ```
 *
 * ## 注意事项
 *
 * - 该指令会直接移除 DOM 元素，而不是使用 v-if 隐藏
 * - 权限列表从当前路由的 meta.authList 中获取
 */
import type { App, Directive, DirectiveBinding } from 'vue'
import { useUserStore } from '@/store/modules/user'

export type AuthDirective = Directive<HTMLElement, string>

/**
 * @description 根据当前用户的后端授权数据校验指令权限。
 * @param el 指令绑定的 DOM 元素。
 * @param binding 指令绑定信息。
 * @return 无返回值。
 */
function checkAuthPermission(el: HTMLElement, binding: DirectiveBinding<string>): void {
  if (!binding.value || useUserStore().info.auth?.includes(binding.value)) return
  removeElement(el)
}

/**
 * @description 从 DOM 中移除无权限元素。
 * @param el 需要移除的 DOM 元素。
 * @return 无返回值。
 */
function removeElement(el: HTMLElement): void {
  if (!el.parentNode) return
  el.parentNode.removeChild(el)
}

const authDirective: AuthDirective = {
  mounted: checkAuthPermission,
  updated: checkAuthPermission
}

/**
 * @description 注册全局按钮权限指令。
 * @param app Vue 应用实例。
 * @return 无返回值。
 */
export function setupAuthDirective(app: App): void {
  app.directive('auth', authDirective)
}
