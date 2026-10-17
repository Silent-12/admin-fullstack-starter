/** 菜单管理页私有类型定义 */

import type { AppRouteRecord } from '@/types/router'

/** 菜单表单数据类型（页面 index.vue 使用） */
export interface MenuFormData {
  name: string
  path: string
  component?: string
  icon?: string
  roles?: string[]
  sort?: number
  [key: string]: unknown
}

/** 菜单弹窗表单数据类型 */
export interface MenuDialogFormData {
  menuType: 'menu' | 'button'
  id: number
  name: string
  path: string
  label: string
  component: string
  icon: string
  isEnable: boolean
  sort: number
  isMenu: boolean
  keepAlive: boolean
  isHide: boolean
  isHideTab: boolean
  link: string
  isIframe: boolean
  showBadge: boolean
  showTextBadge: string
  fixedTab: boolean
  activePath: string
  roles: string[]
  isFullPage: boolean
  authName: string
  authLabel: string
  authIcon: string
  authSort: number
}

/** 权限按钮编辑数据类型 */
export interface AuthEditData {
  title: string
  authMark: string
}

/** 菜单弹窗组件 Props */
export interface MenuDialogProps {
  /** 弹窗是否可见（支持 v-model 双向绑定） */
  modelValue: boolean
  /** 编辑时的原始数据（菜单为路由记录，按钮为权限数据） */
  editData?: AppRouteRecord | AuthEditData
  /** 菜单类型 */
  type?: 'menu' | 'button'
  /** 是否锁定菜单类型切换 */
  lockType?: boolean
}

/** 菜单弹窗组件 Emits */
export interface MenuDialogEmits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'submit', data: MenuDialogFormData): void
}
