/** 角色管理页私有类型定义 */

import type { RoleListItem } from '@/types/api/system-manage'

/** 角色列表项类型别名 */
export type { RoleListItem }

/** 角色编辑弹窗 Props */
export interface RoleEditDialogProps {
  /** 弹窗是否可见 */
  modelValue: boolean
  /** 弹窗类型 */
  dialogType: 'add' | 'edit'
  /** 角色数据（编辑时传入） */
  roleData?: RoleListItem
}

/** 角色编辑弹窗 Emits */
export interface RoleEditDialogEmits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}

/** 菜单权限弹窗 Props */
export interface RolePermissionDialogProps {
  /** 弹窗是否可见 */
  modelValue: boolean
  /** 角色数据 */
  roleData?: RoleListItem
}

/** 菜单权限弹窗 Emits */
export interface RolePermissionDialogEmits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}

/** 菜单树节点类型 */
export interface MenuNode {
  id?: string | number
  name?: string
  label?: string
  meta?: {
    title?: string
    authList?: Array<{
      authMark: string
      title: string
      checked?: boolean
    }>
  }
  children?: MenuNode[]
  [key: string]: any
}
