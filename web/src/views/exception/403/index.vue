<!-- 403页面 -->
<template>
  <AoException
    :data="{
      title: '403',
      desc: $t('exceptionPage.403'),
      btnText: $t('exceptionPage.gohome'),
      imgUrl
    }"
  >
    <template #action="{ backHome, homePath }">
      <ElButton v-if="homePath" type="primary" size="large" @click="backHome">返回首页</ElButton>
      <ElButton v-else type="primary" size="large" @click="relogin">重新登录</ElButton>
      <ElButton v-if="homePath" size="large" @click="relogin">重新登录</ElButton>
    </template>
  </AoException>
</template>

<script setup lang="ts">
  import { ElButton } from 'element-plus'
  import { useUserStore } from '@/store/modules/user'
  import imgUrl from '@imgs/svg/403.svg'
  import AoException from '../components/AoException.vue'

  defineOptions({ name: 'Exception403' })

  /**
   * @description 清除当前会话并返回登录页，避免无授权菜单用户被 403 循环困住
   * @return 无返回值。
   */
  const relogin = (): void => {
    useUserStore().clearSession()
  }
</script>
