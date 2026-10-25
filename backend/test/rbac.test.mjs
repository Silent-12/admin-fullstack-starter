import 'reflect-metadata'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { All, Controller, Get, Patch } from '@nestjs/common'
import { MetadataScanner } from '@nestjs/core'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { randomUUID } from 'node:crypto'
import { AdminApi } from '../dist/common/auth/admin-api.decorator.js'
import { ApiResourceService } from '../dist/modules/api-resource/admin/api-resource.service.js'
import { AdminAuthorizationService } from '../dist/modules/rbac/admin/services/admin-authorization.service.js'
import { AdminResourceService } from '../dist/modules/rbac/admin/services/admin-resource.service.js'
import { AdminRoleService } from '../dist/modules/rbac/admin/services/admin-role.service.js'
import { AdminUserService } from '../dist/modules/rbac/admin/services/admin-user.service.js'
import { RbacQueryDto, UpdateResourceDto, UpdateRoleDto, UpdateUserDto } from '../dist/modules/rbac/admin/dto/rbac.dto.js'
import { ADMIN_ROUTE_POLICY } from '../dist/common/constants/admin-route.constant.js'
import { SYSTEM_BUTTON_PERMISSIONS } from '../dist/common/constants/admin-permission.constant.js'
import { BUILTIN_RESOURCE_IDS, SEED_API_CODES, SUPER_ROLE_ID, initializeRbac } from '../dist/modules/rbac/admin/initialize-rbac.js'

function audit(actorId) {
  const now = Math.floor(Date.now() / 1000)
  return {
    actorId,
    now,
    create: () => ({ createTime: now, updateTime: now, createdBy: actorId, updatedBy: actorId, isDeleted: 0 }),
    update: () => ({ updateTime: now, updatedBy: actorId }),
  }
}

function store(source = {}) {
  return { mutate: async (actorId, operation) => operation(source.manager, audit(actorId)), ...source }
}

function declareController(path, entries) {
  class TestController {}
  Controller(path)(TestController)
  for (const [name, method, route, declaration] of entries) {
    Object.defineProperty(TestController.prototype, name, { value() {}, configurable: true })
    const descriptor = Object.getOwnPropertyDescriptor(TestController.prototype, name)
    method(route)(TestController.prototype, name, descriptor)
    if (declaration) AdminApi(declaration)(TestController.prototype, name, descriptor)
  }
  return TestController
}

function apiResources(controllers, rows = []) {
  const repository = {
    find: async () => rows,
    update: async ({ code }, values) => Object.assign(rows.find((row) => row.code === code), values),
  }
  return new ApiResourceService(
    { getControllers: () => controllers.map((metatype) => ({ metatype, instance: new metatype() })) },
    new MetadataScanner(),
    repository,
  )
}

const api = (code, extra = {}) => ({ code, module: '业务模块', feature: '查询功能', action: '读取', ...extra })
const authz = (resourceIds = [], apiCodes = [], isBuiltin = false) => ({ resourceIds, apiCodes, permissions: [], isBuiltin })

test('菜单列表仅返回页面需要的扁平字段与绑定数量，详情保留完整编辑配置', async () => {
  const rows = [
    { id: 'button', parentId: 'menu', type: 'button', enabled: false, sort: 0, createTime: 123, isDeleted: 0 },
    { id: 'menu', parentId: 'directory', type: 'menu', enabled: true, sort: 1 },
    { id: 'directory', parentId: null, type: 'directory', enabled: true, sort: 2 },
  ]
  Object.assign(rows[0], { title: '操作', name: null, path: null, permission: 'orders.edit', component: null, icon: null, hidden: false, keepAlive: false })
  const bindings = [{ resourceId: 'button', apiCode: 'orders.edit' }, { resourceId: 'button', apiCode: 'orders.read' }]
  const service = new AdminResourceService({
    getRepository: (entity) => ({
      find: async (query) => {
        assert.deepEqual(query.where, { isDeleted: 0 })
        if (entity.name === 'AdminPermissionResource') {
          assert.deepEqual(query.order, { sort: 'ASC', id: 'ASC' })
          return rows
        }
        assert.deepEqual(query.select, { resourceId: true })
        return bindings
      },
      findBy: async (query) => {
        assert.deepEqual(query, { resourceId: 'button', isDeleted: 0 })
        return bindings
      },
    }),
  }, { requireResource: async () => rows[0] }, {})
  const list = await service.listResources()
  assert.deepEqual(list.map(({ id, parentId }) => ({ id, parentId })), rows.map(({ id, parentId }) => ({ id, parentId })))
  assert.equal(list[0].enabled, false)
  assert.equal(list[0].apiCount, 2)
  assert.equal(list[1].apiCount, 0)
  for (const item of list) {
    assert.deepEqual(Object.keys(item).sort(), ['id', 'parentId', 'type', 'title', 'name', 'path', 'permission', 'enabled', 'sort', 'isBuiltin', 'apiCount'].sort())
  }
  const detail = await service.getResource('button')
  assert.deepEqual(detail.apiCodes, ['orders.edit', 'orders.read'])
  for (const field of ['component', 'icon', 'hidden', 'keepAlive']) assert.equal(detail[field], rows[0][field])
  assert.equal(Object.hasOwn(detail, 'apiCount'), false)
})

