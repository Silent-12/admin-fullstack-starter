import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile, readdir } from 'node:fs/promises'
import {
  reactive,
  nextTick,
  effectScope,
  createRenderer,
  defineComponent,
  h,
  ref,
  KeepAlive,
  onMounted,
  onUnmounted
} from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'
import { compileScript, parse } from 'vue/compiler-sfc'
import ts from 'typescript'

const moduleUrl = (source) =>
  `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const leaf = (key) => ({ key, label: key, kind: 'api', selectable: true })

test('v-auth 按 auth 标识移除无权限按钮，权限变化后重新挂载更新显示', async (t) => {
  const source = await readFile(new URL('../src/directives/auth.ts', import.meta.url), 'utf8')
  const store = moduleUrl('export const useUserStore = () => globalThis.rbacDirectiveUser')
  const code = ts
    .transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext }
    })
    .outputText.replace("'@/store/modules/user'", `'${store}'`)
  const { setupAuthDirective } = await import(moduleUrl(code))
  let directive
  setupAuthDirective({
    directive(name, value) {
      assert.equal(name, 'auth')
      directive = value
    }
  })
  const user = { info: { auth: [], roles: ['super_admin'] } }
  globalThis.rbacDirectiveUser = user
  t.after(() => delete globalThis.rbacDirectiveUser)
  const mount = (value) => {
    const parent = {
      removeChild(element) {
        assert.equal(element.parentNode, parent)
        element.parentNode = null
      }
    }
    const element = { parentNode: parent }
    directive.mounted(element, { value })
    return element
  }
  const denied = mount('system.user.create')
  assert.equal(denied.parentNode, null, '角色不能替代 auth 标识')
  user.info.auth = ['system.user.create']
  await nextTick()
  assert.equal(denied.parentNode, null, '授权变化不自动恢复已移除按钮')
  const allowed = mount('system.user.create')
  assert.notEqual(allowed.parentNode, null, '刷新后重新挂载按最新权限显示')
  assert.equal(mount('system.user.delete').parentNode, null)
  for (const value of ['', ' ', undefined, null, 123]) {
    assert.equal(mount(value).parentNode, null, '无效权限标识默认拒绝')
  }
  directive.updated(allowed, { value: 'system.user.delete' })
  assert.equal(allowed.parentNode, null, '元素更新后仍校验绑定标识')
  assert.doesNotThrow(() => directive.updated(allowed, { value: 'system.user.delete' }))
  user.info = {}
  assert.equal(mount('system.user.create').parentNode, null, '资料缺失时拒绝显示')
})

test('前端按钮仅依赖 auth 标识，对角色属性和超级管理员标记不做权限推导', async (t) => {
  // 组件包入口定义持久化 Store，Node 环境提供独立内存存储以加载真实 useAuth。
  const previousStorage = globalThis.localStorage
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} }
  t.after(() => {
    if (previousStorage === undefined) delete globalThis.localStorage
    else globalThis.localStorage = previousStorage
  })
  const user = reactive({ info: { auth: [] } })
  const { useAuth, AUTH_LIST_KEY } = await import('@ao/admin-components')
  const app = createRenderer({}).createApp({})
  app.provide(AUTH_LIST_KEY, () => user.info.auth)
  const { hasAuth } = app.runWithContext(useAuth)
  assert.equal(hasAuth('system.user.create'), false)
  user.info.roles = ['super_admin']
  assert.equal(hasAuth('system.user.create'), false)
  user.info.auth = ['system.user.create', 'orders.edit']
  assert.equal(hasAuth('system.user.create'), true)
  assert.equal(hasAuth('orders.edit'), true)
  assert.equal(hasAuth('system.user.delete'), false)
  user.info = { auth: [] }
  assert.equal(hasAuth('system.user.create'), false)
  const source = await readFile(
    new URL('../../backend/src/common/constants/admin-permission.constant.ts', import.meta.url),
    'utf8'
  )
  const { SYSTEM_BUTTON_PERMISSIONS } = await import(
    moduleUrl(
      ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
    )
  )
  const markers = new Set()
  for (const page of ['user', 'role', 'menu', 'api-resources']) {
    const view = await readFile(
      new URL(`../src/views/system/${page}/index.vue`, import.meta.url),
      'utf8'
    )
    const template = parse(view).descriptor.template.content
    assert.doesNotMatch(template, /hasAuth\(/, '模板按钮权限统一使用 v-auth')
    for (const match of template.matchAll(/v-auth="'([^']+)'"/g)) markers.add(match[1])
  }
  assert.deepEqual(
    [...markers].sort(),
    Object.values(SYSTEM_BUTTON_PERMISSIONS).sort(),
    '系统页面消费的按钮标识须与后端下发一致'
  )
})

// 直接编译真实路由服务；仅替换 Vite 的构建期视图发现，仍使用真实 Vue 和 Vue Router。
async function sourceModule(path, overrides = {}) {
  let url = new URL(`../src/${path}`, import.meta.url)
  let source
  try {
    source = await readFile(url, 'utf8')
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    url = new URL(url.href.replace(/\.ts$/, '/index.ts'))
    source = await readFile(url, 'utf8')
  }
  source = source
    .replace(
      "import.meta.glob<Component>('../../views/**/*.vue', { import: 'default' })",
      'globalThis.rbacRouteModules'
    )
    .replaceAll('import.meta.env.VITE_ROUTE_SOURCE', 'globalThis.rbacRouteSource')
  let code = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
  }).outputText
  for (const match of [...code.matchAll(/from (['"])([^'"]+)\1/g)]) {
    const name = match[2]
    let resolved
    if (overrides[name]) resolved = overrides[name]
    else if (name === '@/api/system-manage')
      resolved = moduleUrl('export const fetchGetUserMenus = () => globalThis.rbacMenuFetch()')
    else if (name.startsWith('@/')) resolved = await sourceModule(`${name.slice(2)}.ts`, overrides)
    else if (name.startsWith('.')) {
      const dependency = new URL(`${name}.ts`, url)
      resolved = await sourceModule(dependency.href.split('/src/')[1], overrides)
    } else resolved = import.meta.resolve(name)
    code = code.replace(match[0], `from '${resolved}'`)
  }
  return moduleUrl(code)
}

test('路由来源开关只切换菜单，静态模式不请求也不合并后端菜单，动态失败不回退本地菜单', async (t) => {
  t.after(() => {
    delete globalThis.rbacRouteSource
    delete globalThis.rbacMenuFetch
    delete globalThis.rbacRouteModules
  })
  const { MenuRouteService } = await import(
    await sourceModule('router/services/MenuRouteService.ts')
  )
  const { RouteRegistry } = await import(await sourceModule('router/services/RouteRegistry.ts'))
  const { getRouteSource } = await import(await sourceModule('router/constants.ts'))
  const service = new MenuRouteService()
  let calls = 0
  let backendRoutes = [
    { path: '/remote', name: 'Remote', component: '/system/user', meta: { title: '后端菜单' } }
  ]
  let failure
  globalThis.rbacMenuFetch = async () => {
    calls++
    if (failure) throw failure
    return backendRoutes
  }
  const nodes = (routes) => routes.flatMap((route) => [route, ...nodes(route.children || [])])
  globalThis.rbacRouteSource = 'static'
  const local = await service.getRoutes()
  assert.equal(calls, 0, '静态模式不请求后端菜单接口')
  assert.deepEqual(await service.getRoutes(), local, '静态模式重复读取仍完全使用本地路由')
  assert.equal(calls, 0)
  // 后端有数据或请求失败都不能影响静态调试路由
  backendRoutes = []
  failure = new Error('后端不可用')
  assert.deepEqual(await service.getRoutes(), local, '静态模式忽略后端菜单与失败')
  assert.equal(calls, 0)
  failure = undefined
  const system = local.find((route) => route.name === 'System')
  assert.equal(system.redirect, '/system/user')
  assert.equal('icon' in system.meta, false, '系统根目录不允许配置图标')
  assert.deepEqual(
    nodes(local)
      .filter((route) => route.path.startsWith('/system/'))
      .map((route) => route.path),
    ['/system/user', '/system/role', '/system/menu', '/system/api-resources']
  )
  const apiResourceRoute = nodes([system]).find((route) => route.name === 'SystemApiResources')
  assert.deepEqual(
    {
      path: apiResourceRoute.path,
      component: apiResourceRoute.component,
      meta: apiResourceRoute.meta
    },
    {
      path: '/system/api-resources',
      component: '/system/api-resources',
      meta: { title: '接口资源', keepAlive: false }
    },
    '静态路由与后端内置资源种子保持一致'
  )
  for (const route of nodes([system])) assert.notEqual(route.meta.keepAlive, true)
  globalThis.rbacRouteModules = {}
  for (const route of nodes(local)) {
    if (!route.component || route.component === '/index/index') continue
    await readFile(new URL(`../src/views${route.component}/index.vue`, import.meta.url), 'utf8')
    globalThis.rbacRouteModules[`../../views${route.component}/index.vue`] = async () => ({})
  }
  const router = createRouter({ history: createMemoryHistory(), routes: [] })
  const registry = new RouteRegistry(router)
  registry.register(local)
  assert.equal(router.resolve('/system/role').name, 'SystemRole')
  registry.unregister()
  assert.equal(router.hasRoute('SystemRole'), false)
  assert.equal((await service.getRoutes())[0].children[0].path, '/example/dashboard')

  for (const source of ['dynamic', undefined, '', 'invalid']) {
    globalThis.rbacRouteSource = source
    assert.equal(getRouteSource(), 'dynamic')
    assert.deepEqual(await service.getRoutes(), [], '空授权菜单不回退本地菜单')
  }
  assert.equal(calls, 4)
  const unauthorized = Object.assign(new Error('session expired'), { status: 401 })
  failure = unauthorized
  await assert.rejects(service.getRoutes(), (error) => error === unauthorized)
})

// 编译真实组件 setup，仅替换网络、界面依赖与生命周期注册。
async function component(path, context, overrides = {}) {
  globalThis.rbacTest = context
  const source = compileScript(
    parse(await readFile(new URL(`../src/${path}`, import.meta.url), 'utf8')).descriptor,
    { id: path }
  ).content
  const vueUrl = import.meta.resolve('vue')
  const vueStub = moduleUrl(
    `export * from '${vueUrl}'; export const onMounted = () => {}; export const onBeforeUnmount = callback => { globalThis.rbacTest.dispose = callback }`
  )
  const elementStub = moduleUrl(
    'export const ElAlert = {}, ElButton = {}, ElInput = {}, ElScrollbar = {}, ElTree = {}, ElTreeSelect = {}, ElSpace = {}, ElTag = {}; export const ElMessage = { success: message => globalThis.rbacTest.success.push(message), warning: message => (globalThis.rbacTest.warnings ||= []).push(message) }'
  )
  const stubs = {
    vue: vueStub,
    'element-plus': elementStub,
    '@ao/admin-components': moduleUrl('export const AoForm = {}'),
    '@/api/system-manage': moduleUrl(
      'export const fetchApiTree = keyword => globalThis.rbacTest.fetch(keyword); export const fetchGetMenu = id => globalThis.rbacTest.detail(id); export const createMenu = data => globalThis.rbacTest.save(data); export const updateMenu = (id, data) => globalThis.rbacTest.save(data, id)'
    ),
    './ApiTreeSelector.vue': moduleUrl('export default {}'),
    '@/router/services/RouteConfigValidator': await sourceModule(
      'router/services/RouteConfigValidator.ts'
    ),
    '@/hooks/useDialogForm': await sourceModule('hooks/useDialogForm.ts', {
      vue: vueStub,
      'element-plus': elementStub
    }),
    '@/hooks/usePagedList': await sourceModule('hooks/usePagedList.ts', { vue: vueStub }),
    '@/hooks/useLatestRequest': await sourceModule('hooks/useLatestRequest.ts', { vue: vueStub }),
    ...overrides
  }
  const code = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
  }).outputText
  const { default: target } = await import(
    moduleUrl(
      code.replace(
        /from (['"])([^'"]+)\1/g,
        (_match, _quote, name) => `from '${stubs[name] || import.meta.resolve(name)}'`
      )
    )
  )
  const scope = effectScope()
  const state = scope.run(() => target.setup(context.props, { expose() {}, emit: context.emit }))
  return { state, stop: () => scope.stop() }
}

test('请求代次只接受最后一次响应，显式失效与卸载后丢弃旧响应', async () => {
  const vueStub = moduleUrl(
    `export * from '${import.meta.resolve('vue')}'; export const onBeforeUnmount = callback => { globalThis.rbacLatestUnmount = callback }`
  )
  const { useLatestRequest } = await import(
    await sourceModule('hooks/useLatestRequest.ts', { vue: vueStub })
  )
  const request = useLatestRequest()
  const first = request.begin()
  assert.equal(request.isCurrent(first), true)
  const second = request.begin()
  assert.equal(request.isCurrent(first), false, '新请求使旧令牌失效')
  assert.equal(request.isCurrent(second), true)
  request.invalidate()
  assert.equal(request.isCurrent(second), false, '显式失效后丢弃未完成响应')
  const third = request.begin()
  assert.equal(request.isCurrent(third), true)
  globalThis.rbacLatestUnmount()
  assert.equal(request.isCurrent(third), false, '卸载后丢弃未完成响应')
  delete globalThis.rbacLatestUnmount
})

test('接口检索保留不可见选中项，禁选分支并隔离旧请求及卸载返回', async () => {
  const requests = []
  const events = []
  const props = reactive({ modelValue: ['outside', 'visible'] })
  const context = {
    props,
    success: [],
    fetch: (keyword) => {
      const pending = deferred()
      requests.push({ ...pending, keyword })
      return pending.promise
    },
    emit: (event, value) => {
      events.push([event, value])
      if (event === 'update:modelValue') props.modelValue = value
    }
  }
  const { state, stop } = await component(
    'views/system/menu/components/ApiTreeSelector.vue',
    context
  )
  const checked = []
  state.tree.value = { setCheckedKeys: (keys) => checked.push([...keys]) }
  state.check(leaf('visible'), { checkedKeys: [] })
  assert.deepEqual(props.modelValue, ['outside'])
  state.check({ key: 'module', kind: 'module', selectable: false }, { checkedKeys: ['module'] })
  assert.deepEqual(props.modelValue, ['outside'])
  state.check(leaf('new'), { checkedKeys: ['new'] })
  assert.deepEqual(props.modelValue, ['outside', 'new'])
  state.keyword.value = 'old'
  const old = state.load()
  state.keyword.value = 'latest'
  const latest = state.load()
  requests[1].resolve([
    { key: 'branch', label: '模块', kind: 'module', selectable: false, children: [leaf('new')] }
  ])
  await latest
  assert.equal(state.loading.value, false)
  assert.equal(state.displayNodes.value[0].disabled, true)
  assert.equal(state.displayNodes.value[0].children[0].disabled, false)
  assert.deepEqual(checked.at(-1), ['outside', 'new'])
  requests[0].reject(new Error('旧搜索失败'))
  await old
  assert.equal(state.failed.value, false)
  assert.equal(state.nodes.value[0].key, 'branch')
  assert.deepEqual(events.at(-1), ['ready', true])
  state.keyword.value = ''
  const full = state.load()
  requests[2].resolve([leaf('new')])
  await full
  assert.deepEqual(state.invalidCodes.value, ['outside'])
  assert.deepEqual(events.at(-1), ['ready', false])
  state.remove('outside')
  await nextTick()
  assert.deepEqual(props.modelValue, ['new'])
  assert.deepEqual(events.at(-1), ['ready', true])
  const pending = state.load()
  context.dispose()
  requests[3].resolve([leaf('late')])
  await pending
  assert.equal(state.nodes.value[0].key, 'new')
  assert.deepEqual(events.at(-1), ['ready', false])
  stop()
})

test('编辑目录双向切换根与子目录时更新布局组件，表单发送合法结构', async () => {
  const props = reactive({
    modelValue: false,
    resourceId: 'custom-root',
    resources: [{ id: 'parent', type: 'directory', children: [] }]
  })
  const detail = {
    id: 'custom-root',
    parentId: null,
    type: 'directory',
    title: '目录',
    name: 'CustomRoot',
    path: '/custom',
    component: '/index/index',
    enabled: true,
    sort: 0,
    hidden: false,
    keepAlive: false,
    apiCodes: [],
    isBuiltin: false
  }
  const payloads = []
  const context = {
    props,
    success: [],
    emit() {},
    detail: async () => detail,
    save: async (data) => payloads.push(data)
  }
  const { state, stop } = await component('views/system/menu/components/MenuDialog.vue', context)
  props.modelValue = true
  for (let tick = 0; tick < 5; tick++) await nextTick()
  state.form.value.parentId = 'parent'
  await nextTick()
  assert.equal(state.form.value.component, null)
  await state.save()
  assert.equal(payloads[0].parentId, 'parent')
  assert.equal(payloads[0].component, null)
  state.form.value.parentId = null
  await nextTick()
  assert.equal(state.form.value.component, '/index/index')
  await state.save()
  assert.equal(payloads[1].parentId, null)
  assert.equal(payloads[1].component, '/index/index')
  stop()
})

test('前后端菜单路由契约一致，保存前拒绝保留名和动态或非法路径', async () => {
  const { validateBusinessRouteIdentity, RouteConfigValidator } = await import(
    await sourceModule('router/services/RouteConfigValidator.ts')
  )
  const { publicRoutes } = await import(await sourceModule('router/routes/public.ts'))
  const backendSource = await readFile(
    new URL('../../backend/src/common/constants/admin-route.constant.ts', import.meta.url),
    'utf8'
  )
  const { ADMIN_ROUTE_POLICY } = await import(
    moduleUrl(
      ts.transpileModule(backendSource, { compilerOptions: { module: ts.ModuleKind.ESNext } })
        .outputText
    )
  )
  const names = (routes) =>
    routes.flatMap((route) => [String(route.name), ...names(route.children || [])])
  assert.deepEqual([...ADMIN_ROUTE_POLICY.reservedNames].sort(), names(publicRoutes).sort())
  for (const path of [
    '/reports',
    'reports/daily-report_1',
    ':id(',
    ':id',
    'a//b',
    'a/',
    '/',
    '/a?x=1',
    '/a#hash',
    '/a%2Fb',
    '/a\\b',
    '/a/../b',
    '/a.*',
    '/路径'
  ]) {
    assert.equal(
      validateBusinessRouteIdentity('Report', path).length === 0,
      ADMIN_ROUTE_POLICY.pathPattern.test(path),
      path
    )
  }
  const props = reactive({ modelValue: false, resources: [] })
  const context = {
    props,
    success: [],
    warnings: [],
    emit() {},
    save: async () => assert.fail('非法路由不得发送保存请求')
  }
  const { state, stop } = await component('views/system/menu/components/MenuDialog.vue', context)
  props.modelValue = true
  for (let tick = 0; tick < 5; tick++) await nextTick()
  state.form.value.title = '报表'
  for (const name of ADMIN_ROUTE_POLICY.reservedNames) {
    state.form.value.name = name
    state.form.value.path = '/reports'
    await state.save()
    const route = {
      name: 'Reports',
      path: '/reports',
      component: '/index/index',
      meta: {},
      children: [{ name, path: '/reports/list', component: '/system/user', meta: {} }]
    }
    assert.equal(new RouteConfigValidator().validate([route]).valid, false)
  }
  state.form.value.name = 'Reports'
  state.form.value.path = '/:id('
  await state.save()
  state.form.value.path = 'reports'
  await state.save()
  assert.equal(context.warnings.length, ADMIN_ROUTE_POLICY.reservedNames.length + 2)
  stop()
})

test('动态路由注册中途失败时撤销已添加路由，修复后可重试注册', async () => {
  globalThis.rbacRouteModules = {
    '../../views/system/user/index.vue': async () => ({ render: () => h('div') })
  }
  const { RouteRegistry } = await import(await sourceModule('router/services/RouteRegistry.ts'))
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ name: 'Login', path: '/auth/login', component: {} }]
  })
  const original = router.addRoute.bind(router)
  let calls = 0
  router.addRoute = (...args) => {
    if (++calls === 2) throw new Error('注册失败')
    return original(...args)
  }
  const routes = ['First', 'Second'].map((name) => ({
    name,
    path: `/${name}`,
    component: '/index/index',
    meta: {},
    children: [{ name: `${name}Page`, path: `/${name}/page`, component: '/system/user', meta: {} }]
  }))
  const registry = new RouteRegistry(router)
  assert.throws(() => registry.register(routes), /注册失败/)
  assert.equal(registry.isRegistered(), false)
  assert.equal(router.hasRoute('First'), false)
  assert.equal(router.hasRoute('FirstPage'), false)
  assert.equal(router.hasRoute('Login'), true)
  router.addRoute = original
  registry.register(routes)
  assert.equal(registry.isRegistered(), true)
  registry.unregister()
  assert.equal(router.hasRoute('First'), false)
  assert.equal(router.hasRoute('Second'), false)
})

test('具名路由包装使关闭缓存、启用缓存和关闭标签清理均生效，同组件多路由独立', async () => {
  const { RouteTransformer } = await import(
    await sourceModule('router/services/RouteTransformer.ts')
  )
  const { RouteComponentLoader } = await import(
    await sourceModule('router/services/RouteComponentLoader.ts')
  )
  let mounts = 0
  let unmounts = 0
  const page = defineComponent({
    name: 'User',
    setup() {
      onMounted(() => mounts++)
      onUnmounted(() => unmounts++)
      return () => h('div')
    }
  })
  globalThis.rbacRouteModules = { '../../views/system/user/index.vue': async () => page }
  const transformer = new RouteTransformer(new RouteComponentLoader())
  const pages = await Promise.all(
    ['SystemUser', 'AnotherUser'].map(async (name) => {
      const route = transformer.transform({
        name,
        path: `/${name}`,
        component: '/system/user',
        meta: { title: name }
      })
      return route.component()
    })
  )
  assert.equal(pages[0].name, 'SystemUser')
  assert.equal(pages[1].name, 'AnotherUser')
  assert.equal(page.name, 'User', '不修改共享页面组件的名称')
  const host = {
    createElement: () => ({ children: [] }),
    createText: (text) => ({ text }),
    createComment: (text) => ({ text }),
    insert: (node, parent) => {
      if (node.parent) node.parent.children = node.parent.children.filter((item) => item !== node)
      node.parent = parent
      parent.children.push(node)
    },
    remove: (node) => {
      if (node.parent) node.parent.children = node.parent.children.filter((item) => item !== node)
    },
    setText() {},
    setElementText() {},
    patchProp() {},
    parentNode: (node) => node.parent,
    nextSibling: () => null
  }
  const current = ref(0)
  const keepAlive = ref(false)
  const closedNames = ref([])
  const App = {
    setup: () => () =>
      h(
        KeepAlive,
        {
          exclude: [...closedNames.value, ...(!keepAlive.value ? [pages[current.value].name] : [])]
        },
        [h(pages[current.value], { key: current.value })]
      )
  }
  const app = createRenderer(host).createApp(App)
  app.mount({ children: [] })
  current.value = 1
  await nextTick()
  current.value = 0
  await nextTick()
  assert.equal(mounts, 3)
  assert.equal(unmounts, 2)
  keepAlive.value = true
  await nextTick()
  current.value = 1
  await nextTick()
  current.value = 0
  await nextTick()
  assert.equal(mounts, 4, '启用缓存后返回原路由复用实例，另一路由独立创建')
  closedNames.value = ['SystemUser']
  await nextTick()
  current.value = 1
  await nextTick()
  current.value = 0
  await nextTick()
  assert.equal(mounts, 5, '关闭标签后原页面实例失效')
  app.unmount()
  assert.equal(unmounts, mounts)
})

test('菜单绑定保存失败保持输入，成功后才关闭并提交完整接口集合', async () => {
  const events = []
  const props = reactive({ modelValue: false, resourceId: 'uuid', resources: [] })
  let fail = true
  let payload
  const detail = {
    id: 'uuid',
    isBuiltin: false,
    type: 'menu',
    parentId: 'parent-uuid',
    title: '菜单',
    name: 'Page',
    path: 'page',
    component: '/system/user',
    icon: null,
    permission: null,
    enabled: true,
    sort: 0,
    hidden: false,
    keepAlive: false,
    apiCodes: ['outside', 'visible']
  }
  const context = {
    props,
    success: [],
    emit: (...event) => events.push(event),
    detail: async () => detail,
    save: async (data) => {
      payload = data
      if (fail) throw new Error('保存失败')
    }
  }
  const { state, stop } = await component('views/system/menu/components/MenuDialog.vue', context)
  const resets = []
  state.formRef.value = { reset: () => resets.push(state.form.value.title) }
  props.modelValue = true
  for (let tick = 0; tick < 5; tick++) await nextTick()
  assert.deepEqual(resets, ['', '菜单'])
  const sortItem = state.items.value.find((item) => item.key === 'sort')
  assert.equal(sortItem.props.valueOnClear, 0, '排序清空后回填 0，模型不会出现 null')
  assert.ok(state.rules.value.sort, '排序需要非负整数校验')
  state.apiReady.value = true
  state.form.value.title = '  修改后的菜单  '
  state.form.value.sort = null
  await state.save()
  assert.equal(state.busy.value, false)
  assert.equal(props.modelValue, true)
  assert.equal(state.form.value.title, '  修改后的菜单  ')
  assert.equal(context.success.length, 0)
  assert.equal(
    events.some(([event]) => event === 'success'),
    false
  )
  assert.deepEqual(payload.apiCodes, ['outside', 'visible'])
  assert.equal(payload.sort, 0, '清空后的排序按 0 提交')
  assert.equal('id' in payload, false)
  assert.equal('isBuiltin' in payload, false)
  fail = false
  await state.save()
  assert.equal(payload.title, '修改后的菜单')
  assert.deepEqual(events.slice(-2), [['update:modelValue', false], ['success']])
  assert.equal(context.success.length, 1)
  props.modelValue = false
  await nextTick()
  props.modelValue = true
  for (let tick = 0; tick < 5; tick++) await nextTick()
  assert.deepEqual(resets, ['', '菜单', '', '菜单'])
  assert.equal(state.form.value.title, '菜单')
  stop()
})

test('接口检索组件位于菜单模块内，旧路径不再存在', async () => {
  const dialog = await readFile(
    new URL('../src/views/system/menu/components/MenuDialog.vue', import.meta.url),
    'utf8'
  )
  assert.match(dialog, /from '\.\/ApiTreeSelector\.vue'/)
  assert.match(dialog, /:disabled="busy \|\| builtin"/, '内置资源接口绑定只读')
  await assert.rejects(
    readFile(new URL('../src/views/system/components/ApiTreeSelector.vue', import.meta.url)),
    (error) => error.code === 'ENOENT'
  )
})

test('接口清单标签弹窗排序清空提交 0，访问级别只保留三种策略', async () => {
  const saves = []
  const requests = []
  const context = {
    props: {},
    success: [],
    fetchList: (query) => {
      requests.push(query)
      return Promise.resolve({
        list: [],
        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 }
      })
    },
    save: async (data, code) => saves.push({ code, data })
  }
  const { state, stop } = await component('views/system/api-resources/index.vue', context, {
    '@ao/admin-components': moduleUrl(`
      export const AoForm = {}, AoTable = {}
      export const useTableColumns = (factory) => ({ columns: { value: factory() }, columnChecks: { value: [] } })
      export const useAuth = () => ({ hasAuth: () => true })
    `),
    '@/api/system-manage': moduleUrl(`
      export const fetchApiResources = (query) => globalThis.rbacTest.fetchList(query)
      export const updateApiLabels = (code, data) => globalThis.rbacTest.save(data, code)
    `)
  })
  const row = {
    code: 'system.apis.list',
    module: '系统管理',
    feature: '接口清单',
    action: '列表',
    method: 'GET',
    path: '/v1/admin/api-resources',
    access: 'permission',
    aliases: ['接口'],
    sort: 5
  }
  state.edit(row)
  for (let tick = 0; tick < 5; tick++) await nextTick()
  assert.equal(state.visible.value, true)
  assert.deepEqual(state.form.value, {
    module: '系统管理',
    feature: '接口清单',
    action: '列表',
    aliases: ['接口'],
    sort: 5
  })
  const sortItem = state.items.find((item) => item.key === 'sort')
  assert.equal(sortItem.props.valueOnClear, 0, '排序清空后回填 0，模型不会出现 null')
  assert.ok(state.rules.sort, '排序需要非负整数校验')
  state.form.value.sort = null
  await state.save()
  assert.equal(saves[0].code, 'system.apis.list')
  assert.equal(saves[0].data.sort, 0, '清空后的排序按 0 提交')
  assert.deepEqual(saves[0].data.aliases, ['接口'])
  assert.equal(saves[0].data.module, '系统管理')
  stop()
})

test('前端不再消费已移除的 managementOnly、authList 与 isSuper 字段', async () => {
  const root = new URL('../src/', import.meta.url)
  const files = await readdir(root, { recursive: true })
  const sources = files
    .filter((file) => /\.(ts|vue)$/.test(file))
    .map((file) => file.replaceAll('\\', '/'))
  assert.ok(sources.length > 0)
  for (const file of sources) {
    const source = await readFile(new URL(file, root), 'utf8')
    assert.doesNotMatch(source, /managementOnly|authList|isSuper/, `${file} 不应残留已移除字段`)
  }
  const apiResources = await readFile(
    new URL('../src/views/system/api-resources/index.vue', import.meta.url),
    'utf8'
  )
  assert.doesNotMatch(apiResources, /超级管理员专用/)
  for (const label of ['公开接口', '登录即可访问', '按角色授权']) {
    assert.match(apiResources, new RegExp(label))
  }
})

test('内置账号用 isBuiltin 判定，弹窗禁用角色与启用开关并展示缺失角色', async () => {
  const root = new URL('../src/', import.meta.url)
  const files = await readdir(root, { recursive: true })
  const sources = files
    .filter((file) => /\.(ts|vue)$/.test(file))
    .map((file) => file.replaceAll('\\', '/'))
  for (const file of sources) {
    const source = await readFile(new URL(file, root), 'utf8')
    assert.doesNotMatch(source, /isDeletable/, `${file} 不应残留已移除的 isDeletable 字段`)
  }
  const userIndex = await readFile(
    new URL('../src/views/system/user/index.vue', import.meta.url),
    'utf8'
  )
  assert.match(userIndex, /row\.isBuiltin/, '用户列表按 isBuiltin 禁用删除')
  assert.doesNotMatch(userIndex, /!row\.isBuiltin/, '内置账号删除按钮直接禁用而无需取反使用')

  const saved = []
  const props = reactive({ modelValue: false, userId: 'builtin' })
  const roleOptions = [
    { id: 'role-a', code: 'role_a', name: '角色 A' },
    { id: 'role-b', code: 'role_b', name: '角色 B' }
  ]
  const context = {
    props,
    success: [],
    emit: () => {},
    roleOptions: () => Promise.resolve(roleOptions),
    detail: (id) =>
      Promise.resolve({
        id,
        username: 'admin',
        name: '管理员',
        phone: null,
        email: null,
        avatar: null,
        enabled: true,
        roleIds: id === 'builtin' ? ['role-a', 'retired-role'] : ['retired-role'],
        roleCodes: id === 'builtin' ? ['role_a', 'retired_role'] : ['retired_role'],
        isBuiltin: id === 'builtin',
        createTime: 0,
        lastLoginTime: null
      }),
    save: async (data, id) => saved.push({ id, data })
  }
  const { state, stop } = await component('views/system/user/components/UserDialog.vue', context, {
    'element-plus': moduleUrl(`
      export const ElButton = {}, ElAlert = {}
      export const ElMessage = {
        success: (message) => globalThis.rbacTest.success.push(message),
        warning: (message) => (globalThis.rbacTest.warnings ||= []).push(message)
      }
    `),
    '@/api/system-manage': moduleUrl(`
      export const fetchGetRoleOptions = () => globalThis.rbacTest.roleOptions()
      export const fetchGetUser = (id) => globalThis.rbacTest.detail(id)
      export const createUser = (data) => globalThis.rbacTest.save(data)
      export const updateUser = (id, data) => globalThis.rbacTest.save(data, id)
    `)
  })
  props.modelValue = true
  for (let tick = 0; tick < 6; tick++) await nextTick()
  const items = state.items.value
  const roleItem = items.find((item) => item.key === 'roleIds')
  assert.equal(roleItem.props.disabled, true, '内置账号的角色选择保持禁用')
  assert.equal(
    items.find((item) => item.key === 'enabled').props.disabled,
    true,
    '内置账号的启用开关保持禁用'
  )
  assert.deepEqual(
    roleItem.props.options.filter((option) => option.value === 'retired-role'),
    [{ label: '已停用或不可用角色', value: 'retired-role' }],
    '不在角色选项接口中的已绑定角色显示为只读中文项'
  )
  assert.equal(
    roleItem.props.options.some((option) => option.label.includes('retired-role')),
    false,
    '缺失角色不能显示 UUID'
  )
  const hint = items.find((item) => item.key === 'roleHint')
  assert.ok(hint, '内置账号显示权限固定提示')
  assert.match(hint.render().props.title, /内置管理员权限固定，不可修改/)
  await state.save()
  assert.equal(saved[0].id, 'builtin')
  assert.deepEqual(saved[0].data.roleIds, ['role-a', 'retired-role'], '保存时原样保留已绑定的角色')
  assert.equal(saved[0].data.enabled, true)
  assert.equal(saved[0].data.name, '管理员', '内置账号普通资料仍可编辑保存')

  props.modelValue = false
  await nextTick()
  props.userId = 'normal'
  props.modelValue = true
  for (let tick = 0; tick < 6; tick++) await nextTick()
  const normalItems = state.items.value
  const normalRoleItem = normalItems.find((item) => item.key === 'roleIds')
  assert.equal(normalRoleItem.props.disabled, false)
  assert.equal(normalItems.find((item) => item.key === 'enabled').props.disabled, false)
  assert.equal(
    normalItems.some((item) => item.key === 'roleHint'),
    false,
    '普通用户不显示内置账号提示'
  )
  assert.deepEqual(
    normalRoleItem.props.options.filter((option) => option.value === 'retired-role'),
    [{ label: '已停用或不可用角色', value: 'retired-role' }],
    '普通用户缺失角色同样补齐中文展示项'
  )
  stop()
})

test('内置角色在列表禁用资源授权并提示权限固定，普通角色仍可打开授权', async () => {
  const source = await readFile(
    new URL('../src/views/system/role/index.vue', import.meta.url),
    'utf8'
  )
  const grantTag = source.match(/<ElButton[^>]*system\.role\.grant[^>]*>/)?.[0]
  assert.ok(grantTag, '角色列表保留资源授权按钮')
  assert.match(grantTag, /:disabled="busy \|\| row\.isBuiltin"/, '内置角色禁用资源授权')
  assert.match(grantTag, /'内置角色权限固定'/, '禁用时给出固定权限提示')

  const context = { props: {}, success: [], emit: () => {} }
  const { state, stop } = await component('views/system/role/index.vue', context, {
    '@ao/admin-components': moduleUrl(`
      export const AoTable = {}
      export const useTableColumns = (factory) => ({ columns: { value: factory() }, columnChecks: { value: [] } })
      export const useAuth = () => ({ hasAuth: () => true })
    `),
    'element-plus': moduleUrl(
      'export const ElButton = {}, ElTag = {}, ElMessageBox = {}; export const ElMessage = { success() {}, warning() {} }'
    ),
    '@/api/system-manage': moduleUrl(`
      export const fetchGetRoleList = () =>
        Promise.resolve({ list: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 } })
      export const deleteRole = () => Promise.resolve()
    `),
    './components/RoleEditDialog.vue': moduleUrl('export default {}'),
    './components/RolePermissionDialog.vue': moduleUrl('export default {}')
  })
  const role = {
    id: 'role-1',
    code: 'super_admin',
    name: '超级管理员',
    description: '',
    enabled: true,
    isBuiltin: true
  }
  state.grant(role)
  assert.equal(state.permissionVisible.value, false, '内置角色不打开资源授权弹窗')
  state.grant({ ...role, id: 'role-2', isBuiltin: false })
  assert.equal(state.permissionVisible.value, true)
  assert.equal(state.selectedId.value, 'role-2')
  stop()
})

test('403 空授权主按钮为重新登录，有首页时保留返回首页与次要重新登录', async () => {
  const page = await readFile(
    new URL('../src/views/exception/403/index.vue', import.meta.url),
    'utf8'
  )
  const exception = await readFile(
    new URL('../src/views/exception/components/AoException.vue', import.meta.url),
    'utf8'
  )
  assert.match(page, /#action="\{ backHome, homePath \}"/)
  assert.match(page, /v-if="homePath"[\s\S]*返回首页/)
  assert.match(page, /v-else[\s\S]*重新登录/)
  assert.match(page, /v-if="homePath"[\s\S]*重新登录/)
  assert.match(exception, /:back-home="backHome"/)
  assert.match(exception, /:home-path="homePath"/)
})
