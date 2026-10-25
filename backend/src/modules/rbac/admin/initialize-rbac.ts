import { In } from 'typeorm'
import type { EntityManager } from 'typeorm'
import { DataSource } from 'typeorm'
import { SYSTEM_BUTTON_PERMISSIONS } from '../../../common/constants/admin-permission.constant.js'
import { AdminInitError } from '../../../common/errors/admin-init.error.js'
import { isBuiltinAdmin } from '../../auth/admin/admin-user.util.js'
import { AdminUser } from '../../auth/admin/entities/admin-user.entity.js'
import { AdminRole } from './entities/admin-role.entity.js'
import { AdminPermissionResource } from './entities/admin-permission-resource.entity.js'
import { AdminUserRole } from './entities/admin-user-role.entity.js'
import { AdminRoleResource } from './entities/admin-role-resource.entity.js'
import { AdminResourceApi } from './entities/admin-resource-api.entity.js'

// 内置数据使用固定 UUID v4 常量：编译期即可被代码引用，重复初始化按主键幂等写入。
// 取值刻意保持无序，避免从 ID 推断资源层级或创建顺序；改动这些常量等价于重建内置数据。
/** 内置管理员角色 UUID，同时作为授权配置事务互斥行 */
export const SUPER_ROLE_ID = '0b572fce-5e72-43bb-afc2-f38189f4372a'
/** 内置系统目录 UUID */
export const SYSTEM_RESOURCE_ID = 'dfe9650a-b7df-46b7-a730-b9fa7f0cd7b3'

// 系统菜单与按钮使用固定 UUID，重复初始化按主键幂等写入。
const USER_MENU_ID = 'ed61a715-1773-4898-97e3-adae0b49d7db'
const ROLE_MENU_ID = 'a602cf57-cc28-4f55-abc2-b50940cb137c'
const MENU_MENU_ID = '51e8ae75-7742-4bde-84ba-ff2c4087efd8'
const API_MENU_ID = 'caf6d636-484d-4341-84e9-7cab7a6be1ea'
const USER_CREATE_ID = '57f10d9b-f24f-4bb3-98ba-02286291c19a'
const USER_UPDATE_ID = '02cd7728-00be-44f2-ada3-b6ab482fb813'
const USER_DELETE_ID = 'b49af2fa-4325-4237-93c7-b327dbd57762'
const USER_RESET_PASSWORD_ID = '91f0aba7-7a3f-45f4-8c0c-b37b433fa773'
const ROLE_CREATE_ID = 'd301b2bf-8d99-4014-a736-8f909f85f8be'
const ROLE_UPDATE_ID = '720f1037-a1ca-4ec2-a460-aec45a3ace76'
const ROLE_DELETE_ID = 'ca60b746-d0b6-434f-8c1b-78c0322d5359'
const ROLE_GRANT_ID = 'dda867b6-6740-4e8e-8387-4a8985766355'
const MENU_CREATE_ID = '1b072bfb-ff50-4d71-adf0-8c74fd1f9544'
const MENU_UPDATE_ID = '71a3a958-9306-4a84-b775-98cca2443006'
const MENU_DELETE_ID = '1e0742c9-e1a1-444e-b7e8-f694a2a85422'
const API_UPDATE_ID = '7303d2dc-cbe6-4575-a9f9-23828a9cdede'

/** 路由结构与接口绑定受保护、仅允许编辑展示信息的内置资源 */
export const BUILTIN_RESOURCE_IDS = [
  SYSTEM_RESOURCE_ID,
  USER_MENU_ID,
  ROLE_MENU_ID,
  MENU_MENU_ID,
  API_MENU_ID,
  USER_CREATE_ID,
  USER_UPDATE_ID,
  USER_DELETE_ID,
  USER_RESET_PASSWORD_ID,
  ROLE_CREATE_ID,
  ROLE_UPDATE_ID,
  ROLE_DELETE_ID,
  ROLE_GRANT_ID,
  MENU_CREATE_ID,
  MENU_UPDATE_ID,
  MENU_DELETE_ID,
  API_UPDATE_ID,
]

/**
 * 内置资源种子
 * @description 描述需要幂等初始化的系统菜单与按钮资源
 */
interface ResourceSeed {
  id: string
  parentId: string | null
  type: 'directory' | 'menu' | 'button'
  title: string
  name: string | null
  path: string | null
  component: string | null
  permission: string | null
  sort: number
  apiCodes: string[]
}

