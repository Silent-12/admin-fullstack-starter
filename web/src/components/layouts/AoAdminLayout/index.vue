<!-- Admin 布局宿主：把模板自有业务内容（侧栏品牌、顶部栏用户菜单）注入布局包的插槽 -->
<!-- 布局骨架、侧栏、头部、内容区、worktab 等均由 @ao/admin-layout 提供，本组件只负责插槽内容装配 -->
<template>
  <AppLayout>
    <!-- 侧栏顶部品牌区：回传菜单折叠态与菜单主题，供品牌内容适配折叠态与配色 -->
    <template #sidebar-header="{ menuOpen, theme }">
      <SidebarBrand :menu-open="menuOpen" :theme="theme" />
    </template>

    <!-- 顶部栏右侧用户头像区：头像、用户信息与登出由模板自行持有 -->
    <template #user-avatar>
      <UserMenu />
    </template>
  </AppLayout>
</template>

<script setup lang="ts">
  import { AppLayout } from '@ao/admin-layout'
  import SidebarBrand from './widget/SidebarBrand.vue'
  import UserMenu from './widget/UserMenu.vue'

  defineOptions({ name: 'AoAdminLayout' })
</script>
