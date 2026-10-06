/// <reference types="vite/client" />

/**
 * Vite 环境变量声明
 * @description 定义构建期可读取的业务路由来源配置。
 */
interface ImportMetaEnv {
  // 应用版本
  readonly VITE_APP_VERSION: string
  // 业务路由来源：本地静态路由或后端动态路由
  readonly VITE_ROUTE_SOURCE: 'static' | 'dynamic'
}

declare module 'nprogress'

declare module 'vue-img-cutter'

declare module 'file-saver'