function authorizationService({ user = { id: 'user', enabled: true }, assignments = [{ roleId: 'role' }], roles, resources, grants, bindings = [] }) {
  const manager = {
    findOneBy: async (entity) => (entity.name === 'AdminUser' ? user : null),
    findBy: async (entity) => {
      if (entity.name === 'AdminUserRole') return assignments
      if (entity.name === 'AdminRole') return roles
      if (entity.name === 'AdminRoleResource') return grants.map((resourceId) => ({ resourceId, isDeleted: 0 }))
      if (entity.name === 'AdminResourceApi') return bindings
      return []
    },
    find: async (entity) => (entity.name === 'AdminPermissionResource' ? resources : []),
  }
  return new AdminAuthorizationService({ transaction: async (_isolation, callback) => callback(manager) })
}

test('授权只合并启用角色显式资源，不存在超级管理员旁路且系统按钮不再被过滤', async () => {
  const menu = { id: 'menu', enabled: true, parentId: null, type: 'menu', name: 'Orders', path: 'orders', permission: null }
  const editButton = { id: 'edit', enabled: true, parentId: 'menu', type: 'button', permission: 'orders.edit' }
  const systemButton = { id: 'system', enabled: true, parentId: 'menu', type: 'button', permission: SYSTEM_BUTTON_PERMISSIONS.userCreate }
  const service = authorizationService({
    roles: [{ id: 'role' }],
    resources: [menu, editButton, systemButton],
    grants: ['menu', 'edit', 'system'],
    bindings: [
      { resourceId: 'menu', apiCode: 'orders.list', isDeleted: 0 },
      { resourceId: 'system', apiCode: 'system.users.create', isDeleted: 0 },
    ],
  })
  const authorization = await service.getAuthorization('user')
  assert.equal(Object.hasOwn(authorization, 'isSuper'), false)
  assert.deepEqual(authorization.resourceIds, ['edit', 'menu', 'system'])
  assert.deepEqual(authorization.apiCodes, ['orders.list', 'system.users.create'])
  // 系统管理按钮与其他按钮同权：角色显式绑定即可获得，后端不再做特权过滤。
  assert.deepEqual(authorization.permissions, ['orders.edit', SYSTEM_BUTTON_PERMISSIONS.userCreate])
})

test('多角色资源取并集，停用或软删除的角色与资源不参与授权', async () => {
  const menu = { id: 'menu', enabled: true, parentId: null, type: 'menu', name: 'Orders', path: 'orders' }
  const detail = { id: 'detail', enabled: true, parentId: 'menu', type: 'button', permission: 'orders.detail' }
  const unioned = await authorizationService({
    assignments: [{ roleId: 'reader' }, { roleId: 'writer' }],
    roles: [{ id: 'reader' }, { id: 'writer' }],
    resources: [menu, detail],
    grants: ['menu', 'detail'],
  }).getAuthorization('user')
  assert.deepEqual(unioned.resourceIds, ['detail', 'menu'])
  assert.deepEqual(unioned.permissions, ['orders.detail'])

  // 数据库只返回启用且未删除角色；全部角色失效时授权为空。
  const withoutRoles = await authorizationService({
    roles: [],
    resources: [menu, detail],
    grants: ['menu', 'detail'],
  }).getAuthorization('user')
  assert.deepEqual(withoutRoles, { resourceIds: [], apiCodes: [], permissions: [], isBuiltin: false })

  // 软删除的资源不会出现在有效资源表内，即使历史授权行仍存在。
  const removedGrant = await authorizationService({
    roles: [{ id: 'role' }],
    resources: [menu],
    grants: ['menu', 'detail'],
  }).getAuthorization('user')
  assert.deepEqual(removedGrant.resourceIds, ['menu'])
})

test('停用或缺失祖先、停用用户立即阻断授权', async () => {
  const directory = { id: 'directory', enabled: false, parentId: null, type: 'directory' }
  const menu = { id: 'menu', enabled: true, parentId: 'directory', type: 'menu', name: 'Orders', path: 'orders' }
  const disabledAncestor = await authorizationService({
    roles: [{ id: 'role' }],
    resources: [directory, menu],
    grants: ['menu'],
  }).getAuthorization('user')
  assert.deepEqual(disabledAncestor.resourceIds, [])

  const missingAncestor = await authorizationService({
    roles: [{ id: 'role' }],
    resources: [menu],
    grants: ['menu'],
  }).getAuthorization('user')
  assert.deepEqual(missingAncestor.resourceIds, [])

  await assert.rejects(authorizationService({ user: null }).getAuthorization('user'), (error) => error.getStatus() === 401)
})

test('授权菜单只返回导航字段，按钮授权不会额外显示页面', async () => {
  const directory = { id: 'directory', enabled: true, parentId: null, type: 'directory', name: 'System', path: '/system', title: '系统管理' }
  const menu = {
    id: 'menu',
    enabled: true,
    parentId: 'directory',
    type: 'menu',
    name: 'SystemUser',
    path: 'user',
    component: '/system/user',
    title: '用户管理',
    hidden: false,
    keepAlive: false,
  }
  const button = { id: 'button', enabled: true, parentId: 'menu', type: 'button', permission: SYSTEM_BUTTON_PERMISSIONS.userCreate }
  const service = new AdminAuthorizationService({ getRepository: () => ({ find: async () => [directory, menu, button] }) })
  const menus = await service.getUserMenus({ resourceIds: ['button'], apiCodes: [], permissions: [] })
  assert.deepEqual(menus, [])

  const granted = await service.getUserMenus({ resourceIds: ['menu'], apiCodes: [], permissions: [] })
  assert.equal(granted.length, 1)
  assert.equal(granted[0].name, 'System')
  assert.equal(granted[0].meta.title, '系统管理')
  assert.equal(Object.hasOwn(granted[0].meta, 'authList'), false)
  assert.equal(granted[0].children[0].name, 'SystemUser')
  assert.equal(granted[0].children[0].meta.component, undefined)
})

