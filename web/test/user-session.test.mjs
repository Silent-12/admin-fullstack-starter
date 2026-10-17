import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { createApp, effectScope, nextTick } from 'vue'
import { createPinia, disposePinia } from 'pinia'
import { createPersistedState } from 'pinia-plugin-persistedstate'
import ts from 'typescript'

const moduleUrl = (source) =>
  `data:text/javascript;base64,${Buffer.from(`${source}\n//# sourceURL=auth-session-test.js`).toString('base64')}`

/** 在内存中编译实际 Store，仅替换与本次会话行为无关的路由及布局 UI */
async function loadStore() {
  const storageSource = await readFile(
    new URL('../src/utils/storage/storageConfig.ts', import.meta.url),
    'utf8'
  )
  const compile = (source) =>
    ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
    }).outputText
  const layoutUrl = moduleUrl(`
    import { defineStore } from '${import.meta.resolve('pinia')}'
    export const useSettingStore = () => ({ $state: {} })
    export const useWorktabStore = defineStore('worktab', {
      state: () => ({ opened: [], keepAliveExclude: [] }),
      persist: {
        key: 'worktab',
        storage: {
          getItem: (key) => sessionStorage.getItem(key),
          setItem: (key, value) => sessionStorage.setItem(key, value)
        }
      }
    })
  `)
  const routerUrl = moduleUrl(`
    import { createRouter, createMemoryHistory } from '${import.meta.resolve('vue-router')}'
    export const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'Root', component: {} },
        { path: '/auth/login', name: 'Login', component: {} },
        { path: '/500', name: 'Exception500', component: {} },
        { path: '/details', name: 'Details', component: {} }
      ]
    })
  `)
  const dependencies = {
    vue: import.meta.resolve('vue'),
    pinia: import.meta.resolve('pinia'),
    '@/enums': moduleUrl("export const LanguageEnum = { ZH: 'zh' }"),
    '@/router': routerUrl,
    '@ao/admin-layout': layoutUrl,
    '@/utils/router': moduleUrl('export const setPageTitle = () => {}'),
    '@/router/guards/beforeEach': moduleUrl('export const resetRouterState = () => {}'),
    '@/utils/storage/storageConfig': moduleUrl(compile(storageSource)),
    '@/utils/navigation/login': moduleUrl(
      compile(await readFile(new URL('../src/utils/navigation/login.ts', import.meta.url), 'utf8'))
    )
  }
  const resolveImports = (source) =>
    compile(source).replace(/from (['"])([^'"]+)\1/g, (_match, _quote, name) => {
      assert.ok(dependencies[name], `未配置被测 Store 的依赖：${name}`)
      return `from '${dependencies[name]}'`
    })
  const source = await readFile(new URL('../src/store/modules/user.ts', import.meta.url), 'utf8')
  const storeUrl = moduleUrl(resolveImports(source))
  dependencies['@/store/modules/user'] = storeUrl
  dependencies['./storageConfig'] = dependencies['@/utils/storage/storageConfig']
  const sessionSource = await readFile(
    new URL('../src/utils/storage/user-session.ts', import.meta.url),
    'utf8'
  )
  return {
    ...(await import(storeUrl)),
    ...(await import(layoutUrl)),
    ...(await import(routerUrl)),
    ...(await import(moduleUrl(resolveImports(sessionSource))))
  }
}

/** 独立模拟 localStorage 与各标签页的 sessionStorage，不接触浏览器真实数据 */
function memoryStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear()
  }
}

globalThis.localStorage = memoryStorage()
const { useUserStore, useWorktabStore, router, setupUserSession } = await loadStore()
const profile = (id) => ({ userId: id, userName: id, name: id, roles: [], auth: [] })

/** 安装真实 Pinia 持久化插件，重建实例即模拟页面重载 */
function startPage() {
  const pinia = createPinia().use(createPersistedState())
  createApp({}).use(pinia)
  return { pinia, user: useUserStore(pinia), tabs: useWorktabStore(pinia) }
}

/** 建立 A 的已验证会话，并持久化带参数的标签页及缓存状态 */
async function loginAndOpenTabs() {
  const page = startPage()
  page.user.setToken('token-a', Math.floor(Date.now() / 1000) + 60)
  page.user.setUserInfo(profile('user-a'))
  page.user.checkAndClearWorktabs()
  page.tabs.opened = [{ path: '/details', query: { record: 'user-a-data' } }]
  page.tabs.keepAliveExclude = ['Details']
  await nextTick()
  return page
}

