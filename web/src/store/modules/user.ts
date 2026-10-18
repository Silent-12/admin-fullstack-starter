/** 用户会话与偏好：只持久化令牌、到期时间和偏好，资料与授权每次启动重新获取 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { LanguageEnum } from '@/enums'
import { router } from '@/router'
import { useSettingStore, useWorktabStore } from '@ao/admin-layout'
import type { AppRouteRecord } from '@/types/router'
import type { UserInfo } from '@/types/api/auth'
import { setPageTitle } from '@/utils/router'
import { resetRouterState } from '@/router/guards/beforeEach'
import { StorageConfig } from '@/utils/storage/storageConfig'
import { getLoginRedirect } from '@/utils/navigation/login'

/**
 * @description 管理后台会话；所有异步操作以会话版本判断是否仍属于当前用户
 */
export const useUserStore = defineStore(
  'userStore',
  () => {
    // 用户偏好
    const language = ref(LanguageEnum.ZH)
    const searchHistory = ref<AppRouteRecord[]>([])
    // 凭证与运行时资料
    const accessToken = ref('')
    const expiresAt = ref(0)
    const info = ref<Partial<UserInfo>>({})
    // 独立授权接口返回的运行时按钮权限
    const auth = ref<string[]>([])
    let sessionVersion = 0

    /**
     * @description 实时检查本地凭证到期时间，服务端仍是最终认证依据
     */
    const hasValidSession = (): boolean =>
      Boolean(accessToken.value) &&
      Number.isSafeInteger(expiresAt.value) &&
      expiresAt.value > Date.now() / 1000
    const isLogin = computed(hasValidSession)
    const getUserInfo = computed(() => info.value)
    const getSettingState = computed(() => useSettingStore().$state)
    const getWorktabState = computed(() => useWorktabStore().$state)

    /**
     * @description 获取内存会话版本
     */
    const getSessionVersion = (): number => sessionVersion

    /**
     * @description 清理当前资料与动态路由，使之前的异步请求失效
     */
    const invalidateSession = (): void => {
      sessionVersion++
      info.value = {}
      auth.value = []
      resetRouterState()
    }

    /**
     * @description 写入新令牌并清除前一个会话的业务数据
     */
    const setToken = (token: string, expiry: number): void => {
      invalidateSession()
      accessToken.value = token
      expiresAt.value = expiry
    }

    /**
     * @description 仅清理凭证与路由状态，跳转由调用方决定，以便保留回跳地址
     */
    const resetCredentials = (): void => {
      invalidateSession()
      accessToken.value = ''
      expiresAt.value = 0
    }

    /**
     * @description 本地清理会话并跳转登录页；主动登出必须先调用后端撤销接口
     * @param redirect 可选的站内回跳地址，自动到期时用于保留初始化恢复目标
     */
    const clearSession = (redirect?: string): void => {
      resetCredentials()
      void router.replace({
        name: 'Login',
        query: redirect ? { redirect: getLoginRedirect(redirect) } : undefined
      })
    }

    /**
     * @description 保存已验证的当前用户资料
     */
    const setUserInfo = (value: UserInfo): void => {
      info.value = value
    }

    /**
     * @description 保存当前会话独立获取的按钮权限
     * @param value 后端返回的有效按钮权限标识
     */
    const setAuth = (value: string[]): void => {
      auth.value = value
    }

    /**
     * @description 设置语言偏好
     */
    const setLanguage = (lang: LanguageEnum): void => {
      language.value = lang
      setPageTitle(router.currentRoute.value)
    }

    /**
     * @description 设置用户搜索历史
     */
    const setSearchHistory = (list: AppRouteRecord[]): void => {
      searchHistory.value = list
    }

    /**
     * @description 根据当前标签页保存的归属 UUID 隔离标签页，仅在资料验证后更新归属
     */
    const checkAndClearWorktabs = (): void => {
      const userId = info.value.userId
      if (!userId) return
      const previousId = sessionStorage.getItem(StorageConfig.WORKTAB_OWNER_KEY)
      if (previousId !== userId) {
        const tabs = useWorktabStore()
        tabs.opened = []
        tabs.keepAliveExclude = []
        searchHistory.value = []
      }
      sessionStorage.setItem(StorageConfig.WORKTAB_OWNER_KEY, userId)
    }

    return {
      language,
      searchHistory,
      accessToken,
      expiresAt,
      info,
      auth,
      isLogin,
      getUserInfo,
      getSettingState,
      getWorktabState,
      hasValidSession,
      getSessionVersion,
      invalidateSession,
      setToken,
      resetCredentials,
      clearSession,
      setUserInfo,
      setAuth,
      setLanguage,
      setSearchHistory,
      checkAndClearWorktabs
    }
  },
  {
    persist: {
      key: StorageConfig.USER_KEY,
      storage: localStorage,
      pick: ['accessToken', 'expiresAt', 'language', 'searchHistory']
    }
  }
)