test('角色选项只返回启用、未删除、非内置且不超出操作者范围的角色', async () => {
  let captured
  const rows = [
    { id: 'r1', code: 'reader', name: '只读', description: '忽略', enabled: true, isBuiltin: false },
    { id: 'r2', code: 'writer', name: '读写', description: '忽略', enabled: true, isBuiltin: false },
    { id: 'builtin', code: 'super_admin', name: '内置管理员', description: '忽略', enabled: true, isBuiltin: true },
  ]
  const repository = {
    find: async (options) => {
      captured = options
      // 模拟数据库按条件过滤：内置角色不能作为用户角色选项。
      return rows.filter((row) => (options.where.isBuiltin === false ? !row.isBuiltin : true))
    },
  }
  const grants = {
    findBy: async () => [
      { roleId: 'r1', resourceId: 'allowed', isDeleted: 0 },
      { roleId: 'r2', resourceId: 'outside', isDeleted: 0 },
    ],
  }
  const service = new AdminRoleService(
    { getRepository: (entity) => (entity.name === 'AdminRoleResource' ? grants : repository) },
    {},
  )
  const options = await service.roleOptions(authz(['allowed']))
  assert.deepEqual(captured.where, { enabled: true, isDeleted: 0, isBuiltin: false })
  assert.deepEqual(options, [{ id: 'r1', code: 'reader', name: '只读' }])
  // 系统兜底账号可分配全部启用普通角色。
  assert.deepEqual(await service.roleOptions(authz([], [], true)), [
    { id: 'r1', code: 'reader', name: '只读' },
    { id: 'r2', code: 'writer', name: '读写' },
  ])
})

test('删除角色软删除并释放唯一编码，授权与用户绑定同步软删除，内置角色禁止删除', async () => {
  const role = { id: 'role-1', code: 'reader', name: '只读', description: '', enabled: true, isBuiltin: false, isDeleted: 0 }
  const updates = []
  const manager = {
    save: async () => {},
    update: async (entity, criteria, values) => updates.push({ table: entity.name, criteria, values }),
  }
  const service = new AdminRoleService(
    { manager },
    { requireRole: async () => role, mutate: async (actorId, operation) => operation(manager, audit(actorId)) },
  )
  await service.deleteRole(role.id, 'actor')
  assert.equal(role.code, `deleted_${role.id}`)
  assert.ok(role.code.length <= 64)
  assert.equal(role.isDeleted, 1)
  assert.equal(role.enabled, false)
  assert.deepEqual(
    updates.map((item) => [item.table, item.criteria, item.values.isDeleted]),
    [
      ['AdminRoleResource', { roleId: 'role-1', isDeleted: 0 }, 1],
      ['AdminUserRole', { roleId: 'role-1', isDeleted: 0 }, 1],
    ],
  )

  const builtin = { ...role, code: 'super_admin', isBuiltin: true, isDeleted: 0 }
  const builtinService = new AdminRoleService(
    { manager },
    { requireRole: async () => builtin, mutate: async (actorId, operation) => operation(manager, audit(actorId)) },
  )
  await assert.rejects(builtinService.deleteRole('role-1', 'actor'), (error) => error.getStatus() === 400)
  await assert.rejects(builtinService.updateRole('role-1', { name: '改名' }, 'actor'), (error) => error.getStatus() === 400)
})

test('内置角色资源授权固定，委派角色管理只能操作自身授权范围', async () => {
  const builtin = { id: 'role-1', code: 'super_admin', isBuiltin: true, isDeleted: 0 }
  const builtinService = new AdminRoleService(
    { manager: {} },
    { requireRole: async () => builtin, mutate: async (actorId, operation) => operation({}, audit(actorId)) },
  )
  await assert.rejects(
    builtinService.setRoleResources('role-1', [], 'actor', authz()),
    (error) => error.getStatus() === 400,
  )

  const role = { id: 'role-2', code: 'reader', isBuiltin: false, isDeleted: 0 }
  const updates = []
  const inserts = []
  const manager = {
    countBy: async (_entity, where) => where.id.value.length,
    findBy: async (_entity, where) =>
      where.isDeleted === 0
        ? [{ roleId: 'role-2', resourceId: 'allowed', isDeleted: 0 }]
        : [
            { roleId: 'role-2', resourceId: 'allowed', isDeleted: 0 },
            { roleId: 'role-2', resourceId: 'revoked', isDeleted: 1 },
          ],
    update: async (entity, criteria, values) => updates.push({ table: entity.name, criteria, values }),
    insert: async (entity, values) => inserts.push({ table: entity.name, values }),
  }
  const service = new AdminRoleService(
    { manager },
    { requireRole: async () => role, mutate: async (actorId, operation) => operation(manager, audit(actorId)) },
  )
  await assert.rejects(
    service.setRoleResources('role-2', ['allowed', 'outside'], 'actor', authz(['allowed'])),
    (error) => error.getStatus() === 403,
  )
  await service.setRoleResources('role-2', ['allowed', 'revoked', 'added'], 'actor', authz(['allowed', 'revoked', 'added']))
  assert.deepEqual(updates.map((item) => [item.criteria, item.values.isDeleted]), [
    [{ roleId: 'role-2', resourceId: 'revoked' }, 0],
  ])
  assert.equal(inserts[0].values[0].resourceId, 'added')
})

