# TODO — 待补齐能力清单

> 本文档登记 `admin-fullstack-starter` 合并完成后**尚未打通**的能力与**前后端契约差异**。
> 记录时间：2026-10-06 ｜ 基线提交：`4b1cd65`
> 性质：问题登记与决策记录，不代表已排期。每项完成后请勾选，并在文末「变更记录」追加说明。
>
> 说明：本文档只描述**现状与目标契约**，所有结论均给出代码位置以便核对，不做实现假设。

---

## 0. 概览

| 编号 | 事项 | 影响面 | 阻塞关系 |
| --- | --- | --- | --- |
| **P0-1** | 后端缺少认证、用户、角色、菜单模块 | 前端 5 处页面与路由守卫无法脱离 Mock | 阻塞 P1-1（前端接线） |
| **P0-2** | 响应包裹字段 `msg` / `message` 不一致 | 成功提示失效；后端业务错误消息无法展示 | 与 P0-1 同期解决 |
| **P0-3** | 分页请求参数与响应结构不一致 | 用户/角色列表接口无法直接对接 | 与 P0-1 同期解决 |
| **P1-1** | 路径前缀、版本号、认证头不一致 | 请求无法路由到后端 | 阻塞联调 |
| **P1-2** | 前端 5 处调用点仍指向 `@/mock` | 页面数据为本地模拟数据 | 依赖 P0-1 |
| **P1-3** | 实体字段与序列化策略冲突 | 后端无法按现有规则直接返回前端所需字段 | 依赖 P0-1 |
| **P2-1** | 前端写操作（新增/编辑/删除）无接口 | 页面操作仅改本地状态，刷新即丢失 | 依赖 P0-1 |

