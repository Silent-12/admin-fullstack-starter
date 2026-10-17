<!-- 授权页右上角组件 -->
<template>
  <div class="auth-top-bar">
    <div class="logo-section">
      <AoLogo class="icon" size="46" />
      <h1 class="logo-title">{{ AppConfig.systemInfo.name }}</h1>
    </div>

    <div class="actions">
      <div class="color-picker-expandable">
        <div class="color-dots">
          <div
            v-for="(color, index) in mainColors"
            :key="color"
            class="color-dot"
            :class="{ active: color === systemThemeColor }"
            :style="{ background: color, '--index': index }"
            @click="changeThemeColor(color)"
          >
            <AoSvgIcon v-if="color === systemThemeColor" icon="ri:check-fill" class="check-icon" />
          </div>
        </div>
        <div class="btn palette-btn">
          <AoSvgIcon icon="ri:palette-line" class="palette-icon" />
        </div>
      </div>
      <ElDropdown
        v-if="shouldShowLanguage"
        @command="changeLanguage"
        popper-class="langDropDownStyle"
      >
        <div class="btn language-btn">
          <AoSvgIcon icon="ri:translate-2" class="translate-icon" />
        </div>
        <template #dropdown>
          <ElDropdownMenu>
            <div v-for="lang in languageOptions" :key="lang.value" class="lang-btn-item">
              <ElDropdownItem
                :command="lang.value"
                :class="{ 'is-selected': locale === lang.value }"
              >
                <span class="menu-txt">{{ lang.label }}</span>
                <AoSvgIcon
                  icon="ri:check-fill"
                  class="lang-check-icon"
                  v-if="locale === lang.value"
                />
              </ElDropdownItem>
            </div>
          </ElDropdownMenu>
        </template>
      </ElDropdown>
      <div v-if="shouldShowThemeToggle" class="btn theme-btn" @click="themeAnimation">
        <AoSvgIcon :icon="isDark ? 'ri:sun-fill' : 'ri:moon-line'" class="theme-icon" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { AoLogo, AoSvgIcon } from '@ao/admin-components'
  import { storeToRefs } from 'pinia'
  import { ElDropdown, ElDropdownItem, ElDropdownMenu } from 'element-plus'
  import { useI18n } from 'vue-i18n'
  import { useSettingStore } from '@ao/admin-layout'
  import { useUserStore } from '@/store/modules/user'
  import { useHeaderBar } from '@ao/admin-layout'
  import { themeAnimation } from '@/utils/ui/animation'
  import { languageOptions } from '@/locales'
  import { LanguageEnum } from '@/enums'
  import AppConfig from '@/config'

  defineOptions({ name: 'AuthTopBar' })

  const settingStore = useSettingStore()
  const userStore = useUserStore()
  const { isDark, systemThemeColor } = storeToRefs(settingStore)
  const { shouldShowThemeToggle, shouldShowLanguage } = useHeaderBar()
  const { locale } = useI18n()

  const mainColors = AppConfig.systemMainColor
  const color = systemThemeColor // css v-bind 使用

  const changeLanguage = (lang: LanguageEnum) => {
    if (locale.value === lang) return
    locale.value = lang
    userStore.setLanguage(lang)
  }

  const changeThemeColor = (color: string) => {
    if (systemThemeColor.value === color) return
    settingStore.setElementTheme(color)
    settingStore.reload()
  }
</script>

<style scoped lang="scss">
  .auth-top-bar {
    position: absolute;
    top: 1.125rem;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: flex-end !important;
    width: 100%;
    @media (width <= 1180px) {
      justify-content: space-between !important;
    }
  }

  .logo-section {
    display: none !important;
    align-items: center;
    justify-content: center;
    margin-left: 0.5rem;
    @media (width <= 1180px) {
      display: flex !important;
    }
    @media (width <= 39.99rem) {
      margin-left: 1.5rem;
    }
  }

  .logo-title {
    margin-left: 0.5rem;
    font-size: 1.25rem;
    line-height: 1.75rem;
  }

  .actions {
    display: flex;
    gap: 0.375rem;
    align-items: center;
    justify-content: center;
    margin-right: 0.5rem;
    @media (width <= 39.99rem) {
      margin-right: 1.25rem;
    }
  }

  .color-picker-expandable {
    position: relative;
    display: flex;
    align-items: center;
    @media (width <= 39.99rem) {
      display: none !important;
    }
  }

  .color-dots {
    position: absolute;
    top: 0;
    right: 0;
    display: flex;
    gap: 0.5rem;
    align-items: center;
    padding: 0.5rem 2.25rem 0.5rem 0.625rem;
    pointer-events: none;
    backdrop-filter: blur(10px);
    border-radius: 9999px;
    box-shadow: 0 2px 12px var(--ao-gray-300);
    opacity: 0;
    transition:
      opacity 0.3s ease,
      transform 0.3s ease;
    transform: translateX(10px);
  }

  .color-dot {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    cursor: pointer;
    border-radius: 9999px;
    box-shadow: 0 2px 4px var(--ao-shadow-15);
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    transition-delay: calc(var(--index) * 0.05s);
    transform: translateX(20px) scale(0.8);
  }

  .color-dot:hover {
    box-shadow: 0 4px 8px var(--ao-shadow-20);
    transform: translateX(0) scale(1.1);
  }

  .color-picker-expandable:hover .color-dots {
    pointer-events: auto;
    opacity: 1;
    transform: translateX(0);
  }

  .color-picker-expandable:hover .color-dot {
    opacity: 1;
    transform: translateX(0) scale(1);
  }

  .dark .color-dots {
    background-color: var(--ao-gray-200);
    box-shadow: none;
  }

  .check-icon {
    color: var(--ao-white);
  }

  .palette-btn {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    cursor: pointer;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 300ms;
    transition-property: all;
  }

  // 语言按钮
  .language-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    cursor: pointer;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 300ms;
    transition-property: all;
  }

  // 主题按钮
  .theme-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    cursor: pointer;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 300ms;
    transition-property: all;
  }

  // 调色板图标
  .palette-icon {
    font-size: 1.25rem;
    line-height: 1.75rem;
    color: var(--ao-gray-800);
    transition-duration: 300ms;
    transition-property:
      color, background-color, border-color, outline-color, text-decoration-color, fill, stroke;
  }

  // 翻译图标
  .translate-icon {
    font-size: 19px;
    color: var(--ao-gray-800);
    transition-duration: 300ms;
    transition-property:
      color, background-color, border-color, outline-color, text-decoration-color, fill, stroke;
  }

  // 语言勾选图标
  .lang-check-icon {
    font-size: 1rem;
    line-height: 1.5rem;
  }

  // 主题切换图标
  .theme-icon {
    font-size: 1.25rem;
    line-height: 1.75rem;
    color: var(--ao-gray-800);
    transition-duration: 300ms;
    transition-property:
      color, background-color, border-color, outline-color, text-decoration-color, fill, stroke;
  }

  // 调色板按钮 hover 时图标颜色（v-bind 主题色）
  .color-picker-expandable:hover .palette-btn :deep(.ao-svg-icon) {
    color: v-bind(color);
  }
</style>