test('内置管理员角色绑定不可修改，新分配内置角色被拒，已生效禁用绑定可保留', async () => {
  const protectedUser = { id: 'user-1', username: 'admin', createdBy: 'system', enabled: true, tokenVersion: 1, token: 'token', updateTime: 0, updatedBy: 'system' }
  const ordinaryUser = { ...protectedUser, id: 'user-2', username: 'ordinary', createdBy: 'actor' }
  const roleRows = [
    { id: 'kept', name: 'kept', isBuiltin: false, enabled: true, isDeleted: 0 },
    { id: 'added', name: 'added', isBuiltin: false, enabled: true, isDeleted: 0 },
    { id: 'disabled', name: 'disabled', isBuiltin: false, enabled: false, isDeleted: 0 },
    { id: 'removed', name: 'removed', isBuiltin: false, enabled: true, isDeleted: 0 },
    { id: SUPER_ROLE_ID, name: 'builtin', isBuiltin: true, enabled: true, isDeleted: 0 },
  ]
  const existingRows = []
  const updates = []
  const inserts = []
  const manager = {
    findBy: async (entity, where) => {
      if (entity.name === 'AdminUserRole') return existingRows
      if (entity.name === 'AdminRole') {
        const ids = where.id?.value ?? []
        return roleRows.filter((role) => ids.includes(role.id))
      }
      if (entity.name === 'AdminRoleResource') return []
      return []
    },
    update: async (entity, criteria, values) => updates.push({ table: entity.name, criteria, values }),
    insert: async (entity, values) => inserts.push({ table: entity.name, values }),
    save: async () => {},
  }
  const service = new AdminUserService(
    { manager },
    {
      requireUser: async (_manager, id) => (id === 'user-1' ? protectedUser : ordinaryUser),
      mutate: async (actorId, operation) => operation(manager, audit(actorId)),
    },
    { hash: async () => 'hash' },
  )

  // 内置管理员的角色绑定固定，权限由内置角色的不可编辑全量授权保证。
  existingRows.push({ userId: 'user-1', roleId: SUPER_ROLE_ID, isDeleted: 0 })
  await assert.rejects(service.updateUser('user-1', { roleIds: [] }, 'actor', authz()), (error) => error.getStatus() === 400)
  await assert.rejects(service.updateUser('user-1', { roleIds: [SUPER_ROLE_ID, 'added'] }, 'actor', authz()), (error) => error.getStatus() === 400)
  // 原样回传既有绑定属于无操作，允许保存其他资料。
  await service.updateUser('user-1', { roleIds: [SUPER_ROLE_ID], name: '改名' }, 'actor', authz())
  assert.deepEqual(updates, [])
  assert.deepEqual(inserts, [])

  // 普通用户不能新分配内置角色，也不能新分配禁用角色。
  existingRows.length = 0
  existingRows.push({ userId: 'user-2', roleId: 'removed', isDeleted: 0 })
  await assert.rejects(service.updateUser('user-2', { roleIds: ['removed', SUPER_ROLE_ID] }, 'actor', authz()), (error) => error.getStatus() === 400)
  await assert.rejects(service.updateUser('user-2', { roleIds: ['removed', 'disabled'] }, 'actor', authz()), (error) => error.getStatus() === 400)
  await assert.rejects(service.updateUser('user-2', { roleIds: ['removed', 'missing'] }, 'actor', authz()), (error) => error.getStatus() === 400)

  // 已生效的禁用角色绑定在编辑资料时原样保留。
  existingRows.length = 0
  existingRows.push({ userId: 'user-2', roleId: 'disabled', isDeleted: 0 })
  updates.length = 0
  inserts.length = 0
  await service.updateUser('user-2', { roleIds: ['disabled'], name: '改名' }, 'actor', authz())
  assert.deepEqual(updates, [])
  assert.deepEqual(inserts, [])
  // 移除绑定后成功，且不能以禁用角色重新恢复。
  await service.updateUser('user-2', { roleIds: [] }, 'actor', authz())
  assert.deepEqual(updates.map((item) => [item.criteria, item.values.isDeleted]), [[{ userId: 'user-2', roleId: 'disabled' }, 1]])
  existingRows[0].isDeleted = 1
  await assert.rejects(service.updateUser('user-2', { roleIds: ['disabled'] }, 'actor', authz()), (error) => error.getStatus() === 400)

  // 普通角色新增与软删除恢复仍复用原关联行。
  existingRows.length = 0
  existingRows.push({ userId: 'user-2', roleId: 'removed', isDeleted: 0 }, { userId: 'user-2', roleId: 'kept', isDeleted: 1 })
  updates.length = 0
  inserts.length = 0
  await service.updateUser('user-2', { roleIds: ['removed', 'kept', 'added'] }, 'actor', authz())
  assert.deepEqual(updates.map((item) => [item.criteria, item.values.isDeleted]), [[{ userId: 'user-2', roleId: 'kept' }, 0]])
  assert.equal(inserts[0].values.length, 1)
  assert.equal(inserts[0].values[0].roleId, 'added')

  await assert.rejects(service.deleteUser('user-1', 'actor'), (error) => error.getStatus() === 400)
  await assert.rejects(service.updateUser('user-1', { enabled: false }, 'actor', authz()), (error) => error.getStatus() === 400)

  existingRows.length = 0
  existingRows.push({ userId: 'user-2', roleId: 'disabled', isDeleted: 0 })
  updates.length = 0
  inserts.length = 0
  await service.deleteUser('user-2', 'actor')
  assert.deepEqual(
    updates.map((item) => [item.table, item.values.isDeleted]),
    [
      ['AdminUserRole', 1],
      ['AdminUser', 1],
    ],
  )
})

