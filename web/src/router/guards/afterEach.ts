import { nextTick } from 'vue'
import type { Router } from 'vue-router'
import NProgress from 'nprogress'
import { useCommon } from '@ao/admin-layout'
import { loadingService } from '@/utils/ui'
import { getPendingLoading, resetPendingLoading } from './beforeEach'

/**
 * @description 注册路由全局后置守卫，处理滚动位置、进度条与加载状态。
 * @param router Vue Router 实例。
 * @return 无返回值。
 */
export function setupAfterEachGuard(router: Router): void {
  const { scrollToTop } = useCommon()

  router.afterEach(() => {
    scrollToTop()

    // 关闭进度条
    NProgress.done()
    // 确保进度条完全移除，避免残影
    setTimeout(() => {
      NProgress.remove()
    }, 600)

    // 关闭 loading 效果
    if (getPendingLoading()) {
      nextTick(() => {
        loadingService.hideLoading()
        resetPendingLoading()
      })
    }
  })
}
