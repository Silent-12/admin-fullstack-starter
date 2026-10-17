# TODO — 待补齐能力清单

> 本文档登记 `admin-fullstack-starter` 当前**尚未打通**的能力，并记录已冻结的契约口径与仍待确认的设计问题。
> 更新时间：2026-10-17 ｜ 本次基线：架构与契约清理（迁移机制移除、契约冻结）
> 性质：问题登记与决策记录，不代表已排期。每项完成后请勾选，并在文末「变更记录」追加说明。
>
> 说明：本文档只描述**现状与目标契约**，所有结论均给出代码位置以便核对，不做实现假设。

---

## 0. 概览

| 编号 | 事项 | 影响面 | 状态 / 阻塞关系 |
| --- | --- | --- | --- |
| **P0-1** | 后端缺少认证、用户、角色、菜单模块 | 前端 6 个页面与路由守卫取不到数据 | 阻塞 P1-3、P2-1；阻塞联调 |
| ~~P0-2~~ | ~~响应包裹字段 `msg` / `message` 不一致~~ | — | 已冻结：统一 `message` |
| ~~P0-3~~ | ~~分页请求参数与响应结构不一致~~ | — | 已冻结：`page`/`pageSize` + `{ list, pagination }` |
| ~~P1-1~~ | ~~路径前缀、版本号、认证头不一致~~ | — | 已冻结：`v1/admin/*`、`v1/auth/*`、`Bearer` |
| ~~P1-2~~ | ~~前端多处调用点指向 `@/mock`~~ | — | 已完成：`src/mock` 已删除，页面全部走 `src/api` |
| **P1-3** | 实体字段与「最小化字段」策略的取舍未定 | 后端列表接口的响应 DTO 尚未设计 | 依赖 P0-1 |
| **P2-1** | 前端写操作（新增/编辑/删除）无接口 | 页面操作仅改本地状态，刷新即丢失 | 依赖 P0-1 |
| **P2-2** | 共享 / 生产环境没有建库基线 SQL | 环境无法初始化 | **上线前必做** |

---

## 1. 后端缺少认证与权限管理模块（P0-1）

### 1.1 现状

后端 `backend/src/modules/` 下只有两个模块：

| 模块 | 职责 | 与本文档的关系 |
| --- | --- | --- |
| `template-api` | CRUD 模板（仅在 `MYSQL_ENABLED=true` 时加载），路径 `v1/admin/template-api` | 可作为新模块的结构参考 |
| `access-log` | HTTP 访问日志持久化，无查询接口 | 无 |

**认证、用户、角色、菜单、权限五类能力全部缺失**，后端当前没有任何鉴权守卫（无 JWT / Session / Guard）。`app.module.ts` 中注册的全局 Guard 只有 `ThrottlerGuard`（限流）。

### 1.2 前端已就绪的接口契约（后端需实现的目标）

前端 API 层与类型定义已按 §2 的冻结契约写好，但**后端接口一个都不存在**，页面调用会收到 404。

#### 1.2.1 登录

| 项 | 内容 |
| --- | --- |
| 前端定义 | `web/src/api/auth.ts:13` |
| 类型 | `web/src/types/api/auth.d.ts:10`、`:21` |
| 方法与路径 | `POST /backend/v1/auth/login` |
| 请求体 | `{ userName: string, password: string }` |
| 响应 `data` | `{ token: string, refreshToken: string }` |

> 注：HTTP 封装会把 POST 的 `params` 自动降级为 `data` 并以 JSON body 发送（`web/src/utils/http/index.ts:179`），因此后端按请求体接收即可。

#### 1.2.2 当前登录用户信息

| 项 | 内容 |
| --- | --- |
| 前端定义 | `web/src/api/auth.ts:28` |
| 类型 | `web/src/types/api/auth.d.ts:32` |
| 方法与路径 | `GET /backend/v1/auth/profile` |
| 响应 `data` | `{ auth: string[], roles: string[], userId: number, userName: string, email: string, avatar?: string }` |

