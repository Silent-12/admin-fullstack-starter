import App from './App.vue'
import { createApp, toRef } from 'vue'
import { useUserStore } from './store/modules/user'
import { AdminComponents } from '@ao/admin-components'
import { AdminLayout, useSettingStore } from '@ao/admin-layout'
// 组件包样式：SFC scoped 样式编译产物，需与全局样式一同引入
import '@ao/admin-components/styles.css'
// 布局包样式底座：主题变量 / 布局骨架类 / 暗色与切换动画
import '@ao/admin-layout/styles.css'
import logoUrl from '@imgs/common/logo.webp'

// Store
import { initStore } from './store'
import { useMenuStore } from './store/modules/menu'
import { router } from './router'
// Router
import { initRouter } from './router'
// 多语言
import language from './locales'
// 全局样式
import '@styles/index.scss'
// 全局配置
import AppConfig from '@/config'
import { LanguageEnum } from '@/enums'
// 自定义指令
import { setupGlobDirectives } from './directives'
// 全局错误处理
import { setupErrorHandle } from './utils/sys/errorHandle'

// 收集宿主本地 SVG 资源，注入组件包供 AoSvgIcon 解析（图标名以连字符表示目录层级）
const localSvgModules = import.meta.glob('@/assets/svg/**/*.svg', {
  eager: true,
  query: '?url',
  import: 'default'
}) as Record<string, string>

/**
 * @description 按图标名解析宿主本地 SVG 资源地址。
 * @param icon 图标名称，使用连字符表示 SVG 目录层级。
 * @return 本地 SVG URL，未找到时返回 undefined。
 */
const resolveLocalSvg = (icon: string): string | undefined => {
  const relativePath = `${icon.split('-').join('/')}.svg`
  return Object.entries(localSvgModules).find(([path]) =>
    path.endsWith(`/assets/svg/${relativePath}`)
  )?.[1]
}

// 解决 Element Plus 等组件库在移动端触摸滚动时的兼容性问题
document.addEventListener('touchstart', function () {}, { passive: false })

const app = createApp(App)
initStore(app)
const userLanguage = useUserStore().language
const globalLocale = language.global.locale
if (typeof globalLocale === 'string') {
  language.global.locale = userLanguage
} else {
  globalLocale.value = userLanguage
}
initRouter(app)
setupGlobDirectives(app)
setupErrorHandle(app)

app.use(language)
// 公共组件包：注册 v-loading 指令、合并包语言包、注入权限与本地资源解析
app.use(AdminComponents, {
  i18n: language,
  getAuthList: () => useUserStore().info?.auth,
  resolveLocalSvg,
  assets: { logo: logoUrl }
})
// 布局包：注入菜单数据、语言与系统配置；用户信息与登出属业务域，由本项目经 #user-avatar 插槽自行渲染
const menuStore = useMenuStore()

/**
 * @description 同步 vue-i18n 全局 locale（兼容 legacy / composition 两种取值形态）。
 * @param lang 目标语言。
 */
const setI18nLocale = (lang: string) => {
  const globalLocale = language.global.locale
  if (typeof globalLocale === 'string') {
    language.global.locale = lang
  } else {
    globalLocale.value = lang
  }
}

app.use(AdminLayout, {
  i18n: language,
  router,
  menuSource: () => ({
    menuList: menuStore.menuList,
    applicationList: menuStore.applicationList,
    currentApplication: menuStore.currentApplication,
    homePath: menuStore.getHomePath()
  }),
  language: toRef(useUserStore(), 'language'),
  onLanguageChange: (lang: string) => {
    setI18nLocale(lang)
    useUserStore().setLanguage(lang as LanguageEnum)
    useSettingStore().reload()
  },
  config: { systemName: AppConfig.systemInfo.name ?? undefined }
})
app.mount('#app')
