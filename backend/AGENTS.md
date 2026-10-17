# 规则加载与优先级

- 在新增或修改代码前，先检查项目根目录是否存在 `.agents` 目录；存在时读取与任务直接相关的 `rules` 和 `skills`。任务不涉及的规则无需加载。
- 跨端共用的技能（提交信息生成、改动说明生成、代码审查、编码行为准则、TypeDoc 注释规范）位于仓库根 `.agents/skills/`，按需读取；本目录 `.agents/` 仅保留后端专项规则与技能。
- 项目内规则冲突时，优先采用本文件中更具体且更贴近任务的约束；用户明确要求和外部系统规则按其自身优先级处理。无法安全判断时先说明冲突。
- 修改前先搜索已有实现、工具和常量；能够复用时不得重复实现。
- 当需求存在多个合理实现，且选择会实质影响接口语义、数据结构、兼容性、版本策略或业务流程时，先向用户确认；普通实现细节可依据现有代码和合理假设推进。需要确认时默认一次只提出一个相互关联的问题。

# 通用规则

- 本子项目（`admin-fullstack-starter/backend`）技术栈为 NestJS、MySQL、Redis、TypeORM 与 TypeScript；调试命令必须兼容 Windows。
- 新增或修改公共 API、Controller、Service、Entity 或复杂逻辑时，保留有效既有注释并使用 `/** */` JSDoc。JSDoc 应包含 `@description`；仅在存在参数时写 `@param`，仅在返回值需要说明时写 `@returns`。简单私有函数、构造函数、接口实现或可从上下文直接理解的代码可省略重复注释。
- 函数保持单一职责；在入口处对非法输入、异常状态和不满足条件提前返回或抛错，避免深层嵌套。
- 新增跨模块常量前，先检索 `src/common/constants`。公共常量使用普通对象字面量和 JSDoc，禁止散落同义常量。
- 详细异常只能写入产生异常的类或集中异常过滤器的 `Logger`；业务代码不得使用 `console`，启动脚本、CLI 或一次性诊断允许使用 `console.error/warn`。不得向接口响应透传原始错误、堆栈、SQL 或第三方响应细节。
- 面向业务的 JSON HTTP API 默认使用 `ApiResponseDto`，至少包含 `code`、`message`、`data`。页码分页列表统一返回 `data: { list, pagination: { page, pageSize, total, totalPages } }`。文件下载、流式响应、SSE、Webhook、健康探针及 `204 No Content` 等按其协议返回。
- 创建、编辑、更新、删除类接口的成功响应统一返回 `data: null`，不得在写操作响应中暴露完整实体或数据库记录；列表和详情接口可在 `data` 中返回业务数据。若业务确实需要返回新建资源，必须明确设计独立的详情查询接口或经用户确认采用例外响应。
- 接口字段遵循最小化原则：只返回当前页面、流程和调用方确实需要的字段；禁止直接序列化 Entity 或透出数据库原始字段、内部状态、审计字段、敏感信息及无业务意义的冗余字段。新增字段必须有明确的调用方需求和脱敏判断。
- 对外接口非必要不得暴露或使用数据库自增 `id` 作为返回字段、路径参数或查询条件；优先使用业务编号、UUID 或其他稳定业务标识，避免对象可枚举和数据库规模信息泄露。后台内部接口在确有必要时可使用主键，但不得因此绕过权限校验。
- 可跨模块复用的纯 TypeScript 类型统一放在 `.d.ts` 文件：公共类型放 `src/common/types`，模块类型放 `src/types`。模块内部或局部类型可放在使用文件中；DTO、Entity 等运行时 class 必须保留在 `.ts` 文件。
- 删除内部实现可直接清理；删除对外接口、DTO 或响应字段属于破坏性变更，必须保留兼容版本或先确认调用方。
- 全局 API 前缀由 `.env` 的 `API_PREFIX` 提供，本子项目默认 `backend`；业务 Controller 必须显式使用 `v1/...`。破坏性接口变更新增 `v2/...`，不得覆盖 `v1`；非业务协议端点可按协议例外处理。
- 业务 Controller 必须使用 `@ApiTags` 和 `@ApiOperation`；方法 JSDoc 标题与 `@ApiOperation` 的业务动作保持一致。协议适配、内部回调等非业务端点按实际用途处理。
- 后台或管理端接口必须使用 `admin` 路径前缀，例如 `v1/admin/users`；对外用户端接口使用 `user` 目录分层。模块按使用方拆分为 `src/modules/<module>/admin` 与 `src/modules/<module>/user`，Controller、DTO、Service 等分别归入对应目录；跨端复用的领域能力放入明确的 `shared` 目录。未明确属于后台或用户端的基础模板模块可保留在模块根目录。认证协议端点（登录、登出、刷新令牌、当前用户信息与当前用户授权菜单）统一使用 `v1/auth/*`，不并入 `admin` 资源路径。
- 数据库表结构的唯一来源是 `src/**/entities` 下的 TypeORM 实体。本项目不维护 SQL 迁移文件，`document/migrations/` 与 `document/deployment-change-record.md` 已移除：新增或修改表结构直接改实体，并同步更新受影响的响应 DTO；新增实体必须注册到 `src/app.module.ts` 的条件化导入中，否则 `MYSQL_ENABLED=true` 时不会被加载；删除实体不会自动删表，只会留下孤儿表，需要时人工清理。
- `DB_SYNCHRONIZE=true` 时 TypeORM 会按实体与库表的差异直接执行 `ALTER` / `DROP`：删除实体字段即删除对应列且数据不可恢复，MySQL 的 DDL 隐式提交也使该过程无法回滚。因此该开关仅允许 development / test 环境开启，`src/config/database.config.ts` 会在其他环境启动阶段直接报错；共享或生产环境需要建表、改表时必须改由人工 SQL 执行，并在 `backend/README.md` 的「数据库结构策略」中写明执行顺序与核验方式。
- 首次部署到共享或生产环境前，必须从实体导出建表语句形成一份基线 SQL（含索引与外键）并纳入版本管理，由人工按环境执行；本项目尚未上线，当前不存在该文件，不得以「本地能跑」替代这一步。
- 分页查询统一继承 `src/common/dto/pagination-query.dto.ts` 的 `PaginationQueryDto`（`page`、`pageSize`，默认 `1` / `10`，上限 `100`）；分页元信息统一使用 `src/common/dto/pagination-meta.dto.ts` 的 `PaginationMetaDto`；列表接口的 `data` 统一为 `src/common/types/response.d.ts` 的 `PaginatedData<T>`（`{ list, pagination }`）。模块内不得重复声明 `page` / `pageSize`，也不得自行拼装分页结构。
- `src/config/app.config.ts` 新增实际生效的配置项时，同步补充 `.env`、`.env.example` 与非空校验策略。
- 导出接口必须使用独立的 `Export{ModuleName}Dto`，只包含导出筛选条件，不得复用带 `page`、`pageSize` 或其他分页语义的列表查询 DTO；只有确实存在导出接口时适用。
- 修改已有文件前先检查编码；发现 GBK、ANSI、乱码或 BOM 异常时先报告并转换。新增或修改源码文件使用 UTF-8 无 BOM；中文注释不得乱码。
- 完成 TypeScript 代码修改后必须执行 `pnpm run lint` 和 `pnpm run build`（在 `backend/` 目录执行，或在仓库根执行 `pnpm run lint:backend`、`pnpm run build:backend`），并修复错误；仅修改文档、SQL 或环境示例时执行与变更相称的检查。`pnpm run lint` 可能带自动修复，提交前应复查其改动并报告无法修复的环境问题。