// 菜单绑定页面级查询接口，按钮绑定操作接口；父资源不会向子资源隐式授予接口权限。
const RESOURCE_SEEDS: ResourceSeed[] = [
  {
    id: SYSTEM_RESOURCE_ID,
    parentId: null,
    type: 'directory',
    title: '系统管理',
    name: 'System',
    path: '/system',
    component: '/index/index',
    permission: null,
    sort: 100,
    apiCodes: [],
  },
  {
    id: USER_MENU_ID,
    parentId: SYSTEM_RESOURCE_ID,
    type: 'menu',
    title: '用户管理',
    name: 'SystemUser',
    path: 'user',
    component: '/system/user',
    permission: null,
    sort: 10,
    // 用户管理弹窗需要读取启用角色选项来绑定角色。
    apiCodes: ['system.users.list', 'system.users.detail', 'system.roles.options'],
  },
  {
    id: ROLE_MENU_ID,
    parentId: SYSTEM_RESOURCE_ID,
    type: 'menu',
    title: '角色管理',
    name: 'SystemRole',
    path: 'role',
    component: '/system/role',
    permission: null,
    sort: 20,
    apiCodes: ['system.roles.list', 'system.roles.options', 'system.roles.detail'],
  },
  {
    id: MENU_MENU_ID,
    parentId: SYSTEM_RESOURCE_ID,
    type: 'menu',
    title: '菜单管理',
    name: 'SystemMenu',
    path: 'menu',
    component: '/system/menu',
    permission: null,
    sort: 30,
    // 菜单管理弹窗需要可绑定接口目录来选择接口编码。
    apiCodes: ['system.menus.list', 'system.menus.detail', 'system.apis.tree'],
  },
  {
    id: API_MENU_ID,
    parentId: SYSTEM_RESOURCE_ID,
    type: 'menu',
    title: '接口资源',
    name: 'SystemApiResources',
    path: 'api-resources',
    component: '/system/api-resources',
    permission: null,
    sort: 40,
    apiCodes: ['system.apis.list', 'system.apis.tree'],
  },
  {
    id: USER_CREATE_ID,
    parentId: USER_MENU_ID,
    type: 'button',
    title: '新增用户',
    name: null,
    path: null,
    component: null,
    permission: SYSTEM_BUTTON_PERMISSIONS.userCreate,
    sort: 10,
    apiCodes: ['system.users.create'],
  },
  {
    id: USER_UPDATE_ID,
    parentId: USER_MENU_ID,
    type: 'button',
    title: '编辑用户',
    name: null,
    path: null,
    component: null,
    permission: SYSTEM_BUTTON_PERMISSIONS.userUpdate,
    sort: 20,
    apiCodes: ['system.users.update'],
  },
  {
    id: USER_DELETE_ID,
    parentId: USER_MENU_ID,
    type: 'button',
    title: '删除用户',
    name: null,
    path: null,
    component: null,
    permission: SYSTEM_BUTTON_PERMISSIONS.userDelete,
    sort: 30,
    apiCodes: ['system.users.delete'],
  },
  {
    id: USER_RESET_PASSWORD_ID,
    parentId: USER_MENU_ID,
    type: 'button',
    title: '重置密码',
    name: null,
    path: null,
    component: null,
    permission: SYSTEM_BUTTON_PERMISSIONS.userResetPassword,
    sort: 40,
    apiCodes: ['system.users.password.reset'],
  },
  {
    id: ROLE_CREATE_ID,
    parentId: ROLE_MENU_ID,
    type: 'button',
    title: '新增角色',
    name: null,
    path: null,
    component: null,
    permission: SYSTEM_BUTTON_PERMISSIONS.roleCreate,
    sort: 10,
    apiCodes: ['system.roles.create'],
  },
  {
    id: ROLE_UPDATE_ID,
    parentId: ROLE_MENU_ID,
    type: 'button',
    title: '编辑角色',
    name: null,
    path: null,
    component: null,
    permission: SYSTEM_BUTTON_PERMISSIONS.roleUpdate,
    sort: 20,
    apiCodes: ['system.roles.update'],
  },
  {
    id: ROLE_DELETE_ID,
    parentId: ROLE_MENU_ID,
    type: 'button',
    title: '删除角色',
    name: null,
    path: null,
    component: null,
    permission: SYSTEM_BUTTON_PERMISSIONS.roleDelete,
    sort: 30,
    apiCodes: ['system.roles.delete'],
  },
  {
    id: ROLE_GRANT_ID,
    parentId: ROLE_MENU_ID,
    type: 'button',
    title: '授权角色',
    name: null,
    path: null,
    component: null,
    permission: SYSTEM_BUTTON_PERMISSIONS.roleGrant,
    sort: 40,
    // 角色授权抽屉需要读取资源列表，因此授权按钮同时授予菜单资源列表查询接口。
    apiCodes: ['system.roles.resources.read', 'system.roles.resources.assign', 'system.menus.list'],
  },
  {
    id: MENU_CREATE_ID,
    parentId: MENU_MENU_ID,
    type: 'button',
    title: '新增菜单',
    name: null,
    path: null,
    component: null,
    permission: SYSTEM_BUTTON_PERMISSIONS.menuCreate,
    sort: 10,
    apiCodes: ['system.menus.create'],
  },
  {
    id: MENU_UPDATE_ID,
    parentId: MENU_MENU_ID,
    type: 'button',
    title: '编辑菜单',
    name: null,
    path: null,
    component: null,
    permission: SYSTEM_BUTTON_PERMISSIONS.menuUpdate,
    sort: 20,
    apiCodes: ['system.menus.update'],
  },
  {
    id: MENU_DELETE_ID,
    parentId: MENU_MENU_ID,
    type: 'button',
    title: '删除菜单',
    name: null,
    path: null,
    component: null,
    permission: SYSTEM_BUTTON_PERMISSIONS.menuDelete,
    sort: 30,
    apiCodes: ['system.menus.delete'],
  },
  {
    id: API_UPDATE_ID,
    parentId: API_MENU_ID,
    type: 'button',
    title: '修改接口展示',
    name: null,
    path: null,
    component: null,
    permission: SYSTEM_BUTTON_PERMISSIONS.apiUpdate,
    sort: 10,
    apiCodes: ['system.apis.update'],
  },
]