test('角色分配限制在操作者资源范围，不能借自定义角色提升权限', async () => {
  const user = { id: 'user-1', username: 'ordinary', createdBy: 'actor', enabled: true, tokenVersion: 1, token: null, updateTime: 0, updatedBy: 'actor' }
  const manager = {
    findBy: async (entity, where) => {
      if (entity.name === 'AdminUserRole') return []
      if (entity.name === 'AdminRole') {
        const ids = where.id?.value ?? []
        return [
          { id: 'higher', name: '高权限角色', isBuiltin: false, enabled: true, isDeleted: 0 },
          { id: 'same', name: '同范围角色', isBuiltin: false, enabled: true, isDeleted: 0 },
        ].filter((role) => ids.includes(role.id))
      }
      if (entity.name === 'AdminRoleResource') {
        if (where.isDeleted === 0) {
          const roleIds = where.roleId?.value ?? []
          return [
            { roleId: 'higher', resourceId: 'restricted', isDeleted: 0 },
            { roleId: 'same', resourceId: 'allowed', isDeleted: 0 },
          ].filter((grant) => roleIds.includes(grant.roleId))
        }
        return []
      }
      return []
    },
    update: async () => {},
    insert: async () => {},
    save: async () => {},
  }
  const service = new AdminUserService(
    { manager },
    {
      requireUser: async () => user,
      mutate: async (actorId, operation) => operation(manager, audit(actorId)),
    },
    { hash: async () => 'hash' },
  )
  await assert.rejects(
    service.updateUser('user-1', { roleIds: ['higher'] }, 'actor', authz(['allowed'])),
    (error) => error.getStatus() === 403,
  )
  await service.updateUser('user-1', { roleIds: ['same'] }, 'actor', authz(['allowed']))
})

test('软删除同名用户自动追加数字后缀，用户名仍满足登录规则', async () => {
  const inserted = []
  const manager = {
    create: (_entity, data) => data,
    find: async (entity) => (entity.name === 'AdminUser' ? [{ username: 'hlh' }, { username: 'hlh1' }] : []),
    findBy: async () => [],
    insert: async (_entity, values) => inserted.push(values),
  }
  const service = new AdminUserService(
    { manager },
    { mutate: async (actorId, operation) => operation(manager, audit(actorId)) },
    { hash: async () => 'hash' },
  )
  await service.createUser(
    {
      username: 'hlh',
      name: '同名用户',
      enabled: true,
      roleIds: [],
      password: 'SameNamePassword123',
    },
    'actor',
    authz(),
  )
  assert.equal(inserted[0].username, 'hlh2')
  assert.equal(inserted[0].createdBy, 'actor')
  assert.equal(Object.hasOwn(inserted[0], 'isDeletable'), false)
})

test('创建和编辑资源拒绝公共路由名称、非法路径及大小写碰撞，失败不产生写入', async () => {
  const root = { id: randomUUID(), parentId: null, type: 'directory', name: 'System', path: '/system', component: '/index/index', isDeleted: 0 }
  const menu = {
    id: randomUUID(),
    parentId: root.id,
    type: 'menu',
    name: 'Reports',
    path: 'reports',
    component: '/system/user',
    isDeleted: 0,
  }
  const writes = []
  const manager = {
    create: (_entity, data) => data,
    find: async () => structuredClone([root, menu]),
    findBy: async () => [],
    insert: async (...args) => writes.push(args),
    save: async (...args) => writes.push(args),
    countBy: async () => 0,
  }
  const service = new AdminResourceService(
    { manager },
    {
      mutate: async (actorId, operation) => operation(manager, audit(actorId)),
      requireResource: async (_manager, id) => structuredClone([root, menu].find((item) => item.id === id)),
    },
    { validateCodes() {} },
  )
  const invalid = [
    ...ADMIN_ROUTE_POLICY.reservedNames.map((name) => ({ name })),
    ...[':id(', ':id', 'a//b', 'a/', '/', '/a?x=1', '/a#hash', '/a%2Fb', '/a\\b', '/a/../b', '/a.*', '/路径'].map((path) => ({ path })),
    { path: '/SYSTEM/REPORTS' },
  ]
  for (const changes of invalid) {
    const input = {
      parentId: root.id,
      type: 'menu',
      title: '报表',
      name: 'NewReport',
      path: 'new-report',
      component: '/system/user',
      enabled: true,
      ...changes,
    }
    await assert.rejects(
      service.createResource(input, 'actor', authz()),
      (error) => error.getStatus() === (changes.path === '/SYSTEM/REPORTS' ? 409 : 400),
    )
    if (changes.path === '/SYSTEM/REPORTS') continue // 编辑自身保持同一路径不构成碰撞。
    await assert.rejects(service.updateResource(menu.id, changes, 'actor', authz()), (error) => error.getStatus() === 400)
  }
  await assert.rejects(
    service.createResource({
      type: 'directory',
      title: '目录',
      name: 'RootDirectory',
      path: 'relative',
      component: '/index/index',
      enabled: true,
    }, 'actor', authz()),
    (error) => error.getStatus() === 400,
  )
  assert.deepEqual(writes, [])
  assert.equal(menu.name, 'Reports')
  assert.equal(menu.path, 'reports')
})

