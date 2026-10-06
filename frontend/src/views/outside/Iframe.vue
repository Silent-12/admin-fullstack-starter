<template>
  <div class="iframe-container" v-loading="isLoading">
    <iframe :src="iframeUrl" frameborder="0" class="iframe-view" @load="handleIframeLoad"></iframe>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { useRoute } from 'vue-router'
  defineOptions({ name: 'IframeView' })

  const route = useRoute()
  const isLoading = ref(true)
  const iframeUrl = computed(() => String(route.meta.link || ''))

  /**
   * @description 处理 iframe 加载完成事件并隐藏加载状态。
   * @return 无返回值。
   */
  const handleIframeLoad = (): void => {
    isLoading.value = false
  }
</script>

<style scoped lang="scss">
  /* iframe 外层容器 */
  .iframe-container {
    box-sizing: border-box;
    width: 100%;
    height: 100%;
  }

  /* iframe 元素：铺满容器并保留底部留白 */
  .iframe-view {
    width: 100%;
    height: 100%;
    min-height: var(--ao-full-height);
    border: none;
  }
</style>