/** 内置资源种子绑定的接口编码，启动时与真实路由定义交叉校验 */
export const SEED_API_CODES = [...new Set(RESOURCE_SEEDS.flatMap((seed) => seed.apiCodes))].sort()

/**
 * 初始化权限基础数据
 * @description 并发安全地创建内置角色与系统菜单按钮资源；内置角色是系统兜底权限，始终拥有全部有效资源且不允许人工编辑，
 * 每次启动都会恢复缺失或软删除的种子接口绑定与资源授权
 * @param source 已连接且包含权限实体的数据源，或调用方持有的事务管理器
 * @param adminId 可信初始化流程指定的内置管理员 UUID，缺省时不分配账号
 */
export async function initializeRbac(source: DataSource | EntityManager, adminId?: string): Promise<void> {
  const initialize = async (manager: EntityManager): Promise<void> => {
    await ensureRbacSeed(manager)
    if (adminId) await bindBuiltinAdmin(manager, adminId)
  }
  if (source instanceof DataSource) await source.transaction(initialize)
  else await initialize(source)
}

/**
 * 初始化权限种子数据
 * @description 以悲观锁串行化内置角色写入，幂等恢复角色、系统菜单按钮、接口绑定与全量授权
 * @param manager 事务管理器
 */
export async function ensureRbacSeed(manager: EntityManager): Promise<void> {
  const now = Math.floor(Date.now() / 1000)
  await manager
    .createQueryBuilder()
    .insert()
    .into(AdminRole)
    .values({
      id: SUPER_ROLE_ID,
      code: 'super_admin',
      name: '内置管理员',
      description: '内置管理员角色，始终拥有全部后台资源且不允许人工编辑',
      enabled: true,
      isBuiltin: true,
      createTime: now,
      updateTime: now,
      createdBy: 'system',
      updatedBy: 'system',
      isDeleted: 0,
    })
    .orIgnore()
    .execute()
  const role = assertBuiltinRole(await manager.findOne(AdminRole, { where: { id: SUPER_ROLE_ID }, lock: { mode: 'pessimistic_write' } }))
  for (const seed of RESOURCE_SEEDS) {
    await manager
      .createQueryBuilder()
      .insert()
      .into(AdminPermissionResource)
      .values({
        id: seed.id,
        parentId: seed.parentId,
        type: seed.type,
        title: seed.title,
        name: seed.name,
        path: seed.path,
        component: seed.component,
        icon: null,
        permission: seed.permission,
        enabled: true,
        sort: seed.sort,
        hidden: false,
        keepAlive: false,
        createTime: now,
        updateTime: now,
        createdBy: 'system',
        updatedBy: 'system',
        isDeleted: 0,
      })
      .orIgnore()
      .execute()
    const saved = await manager.findOneBy(AdminPermissionResource, { id: seed.id })
    if (
      saved?.type !== seed.type ||
      saved.parentId !== seed.parentId ||
      saved.name !== seed.name ||
      saved.path !== seed.path ||
      saved.component !== seed.component ||
      saved.isDeleted !== 0 ||
      !saved.enabled
    ) {
      throw new AdminInitError('内置系统资源状态异常')
    }
  }
  const bindings = RESOURCE_SEEDS.flatMap((seed) => seed.apiCodes.map((apiCode) => ({ resourceId: seed.id, apiCode })))
  if (bindings.length) {
    // 复合主键行被软删除后 INSERT IGNORE 不会恢复，必须按种子精确配对恢复。
    await manager.update(
      AdminResourceApi,
      bindings.map((binding) => ({ ...binding, isDeleted: 1 })),
      { isDeleted: 0, updateTime: now, updatedBy: 'system' },
    )
    await manager
      .createQueryBuilder()
      .insert()
      .into(AdminResourceApi)
      .values(
        bindings.map((binding) => ({
          ...binding,
          createTime: now,
          updateTime: now,
          createdBy: 'system',
          updatedBy: 'system',
          isDeleted: 0,
        })),
      )
      .orIgnore()
      .execute()
  }
  // 内置角色是系统兜底权限，每次初始化都恢复全量资源授权，不接受人工撤销。
  await grantAllResources(manager, role.id, now)
}