`auth` 是**权限标识列表**，供 `v-auth` 指令逐项校验（`web/src/directives/auth.ts:43`：`useUserStore().info.auth?.includes(binding.value)`）。该字段直接决定按钮级权限是否生效，不可省略或返回空数组，否则所有带 `v-auth` 的按钮都会被移出 DOM。

#### 1.2.3 用户列表

| 项 | 内容 |
| --- | --- |
| 前端定义 | `web/src/api/system-manage.ts:15` |
| 类型 | `web/src/types/api/system-manage.d.ts:13` |
| 方法与路径 | `GET /backend/v1/admin/users` |
| 请求参数（query） | `page`、`pageSize`，可选 `id`、`userName`、`userGender`、`userPhone`、`userEmail`、`status` |
| 响应 `data` | `{ list: UserListItem[], pagination: { page, pageSize, total, totalPages } }` |

`UserListItem` 字段（`web/src/types/api/system-manage.d.ts:13`）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | number | 用户 ID，**是否暴露见 §5.1** |
| `avatar` | string | 头像地址 |
| `status` | string | 用户状态，取值 `'1'`/`'2'`/`'3'`/`'4'`，**语义待确认**（见 §5.2） |
| `userName` | string | 登录名 |
| `userGender` | string | 性别，取值 `'男'`/`'女'` |
| `nickName` | string | 昵称 |
| `userPhone` | string | 手机号 |
| `userEmail` | string | 邮箱 |
| `userRoles` | string[] | 角色编码列表，如 `['R_SUPER']` |
| `createBy` / `createTime` / `updateBy` / `updateTime` | string | 审计字段，**是否全部返回见 §5.3** |

#### 1.2.4 角色列表与角色下拉

| 项 | 内容 |
| --- | --- |
| 前端定义 | `web/src/api/system-manage.ts:27`（列表）、`:39`（下拉） |
| 类型 | `web/src/types/api/system-manage.d.ts:70`（列表）、`:61`（`RoleOption`） |
| 列表路径 | `GET /backend/v1/admin/roles` |
| 列表参数（query） | `page`、`pageSize`，可选 `roleId`、`roleName`、`roleCode`、`description`、`enabled`、`startTime`、`endTime` |
| 列表响应 `data` | `{ list: RoleListItem[], pagination: { page, pageSize, total, totalPages } }` |
| 下拉路径 | `GET /backend/v1/admin/roles/options` |
| 下拉响应 `data` | `RoleOption[]`，即 `{ roleCode: string, roleName: string }[]` |

`RoleListItem` 字段：`roleId: number`、`roleName: string`、`roleCode: string`、`description: string`、`enabled: boolean`、`createTime: string`。

角色下拉使用独立精简接口而非列表接口，避免「传 `pageSize=100` 把分页列表当选项数据源」的做法；后端实现时两者应是不同的响应 DTO。

#### 1.2.5 菜单

| 项 | 内容 |
| --- | --- |
| 前端定义 | `web/src/api/system-manage.ts:50`（管理树）、`:62`（当前用户菜单） |
| 方法与路径 | `GET /backend/v1/admin/menus/tree`（完整菜单与权限树，菜单管理页使用）；`GET /backend/v1/auth/menus`（当前用户可访问菜单，动态路由使用） |
| 响应 `data` | `AppRouteRecord[]`（`web/src/types/router/index.ts:70`） |

`AppRouteRecord` 结构要点：

- 继承 `RouteRecordRaw`，`component` 为**字符串路径**（如 `'/system/user'`），由前端 `RouteComponentLoader` 解析为实际组件，后端不能返回函数。
- `meta` 为 `RouteMeta`，关键字段：`title`、`icon`、`isHide`、`keepAlive`、`roles?: string[]`（角色级权限）、`authList?: { title: string; authMark: string }[]`（按钮级权限清单）。

