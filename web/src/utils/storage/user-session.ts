import { watch } from 'vue'
import { useUserStore } from '@/store/modules/user'
import { router } from '@/router'
import { StorageConfig } from './storageConfig'

/**
 * @description 同步跨标签页会话，并在令牌到期时立即清理当前页面
 */
export function setupUserSession(): void {
  const user = useUserStore()
  let expiryTimer: ReturnType<typeof setTimeout> | undefined

  /**
   * @description 按共享存储的当前会话同步凭证，不依据可能延迟的事件内容清理新会话
   */
  const synchronizeSession = (): void => {
    const previousToken = user.accessToken
    const previousExpiry = user.expiresAt
    // 跨登录态同步仅检查键是否仍存在，字段恢复统一交给 Pinia 持久化插件。
    const hasStoredSession = localStorage.getItem(StorageConfig.USER_KEY) !== null
    if (hasStoredSession) user.$hydrate({ runHooks: false })
    const changed = previousToken !== user.accessToken || previousExpiry !== user.expiresAt

    if (!hasStoredSession || !user.hasValidSession()) {
      if (!previousToken && !previousExpiry && !changed) return
      const route = router.currentRoute.value
      const redirect =
        route.name === 'Exception500' && typeof route.query.redirect === 'string'
          ? route.query.redirect
          : undefined
      // hydrate 会暂缓普通变更订阅，显式 patch 确保清空后的凭证同步持久化。
      user.$patch(() => user.clearSession(redirect))
      return
    }
    if (!changed) return
    user.invalidateSession()
    // 路由和资料按新凭证重新初始化；不复用上一账号当前页面。
    void router.replace('/')
  }

  /**
   * @description 到期清理前同步共享会话；超过浏览器定时器上限时分段等待
   */
  const scheduleExpiry = (): void => {
    clearTimeout(expiryTimer)
    if (!user.accessToken) return
    if (!user.hasValidSession()) synchronizeSession()
    if (!user.hasValidSession()) return
    expiryTimer = setTimeout(
      scheduleExpiry,
      Math.min(user.expiresAt * 1000 - Date.now(), 2147483647)
    )
  }
  watch(() => [user.accessToken, user.expiresAt], scheduleExpiry, {
    immediate: true,
    flush: 'post'
  })

  window.addEventListener('storage', (event) => {
    if (
      event.storageArea !== localStorage ||
      (event.key !== StorageConfig.USER_KEY && event.key !== null)
    )
      return
    synchronizeSession()
    scheduleExpiry()
  })
}