test('删除资源时释放唯一值并软删除关联，重复路径仍由业务层拒绝', async () => {
  const root = { id: randomUUID(), parentId: null, type: 'directory', name: 'First', path: '/first', component: '/index/index', isDeleted: 0 }
  const other = { ...root, id: randomUUID(), name: 'Second', path: '/second' }
  const menu = {
    id: randomUUID(),
    parentId: root.id,
    type: 'menu',
    name: 'Existing',
    path: 'unique-page',
    component: '/system/user',
    permission: null,
    isDeleted: 0,
    enabled: true,
  }
  const updates = []
  const manager = {
    create: (_entity, data) => data,
    find: async () => structuredClone([root, other, menu]),
    findBy: async () => [],
    existsBy: async () => false,
    insert: async () => {},
    save: async () => {},
    update: async (entity, criteria, values) => updates.push({ table: entity.name, criteria, values }),
  }
  const service = new AdminResourceService(
    { manager },
    {
      mutate: async (actorId, operation) => operation(manager, audit(actorId)),
      requireResource: async (_manager, id) => [root, other, menu].find((item) => item.id === id),
    },
    { validateCodes() {} },
  )
  for (const path of ['unique-page', 'UNIQUE-PAGE']) {
    await assert.rejects(
      service.createResource({ ...menu, name: 'Another', parentId: other.id, path }, 'actor', authz()),
      (error) => error.getStatus() === 409,
    )
  }
  await service.deleteResource(menu.id, 'actor')
  const deleted = [root, other, menu].find((item) => item.id === menu.id)
  assert.equal(deleted.isDeleted, 1)
  assert.equal(deleted.path, null)
  assert.equal(deleted.name, null)
  assert.equal(deleted.permission, null)
  assert.deepEqual(updates.map((item) => [item.table, item.criteria, item.values.isDeleted]), [
    ['AdminRoleResource', { resourceId: menu.id, isDeleted: 0 }, 1],
    ['AdminResourceApi', { resourceId: menu.id, isDeleted: 0 }, 1],
  ])
})

test('内置资源不可修改路由结构、权限标识与启用状态，展示字段仍可调整', async () => {
  const root = {
    id: BUILTIN_RESOURCE_IDS[0],
    parentId: null,
    type: 'directory',
    name: 'System',
    path: '/system',
    component: '/index/index',
    permission: null,
    enabled: true,
    isDeleted: 0,
    title: '系统管理',
    sort: 100,
    hidden: false,
    keepAlive: false,
  }
  const menu = {
    id: BUILTIN_RESOURCE_IDS[1],
    parentId: root.id,
    type: 'menu',
    name: 'SystemUser',
    path: 'user',
    component: '/system/user',
    permission: null,
    enabled: true,
    isDeleted: 0,
    title: '用户管理',
    sort: 10,
    hidden: false,
    keepAlive: false,
  }
  const button = {
    id: BUILTIN_RESOURCE_IDS[5],
    parentId: menu.id,
    type: 'button',
    name: null,
    path: null,
    component: null,
    permission: SYSTEM_BUTTON_PERMISSIONS.userCreate,
    enabled: true,
    isDeleted: 0,
    title: '新增用户',
    sort: 10,
    hidden: false,
    keepAlive: false,
  }
  const resources = [root, menu, button]
  const saves = []
  const bindings = [{ resourceId: button.id, apiCode: 'system.users.create', isDeleted: 0 }]
  const manager = {
    find: async () => structuredClone(resources),
    findBy: async (entity, where) =>
      entity.name === 'AdminResourceApi' && where.resourceId === button.id
        ? bindings.filter((binding) => binding.isDeleted === 0)
        : [],
    countBy: async () => 0,
    insert: async () => {},
    save: async (_entity, value) => saves.push(value),
  }
  const service = new AdminResourceService(
    { manager },
    {
      mutate: async (actorId, operation) => operation(manager, audit(actorId)),
      requireResource: async (_manager, id) => resources.find((item) => item.id === id),
    },
    { validateCodes() {} },
  )
  for (const changes of [
    { permission: 'system.user.create.renamed' },
    { type: 'menu' },
    { parentId: null },
    { name: 'Renamed' },
    { path: '/renamed' },
    { component: '/renamed' },
    { enabled: false },
  ]) {
    await assert.rejects(service.updateResource(button.id, changes, 'actor', authz()), (error) => error.getStatus() === 400)
  }
  // 内置资源的接口绑定是系统权限定义，即使内置管理员也不能改写。
  await assert.rejects(
    service.updateResource(button.id, { apiCodes: [] }, 'actor', authz([], ['system.users.create'])),
    (error) => error.getStatus() === 400,
  )
  // 展示、排序与缓存仍可调整，接口绑定与权限标识保持种子值。
  await service.updateResource(
    button.id,
    { title: '新增用户按钮', icon: 'user', sort: 3, hidden: true, keepAlive: true, apiCodes: ['system.users.create'] },
    'actor',
    authz([], ['system.users.create']),
  )
  assert.equal(saves.length, 1)
  assert.equal(button.permission, SYSTEM_BUTTON_PERMISSIONS.userCreate)
  assert.equal(button.title, '新增用户按钮')
  assert.equal(button.sort, 3)
})

