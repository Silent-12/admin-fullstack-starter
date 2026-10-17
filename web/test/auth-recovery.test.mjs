import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { createMemoryHistory, createRouter } from 'vue-router'
import { compileScript, parse } from 'vue/compiler-sfc'
import ts from 'typescript'

const moduleUrl = (source) =>
  `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
const sourceFile = (path) => readFile(new URL(`../src/${path}`, import.meta.url), 'utf8')

// 执行真实守卫和页面脚本，仅替换网络、布局与动态路由注册等外部依赖。
async function loadModule(source, dependencies = {}) {
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
  })
  return import(
    moduleUrl(
      outputText.replace(/from (['"])([^'"]+)\1/g, (_match, _quote, name) => {
        const target = dependencies[name] ?? import.meta.resolve(name)
        return `from '${target}'`
      })
    )
  )
}

globalThis.window = { location: { origin: 'http://localhost:3006' } }
const redirectModule = moduleUrl(
  ts.transpileModule(await sourceFile('utils/navigation/login.ts'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
  }).outputText
)
const guardSource = await sourceFile('router/guards/beforeEach.ts')
const pageSource = compileScript(
  parse(await sourceFile('views/exception/500/index.vue')).descriptor,
  { id: 'auth-recovery' }
).content

test('初始化失败由异常页恢复原地址，重复失败仍可重试，失效凭证转入登录', async (t) => {
  t.mock.method(console, 'error', () => {})
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/auth/login', name: 'Login', component: {} },
      { path: '/500', name: 'Exception500', component: {} },
      { path: '/details', name: 'Details', component: {} },
      { path: '/', name: 'Root', component: {} }
    ]
  })
  let version = 0
  let profileCalls = 0
  let menuCalls = 0
  let registered = false
  let failureStage = 'profile'
  const user = {
    accessToken: 'valid-token',
    get isLogin() {
      return Boolean(user.accessToken)
    },
    hasValidSession: () => Boolean(user.accessToken),
    getSessionVersion: () => version,
    setUserInfo: () => {},
    checkAndClearWorktabs: () => {},
    resetCredentials: () => {
      version++
      user.accessToken = ''
      guard.resetRouterState()
    },
    clearSession: () => {
      user.resetCredentials()
      void router.replace({ name: 'Login' })
    }
  }
  // data URL 模块无法直接访问测试闭包，通过唯一模块导出依赖绑定。
  globalThis.authRecoveryTest = {
    router,
    user,
    menu: {
      clearApplications: () => {},
      setApplicationList: () => {
        if (failureStage === 'after-register') throw new Error('初始化应用列表失败')
      },
      getHomePath: () => '/details',
      activateApplication: () => {}
    },
    profile: async () => {
      profileCalls++
      if (failureStage === 'profile') throw new Error('网络不可用')
      if (failureStage === '401') throw Object.assign(new Error('未授权'), { code: 401 })
      return { userId: 'user-a' }
    },
    getRoutes: async () => {
      menuCalls++
      if (failureStage === 'menu') throw new Error('菜单服务不可用')
      return [{ path: '/details' }]
    },
    registry: {
      isRegistered: () => registered,
      register: () => {
        registered = true
      },
      unregister: () => {
        registered = false
      }
    }
  }
  t.after(() => delete globalThis.authRecoveryTest)
  const stub = (source) => moduleUrl(source)
  const { setupBeforeEachGuard, ...guard } = await loadModule(guardSource, {
    nprogress: stub('export default { start() {} }'),
    '@/store/modules/user': stub(
      'export const useUserStore = () => globalThis.authRecoveryTest.user'
    ),
    '@/store/modules/menu': stub(
      'export const useMenuStore = () => globalThis.authRecoveryTest.menu'
    ),
    '@ao/admin-layout': stub('export const useWorktabStore = () => ({ validateWorktabs() {} })'),
    '@/api/auth': stub(
      'export const fetchGetUserInfo = () => globalThis.authRecoveryTest.profile()'
    ),
    '@/utils/navigation': stub('export const setWorktab = () => {}'),
    '@/utils/router': stub('export const setPageTitle = () => {}'),
    '@/utils/ui': stub('export const loadingService = { showLoading() {}, hideLoading() {} }'),
    '@/router/constants': stub("export const RoutePath = { Root: '/' }"),
    '@/router/services': stub(`
      export class MenuRouteService { getRoutes() { return globalThis.authRecoveryTest.getRoutes() } }
      export class RouteRegistry { constructor() { return globalThis.authRecoveryTest.registry } }
    `),
    '@/utils/http/status': stub('export const ApiStatus = { unauthorized: 401 }'),
    '@/utils/http/error': stub('export const isHttpError = (error) => error.code === 401')
  })
  const { default: recoveryPage } = await loadModule(pageSource, {
    vue: import.meta.resolve('vue'),
    'vue-router': stub(`
      export const useRouter = () => globalThis.authRecoveryTest.router
      export const useRoute = () => globalThis.authRecoveryTest.router.currentRoute.value
    `),
    'element-plus': stub('export const ElButton = {}'),
    '@/utils/navigation/login': redirectModule,
    '@imgs/svg/500.svg': stub("export default '500.svg'"),
    '../components/AoException.vue': stub('export default {}')
  })
  const page = () => recoveryPage.setup({}, { expose() {} })
  setupBeforeEachGuard(router)
  const target = '/details?record=42#summary'

  for (const stage of ['profile', 'menu', 'after-register']) {
    failureStage = stage
    await router.replace(target)
    assert.equal(router.currentRoute.value.name, 'Exception500')
    assert.equal(router.currentRoute.value.query.redirect, target)
    assert.equal(user.accessToken, 'valid-token')
    assert.equal(registered, false)
    assert.equal(guard.getPendingLoading(), false)
    const recovery = page()
    assert.equal(recovery.recoveryTarget.value, target)
    await recovery.retryInitialization()
    assert.equal(router.currentRoute.value.name, 'Exception500')
    assert.equal(router.currentRoute.value.query.redirect, target)
    assert.equal(recovery.loading.value, false)
  }

  failureStage = ''
  const callsBeforeRecovery = [profileCalls, menuCalls]
  const recovery = page()
  const firstRetry = recovery.retryInitialization()
  assert.equal(recovery.loading.value, true)
  await Promise.all([firstRetry, recovery.retryInitialization()])
  assert.equal(recovery.loading.value, false)
  assert.equal(router.currentRoute.value.fullPath, target)
  assert.equal(profileCalls, callsBeforeRecovery[0] + 1)
  assert.equal(menuCalls, callsBeforeRecovery[1] + 1)

  guard.resetRouterState()
  failureStage = 'profile'
  await router.replace('/500')
  await router.replace(target)
  user.resetCredentials()
  await page().retryInitialization()
  assert.equal(router.currentRoute.value.name, 'Login')
  assert.equal(router.currentRoute.value.query.redirect, target)

  user.accessToken = 'valid-token'
  failureStage = '401'
  await router.replace(target)
  assert.equal(router.currentRoute.value.name, 'Login')
  assert.equal(user.accessToken, '')

  await router.replace('/500')
  assert.equal(page().recoveryTarget.value, undefined)
  await router.replace({ name: 'Exception500', query: { redirect: '//evil.example' } })
  assert.equal(page().recoveryTarget.value, '/')

  const notices = []
  globalThis.authRecoveryTest.notices = notices
  user.setToken = (token) => {
    version++
    user.accessToken = token
    guard.resetRouterState()
  }
  const loginScript = compileScript(
    parse(await sourceFile('views/auth/login/index.vue')).descriptor,
    {
      id: 'login-recovery'
    }
  ).content
  const { default: loginPage } = await loadModule(loginScript, {
    vue: import.meta.resolve('vue'),
    'vue-router': stub(`
      export const useRouter = () => globalThis.authRecoveryTest.router
      export const useRoute = () => globalThis.authRecoveryTest.router.currentRoute.value
    `),
    'element-plus': stub(`
      export const ElButton = {}, ElForm = {}, ElFormItem = {}, ElInput = {}
      export const ElMessage = {
        success: (message) => globalThis.authRecoveryTest.notices.push(message),
        error: (message) => globalThis.authRecoveryTest.notices.push(message)
      }
    `),
    '@/store/modules/user': stub(
      'export const useUserStore = () => globalThis.authRecoveryTest.user'
    ),
    '@/utils/http/error': stub('export class HttpError extends Error {}'),
    '@/api/auth': stub(`export const fetchLogin = async () => ({
      accessToken: 'new-token', expiresAt: Math.floor(Date.now() / 1000) + 60
    })`),
    '@/utils/navigation/login': redirectModule,
    './components/AuthTopBar.vue': stub('export default {}'),
    './components/LoginLeftView.vue': stub('export default {}')
  })
  for (const stage of ['menu', '']) {
    await router.replace({ name: 'Login', query: { redirect: target } })
    failureStage = stage
    const login = loginPage.setup({}, { expose() {} })
    login.formRef.value = { validate: async () => true }
    login.formData.username = 'admin'
    login.formData.password = 'password'
    await login.handleSubmit()
    assert.equal(router.currentRoute.value.name, stage ? 'Exception500' : 'Details')
    assert.equal(login.formData.password, '')
    assert.equal(login.loading.value, false)
    assert.deepEqual(notices, stage ? [] : ['登录成功'])
  }
})