**两个端点的区别**：管理树是「库里有哪些菜单」，用于菜单管理页的增删改；当前用户菜单是「这个人能看到哪些菜单」，需按角色过滤后下发。二者不得合并为一个接口——否则拥有菜单管理权限的人才能取到自己的路由。

**调用条件**：当前用户菜单仅在 `VITE_ROUTE_SOURCE=dynamic` 时调用（`web/src/router/services/MenuRouteService.ts:16`）；当前 `.env` 为 `static`，即前端使用本地静态路由，该接口暂不触发。是否切换到后端下发菜单需决策（见 §5.4）。

#### 1.2.6 权限模型总结

前端采用**两级权限**：

| 层级 | 载体 | 校验方式 |
| --- | --- | --- |
| 路由级 | `meta.roles: string[]` | 路由注册与守卫过滤 |
| 按钮级 | `meta.authList[].authMark` + `v-auth="authMark"` | 比对 `userInfo.auth` 数组 |

后端需提供与之对应的数据：用户 → 角色 → 菜单/权限点的映射关系，并在 `GET /v1/auth/profile` 中聚合成扁平的 `auth: string[]` 与 `roles: string[]`。

### 1.3 需要新建的后端模块

按 `backend/AGENTS.md` 的目录与命名约定（后台资源用 `admin` 前缀、认证协议端点用 `v1/auth/*`、模块按使用方拆分、`.d.ts` 放纯类型），建议结构：

```
backend/src/modules/
├── auth/
│   ├── admin/          # 登录、登出、刷新令牌、当前用户信息与授权菜单
│   └── shared/         # 令牌签发/校验、密码哈希、JWT 策略
├── user/
│   └── admin/          # 用户 CRUD、启用/禁用、重置密码、分配角色
├── role/
│   └── admin/          # 角色 CRUD、分配菜单权限、下拉选项
└── menu/
    └── admin/          # 菜单与权限点 CRUD、树形结构
```

同时需要：

1. **鉴权守卫**：新增全局 `AuthGuard`（或在需要的 Controller 上显式声明），并在 `app.module.ts` 注册。
2. **权限守卫**：基于 `authMark` 的接口级权限校验。
3. **公开端点白名单**：`/v1/health`、`/v1/auth/login` 等需放行。

### 1.4 数据库表与迁移

后端使用 `SnakeNamingStrategy`（`backend/src/config/database-naming-strategy.ts`），实体 camelCase 字段自动映射 snake_case 列。

> **表结构的维护方式已变更**：项目不再维护 SQL 迁移文件，`backend/document/migrations/` 与 `backend/document/deployment-change-record.md` 已于 2026-10-17 移除。表结构的唯一来源是 `src/**/entities` 下的 TypeORM 实体，本地开发用 `DB_SYNCHRONIZE=true` 自动建表（详见 [backend/README.md](backend/README.md) 的「数据库结构策略」）。

建议表结构（字段名为数据库列名）：

| 表 | 用途 | 关键列 |
| --- | --- | --- |
| `sys_user` | 用户 | `id`、`user_name`、`password`、`nick_name`、`user_gender`、`user_phone`、`user_email`、`avatar`、`status`、审计列 |
| `sys_role` | 角色 | `id`、`role_name`、`role_code`、`description`、`enabled`、审计列 |
| `sys_user_role` | 用户-角色关联 | `user_id`、`role_id` |
| `sys_menu` | 菜单与权限点（树形） | `id`、`parent_id`、`menu_type`（目录/菜单/按钮）、`title`、`icon`、`path`、`component`、`auth_mark`、`sort`、`is_hide`、`keep_alive`、审计列 |
| `sys_role_menu` | 角色-菜单关联 | `role_id`、`menu_id` |

落地要求：