**决策前置**：P0-2 与 P0-3 需要先确定「统一到哪一端的契约」，见 [2.3 三种修复方案对比](#23-三种修复方案对比需决策)。

---

## 1. 后端缺少认证与权限管理模块

### 1.1 现状

后端 `backend/src/modules/` 下只有两个模块：

| 模块 | 职责 | 与本文档的关系 |
| --- | --- | --- |
| `template-api` | CRUD 模板（仅在 `MYSQL_ENABLED=true` 时加载） | 无 |
| `access-log` | HTTP 访问日志持久化 | 无 |

**认证、用户、角色、菜单、权限五类能力全部缺失**，且后端当前没有任何鉴权守卫（无 JWT / Session / Guard）。`app.module.ts` 中注册的全局 Guard 只有 `ThrottlerGuard`（限流）。

### 1.2 前端已就绪的接口契约（后端需实现的目标）

前端已存在完整的 API 层与类型定义，但**尚未被页面调用**（见 [3.1](#31-待替换的调用点)）。以下是后端需要满足的契约。

#### 1.2.1 登录

| 项 | 内容 |
| --- | --- |
| 前端定义 | `frontend/src/api/auth.ts:9` |
| 类型 | `frontend/src/types/api/auth.d.ts:10`、`:21` |
| 方法与路径 | `POST /api/auth/login` |
| 请求体 | `{ userName: string, password: string }` |
| 响应 `data` | `{ token: string, refreshToken: string }` |

> 注：HTTP 封装会把 POST 的 `params` 自动降级为 `data` 并以 JSON body 发送（`frontend/src/utils/http/index.ts:177`），因此后端按请求体接收即可。

#### 1.2.2 当前用户信息

| 项 | 内容 |
| --- | --- |
| 前端定义 | `frontend/src/api/auth.ts:22` |
| 类型 | `frontend/src/types/api/auth.d.ts:32` |
| 方法与路径 | `GET /api/user/info` |
| 响应 `data` | `{ auth: string[], roles: string[], userId: number, userName: string, email: string, avatar?: string }` |

`auth` 是**权限标识列表**，供 `v-auth` 指令逐项校验（`frontend/src/directives/auth.ts:45`：`useUserStore().info.auth?.includes(binding.value)`）。该字段直接决定按钮级权限是否生效，不可省略或返回空数组，否则所有带 `v-auth` 的按钮都会被移出 DOM。

#### 1.2.3 用户列表

| 项 | 内容 |
| --- | --- |
| 前端定义 | `frontend/src/api/system-manage.ts:11` |
| 类型 | `frontend/src/types/api/system-manage.d.ts:13` |
| 方法与路径 | `GET /api/user/list` |
| 请求参数（query） | `current`、`size`，可选 `id`、`userName`、`userGender`、`userPhone`、`userEmail`、`status` |
| 响应 `data` | `{ records: UserListItem[], current: number, size: number, total: number }` |

`UserListItem` 字段（`frontend/src/types/api/system-manage.d.ts:13`）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | number | 用户 ID |
| `avatar` | string | 头像地址 |
| `status` | string | 用户状态，Mock 取值为 `'1'`/`'2'`/`'3'`/`'4'`，**语义待确认**（见 [5](#5-待确认问题)） |
| `userName` | string | 登录名 |
| `userGender` | string | 性别，Mock 取值为 `'男'`/`'女'` |
| `nickName` | string | 昵称 |
| `userPhone` | string | 手机号 |
| `userEmail` | string | 邮箱 |
| `userRoles` | string[] | 角色编码列表，如 `['R_SUPER']` |
| `createBy` / `createTime` / `updateBy` / `updateTime` | string | 审计字段 |

#### 1.2.4 角色列表

| 项 | 内容 |
| --- | --- |
| 前端定义 | `frontend/src/api/system-manage.ts:19` |
| 类型 | `frontend/src/types/api/system-manage.d.ts:61` |
| 方法与路径 | `GET /api/role/list` |
| 请求参数（query） | `current`、`size`，可选 `roleId`、`roleName`、`roleCode`、`description`、`enabled`、`startTime`、`endTime` |
| 响应 `data` | `{ records: RoleListItem[], current: number, size: number, total: number }` |

`RoleListItem` 字段：`roleId: number`、`roleName: string`、`roleCode: string`、`description: string`、`enabled: boolean`、`createTime: string`。

Mock 角色编码为 `R_SUPER` / `R_ADMIN` / `R_USER` / `R_FINANCE` / `R_ANALYST` / `R_SUPPORT` / `R_MARKETING` / `R_GUEST` / `R_MAINTAINER` / `R_PM`（`frontend/src/mock/system-manage.ts:43`），可作初始数据参考。

#### 1.2.5 菜单

| 项 | 内容 |
| --- | --- |
| 前端定义 | `frontend/src/api/system-manage.ts:31` |
| 方法与路径 | `GET /api/v3/system/menus/simple` |
| 响应 `data` | `AppRouteRecord[]`（`frontend/src/types/router/index.ts:70`） |

`AppRouteRecord` 结构要点：

- 继承 `RouteRecordRaw`，`component` 为**字符串路径**（如 `'/system/user'`），由前端 `RouteComponentLoader` 解析为实际组件，后端不能返回函数。
- `meta` 为 `RouteMeta`，关键字段：`title`、`icon`、`isHide`、`keepAlive`、`roles?: string[]`（角色级权限）、`authList?: { title: string; authMark: string }[]`（按钮级权限清单）。

**调用条件**：仅在 `VITE_ROUTE_SOURCE=dynamic` 时调用（`frontend/src/router/services/MenuRouteService.ts:16`）；当前 `.env` 配置为 `static`，即前端使用本地静态路由，该接口暂不触发。是否要切换到后端下发菜单需决策（见 [5](#5-待确认问题)）。

#### 1.2.6 权限模型总结

前端采用**两级权限**：

| 层级 | 载体 | 校验方式 |
| --- | --- | --- |
| 路由级 | `meta.roles: string[]` | 路由注册与守卫过滤 |
| 按钮级 | `meta.authList[].authMark` + `v-auth="authMark"` | 比对 `userInfo.auth` 数组 |

后端需提供与之对应的数据：用户 → 角色 → 菜单/权限点的映射关系，并在 `GET /api/user/info` 中聚合成扁平的 `auth: string[]` 与 `roles: string[]`。

### 1.3 需要新建的后端模块

按 `backend/AGENTS.md` 的目录与命名约定（后台接口使用 `admin` 前缀、模块按使用方拆分、`.d.ts` 放纯类型），建议结构：

```
backend/src/modules/
├── auth/
│   ├── admin/          # 登录、登出、刷新令牌、当前用户信息
│   └── shared/         # 令牌签发/校验、密码哈希、JWT 策略
├── user/
│   └── admin/          # 用户 CRUD、启用/禁用、重置密码、分配角色
├── role/
│   └── admin/          # 角色 CRUD、分配菜单权限
└── menu/
    └── admin/          # 菜单与权限点 CRUD、树形结构
```

同时需要：

1. **鉴权守卫**：新增全局 `AuthGuard`（或在需要的 Controller 上显式声明），并在 `app.module.ts` 注册。
2. **权限守卫**：基于 `authMark` 的接口级权限校验。
3. **公开端点白名单**：`/v1/health`、登录接口等需放行。
4. **`API_PREFIX` 与前端路径的对齐**：见 [2.2.4](#224-路径前缀与版本号)。

### 1.4 数据库表与迁移

后端使用 `SnakeNamingStrategy`（`backend/src/config/database-naming-strategy.ts`），实体 camelCase 字段自动映射 snake_case 列。

建议表结构（字段名为数据库列名）：

| 表 | 用途 | 关键列 |
| --- | --- | --- |
| `sys_user` | 用户 | `id`、`user_name`、`password`、`nick_name`、`user_gender`、`user_phone`、`user_email`、`avatar`、`status`、审计列 |
| `sys_role` | 角色 | `id`、`role_name`、`role_code`、`description`、`enabled`、审计列 |
| `sys_user_role` | 用户-角色关联 | `user_id`、`role_id` |
| `sys_menu` | 菜单与权限点（树形） | `id`、`parent_id`、`menu_type`（目录/菜单/按钮）、`title`、`icon`、`path`、`component`、`auth_mark`、`sort`、`is_hide`、`keep_alive`、审计列 |
| `sys_role_menu` | 角色-菜单关联 | `role_id`、`menu_id` |

迁移文件按 `backend/AGENTS.md` 要求放入 `backend/src/database/migrations/`，命名 `V{序号}__{描述}.sql`，且已执行迁移不得修改。

> 现有参考：`backend/src/database/migrations/V1__access_logs.sql`。

### 1.5 缺口：前端写操作尚无接口

用户、角色、菜单三个页面的**新增/编辑/删除当前只修改本地状态**，没有发起任何请求。例如：

- 用户注销：`frontend/src/views/system/user/index.vue:292` 仅弹确认框后提示成功。
- 角色删除：`frontend/src/views/system/role/index.vue:279` 同上。
- 菜单/权限增删改：`frontend/src/views/system/menu/index.vue:353`–`:438` 均为本地操作。

因此写接口属于**全新设计**，而非「替换 Mock」。设计时需遵守 `backend/AGENTS.md` 的既有约定：

- 写操作成功响应统一返回 `data: null`，不得回传完整实体。
- 导出接口需独立 DTO；分页 DTO 不得复用于导出。

### 1.6 验收标准

- [ ] 未登录访问任意后台接口返回 401，前端自动跳转登录页且不重复弹窗（前端已有 401 防抖，见 `frontend/src/utils/http/index.ts:108`）。
- [ ] `POST /api/auth/login` 使用真实账号密码可换取令牌，错误凭证返回明确的业务错误。
- [ ] `GET /api/user/info` 返回的 `auth` 非空时，`v-auth` 按钮按预期显示/隐藏。
- [ ] 用户、角色列表的分页、筛选、排序与后端数据一致。
- [ ] 数据库变更通过迁移文件落地，新库可由迁移脚本完整初始化。

---

## 2. 前后端响应契约不一致

### 2.1 汇总表

| 维度 | 前端期望 | 后端现状 | 代码位置 |
| --- | --- | --- | --- |
| 响应包裹字段 | `{ code, msg, data }` | `{ code, message, data, timestamp, traceId? }` | FE `frontend/src/types/common/response.ts:20`；BE `backend/src/common/dto/api-response.dto.ts:9` |
| 分页请求参数 | `current`、`size` | `page`、`pageSize` | FE `frontend/src/types/api/common.d.ts:5`；BE `backend/src/modules/template-api/dto/query-template-item.dto.ts:15` |
| 分页响应结构 | `{ records, current, size, total }` | `{ list, pagination: { page, pageSize, total, totalPages } }` | FE `frontend/src/types/api/common.d.ts:24`；BE `backend/src/modules/template-api/dto/pagination-meta.dto.ts:9` |
| 路径前缀 | `/api/...` | 全局前缀 `API_PREFIX`（默认 `backend`） | FE `frontend/.env.development:10`；BE `backend/.env.example` |
| 接口版本 | 混用 `/api/user/...` 与 `/api/v3/system/...` | 约定业务接口显式 `v1/...` | BE `backend/AGENTS.md` |
| 后台路径规范 | `/api/user/list`、`/api/role/list` | 约定 `v1/admin/users` 形式 | BE `backend/AGENTS.md` |
| 认证请求头 | `Authorization: <accessToken>`（原样，无 `Bearer ` 前缀） | 无鉴权实现 | FE `frontend/src/utils/http/index.ts:73` |
| 实体字段 | 需要 `id` 与审计字段 `createBy/updateBy/createTime/updateTime` | 规则要求最小化字段、不暴露自增 `id` | FE `frontend/src/types/api/system-manage.d.ts:13`；BE `backend/AGENTS.md` |

### 2.2 逐项分析

#### 2.2.1 响应包裹字段 `msg` / `message`

**事实**：前端三处读取 `msg`，后端返回 `message`。

| 位置 | 代码 | 用途 |
| --- | --- | --- |
| `frontend/src/utils/http/index.ts:91` | `const { code, msg } = response.data` | 响应拦截器判定业务状态 |
| `frontend/src/utils/http/index.ts:190` | `if (config.showSuccessMessage && res.data.msg)` | 成功提示 |
| `frontend/src/utils/http/error.ts:120` | `error.response?.data?.msg \|\| error.message` | 错误消息兜底 |

**实际影响（比字段名本身更值得关注）**：

1. **成功路径不受影响**。前端以 `code === 200` 判定成功（`index.ts:92`），后端成功响应 `code` 与 HTTP 状态码一致（`backend/src/common/interceptors/default-http-status.interceptor.ts:23` 将默认 201 改为 200），业务数据可正常解包返回。
2. **成功提示失效**。`res.data.msg` 为 `undefined`，`showSuccessMessage: true` 的接口不会弹出提示。
3. **后端业务错误消息无法展示给用户**。`frontend/src/utils/http/error.ts:132` 的取值优先级是：

   ```ts
   const message = statusCode
     ? getErrorMessage(statusCode)   // 按状态码映射 i18n 文案
     : errorMessage || $t('httpMsg.requestFailed')
   ```

   后端异常过滤器以**真实 HTTP 状态码**返回错误（`backend/src/common/filters/all-exceptions.filter.ts:67`：`response.status(status).json(errorResponse)`），因此 `statusCode` 恒为真值，前端**永远走 i18n 分支**，后端返回的 `message` 被丢弃。

   > 结论：仅把 `message` 改名为 `msg` 并不能让后端错误消息透出。若希望展示「用户名或密码错误」这类具体提示，必须同时调整 `error.ts` 的优先级策略。这是一个**产品行为决策**，不是单纯的字段重命名。

#### 2.2.2 分页请求参数

前端以 `current` / `size` 传参（`CommonSearchParams`，`frontend/src/types/api/common.d.ts:18`），后端查询 DTO 定义为 `page` / `pageSize`（`query-template-item.dto.ts:15`、`:23`）。

**影响**：后端 `page`/`pageSize` 均为可选，缺失时走默认值，因此**不会报错，但分页参数静默失效**——用户翻页时始终拿到第一页数据。这类问题在联调时容易被误判为「接口正常」。

#### 2.2.3 分页响应结构

| 前端字段 | 后端字段 | 差异 |
| --- | --- | --- |
| `records` | `list` | 名称不同 |
| `current` | `pagination.page` | 名称与嵌套层级均不同 |
| `size` | `pagination.pageSize` | 同上 |
| `total` | `pagination.total` | 嵌套层级不同 |
| — | `pagination.totalPages` | 前端无对应字段 |

**影响**：前端 `records` 为 `undefined`，列表渲染直接为空；`total` 取不到导致分页组件总数为 0。

#### 2.2.4 路径前缀与版本号

| 环节 | 当前值 | 问题 |
| --- | --- | --- |
| 前端 baseURL | dev：`VITE_API_URL=/`；prod：Apifox Mock 地址 | 生产仍指向 Mock |
| Vite 代理 | `'/api' → VITE_API_PROXY_URL`，**未配置 `rewrite`** | 转发时保留 `/api` 前缀 |
| 后端全局前缀 | `API_PREFIX`（默认 `backend`） | 与 `/api` 不匹配 |
| 菜单接口版本 | 前端 `/api/v3/system/menus/simple` | 后端约定业务接口使用 `v1` |
| 后台路径规范 | 前端 `/api/user/list`、`/api/role/list` | 后端约定 `v1/admin/users` 形式（资源路径 + admin 段） |

需要统一的有三件事：**前缀名**（`api` vs `backend`）、**版本号**（`v1` vs `v3`）、**路径风格**（`user/list` vs `admin/users`）。三者可独立决策，但必须一次对齐。

#### 2.2.5 认证请求头

前端注入方式为原样写入令牌：

```ts
// frontend/src/utils/http/index.ts:73
if (accessToken) request.headers.set('Authorization', accessToken)
```

即请求头形如 `Authorization: mock-access-token`，**没有 `Bearer ` 前缀**。后端解析策略需与之匹配，或改为标准 `Bearer` 形式（后者需同步修改前端）。

#### 2.2.6 实体字段与序列化策略冲突

`backend/AGENTS.md` 明确规定：接口字段最小化、**禁止直接序列化 Entity**、非必要不得暴露数据库自增 `id`、新增字段必须有明确调用方需求。

而前端 `UserListItem` 需要 `id` 与 `createBy`/`createTime`/`updateBy`/`updateTime` 等审计字段。两者需要在设计阶段显式取舍：

- 若沿用后端规则，则应为每个列表接口单独设计响应 DTO，并考虑用业务编号替代自增 `id`（前端类型需同步调整）。
- 若前端确实需要 `id` 与审计字段，需在 `backend/AGENTS.md` 中记录为例外，避免规则与实际实现脱节。

### 2.3 三种修复方案对比（需决策）

| 方案 | 做法 | 优点 | 缺点 |
| --- | --- | --- | --- |
| **A. 统一到后端契约**（改前端） | 前端 `BaseResponse` 改 `message`，`PaginatedResponse` 改 `{ list, pagination }`，请求参数改 `page`/`pageSize` | 后端契约信息更完整（含 `totalPages`、`timestamp`、`traceId`）；后端规则文件已固化该约定，无需改动规则 | 前端 `utils/http`、`types/api`、以及使用分页数据的表格配置均需调整 |
| **B. 统一到前端契约**（改后端） | 后端 `ApiResponseDto.message` 改名 `msg`，分页改为 `records`/`current`/`size`/`total` | 前端改动最小 | 与 `backend/AGENTS.md` 中已固化的多条约定冲突，需同步改规则文件；`totalPages` 等能力需另找位置承载 |
| **C. 前端加适配层**（两端都不动） | 在响应拦截器中做字段映射 | 两端模板零改动 | 隐式转换使两端规则文件与实际行为脱节，排障成本高；映射逻辑需长期维护，属于技术债 |

**倾向意见（待确认）**：建议采用 **方案 A**。理由是后端契约的语义更完整，且 `backend/AGENTS.md` 已把 `code/message/data` 与 `list/pagination/page/pageSize` 写为项目规范——改后端等于同时改规则，成本与风险都高于改前端。方案 C 应排除：它会让两份规则文件都失去约束力。

> 该倾向仅为建议，最终口径需 HLH 确认后再动代码。

### 2.4 决策记录

| 决策项 | 结论 | 决策人 | 日期 |
| --- | --- | --- | --- |
| 契约统一方向（A/B/C） | 待定 | | |
| 路径前缀（`api` / `backend`） | 待定 | | |
| 接口版本（`v1` / `v3`） | 待定 | | |
| 后台路径风格（`user/list` / `admin/users`） | 待定 | | |
| 认证头格式（原样 / `Bearer`） | 待定 | | |
| 后端错误消息是否透出到界面 | 待定 | | |

---

## 3. 前端接线（Mock → 真实接口）

### 3.1 待替换的调用点

`frontend/src/api/` 下的接口封装已完成，但页面仍在导入 `@/mock`。需替换的位置共 6 处：

| 序号 | 文件与行号 | 当前导入 | 应替换为 |
| --- | --- | --- | --- |
| 1 | `frontend/src/views/auth/login/index.vue:86` | `fetchLogin` from `@/mock` | `@/api/auth` |
| 2 | `frontend/src/router/guards/beforeEach.ts:10` | `fetchGetUserInfo` from `@/mock` | `@/api/auth` |
| 3 | `frontend/src/views/system/user/index.vue:77` | `fetchGetUserList` from `@/mock` | `@/api/system-manage` |
| 4 | `frontend/src/views/system/role/index.vue:69` | `fetchGetRoleList` from `@/mock` | `@/api/system-manage` |
| 5 | `frontend/src/views/system/menu/index.vue:84` | `fetchGetMenuList` from `@/mock` | `@/api/system-manage` |
| 6 | `frontend/src/views/system/user/components/UserDialog.vue:53` | `ROLE_LIST_DATA` from `@/mock` | 需新增角色下拉数据接口 |

> 第 6 项需要注意：`UserDialog` 直接引用了 Mock 导出的常量数组，而不是通过接口获取。接线时需为「角色下拉选项」确定数据来源（复用角色列表接口，或新增精简接口）。

### 3.2 环境变量

| 文件 | 变量 | 当前值 | 待办 |
| --- | --- | --- | --- |
| `frontend/.env.development:10` | `VITE_API_PROXY_URL` | `https://m1.apifoxmock.com/...` | 改为本地后端地址 |
| `frontend/.env.production:7` | `VITE_API_URL` | `https://m1.apifoxmock.com/...` | 改为真实生产地址 |
| `frontend/.env` | `VITE_ROUTE_SOURCE` | `static` | 若改为后端下发菜单则设为 `dynamic` |

另需确认 Vite 代理是否加 `rewrite`（`frontend/vite.config.ts` 的 `server.proxy['/api']` 当前未配置）。

---

## 4. 建议执行顺序

1. **先决策**：完成 [2.3](#23-三种修复方案对比需决策) 与 [2.4](#24-决策记录) 中的口径确认，避免返工。
2. **契约对齐**：按决策结果调整响应包裹、分页参数与结构；此步可先用 `template-api` 模块验证，因为它已具备完整 CRUD 与分页实现。
3. **打通链路**：统一前缀与版本号，改 `VITE_API_PROXY_URL`，用 `/v1/health` 验证代理连通。
4. **实现认证**：`auth` 模块 + 全局守卫 + 用户信息接口。这是后续所有模块的前置依赖。
5. **实现用户/角色/菜单模块**：先只读接口（列表、详情），让前端页面能脱离 Mock 渲染。
6. **前端接线**：替换 [3.1](#31-待替换的调用点) 的 6 处导入，删除对 `@/mock` 的依赖。
7. **补写接口**：实现新增/编辑/删除，同步改造页面写操作。
8. **收尾**：更新根 `README.md` 的「已知差距」章节，删除本文件中已完成项。

---

## 5. 待确认问题

以下问题会实质影响接口语义或数据结构，需在动手前确认：

1. **契约统一方向**：采用 [2.3](#23-三种修复方案对比需决策) 的方案 A、B 还是 C？
2. **路径前缀与版本**：前缀用 `api` 还是 `backend`？接口版本统一到 `v1`，还是保留 `/v3/system/menus/simple`？
3. **菜单下发方式**：保留前端静态路由（`VITE_ROUTE_SOURCE=static`），还是改为后端下发（`dynamic`）？后者需要后端完整实现菜单树接口。
4. **`status` 字段语义**：前端 `UserListItem.status` 的 `'1'`/`'2'`/`'3'`/`'4'` 分别代表什么？是否需要改为语义化枚举？
5. **认证方案**：使用 JWT 还是 Session？是否需要实现 `refreshToken` 刷新机制——前端已存储 `refreshToken`（`frontend/src/store/modules/user.ts:60`），但**当前没有任何刷新逻辑**。
6. **认证头格式**：接受前端的原样令牌（无 `Bearer` 前缀），还是改为标准 `Bearer` 形式？
7. **后端错误消息是否透出**：是否需要让后端返回的具体错误消息（如「用户名或密码错误」）展示给用户？若是，需调整 `frontend/src/utils/http/error.ts:132` 的取值优先级。
8. **主键暴露策略**：前端需要 `id`，后端规则倾向用业务编号或 UUID。是否将 `backend/AGENTS.md` 的例外情况记录在案，或改用业务标识？
9. **审计字段**：`createBy`/`updateBy`/`createTime`/`updateTime` 是否全部由后端返回？
10. **密码策略**：哈希算法（bcrypt / argon2）、初始密码与重置密码流程、是否强制首次登录改密。
11. **权限粒度**：除菜单与按钮权限外，是否需要数据权限（行级/部门级）？
12. **是否需要操作日志**：现有 `access-log` 只记录 HTTP 请求，是否还需要业务操作日志（谁改了什么）？

---

## 附：变更记录

| 日期 | 变更内容 | 提交 |
| --- | --- | --- |
| 2026-10-06 | 创建文档，登记 P0-1 ~ P2-1 共 7 项 | `4b1cd65` 之后 |
