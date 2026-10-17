# 状态管理与持久化

[返回主索引](../../AGENTS.md)。本文中的源码路径均相对 `frontend/` 目录。

- 状态管理使用 Pinia，模块定义在 `src/store/modules/` 下，每个 store 一个文件，命名与业务域对应（当前为 `user.ts`、`menu.ts`）；`setting` 与 `worktab` 由 `@ao/admin-layout` 提供，不在本目录重复实现；持久化通过 `pinia-plugin-persistedstate`，key 命名需语义清晰。
  - Pinia Setup Store 的持久化示例：
    ```ts
    import { defineStore } from 'pinia'
    import { ref } from 'vue'

    export const usePreferenceStore = defineStore(
      'preferenceStore',
      () => {
        const theme = ref('light')
        const draft = ref('')

        return { theme, draft }
      },
      {
        persist: {
          key: 'preference',
          storage: localStorage,
          pick: ['theme']
        }
      }
    )
    ```
  - `persist` 是 `defineStore` 的配置项：Setup Store 放在第三个参数，Options Store 放在第二个参数。插件已在 `src/store/index.ts` 注册；Store 状态变化后会自动持久化，业务代码不需要手动调用 `localStorage` 或 `$persist()`。
  - `key` 必须使用稳定且唯一的业务域名称，禁止拼接版本号；只需持久化部分字段时使用 `pick` 或 `omit`。临时会话状态使用 `sessionStorage`，需要跨浏览器刷新和重新打开页面保留的用户偏好才使用 `localStorage`。

- 本地存储（localStorage）操作规则：
  - 业务状态需要持久化时，必须通过 Pinia Store 的 `persist` 选项实现（`pinia-plugin-persistedstate`），key 使用语义清晰的业务域名称；禁止通过版本号拼接持久化 key 或自动迁移旧版本数据；**禁止在业务代码中直接调用 `localStorage.getItem/setItem/removeItem`**。
  - 仅在少数基础配置或跨登录态辅助场景才允许直接操作 localStorage（如主题键 `StorageConfig.THEME_KEY` 对应 `sys-theme`、上次登录用户 ID `StorageConfig.LAST_USER_ID_KEY` 对应 `sys-last-user-id`）；键名必须引用 `StorageConfig` 常量（定义于 `src/utils/storage/storageConfig.ts`），禁止硬编码字符串键名。