1. 实体写在 `src/modules/<module>/entities/` 下，并在 `src/app.module.ts` 的条件化导入中注册模块（否则 `MYSQL_ENABLED=true` 时不会加载）。
2. 实施 P2-2（导出基线 SQL）时，必须包含上述表及其索引、外键与关联表唯一约束。
3. 初始化数据（角色编码 `R_SUPER` / `R_ADMIN` / `R_USER` 等，见原 Mock 记录 `web/src/mock/system-manage.ts`，该目录已删除，可在 git 历史中查阅）需要在基线 SQL 中给出幂等的 `INSERT ... ON DUPLICATE KEY UPDATE` 口径。

### 1.5 缺口：前端写操作尚无接口（P2-1）

用户、角色、菜单三个页面的**新增/编辑/删除当前只修改本地状态**，没有发起任何请求。例如：

- 用户注销：`web/src/views/system/user/index.vue:292` 仅弹确认框后提示成功。
- 角色删除：`web/src/views/system/role/index.vue:279` 同上。
- 菜单/权限增删改：`web/src/views/system/menu/index.vue:353`–`:438` 均为本地操作。

写接口属于**全新设计**，设计时须遵守 `backend/AGENTS.md` 的既有约定：

- 写操作成功响应统一返回 `data: null`，不得回传完整实体。
- 导出接口需独立 DTO；分页 DTO 不得复用于导出。
- 列表与详情使用显式响应 DTO，禁止直接序列化实体。

### 1.6 验收标准

- [ ] 未登录访问任意后台接口返回 401，前端自动跳转登录页且不重复弹窗（前端已有 401 防抖，见 `web/src/utils/http/index.ts:110`）。
- [ ] `POST /v1/auth/login` 使用真实账号密码可换取令牌，错误凭证返回明确的业务错误。
- [ ] `GET /v1/auth/profile` 返回的 `auth` 非空时，`v-auth` 按钮按预期显示/隐藏。
- [ ] 用户、角色列表的分页、筛选、排序与后端数据一致（请求 `page`/`pageSize`，响应 `list`/`pagination`）。
- [ ] 请求头 `Authorization: Bearer <token>` 可被后端正确解析。

---

## 2. 已冻结的前后端契约（2026-10-17）

契约已一次性对齐，两端不再存在字段名、分页参数或路径风格差异；后续实现必须按此口径，不得单端改动。

| 契约项 | 口径 | 前端落点 | 后端落点 |
| --- | --- | --- | --- |
| 响应包裹 | `{ code, message, data, timestamp, traceId? }`，成败以 HTTP 状态码判定 | `web/src/types/common/response.ts` | `backend/src/common/dto/api-response.dto.ts` |
| 分页请求 | `page`、`pageSize`（默认 `1` / `10`，上限 `100`） | `web/src/types/api/common.d.ts` | `backend/src/common/dto/pagination-query.dto.ts` |
| 分页响应 | `data: { list, pagination: { page, pageSize, total, totalPages } }` | 同上 | `backend/src/common/dto/pagination-meta.dto.ts`、`backend/src/common/types/response.d.ts` |
| 后台资源路径 | `/{API_PREFIX}/v1/admin/{资源}` | `web/src/api/system-manage.ts` | `v1/admin/*` |
| 认证协议端点 | `/{API_PREFIX}/v1/auth/*` | `web/src/api/auth.ts` | 待实现 |
| 认证头 | `Authorization: Bearer <token>` | `web/src/utils/http/index.ts:74` | 待实现 |
| 全局前缀 | `backend`（`API_PREFIX`） | `web/.env` / `.env.development` | `backend/.env` |

### 2.1 决策记录