/**
 * 绑定内置管理员到内置角色
 * @description 与权限种子写入保持“内置角色 → 用户”的全局锁序；已软删除的绑定复用原行恢复
 * @param manager 事务管理器
 * @param adminId 内置管理员 UUID
 */
export async function bindBuiltinAdmin(manager: EntityManager, adminId: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000)
  const role = assertBuiltinRole(await manager.findOne(AdminRole, { where: { id: SUPER_ROLE_ID }, lock: { mode: 'pessimistic_write' } }))
  const admin = await manager.findOne(AdminUser, { where: { id: adminId, isDeleted: 0 }, lock: { mode: 'pessimistic_write' } })
  if (!admin) throw new AdminInitError('内置管理员不存在或已被删除，请人工处理')
  if (!isBuiltinAdmin(admin)) throw new AdminInitError('admin 账号不是内置管理员，请人工处理')
  if (!admin.enabled) throw new AdminInitError('内置管理员已被停用，请人工启用')
  // 内置管理员的角色绑定固定为初始化绑定，不允许通过用户接口增删。
  await bindAdminRole(manager, admin.id, role.id, now)
}

/**
 * 校验内置管理员角色状态
 * @description 角色被停用、软删除或编码、内置标记被篡改时终止初始化，避免发放兜底权限
 * @param role 内置角色行
 * @returns 校验通过的内置角色
 */
function assertBuiltinRole(role: AdminRole | null): AdminRole {
  if (role?.code !== 'super_admin' || !role.isBuiltin || role.isDeleted !== 0 || !role.enabled) {
    throw new AdminInitError('内置管理员角色状态异常')
  }
  return role
}

async function activeResourceIds(manager: EntityManager): Promise<string[]> {
  const resources = await manager.find(AdminPermissionResource, { where: { isDeleted: 0 }, select: { id: true } })
  return resources.map((resource) => resource.id)
}

/**
 * 授予内置角色全部有效资源
 * @description 恢复已软删除的授权，并为尚未授权的有效资源创建关系
 * @param manager 事务管理器
 * @param roleId 内置角色 ID
 * @param now 当前 Unix 秒时间戳
 */
async function grantAllResources(manager: EntityManager, roleId: string, now: number): Promise<void> {
  const resourceIds = await activeResourceIds(manager)
  if (!resourceIds.length) return
  await manager.update(
    AdminRoleResource,
    { roleId, isDeleted: 1, resourceId: In(resourceIds) },
    { isDeleted: 0, updateTime: now, updatedBy: 'system' },
  )
  const existing = new Set(
    (await manager.find(AdminRoleResource, { where: { roleId }, select: { resourceId: true } })).map((row) => row.resourceId),
  )
  const missing = resourceIds.filter((resourceId) => !existing.has(resourceId))
  if (!missing.length) return
  await manager.insert(
    AdminRoleResource,
    missing.map((resourceId) => ({
      roleId,
      resourceId,
      createTime: now,
      updateTime: now,
      createdBy: 'system',
      updatedBy: 'system',
      isDeleted: 0,
    })),
  )
}

/**
 * 绑定管理员到内置角色
 * @description 已存在的软删除绑定恢复为未删除，避免重复创建关系
 * @param manager 事务管理器
 * @param userId 管理员用户 ID
 * @param roleId 内置角色 ID
 * @param now 当前 Unix 秒时间戳
 */
async function bindAdminRole(manager: EntityManager, userId: string, roleId: string, now: number): Promise<void> {
  const existing = await manager.findOneBy(AdminUserRole, { userId, roleId })
  if (existing) {
    if (existing.isDeleted !== 0) {
      await manager.update(AdminUserRole, { userId, roleId }, { isDeleted: 0, updateTime: now, updatedBy: 'system' })
    }
    return
  }
  await manager.insert(AdminUserRole, {
    userId,
    roleId,
    createTime: now,
    updateTime: now,
    createdBy: 'system',
    updatedBy: 'system',
    isDeleted: 0,
  })
}
