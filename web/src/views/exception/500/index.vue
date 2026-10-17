<!-- 500页面 -->
<template>
  <AoException
    :data="{
      title: '500',
      desc: $t('exceptionPage.500'),
      btnText: $t('exceptionPage.gohome'),
      imgUrl
    }"
  />
</template>

<script setup lang="ts">
  import imgUrl from '@imgs/svg/500.svg'
  import AoException from '../components/AoException.vue'

  defineOptions({ name: 'Exception500' })
</script>
