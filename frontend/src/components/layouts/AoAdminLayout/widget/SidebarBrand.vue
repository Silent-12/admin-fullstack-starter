<!-- 侧栏顶部品牌：系统 logo 与系统名称 -->
<!-- 由 AoAdminLayout 经 #sidebar-header 插槽注入；折叠态（64px 宽）只保留 logo，展开态显示系统名称 -->
<template>
  <div class="sidebar-brand">
    <AoLogo class="logo" :size="36" />
    <span v-if="menuOpen" class="name" :style="{ color: theme.systemNameColor }">
      {{ systemName }}
    </span>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { AoLogo } from '@ao/admin-components'
  import type { SidebarHeaderSlotProps } from '@ao/admin-layout'
  import AppConfig from '@/config'

  defineOptions({ name: 'SidebarBrand' })

  // 插槽上下文：菜单折叠态与当前菜单主题，由布局包回传
  defineProps<SidebarHeaderSlotProps>()

  /** 系统名称，取自全局配置 */
  const systemName = computed(() => AppConfig.systemInfo.name)
</script>

<style scoped lang="scss">
  .sidebar-brand {
    display: flex;
    align-items: center;
    min-width: 0;

    // 系统名称：超出宽度时省略，不与 logo 抢位
    .name {
      min-width: 0;
      margin-left: 10px;
      font-size: 18px;
      @include ellipsis;
    }
  }
</style>
