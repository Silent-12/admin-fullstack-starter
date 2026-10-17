/**
 * 用户状态管理模块
 *
 * 提供用户相关的状态管理
 *
 * ## 主要功能
 *
 * - 用户登录状态管理
 * - 用户信息存储
 * - 访问令牌和刷新令牌管理
 * - 语言设置
 * - 搜索历史记录
 * - 登出清理逻辑
 *
 * ## 使用场景
 *
 * - 用户登录和认证
 * - 权限验证
 * - 个人信息展示
 * - 多语言切换
 * - 搜索历史管理
 *
 * ## 持久化
 *
 * - 使用 localStorage 存储
 * - 存储键：user
 * - 登出时自动清理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { LanguageEnum } from '@/enums'
import { router } from '@/router'
import { useSettingStore } from '@ao/admin-layout'
import { useWorktabStore } from '@ao/admin-layout'
import { AppRouteRecord } from '@/types/router'
import type { UserInfo } from '@/types/api/auth'
import { setPageTitle } from '@/utils/router'
import { resetRouterState } from '@/router/guards/beforeEach'
import { useMenuStore } from './menu'
import { StorageConfig } from '@/utils/storage/storageConfig'

/**
 * 用户状态管理
 * 管理用户登录状态、个人信息、语言设置和搜索历史等
 */
export const useUserStore = defineStore(
  'userStore',
  () => {
    // 语言设置
    const language = ref(LanguageEnum.ZH)
    // 登录状态
    const isLogin = ref(false)
    // 用户信息
    const info = ref<Partial<UserInfo>>({})
    // 搜索历史记录
    const searchHistory = ref<AppRouteRecord[]>([])
    // 访问令牌
    const accessToken = ref('')
    // 刷新令牌
    const refreshToken = ref('')
    // 仅在内存中区分会话，防止旧请求影响重新登录后的状态
    let sessionVersion = 0

    /**
     * @description 获取当前会话版本，供异步请求和路由初始化校验归属。
     * @return 当前页面内的会话版本。
     */
    const getSessionVersion = (): number => sessionVersion

    // 计算属性：获取用户信息
    const getUserInfo = computed(() => info.value)
    // 计算属性：获取设置状态
    const getSettingState = computed(() => useSettingStore().$state)
    // 计算属性：获取工作台状态
    const getWorktabState = computed(() => useWorktabStore().$state)

    /**
     * 设置用户信息
     * @param newInfo 新的用户信息
     */
    const setUserInfo = (newInfo: UserInfo) => {
      info.value = newInfo
    }

    /**
     * 设置登录状态
     * @param status 登录状态
     */
    const setLoginStatus = (status: boolean) => {
      isLogin.value = status
    }

    /**
     * 设置语言
     * @param lang 语言枚举值
     */
    const setLanguage = (lang: LanguageEnum) => {
      setPageTitle(router.currentRoute.value)
      language.value = lang
    }

    /**
     * 设置搜索历史
     * @param list 搜索历史列表
     */
    const setSearchHistory = (list: AppRouteRecord[]) => {
      searchHistory.value = list
    }

    /**
     * @description 设置登录令牌并重置业务路由，使上一会话的异步操作失效，即使新旧令牌相同。
     * @param newAccessToken 访问令牌
     * @param newRefreshToken 刷新令牌（可选）
     */
    const setToken = (newAccessToken: string, newRefreshToken?: string) => {
      sessionVersion++
      accessToken.value = newAccessToken
      if (newRefreshToken) {
        refreshToken.value = newRefreshToken
      }
      resetRouterState()
    }

    /**
     * @description 清空登录态和路由状态并替换为登录页，同一账号重新登录时保留工作台标签页。
     * @return 无返回值。
     */
    const logOut = () => {
      sessionVersion++
      // 保存当前用户 ID，用于下次登录时判断是否为同一用户
      const currentUserId = info.value.userId
      if (currentUserId) {
        localStorage.setItem(StorageConfig.LAST_USER_ID_KEY, String(currentUserId))
      }

      // 清空用户信息
      info.value = {}
      // 重置登录状态
      isLogin.value = false
      // 清空访问令牌
      accessToken.value = ''
      // 清空刷新令牌
      refreshToken.value = ''
      // 注意：不清空工作台标签页，等下次登录时根据用户判断
      // 清空主页路径
      useMenuStore().setHomePath('')
      // 重置路由状态
      resetRouterState()
      // 不携带错误页地址，避免重新登录后再次进入异常页面
      void router.replace({ name: 'Login' })
    }

    /**
     * 检查并清理工作台标签页
     * 如果不是同一用户登录，清空工作台标签页
     * 应在登录成功后调用
     */
    const checkAndClearWorktabs = () => {
      const lastUserId = localStorage.getItem(StorageConfig.LAST_USER_ID_KEY)
      const currentUserId = info.value.userId

      // 无法获取当前用户 ID，跳过检查
      if (!currentUserId) return

      // 首次登录或缓存已清除，保留现有标签页
      if (!lastUserId) {
        return
      }

      // 不同用户登录，清空工作台标签页
      if (String(currentUserId) !== lastUserId) {
        const worktabStore = useWorktabStore()
        worktabStore.opened = []
        worktabStore.keepAliveExclude = []
      }

      // 清除临时存储
      localStorage.removeItem(StorageConfig.LAST_USER_ID_KEY)
    }

    return {
      language,
      isLogin,
      info,
      searchHistory,
      accessToken,
      refreshToken,
      getSessionVersion,
      getUserInfo,
      getSettingState,
      getWorktabState,
      setUserInfo,
      setLoginStatus,
      setLanguage,
      setSearchHistory,
      setToken,
      logOut,
      checkAndClearWorktabs
    }
  },
  {
    persist: {
      key: 'user',
      storage: localStorage
    }
  }
)
