<template>
  <div class="page-content exception-page">
    <div class="exception-inner">
      <ThemeSvg :src="data.imgUrl" size="100%" class="exception-img" />
      <div class="exception-text">
        <p class="exception-desc">{{ data.desc }}</p>
        <ElButton type="primary" size="large" @click="backHome" class="exception-btn">{{
          data.btnText
        }}</ElButton>
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

  const { homePath } = useCommon()

  const backHome = () => {
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
    width: 25rem !important;
  }

  .exception-text {
    width: 18.75rem;
    margin-left: 3.75rem;
    @media (width <= 47.99rem) {
      width: 100%;
      margin-top: 2.5rem;
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
    margin-top: 1.25rem;
  }
</style>