| 决策项 | 结论 | 决策人 | 日期 |
| --- | --- | --- | --- |
| 契约统一方向 | **A：统一到后端契约**（后端 `message` / `list+pagination` / `page+pageSize` 为准则，前端适配） | 按「未上线 + 最佳实践」口径拍板 | 2026-10-17 |
| 路径前缀 | `backend`（与前端 `VITE_API_URL` 一致，保持不变） | 同上 | 2026-10-17 |
| 接口版本 | 业务接口统一 `v1`，废弃 `/v3/system/menus/simple` | 同上 | 2026-10-17 |
| 后台路径风格 | `v1/admin/{资源}`（`user/list`、`role/list` 风格废弃） | 同上 | 2026-10-17 |
| 认证端点归属 | 登录/登出/刷新/当前用户信息/授权菜单统一 `v1/auth/*`，不并入 `admin` | 同上 | 2026-10-17 |
| 认证头格式 | 标准 `Bearer` 形式，前端已在拦截器统一拼接 | 同上 | 2026-10-17 |
| 后端错误消息是否透出 | **是**：前端以 `error.response.data.message` 优先展示后端具体原因（`web/src/utils/http/error.ts:132`），状态码文案作为兜底 | 同上 | 2026-10-17 |
| 数据库变更机制 | **移除 SQL 迁移**：表结构以实体为唯一来源，`DB_SYNCHRONIZE` 仅限 development / test，非开发环境启动即报错；上线前另出基线 SQL（P2-2） | 同上 | 2026-10-17 |
| 契约版本兼容策略 | 项目尚未上线，一律直接破坏性变更，不保留 `v2` 兼容层与旧字段别名 | 同上 | 2026-10-17 |

---

## 3. 前端接线（Mock → 真实接口）

### 3.1 状态

已完成。`web/src/mock` 目录已删除，登录页、路由守卫与用户/角色/菜单管理页全部通过 `web/src/api/` 发起真实请求；`UserDialog` 的角色下拉改用独立的 `/v1/admin/roles/options`，不再引用 Mock 常量数组。

### 3.2 环境变量

| 文件 | 变量 | 当前值 | 待办 |
| --- | --- | --- | --- |
| `web/.env.development` | `VITE_API_PROXY_URL` | `http://localhost:3000` | 已指向本地后端 |
| `web/.env.production` | `VITE_API_URL` | `/backend` | 部署前替换为真实网关地址 |
| `web/.env` | `VITE_ROUTE_SOURCE` | `static` | 若改为后端下发菜单则设为 `dynamic`（见 §5.4） |

---

## 4. 建议执行顺序

1. **实现认证**：`auth` 模块 + 全局守卫 + `/v1/auth/profile`。这是后续所有模块的前置依赖。
2. **实现用户/角色/菜单模块**：先只读接口（列表、详情、下拉、菜单树），让前端页面能渲染；此步需同时落地 §5.1–§5.3 的字段口径。
3. **补写接口**：实现新增/编辑/删除，同步改造页面写操作（P2-1）。
4. **导出基线 SQL**（P2-2）：首次部署到共享或生产环境前必须完成。
5. **收尾**：更新根 `README.md` 的「已知差距」与本文件中已完成项。

---

## 5. 仍待确认的问题

以下问题未被「契约冻结」覆盖，会实质影响接口语义或数据结构，需在动手前确认：

1. **主键暴露策略**：前端 `UserListItem.id`、`RoleListItem.roleId` 需要主键，而 `backend/AGENTS.md` 倾向「非必要不暴露自增 `id`」。是记录为例外，还是改用业务编号/UUID 并同步改前端类型？
2. **`status` 字段语义**：前端用户状态的 `'1'`/`'2'`/`'3'`/`'4'` 分别代表什么？是否改为语义化枚举（可参考 `template-api` 的做法：模块 `constants/` 内单一真源 + DTO 校验共用）？
3. **审计字段**：`createBy`/`updateBy`/`createTime`/`updateTime` 是否全部由后端返回，`createTime` 用 ISO 字符串还是 Unix 时间戳？
4. **菜单下发方式**：保留前端静态路由（`VITE_ROUTE_SOURCE=static`），还是改为后端下发（`dynamic`）？后者需要完整实现 `/v1/auth/menus`。
5. **认证方案**：JWT 还是 Session？是否需要实现 `refreshToken` 刷新机制——前端已存储 `refreshToken`（`web/src/store/modules/user.ts:60`），但**当前没有任何刷新逻辑**。
6. **密码策略**：哈希算法（bcrypt / argon2）、初始密码与重置密码流程、是否强制首次登录改密。
7. **权限粒度**：除菜单与按钮权限外，是否需要数据权限（行级/部门级）？
8. **是否需要操作日志**：现有 `access-log` 只记录 HTTP 请求，是否还需要业务操作日志（谁改了什么）？