test('重载后失效与换账号时隔离标签页，资料仍须重新获取', async (t) => {
  for (const reason of ['本地令牌到期', '服务端返回 401']) {
    await t.test(reason, async () => {
      localStorage.clear()
      globalThis.sessionStorage = memoryStorage()
      const original = await loginAndOpenTabs()
      if (reason === '本地令牌到期') {
        original.user.expiresAt = Math.floor(Date.now() / 1000) - 1
        await nextTick()
      }
      disposePinia(original.pinia)
      const reloaded = startPage()
      assert.deepEqual(reloaded.user.info, {})
      assert.equal(reloaded.tabs.opened.length, 1)
      if (reason === '本地令牌到期') assert.equal(reloaded.user.hasValidSession(), false)
      reloaded.user.clearSession()
      reloaded.user.setToken('token-b', Math.floor(Date.now() / 1000) + 60)
      reloaded.user.setUserInfo(profile('user-b'))
      reloaded.user.checkAndClearWorktabs()
      assert.deepEqual(reloaded.tabs.opened, [])
      assert.deepEqual(reloaded.tabs.keepAliveExclude, [])
      disposePinia(reloaded.pinia)
    })
  }
})

test('重载并验证为同一账号时保留标签页与缓存状态', async () => {
  localStorage.clear()
  globalThis.sessionStorage = memoryStorage()
  const original = await loginAndOpenTabs()
  disposePinia(original.pinia)
  const reloaded = startPage()
  reloaded.user.setUserInfo(profile('user-a'))
  reloaded.user.checkAndClearWorktabs()
  assert.equal(reloaded.tabs.opened[0].query.record, 'user-a-data')
  assert.deepEqual(reloaded.tabs.keepAliveExclude, ['Details'])
  disposePinia(reloaded.pinia)
})

test('每个标签页独立检查所属用户，其他页先完成切换也不能跳过清理', async () => {
  localStorage.clear()
  const firstStorage = memoryStorage()
  const secondStorage = memoryStorage()
  globalThis.sessionStorage = firstStorage
  const firstOriginal = await loginAndOpenTabs()
  disposePinia(firstOriginal.pinia)
  const first = startPage()
  globalThis.sessionStorage = secondStorage
  const secondOriginal = await loginAndOpenTabs()
  disposePinia(secondOriginal.pinia)
  const second = startPage()

  for (const [page, storage] of [
    [first, firstStorage],
    [second, secondStorage]
  ]) {
    globalThis.sessionStorage = storage
    if (page === first) page.user.setToken('token-b', Math.floor(Date.now() / 1000) + 60)
    else {
      page.user.$hydrate({ runHooks: false })
      page.user.invalidateSession()
      assert.equal(page.user.accessToken, 'token-b')
    }
    // 收到新令牌不代表 profile 已验证，此时不得覆盖工作区归属。
    page.user.checkAndClearWorktabs()
    assert.equal(page.tabs.opened.length, 1)
    page.user.setUserInfo(profile('user-b'))
    page.user.checkAndClearWorktabs()
    assert.deepEqual(page.tabs.opened, [])
    assert.deepEqual(page.tabs.keepAliveExclude, [])
    await nextTick()
    disposePinia(page.pinia)
  }
})

test('无法确认归属的已有标签页在 profile 验证后清空', () => {
  localStorage.clear()
  globalThis.sessionStorage = memoryStorage()
  const page = startPage()
  page.tabs.opened = [{ path: '/details', query: { record: 'unknown-owner' } }]
  page.user.checkAndClearWorktabs()
  assert.equal(page.tabs.opened.length, 1)
  page.user.setUserInfo(profile('user-b'))
  page.user.checkAndClearWorktabs()
  assert.deepEqual(page.tabs.opened, [])
  disposePinia(page.pinia)
})

/**
 * @description 安装实际会话监听，用虚拟时钟和事件队列控制跨标签页先后顺序
 */
async function startSessionListener(t, { expired = false, duration = 60 } = {}) {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1800000000000 })
  localStorage.clear()
  globalThis.sessionStorage = memoryStorage()
  const listeners = new Map()
  const previousWindow = globalThis.window
  globalThis.window = {
    location: { origin: 'http://localhost:3006' },
    addEventListener: (name, listener) => listeners.set(name, listener)
  }
  const page = await loginAndOpenTabs()
  page.user.expiresAt = Math.floor(Date.now() / 1000) + (expired ? -1 : duration)
  await nextTick()
  const target = '/details?record=42#summary'
  await router.replace({ name: 'Exception500', query: { redirect: target } })
  const scope = effectScope()
  t.after(() => {
    scope.stop()
    disposePinia(page.pinia)
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  })
  scope.run(setupUserSession)
  return {
    ...page,
    target,
    storageEvent: (event = {}) =>
      listeners.get('storage')({
        storageArea: localStorage,
        key: 'user',
        newValue: localStorage.getItem('user'),
        ...event
      })
  }
}

/** @description 等待持久化订阅与内存路由完成，不推进虚拟到期时间 */
async function flushSession() {
  await nextTick()
  await new Promise((resolve) => setImmediate(resolve))
}

test('自动到期保留恢复页的原路径、查询参数和 hash，启动时已过期也能恢复', async (t) => {
  for (const expired of [false, true]) {
    await t.test(expired ? '启动时已过期' : '实际到期回调', async (t) => {
      const page = await startSessionListener(t, { expired })
      if (!expired) t.mock.timers.tick(60000)
      await flushSession()
      assert.equal(router.currentRoute.value.name, 'Login')
      assert.equal(router.currentRoute.value.query.redirect, page.target)
      assert.equal(page.user.accessToken, '')
      assert.deepEqual(page.user.info, {})
      assert.equal(JSON.parse(localStorage.getItem('user')).accessToken, '')
    })
  }
})