test('自定义资源新增接口绑定不能超出操作者接口授权', async () => {
  const root = { id: randomUUID(), parentId: null, type: 'directory', name: 'System', path: '/system', component: '/index/index', isDeleted: 0, enabled: true }
  const menu = {
    id: randomUUID(),
    parentId: root.id,
    type: 'menu',
    name: 'Reports',
    path: 'reports',
    component: '/system/user',
    permission: null,
    isDeleted: 0,
    enabled: true,
  }
  const resources = [root, menu]
  const bindings = [{ resourceId: menu.id, apiCode: 'tests.read', isDeleted: 0 }]
  const saves = []
  const manager = {
    create: (_entity, data) => data,
    find: async () => structuredClone(resources),
    findBy: async (entity, where) =>
      entity.name === 'AdminResourceApi' && where.resourceId === menu.id
        ? bindings.filter((binding) => where.isDeleted === undefined || binding.isDeleted === where.isDeleted)
        : [],
    countBy: async () => 0,
    insert: async () => {},
    save: async (_entity, value) => saves.push(value),
  }
  const service = new AdminResourceService(
    { manager },
    {
      mutate: async (actorId, operation) => operation(manager, audit(actorId)),
      requireResource: async (_manager, id) => resources.find((item) => item.id === id),
    },
    { validateCodes() {} },
  )
  const allowed = authz([root.id, menu.id], ['tests.read'])
  await assert.rejects(
    service.updateResource(menu.id, { apiCodes: ['tests.read', 'system.users.delete'] }, 'actor', allowed),
    (error) => error.getStatus() === 403,
  )
  // 系统兜底账号不受委派范围限制，可绑定任意已登记接口。
  await service.updateResource(menu.id, { apiCodes: ['tests.read', 'system.users.delete'] }, 'actor', authz([], [], true))
  await assert.rejects(
    service.createResource(
      {
        parentId: root.id,
        type: 'menu',
        title: '越权资源',
        name: 'Unsafe',
        path: 'unsafe',
        component: '/system/user',
        enabled: true,
        apiCodes: ['system.users.delete'],
      },
      'actor',
      allowed,
    ),
    (error) => error.getStatus() === 403,
  )
  await service.updateResource(menu.id, { apiCodes: ['tests.read'] }, 'actor', allowed)
  assert.equal(saves.length, 2)
})

test('初始化种子为页面与按钮绑定交叉页面依赖接口', async () => {
  const inserts = []
  const updates = []
  const insertedValues = (table) => inserts.filter((item) => item.table === table).flatMap((item) => item.values)
  const manager = {
    // 内置角色已存在，避免触发全量授权分支。
    existsBy: async () => true,
    createQueryBuilder: () => {
      const builder = {
        table: undefined,
        payload: undefined,
        insert() {
          return builder
        },
        into(entity) {
          builder.table = entity.name
          return builder
        },
        values(values) {
          builder.payload = values
          return builder
        },
        orIgnore() {
          return builder
        },
        execute: async () => {
          inserts.push({ table: builder.table, values: structuredClone(builder.payload) })
        },
      }
      return builder
    },
    findOne: async (entity) =>
      entity.name === 'AdminRole' ? { id: SUPER_ROLE_ID, code: 'super_admin', isBuiltin: true, isDeleted: 0, enabled: true } : null,
    findOneBy: async (entity, where) =>
      entity.name === 'AdminPermissionResource' ? insertedValues('AdminPermissionResource').find((item) => item.id === where.id) : null,
    find: async () => [],
    findBy: async () => [],
    insert: async () => {},
    update: async (entity, criteria, values) => updates.push({ table: entity.name, criteria, values }),
    countBy: async () => 0,
  }
  await initializeRbac(manager)
  const resources = insertedValues('AdminPermissionResource')
  const bindings = insertedValues('AdminResourceApi')
  // 种子绑定以精确复合键恢复软删除行，避免仅靠 INSERT IGNORE 无法修复历史数据。
  const restored = updates.find((item) => item.table === 'AdminResourceApi')
  assert.ok(restored)
  assert.equal(restored.criteria.length, bindings.length)
  assert.equal(restored.values.isDeleted, 0)
  const bindingOf = (resource, apiCode) => bindings.some((item) => item.resourceId === resource.id && item.apiCode === apiCode)

  const userMenu = resources.find((item) => item.name === 'SystemUser')
  const menuMenu = resources.find((item) => item.name === 'SystemMenu')
  const grantButton = resources.find((item) => item.permission === SYSTEM_BUTTON_PERMISSIONS.roleGrant)
  assert.ok(userMenu && menuMenu && grantButton)
  // 用户弹窗、菜单弹窗与角色授权抽屉依赖的跨页面接口必须随所属资源一起种子化。
  assert.ok(bindingOf(userMenu, 'system.roles.options'))
  assert.ok(bindingOf(menuMenu, 'system.apis.tree'))
  assert.ok(bindingOf(grantButton, 'system.menus.list'))
  // 种子写入审计字段并默认未删除。
  for (const resource of resources) {
    assert.equal(resource.isDeleted, 0)
    assert.equal(resource.createdBy, 'system')
    assert.equal(resource.updatedBy, 'system')
    assert.ok(resource.createTime > 0)
  }
})

test('查询 false 保持禁用筛选语义，写入布尔字段不接受字符串隐式转换', async () => {
  for (const [value, expected] of [
    ['false', false],
    ['true', true],
  ]) {
    const dto = plainToInstance(RbacQueryDto, { enabled: value }, { enableImplicitConversion: true })
    assert.deepEqual(await validate(dto), [])
    assert.equal(dto.enabled, expected)
  }
  for (const value of ['0', '1', 'FALSE', 'TRUE', 'yes', '']) {
    const dto = plainToInstance(RbacQueryDto, { enabled: value }, { enableImplicitConversion: true })
    assert.ok((await validate(dto)).length > 0, `非法查询布尔值 ${value} 不得被转换为 true`)
  }
  for (const type of [UpdateRoleDto, UpdateUserDto, UpdateResourceDto]) {
    const disabled = plainToInstance(type, { enabled: false }, { enableImplicitConversion: true })
    assert.deepEqual(await validate(disabled), [])
    assert.equal(disabled.enabled, false)
    for (const enabled of ['false', 'true', 0, 1, null]) {
      const dto = plainToInstance(type, { enabled }, { enableImplicitConversion: true })
      assert.ok((await validate(dto)).length > 0, `${type.name} 必须拒绝非布尔值`)
    }
  }
})

