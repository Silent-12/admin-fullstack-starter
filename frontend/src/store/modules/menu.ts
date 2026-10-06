/**
 * 多系统菜单状态管理。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AppRouteRecord } from '@/types/router'
import { findApplicationByPath, getFirstMenuPath } from '@/utils/navigation/route'

/**
 * @description 管理业务系统列表、当前系统与当前侧栏菜单。
 * @return Pinia 菜单状态实例。
 */
export const useMenuStore = defineStore('menuStore', () => {
  const applicationList = ref<AppRouteRecord[]>([])
  const currentApplication = ref<AppRouteRecord | null>(null)
  /** 菜单列表 */
  const menuList = ref<AppRouteRecord[]>([])
  /** 菜单宽度 */
  const menuWidth = ref('')
  /** 首页路径 */
  const homePath = ref('')

  /**
   * @description 设置完整业务系统列表，并根据当前地址激活对应系统。
   * @param list 一级业务系统路由列表。
   * @param path 当前访问路径。
   * @return 无返回值。
   */
  const setApplicationList = (list: AppRouteRecord[], path: string): void => {
    applicationList.value = list
    activateApplication(path)
  }

  /**
   * @description 根据地址切换当前业务系统及其侧栏菜单。
   * @param path 当前访问路径。
   * @return 当前激活的业务系统，无匹配时返回 undefined。
   */
  const activateApplication = (path: string): AppRouteRecord | undefined => {
    const application =
      findApplicationByPath(applicationList.value, path) || applicationList.value[0]
    if (!application) {
      currentApplication.value = null
      menuList.value = []
      homePath.value = ''
      return undefined
    }

    currentApplication.value = application
    menuList.value = application.children || []
    homePath.value = getFirstMenuPath(menuList.value)
    return application
  }

  /**
   * @description 获取当前业务系统首页地址。
   * @return 当前系统首页地址。
   */
  const getHomePath = (): string => homePath.value

  /**
   * @description 设置当前系统首页地址。
   * @param path 首页地址。
   * @return 无返回值。
   */
  const setHomePath = (path: string): void => {
    homePath.value = path
  }

  /**
   * @description 清空业务系统与菜单状态。
   * @return 无返回值。
   */
  const clearApplications = (): void => {
    applicationList.value = []
    currentApplication.value = null
    menuList.value = []
    homePath.value = ''
  }

  return {
    applicationList,
    currentApplication,
    menuList,
    menuWidth,
    setApplicationList,
    activateApplication,
    getHomePath,
    setHomePath,
    clearApplications
  }
})