---

## 6. 已登记未修复项（已审计确认当前无引用，按「模板待用能力」保留）

| 项 | 现状 | 影响 |
| --- | --- | --- |
| `web/src/main.ts:31-47` 的 `import.meta.glob('@/assets/svg/**/*.svg')` | 所匹配的 `src/assets/svg/` 下无任何 `.svg`（真实 SVG 在 `src/assets/images/svg/`），`localSvgModules` 恒为空，传给 `AdminComponents` 的回调为空转 | 本地 SVG 解析能力实际不可用，需补充素材或调整匹配目录 |
| `web/package.json` 的 `xgplayer`、`vue-img-cutter`、`highlight.js` | 分别服务于 `AoVideoPlayer.vue`、`AoCutterImg.vue`、`v-highlight` 指令——三者均为待业务页面使用的模板能力 | 无（属预期预留） |
| `backend/src/common/redis/redis.service.ts` 的 `set`/`setIfAbsent`/`get`/`del` | 当前仅有 `getClient()` 与 `getStatus()` 被调用 | 无（属预期预留） |
| `backend/package.json` 的 `@types/ioredis@^4` | ioredis 实际为 v5（自带类型），该桩包为 v4 API 类型 | 暂无实际影响（`tsc` 通过）；建议后续移除 |
| `backend/src/modules/template-api/entities/template-item.entity.ts` 与 `backend/src/modules/access-log/entities/access-log.entity.ts` 的 bigint 主键 | 已裁定加列 transformer，把驱动按 `bigNumberStrings` 回传的字符串 `id` 归一为 `number`，使声明、Swagger 与运行时一致 | `Number()` 在超过 2^53 时丢精度；本脚手架的主键规模不触及，将来需要超大主键时应改用 string 约定 |

> 本节已于 2026-10-17 移除两处已解决问题：分页契约不一致（见 §2）、`template-api` 的 `status` 校验规则与实体注释矛盾（现由 `constants/template-item.constant.ts` 统一为 `active | inactive | archived` 单一真源）。

---

## 附：变更记录

| 日期 | 变更内容 | 提交 |
| --- | --- | --- |
| 2026-10-06 | 创建文档，登记 P0-1 ~ P2-1 共 7 项 | `4b1cd65` 之后 |
| 2026-10-17 | 统一包管理器为 pnpm：后端改用 pnpm 安装、新增 `backend/pnpm-workspace.yaml`（`allowBuilds` 放行 `@scarf/scarf`）、补齐未声明的 `dotenv`、删除 `backend/package-lock.json` | 已提交 |
| 2026-10-17 | 架构与契约清理：① 移除 SQL 迁移机制与部署变更记录（删除 `backend/document/`，表结构改由实体维护，`DB_SYNCHRONIZE` 增加非开发环境启动防线）；② 冻结并统一前后端契约（`message`、`page`/`pageSize`、`{ list, pagination }`、`v1/admin/*`、`v1/auth/*`、`Bearer`）；③ 分页 DTO 下沉 `backend/src/common/dto/`，列表响应统一 `PaginatedData<T>`；④ `template-api` 迁至 `v1/admin/template-api` 并消除 `status` 常量矛盾；⑤ 拆出角色下拉接口与「管理菜单树 / 当前用户菜单」两个端点 | 待提交 |