test('旧到期回调与跨标签页事件的两种顺序均保留新会话，资料验证后才更新工作区归属', async (t) => {
  for (const eventFirst of [false, true]) {
    for (const userId of ['user-a', 'user-b']) {
      await t.test(`${eventFirst ? '事件先到' : '到期先到'} / ${userId}`, async (t) => {
        const page = await startSessionListener(t)
        const version = page.user.getSessionVersion()
        const replacement = {
          ...JSON.parse(localStorage.getItem('user')),
          accessToken: 'replacement-token',
          expiresAt: Math.floor(Date.now() / 1000) + 3600
        }
        // 其他标签页先写共享存储；本页的 storage 事件按指定顺序交付。
        localStorage.setItem('user', JSON.stringify(replacement))
        if (eventFirst) page.storageEvent()
        t.mock.timers.tick(60000)
        await flushSession()
        assert.equal(page.user.accessToken, replacement.accessToken)
        assert.equal(page.user.expiresAt, replacement.expiresAt)
        assert.equal(page.user.hasValidSession(), true)
        assert.deepEqual(page.user.info, {})
        assert.equal(router.currentRoute.value.path, '/')
        assert.equal(JSON.parse(localStorage.getItem('user')).accessToken, replacement.accessToken)
        assert.equal(page.user.getSessionVersion(), version + 1)
        assert.equal(page.tabs.opened.length, 1)
        assert.equal(sessionStorage.getItem('sys-worktab-owner'), 'user-a')

        page.storageEvent()
        await flushSession()
        assert.equal(page.user.getSessionVersion(), version + 1)
        page.user.setUserInfo(profile(userId))
        page.user.checkAndClearWorktabs()
        assert.equal(page.tabs.opened.length, userId === 'user-a' ? 1 : 0)
        assert.equal(sessionStorage.getItem('sys-worktab-owner'), userId)
      })
    }
  }
})

test('延迟的删除事件读取当前共享会话；真实删除和偏好变更分别清理及保留会话', async (t) => {
  for (const key of ['user', null]) {
    await t.test(key === null ? '清空存储事件' : '删除用户键事件', async (t) => {
      const page = await startSessionListener(t)
      const replacement = {
        ...JSON.parse(localStorage.getItem('user')),
        accessToken: 'replacement-token',
        expiresAt: Math.floor(Date.now() / 1000) + 3600
      }
      localStorage.setItem('user', JSON.stringify(replacement))
      page.storageEvent({ key, newValue: null })
      await flushSession()
      assert.equal(page.user.accessToken, replacement.accessToken)
      const version = page.user.getSessionVersion()
      page.user.setUserInfo(profile('user-b'))
      await router.replace('/details')
      localStorage.setItem('user', JSON.stringify({ ...replacement, language: 'en' }))
      page.storageEvent()
      await flushSession()
      assert.equal(page.user.language, 'en')
      assert.equal(page.user.info.userId, 'user-b')
      assert.equal(page.user.getSessionVersion(), version)
      assert.equal(router.currentRoute.value.path, '/details')

      localStorage.removeItem('user')
      page.storageEvent({ key, newValue: null })
      await flushSession()
      assert.equal(page.user.accessToken, '')
      assert.deepEqual(page.user.info, {})
      assert.equal(router.currentRoute.value.name, 'Login')
      assert.equal(router.currentRoute.value.query.redirect, undefined)
    })
  }
})

test('30 天会话分段计时，主动退出不回跳，自动到期回跳拒绝外站', async (t) => {
  await t.test('超过定时器上限仍按真实到期时间清理', async (t) => {
    const duration = 30 * 24 * 60 * 60
    const page = await startSessionListener(t, { duration })
    t.mock.timers.tick(2147483647)
    await flushSession()
    assert.equal(page.user.hasValidSession(), true)
    t.mock.timers.tick(duration * 1000 - 2147483647)
    await flushSession()
    assert.equal(router.currentRoute.value.name, 'Login')
    assert.equal(router.currentRoute.value.query.redirect, page.target)
  })
  await t.test('主动退出不携带恢复页地址', async (t) => {
    const page = await startSessionListener(t)
    page.user.clearSession()
    await flushSession()
    assert.equal(router.currentRoute.value.name, 'Login')
    assert.equal(router.currentRoute.value.query.redirect, undefined)
  })
  await t.test('外站回跳降级为首页', async (t) => {
    await startSessionListener(t)
    await router.replace({ name: 'Exception500', query: { redirect: '//evil.example' } })
    t.mock.timers.tick(60000)
    await flushSession()
    assert.equal(router.currentRoute.value.name, 'Login')
    assert.equal(router.currentRoute.value.query.redirect, '/')
  })
})
