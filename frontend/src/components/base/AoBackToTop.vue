<!-- 返回顶部按钮 -->
<template>
  <Transition
    enter-active-class="backtop-enter-active"
    leave-active-class="backtop-leave-active"
    enter-from-class="backtop-enter-from"
    enter-to-class="backtop-enter-to"
    leave-from-class="backtop-leave-from"
    leave-to-class="backtop-leave-to"
  >
    <div v-show="showButton" class="back-to-top" @click="scrollToTop">
      <AoSvgIcon icon="ri:arrow-up-wide-line" class="back-to-top-icon" />
    </div>
  </Transition>
</template>

<script setup lang="ts">
  import { onMounted, ref, watch } from 'vue'
  import { useScroll } from '@vueuse/core'
  import { useCommon } from '@ao/admin-layout'

  defineOptions({ name: 'AoBackToTop' })

  const { scrollToTop } = useCommon()

  const showButton = ref(false)
  const scrollThreshold = 300

  onMounted(() => {
    const scrollContainer = document.getElementById('app-main')
    if (scrollContainer) {
      const { y } = useScroll(scrollContainer)
      watch(y, (newY: number) => {
        showButton.value = newY > scrollThreshold
      })
    }
  })
</script>

<style scoped lang="scss">
  // 返回顶部按钮容器
  .back-to-top {
    position: fixed;
    right: 2.5rem;
    bottom: 3.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.375rem;
    height: 2.375rem;
    cursor: pointer;
    border: 1px solid var(--ao-gray-300);
    border-radius: 0.375rem;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 300ms;
    transition-property: all;
    &:hover {
      background: var(--ao-gray-200);
    }
  }

  // 按钮内图标
  .back-to-top-icon {
    font-size: 1.125rem;
    line-height: 1.75rem;
    color: var(--ao-gray-500);
  }

  // 进入过渡
  .backtop-enter-active {
    transition: all 300ms cubic-bezier(0, 0, 0.2, 1);
  }

  // 离开过渡
  .backtop-leave-active {
    transition: all 200ms cubic-bezier(0.4, 0, 1, 1);
  }

  // 进入起点 / 离开终点（透明 + 下移 0.5rem）
  .backtop-enter-from,
  .backtop-leave-to {
    opacity: 0;
    transform: translateY(0.5rem);
  }

  // 进入终点 / 离开起点（不透明 + 原位）
  .backtop-enter-to,
  .backtop-leave-from {
    opacity: 1;
    transform: translateY(0);
  }
</style>
