/**
 * 系统管理按钮标识
 * @description 初始化种子写入内置菜单按钮资源，授权完全由启用角色显式绑定的资源决定，后端不再按标识做特权过滤
 */
export const SYSTEM_BUTTON_PERMISSIONS = {
  userCreate: 'system.user.create',
  userUpdate: 'system.user.update',
  userDelete: 'system.user.delete',
  userResetPassword: 'system.user.resetPassword',
  roleCreate: 'system.role.create',
  roleUpdate: 'system.role.update',
  roleDelete: 'system.role.delete',
  roleGrant: 'system.role.grant',
  menuCreate: 'system.menu.create',
  menuUpdate: 'system.menu.update',
  menuDelete: 'system.menu.delete',
  apiUpdate: 'system.api.update',
}