test('后台处理器缺少接口声明、重复编码、多路由别名与 ALL 方法必须阻止启动', () => {
  const missing = declareController('v1/admin/fail-closed', [['read', Get, '', undefined]])
  assert.throws(() => apiResources([missing]).onModuleInit(), /AdminApi 声明/)
  const first = declareController('v1/admin/first', [['read', Get, '', api('test.duplicate')]])
  const second = declareController('v1/admin/second', [['read', Get, '', api('test.duplicate')]])
  assert.throws(() => apiResources([first, second]).onModuleInit(), /重复/)
  for (const [controllerPath, method, route] of [
    [['v1/admin/one', 'v1/admin/two'], Get, ''],
    ['v1/admin/one', Get, ['first', 'second']],
    ['v1/admin/one', All, ''],
  ]) {
    const controller = declareController(controllerPath, [['read', method, route, api('test.ambiguous')]])
    assert.throws(() => apiResources([controller]).onModuleInit(), /唯一方法和路由/)
  }
})

test('接口绑定只接受需要接口授权的接口，会话、公开与已下线接口均不可授予', async () => {
  const controller = declareController('v1/admin/records', [
    ['read', Get, ':id', api('test.read')],
    ['public', Get, 'public', { ...api('test.public'), access: 'public' }],
    ['session', Get, 'session', { ...api('test.session'), access: 'authenticated' }],
    ['manage', Patch, 'manage', api('test.manage')],
  ])
  const service = apiResources([controller])
  service.onModuleInit()
  const definition = service.getDefinition(controller.prototype.read)
  assert.equal(definition.code, 'test.read')
  assert.equal(definition.method, 'GET')
  assert.equal(definition.path, '/v1/admin/records/:id')
  assert.equal(service.getDefinition(() => {}), undefined)
  // 系统管理接口与普通接口同权，不再有 managementOnly 排除项。
  service.validateCodes(['test.read', 'test.manage'])
  for (const code of ['test.public', 'test.session', 'removed.code']) {
    assert.throws(
      () => service.validateCodes([code]),
      (error) => error.getStatus() === 400,
    )
  }
  const bindable = await service.listBindable()
  assert.deepEqual(
    bindable.map((item) => item.code),
    ['test.manage', 'test.read'],
  )
  for (const item of bindable) {
    assert.deepEqual(Object.keys(item).sort(), ['code', 'module', 'feature', 'action', 'method', 'path'].sort())
  }
})

test('接口目录展示配置不可覆写方法与访问策略，更新写入操作人审计字段', async () => {
  const controller = declareController('v1/admin/records', [
    ['read', Get, ':id', api('test.read')],
    ['manage', Patch, 'manage', api('test.manage')],
  ])
  // 模拟历史或被污染的展示记录，安全字段始终来自当前代码；已下线路由不进入清单。
  const rows = [
    {
      code: 'test.read',
      module: '自定义模块',
      feature: '自定义功能',
      action: '查询详情',
      aliases: ['详情别名'],
      sort: 7,
      method: 'DELETE',
      path: '/unsafe',
      access: 'public',
    },
    { code: 'removed.code', module: '已下线', feature: '已下线', action: '历史接口', aliases: [], sort: 0 },
  ]
  const service = apiResources([controller], rows)
  service.onModuleInit()
  const list = await service.findAll({ page: 1, pageSize: 10, keyword: '详情别名' })
  assert.equal(list.pagination.total, 1)
  assert.equal(list.list[0].method, 'GET')
  assert.equal(list.list[0].path, '/v1/admin/records/:id')
  assert.equal(list.list[0].access, 'permission')
  assert.equal(Object.hasOwn(list.list[0], 'managementOnly'), false)
  // 扁平目录沿用展示排序，并反映持久化的模块、功能与操作标签。
  const bindable = await service.listBindable()
  assert.deepEqual(
    bindable.map((item) => item.code),
    ['test.manage', 'test.read'],
  )
  assert.deepEqual(bindable[1], {
    code: 'test.read',
    module: '自定义模块',
    feature: '自定义功能',
    action: '查询详情',
    method: 'GET',
    path: '/v1/admin/records/:id',
  })
  const actorId = randomUUID()
  await service.update('test.read', { module: '新模块', feature: '新功能', action: '新操作', aliases: [' 标记 ', '标记', ''], sort: 8 }, actorId)
  assert.deepEqual(rows[0].aliases, ['标记'])
  assert.equal(rows[0].updatedBy, actorId)
  assert.equal(typeof rows[0].updateTime, 'number')
  service.validateCodes(['test.read'])
  assert.equal(service.getDefinition(controller.prototype.read).path, '/v1/admin/records/:id')
  assert.equal(service.getDefinitionByCode('test.read').code, 'test.read')
  assert.equal(service.getDefinitionByCode('removed.code'), undefined)
  await assert.rejects(service.update('removed.code', { module: '无效' }, actorId), (error) => error.getStatus() === 404)
})

test('内置种子接口编码集合非空，覆盖全部系统管理入口', () => {
  assert.ok(SEED_API_CODES.length > 0)
  for (const code of ['system.users.list', 'system.users.create', 'system.roles.resources.assign', 'system.menus.list', 'system.apis.update']) {
    assert.ok(SEED_API_CODES.includes(code), `缺少种子接口编码 ${code}`)
  }
})
