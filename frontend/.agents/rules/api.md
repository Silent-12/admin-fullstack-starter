# 接口请求与响应

[返回主索引](../../AGENTS.md)。本文中的源码路径均相对仓库根目录。

- 所有 HTTP 请求必须通过 `src/utils/http/index.ts` 封装的默认 `request` 实例发起，统一经过请求 / 响应拦截器；禁止在业务代码中直接 `import axios from 'axios'` 自建实例。API 方法定义统一放置在 `src/api/` 下，按业务模块分文件，方法名以 `fetch` / `get` / `update` / `create` / `delete` 等动词开头。

- 后端响应数据结构在前端统一以 `BaseResponse<T>` 描述（定义于 `src/types/common/response.ts`，字段为 `code`、`msg`、`data`）；新增 API 方法的返回类型必须显式声明泛型 `T`，禁止使用 `any`。
