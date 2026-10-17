import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { createApp, nextTick } from 'vue'
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
  const dependencies = {
    vue: import.meta.resolve('vue'),
    pinia: import.meta.resolve('pinia'),
    '@/enums': moduleUrl("export const LanguageEnum = { ZH: 'zh' }"),
    '@/router': moduleUrl(
      'export const router = { replace: async () => {}, currentRoute: { value: {} } }'
    ),
    '@ao/admin-layout': layoutUrl,
    '@/utils/router': moduleUrl('export const setPageTitle = () => {}'),
    '@/router/guards/beforeEach': moduleUrl('export const resetRouterState = () => {}'),
    '@/utils/storage/storageConfig': moduleUrl(compile(storageSource))
  }
  const source = await readFile(new URL('../src/store/modules/user.ts', import.meta.url), 'utf8')
  const compiled = compile(source).replace(/from (['"])([^'"]+)\1/g, (_match, _quote, name) => {
    assert.ok(dependencies[name], `未配置被测 Store 的依赖：${name}`)
    return `from '${dependencies[name]}'`
  })
  return {
    ...(await import(moduleUrl(compiled))),
    ...(await import(layoutUrl))
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
const { useUserStore, useWorktabStore } = await loadStore()
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
