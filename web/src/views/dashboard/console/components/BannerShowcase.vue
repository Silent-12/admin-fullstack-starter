<!-- 横幅组件示例展示 -->
<template>
  <div class="banner-showcase">
    <!-- AoBasicBanner 使用示例：带流星效果与主题渐变背景 -->
    <AoBasicBanner
      class="banner-showcase__basic"
      box-style="banner-showcase__basic-box"
      height="12rem"
      title="欢迎使用 Ao Design Pro"
      subtitle="一款兼具设计美学与高效开发的后台管理系统模板"
      :meteor-config="{ enabled: true, count: 12 }"
      :button-config="{
        show: true,
        text: '开始体验',
        color: 'var(--ao-gray-100)',
        textColor: 'var(--theme-color)',
        radius: '6px'
      }"
      @click="handleBannerClick"
      @button-click="handleBannerButtonClick"
    />

    <!-- AoCardBanner 使用示例：带主按钮与取消按钮 -->
    <AoCardBanner
      class="banner-showcase__card"
      height="auto"
      :image="cardImage"
      title="组件化开发"
      description="基于 Vue3 组合式 API 与 Element Plus，提供丰富的业务组件示例。"
      :button="{
        show: true,
        text: '查看文档',
        color: 'var(--theme-color)',
        textColor: 'var(--ao-gray-100)'
      }"
      :cancel-button="{
        show: true,
        text: '稍后再看',
        color: 'var(--ao-gray-100)',
        textColor: 'var(--ao-gray-700)'
      }"
      @click="handleCardConfirm"
      @cancel="handleCardCancel"
    />
  </div>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  // 卡片横幅展示用的插图
  import cardImage from '@imgs/draw/draw1.png'

  /**
   * @description 基础横幅整体点击处理
   */
  const handleBannerClick = (): void => {
    ElMessage.info('点击了基础横幅区域')
  }

  /**
   * @description 基础横幅按钮点击处理
   */
  const handleBannerButtonClick = (): void => {
    ElMessage.success('开始体验 Ao Design Pro！')
  }

  /**
   * @description 卡片横幅主按钮点击处理
   */
  const handleCardConfirm = (): void => {
    ElMessage.success('已为您打开文档页面')
  }

  /**
   * @description 卡片横幅取消按钮点击处理
   */
  const handleCardCancel = (): void => {
    ElMessage.warning('已忽略，可稍后查看')
  }
</script>

<style scoped lang="scss">
  // 横幅展示容器
  .banner-showcase {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    margin-bottom: 1.25rem;
  }

  // 基础横幅主题渐变背景（boxStyle 类名透传到子组件根节点，需用 :deep 穿透）
  :deep(.banner-showcase__basic-box) {
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--theme-color) 85%, var(--ao-black)) 0%,
      color-mix(in srgb, var(--theme-color) 60%, var(--ao-login-banner-dark)) 100%
    ) !important;
  }

  // 卡片横幅自适应高度修正
  :deep(.banner-showcase__card) {
    height: auto !important;
    padding-top: 1.5rem;
  }
</style>
