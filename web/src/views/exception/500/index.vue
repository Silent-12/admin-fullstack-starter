<!-- 500页面 -->
<template>
  <AoException
    :data="{
      title: '500',
      desc: recoveryTarget
        ? '后台初始化失败，请重试；若问题持续，请联系管理员。'
        : $t('exceptionPage.500'),
      btnText: $t('exceptionPage.gohome'),
      imgUrl
    }"
  >
    <template v-if="recoveryTarget" #action>
      <ElButton type="primary" size="large" :loading="loading" @click="retryInitialization">
        重试进入
      </ElButton>
    </template>
  </AoException>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { ElButton } from 'element-plus'
  import { getLoginRedirect } from '@/utils/navigation/login'
  import imgUrl from '@imgs/svg/500.svg'
  import AoException from '../components/AoException.vue'

  defineOptions({ name: 'Exception500' })

  const route = useRoute()
  const router = useRouter()

  // 初始化恢复目标与提交状态
  const recoveryTarget = computed(() =>
    typeof route.query.redirect === 'string' ? getLoginRedirect(route.query.redirect) : undefined
  )
  const loading = ref(false)

  /**
   * @description 重新进入原目标路由，由守卫恢复初始化或在凭证失效时转入登录
   */
  const retryInitialization = async (): Promise<void> => {
    if (loading.value || !recoveryTarget.value) return
    loading.value = true
    try {
      await router.replace(recoveryTarget.value)
    } finally {
      loading.value = false
    }
  }
</script>
