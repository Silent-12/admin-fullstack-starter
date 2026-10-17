<!-- 卡片横幅组件 -->
<template>
  <div class="ao-card-sm card-banner" :style="{ height: height }">
    <div class="card-banner-inner">
      <div class="banner-image-wrap">
        <img :src="image" :alt="title" class="banner-image" />
      </div>
      <div class="banner-text">
        <p class="banner-title">{{ title }}</p>
        <p class="banner-desc">{{ description }}</p>
      </div>
      <div class="banner-actions">
        <div
          v-if="cancelButton?.show"
          class="banner-btn banner-btn-cancel"
          :style="{
            backgroundColor: cancelButton?.color,
            color: cancelButton?.textColor
          }"
          @click="handleCancel"
        >
          {{ cancelButton?.text }}
        </div>
        <div
          v-if="button?.show"
          class="banner-btn banner-btn-primary"
          :style="{ backgroundColor: button?.color, color: button?.textColor }"
          @click="handleClick"
        >
          {{ button?.text }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  // 导入默认图标
  import defaultIcon from '@imgs/draw/draw1.png'

  defineOptions({ name: 'AoCardBanner' })

  // 定义卡片横幅组件的属性接口
  interface CardBannerProps {
    /** 高度 */
    height?: string
    /** 图片路径 */
    image?: string
    /** 标题文本 */
    title: string
    /** 描述文本 */
    description: string
    /** 主按钮配置 */
    button?: {
      /** 是否显示 */
      show?: boolean
      /** 按钮文本 */
      text?: string
      /** 背景颜色 */
      color?: string
      /** 文字颜色 */
      textColor?: string
    }
    /** 取消按钮配置 */
    cancelButton?: {
      /** 是否显示 */
      show?: boolean
      /** 按钮文本 */
      text?: string
      /** 背景颜色 */
      color?: string
      /** 文字颜色 */
      textColor?: string
    }
  }

  // 定义组件属性默认值
  withDefaults(defineProps<CardBannerProps>(), {
    height: '384px',
    image: defaultIcon,
    title: '',
    description: '',
    // 主按钮默认配置
    button: () => ({
      show: true,
      text: '查看详情',
      color: 'var(--theme-color)',
      textColor: '#fff'
    }),
    // 取消按钮默认配置
    cancelButton: () => ({
      show: false,
      text: '取消',
      color: '#f5f5f5',
      textColor: '#666'
    })
  })

  // 定义组件事件
  const emit = defineEmits<{
    (e: 'click'): void // 主按钮点击事件
    (e: 'cancel'): void // 取消按钮点击事件
  }>()

  // 主按钮点击处理函数
  const handleClick = () => {
    emit('click')
  }

  // 取消按钮点击处理函数
  const handleCancel = () => {
    emit('cancel')
  }
</script>

<style scoped lang="scss">
  // 卡片横幅容器
  .card-banner {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-bottom: 24px;
  }

  // 内部布局容器
  .card-banner-inner {
    display: flex;
    flex-direction: column;
    gap: 16px;
    align-items: center;
    text-align: center;
  }

  // 图片容器
  .banner-image-wrap {
    width: 180px;
  }

  // 图片元素
  .banner-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  // 文本区域
  .banner-text {
    box-sizing: border-box;
    padding-right: 16px;
    padding-left: 16px;
  }

  // 标题文本
  .banner-title {
    margin-bottom: 8px;
    font-size: 1.125rem;
    font-weight: 600;
    line-height: 1.75rem;
    color: var(--ao-gray-800);
  }

  // 描述文本
  .banner-desc {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.25rem;
    color: var(--ao-gray-600);
  }

  // 操作按钮容器
  .banner-actions {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  // 按钮通用样式
  .banner-btn {
    display: inline-block;
    height: 36px;
    padding-right: 12px;
    padding-left: 12px;
    font-size: 0.875rem;
    line-height: 36px;
    cursor: pointer;
    user-select: none;
    border-radius: 6px;
  }

  // 取消按钮（带边框）
  .banner-btn-cancel {
    border-color: var(--ao-gray-300);
    border-width: 1px;
  }
</style>
