<template>
  <ElImage
    v-bind="{ ...props, ...$attrs }"
    class="ao-image"
    :preview-src-list="props.previewSrcList ?? (props.src ? [props.src] : [])"
    :hide-on-click-modal="props.hideOnClickModal ?? true"
  >
    <template #placeholder>
      <slot name="placeholder">
        <div class="ao-image__placeholder" aria-hidden="true">
          <ElIcon class="ao-image__status-icon ao-image__loading">
            <Loading />
          </ElIcon>
        </div>
      </slot>
    </template>

    <template #error>
      <slot name="error">
        <div class="ao-image__error" aria-hidden="true">
          <ElIcon class="ao-image__status-icon ao-image__error-icon">
            <PictureFilled />
          </ElIcon>
        </div>
      </slot>
    </template>

    <template v-if="$slots.viewer" #viewer>
      <slot name="viewer" />
    </template>
    <template v-if="$slots.progress" #progress="scope">
      <slot name="progress" v-bind="scope" />
    </template>
    <template v-if="$slots.toolbar" #toolbar="scope">
      <slot name="toolbar" v-bind="scope" />
    </template>
    <template v-if="$slots['viewer-error']" #viewer-error="scope">
      <slot name="viewer-error" v-bind="scope" />
    </template>
  </ElImage>
</template>

<script setup lang="ts">
  import { ElIcon, ElImage, type ImageProps } from 'element-plus'
  import { Loading, PictureFilled } from '@element-plus/icons-vue'

  defineOptions({
    name: 'AoImage',
    inheritAttrs: false
  })

  const props = defineProps<ImageProps>()
</script>

<style scoped lang="scss">
  .ao-image {
    &__placeholder,
    &__error {
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      min-height: 2.5rem;
      padding: 0.5rem;
      color: var(--ao-gray-600);
      background-color: var(--ao-gray-200);
    }

    &__placeholder {
      color: var(--el-color-primary);
    }

    &__status-icon {
      font-size: 1.25rem;
    }

    &__loading {
      animation: ao-image-loading 1.2s linear infinite;
    }

    &__error-icon {
      color: var(--ao-error);
    }
  }

  @keyframes ao-image-loading {
    from {
      transform: rotate(0deg);
    }

    to {
      transform: rotate(360deg);
    }
  }
</style>
