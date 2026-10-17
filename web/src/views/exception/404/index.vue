<!-- 404页面 -->
<template>
  <AoException
    :data="{
      title: '404',
      desc: $t('exceptionPage.404'),
      btnText: $t('exceptionPage.gohome'),
      imgUrl
    }"
  />
</template>

<script setup lang="ts">
  import imgUrl from '@imgs/svg/404.svg'
  import AoException from '../components/AoException.vue'

  defineOptions({ name: 'Exception404' })
</script>
