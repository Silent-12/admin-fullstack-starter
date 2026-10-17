<!-- 403页面 -->
<template>
  <AoException
    :data="{
      title: '403',
      desc: $t('exceptionPage.403'),
      btnText: $t('exceptionPage.gohome'),
      imgUrl
    }"
  />
</template>

<script setup lang="ts">
  import imgUrl from '@imgs/svg/403.svg'
  import AoException from '../components/AoException.vue'

  defineOptions({ name: 'Exception403' })
</script>
