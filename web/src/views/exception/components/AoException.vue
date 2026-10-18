<template>
  <div class="page-content exception-page">
    <div class="exception-inner">
      <ThemeSvg :src="data.imgUrl" size="100%" class="exception-img" />
      <div class="exception-text">
        <p class="exception-desc">{{ data.desc }}</p>
        <div class="exception-btn">
          <slot name="action" :back-home="backHome" :home-path="homePath">
            <ElButton type="primary" size="large" @click="backHome">{{ data.btnText }}</ElButton>
          </slot>
          <slot name="extra" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useRouter } from 'vue-router'
  import { ElButton } from 'element-plus'
  import { useCommon } from '@ao/admin-layout'
  import { useUserStore } from '@/store/modules/user'

  const router = useRouter()
  const userStore = useUserStore()

  interface ExceptionData {
    /** 标题 */
    title: string
    /** 描述 */
    desc: string
    /** 按钮文本 */
    btnText: string
    /** 图片地址 */
    imgUrl: string
  }

  withDefaults(
    defineProps<{
      data: ExceptionData
    }>(),
    {}
  )

  defineSlots<{
    // 自定义主操作按钮，透传返回首页行为
    action?: (props: { backHome: () => void; homePath: string }) => unknown
    // 次要操作
    extra?: () => unknown
  }>()

  const { homePath } = useCommon()

  /**
   * @description 返回首页，未登录时跳转登录页并保留目标地址
   * @return 无返回值。
   */
  const backHome = (): void => {
    const targetHomePath = homePath.value || '/'

    if (!userStore.isLogin) {
      router.push({
        name: 'Login',
        query: { redirect: targetHomePath }
      })
      return
    }

    router.push(targetHomePath)
  }
</script>

<style scoped lang="scss">
  .exception-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: transparent !important;
    border: 0 !important;
  }

  .exception-inner {
    display: flex;
    align-items: center;
    justify-content: center;
    @media (width <= 47.99rem) {
      display: block !important;
      text-align: center;
    }
  }

  .exception-img {
    width: 400px !important;
  }

  .exception-text {
    width: 300px;
    margin-left: 60px;
    @media (width <= 47.99rem) {
      width: 100%;
      margin-top: 40px;
      margin-right: auto;
      margin-left: auto;
      text-align: center;
    }
  }

  .exception-desc {
    font-size: 1.25rem;
    line-height: 1.75rem;
    color: var(--ao-gray-600);
    @media (width <= 47.99rem) {
      font-size: 1.125rem;
      line-height: 1.75rem;
    }
  }

  .exception-btn {
    margin-top: 20px;
  }
</style>
