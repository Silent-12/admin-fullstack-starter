# 后端规则入口

> 作用域：`backend/`（源码路径相对 `backend/`）。跨端契约、版本策略与根级约定以根规则为准。规则入口：[仓库规则入口](../AGENTS.md)。

## 规则加载与优先级

- 规则加载顺序、子项目入口、跨端任务读两端、共用技能归属、同名技能限制与冲突处理：见 [规则加载与优先级](../AGENTS.md#规则加载与优先级)。
- 多实现先确认、一次一问与冲突先说明：见 [确认门槛](../AGENTS.md#确认门槛)。
- 未上线阶段的直接改写、清理旧实现与禁止过度设计：见 [项目阶段与实现原则](../AGENTS.md#项目阶段与实现原则)。
- 依赖管理、依赖声明、脚本委托、命令兼容 Windows 与 Git 钩子提交：见 [根级工程约定](../AGENTS.md#根级工程约定)。
- 响应包裹、分页口径、`API_PREFIX`、认证头、授权口径、契约变更同步与接口版本策略：见 [跨端接口约定](../AGENTS.md#跨端接口约定)。

## 按任务加载

| 任务 | 规则 |
| --- | --- |
| 新增或修改注释、JSDoc、Swagger 描述 | [注释风格](.agents/rules/comment-style.md) |
| 抛出异常、错误响应、Swagger 错误声明、新增或修改日志 | [错误响应与诊断](.agents/rules/error-response.md) |
| 表结构、实体、字段与索引设计 | [数据库设计规范](.agents/skills/database-design/SKILL.md) |
| 实现取舍与复用判断 | [最小实现原则](../.agents/rules/ponytail.md) |
| `.d.ts` 类型声明与字段注释 | [TypeDoc 风格](../.agents/skills/typedoc-style/SKILL.md) |

## 通用实现约束

- 修改前必须检索已有实现与工具；实现阶梯与复用判断：见 [最小实现原则](../.agents/rules/ponytail.md)。
- 函数保持单一职责；在入口对非法输入、异常状态与不满足条件提前返回或抛错。
- 新增跨模块常量前检索 `src/common/constants`；公共常量使用普通对象字面量与 JSDoc；禁止散落同义常量。
- 新增或修改公共 API、Controller、Service、Entity 或复杂逻辑时保留有效既有注释并使用多行 `/** */` JSDoc；完整格式与可省略场景见 [注释风格](.agents/rules/comment-style.md#jsdoc-块格式)。
- 新增模块并注册到 `src/app.module.ts` 的 `imports` 数组时，必须在该模块前写 `/** */` 块注释：第一行为模块名标题行，第二行为普通说明行，不写 `@description`，两行均不加句号。
- `imports` 数组内每个模块导入前都必须有该注释；相邻元素之间不留空行。
- 可跨模块复用的纯 TypeScript 类型放入 `.d.ts`：公共类型放 `src/common/types`，模块类型放 `src/types`；DTO、Entity 等运行时 class 必须留在 `.ts` 文件。
- 删除内部实现可直接清理，无需兼容处理；变更或删除对外接口、DTO、响应字段：见 [跨端接口约定](../AGENTS.md#跨端接口约定)。

## 接口与响应约束

- 面向业务的 JSON HTTP API 必须使用 `ApiResponseDto`，至少包含 `code`、`message`、`data`；文件下载、流式响应、SSE、Webhook、健康探针与 `204 No Content` 按各自协议返回。
- 创建、编辑、更新、删除类接口的成功响应统一返回 `data: null`；列表与详情接口可在 `data` 返回业务数据。
- 写操作确需返回新建资源时，必须设计独立的详情查询接口，或经用户确认采用例外响应。
- 接口字段遵循最小化原则：只返回当前页面、流程与调用方确实需要的字段；禁止直接序列化 Entity，禁止透出数据库原始字段、内部状态、审计字段、敏感信息与无业务意义的冗余字段；新增字段必须有明确调用方需求与脱敏判断。
- 对外接口非必要不得暴露或使用数据库自增 `id` 作为返回字段、路径参数或查询条件；优先使用业务编号、UUID 或其他稳定业务标识；后台内部接口确有必要时可用主键，但不得绕过权限校验。
- 业务 Controller 必须使用 `@ApiTags` 与 `@ApiOperation`；方法 JSDoc 标题与 `@ApiOperation` 的业务动作保持一致；协议适配、内部回调等非业务端点按实际用途处理。
- 业务 Controller 必须显式声明 `v1/...` 路由；非业务协议端点按协议例外处理；路径前缀口径：见 [跨端接口约定](../AGENTS.md#跨端接口约定)。
- 模块按使用方拆分为 `src/modules/<module>/admin` 与 `src/modules/<module>/user`，Controller、DTO、Service 分别归入对应目录；跨端复用的领域能力放入 `shared` 目录；未明确归属后台或用户端的基础模板模块可保留在模块根目录。
- 导出接口必须使用独立的 `Export{ModuleName}Dto`，只包含导出筛选条件；禁止复用带 `page`、`pageSize` 或其他分页语义的列表查询 DTO；仅在存在导出接口时适用。
- 详细异常与错误响应：见 [错误响应与诊断](.agents/rules/error-response.md)。

## 数据与配置约束

- 数据库表结构以 `src/**/entities` 下的 TypeORM 实体为唯一来源；不维护 SQL 迁移文件；修改表结构直接改实体并同步受影响响应 DTO。
- 新增实体必须通过所属模块注册到 `src/app.module.ts` 的条件化导入。
- 删除实体不会自动删表；需要时人工清理遗留表。
- `DB_SYNCHRONIZE` 仅在 development / test 环境允许开启；共享或生产环境建表、改表必须使用人工 SQL，并在 [数据库结构策略](README.md#数据库结构策略) 记录执行顺序与核验方式。
- 首次部署到共享或生产环境前，必须从实体导出含索引与外键的基线 SQL，纳入版本管理并由人工按环境执行；不得以本地自动建表替代。
- 分页查询统一继承 `src/common/dto/pagination-query.dto.ts` 的 `PaginationQueryDto`；分页元信息统一使用 `src/common/dto/pagination-meta.dto.ts` 的 `PaginationMetaDto`；列表接口 `data` 统一为 `src/common/types/response.d.ts` 的 `PaginatedData<T>`。
- 模块内禁止重复声明 `page` / `pageSize`，禁止自行拼装分页结构。
- `src/config/app.config.ts` 新增实际生效的配置项时，同步补充 `.env`、`.env.example` 与非空校验策略。

## 编码与测试

- 源码文件编码与中文注释要求：见 [根级工程约定](../AGENTS.md#根级工程约定)。
- 测试按类型放入 `test/`（单元，`*.test.mjs`）与 `test-integration/`（集成，`*.integration.mjs`）。
- 测试由 `pnpm run test` / `pnpm run test:integration` 批量执行；禁止为单个测试用例新增 `package.json` 专用命令。

## 验证

- 完成 TypeScript 代码修改后必须执行 `pnpm run lint` 与 `pnpm run build`（在 `backend/` 执行，或在仓库根执行 `pnpm run lint:backend`、`pnpm run build:backend`），并修复全部错误。
- 仅修改文档、SQL 或环境示例时执行与变更相称的检查。
- `pnpm run lint` 可能带自动修复；提交前必须复查其改动。
- 无法修复的环境问题必须报告。
