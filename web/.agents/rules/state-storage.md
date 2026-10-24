# 状态管理与持久化

> 作用域：`web/`（源码路径相对 `web/`）。规则入口：[web/AGENTS.md](../../AGENTS.md)。

## Store 模块

- 状态管理使用 Pinia；模块定义在 `src/store/modules/` 下，每个 store 一个文件，命名与业务域对应（`user.ts`、`menu.ts`）。
- `setting` 与 `worktab` 由 `@ao/admin-layout` 提供；禁止在本目录重复实现。

## 持久化

- 持久化统一使用 `pinia-plugin-persistedstate`，插件已在 `src/store/index.ts` 注册；状态变化自动持久化，禁止调用 `$persist()`。
- `persist` 是 `defineStore` 配置项：Setup Store 放在第三个参数，Options Store 放在第二个参数。
- 持久化 key 必须使用稳定且唯一的业务域名称，禁止拼接版本号。
- 只需持久化部分字段时使用 `pick` 或 `omit`。
- 临时会话状态使用 `sessionStorage`；需跨浏览器刷新与重新打开页面保留的用户偏好使用 `localStorage`。
- 业务状态持久化必须通过 `persist` 实现；禁止在业务代码中直接调用 `localStorage.getItem/setItem/removeItem`。
- 仅少数基础配置或跨登录态辅助场景允许直接操作 `localStorage`（如主题键 `StorageConfig.THEME_KEY` 对应 `sys-theme`）。
- 直接操作 `localStorage` 时键名必须引用 `StorageConfig` 常量（定义于 `src/utils/storage/storageConfig.ts`）；禁止硬编码字符串键名。
- 标签页归属 UUID 使用 `sessionStorage` 的 `StorageConfig.WORKTAB_OWNER_KEY`，与工作区保持相同生命周期。
- 仅在 profile 验证后比较并更新该 UUID；禁止依赖退出时才记录的运行时资料。

### Pinia persist 示例

```ts
export const usePreferenceStore = defineStore(
  'preferenceStore',
  () => {
    const theme = ref('light')
    return { theme }
  },
  { persist: { key: 'preference', storage: localStorage, pick: ['theme'] } }
)
```
