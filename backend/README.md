# NestJS 后端模板项目 🚀

基于 NestJS 11 的企业级后端模板，集成 MySQL + TypeORM、Redis、Winston 日志、Knife4j / Swagger、限流与统一异常处理，提供可直接复用的模块结构与开发规范。

> **开发规则**：本目录的开发规则见 [`AGENTS.md`](AGENTS.md)，后端专项规则与技能位于 `.agents/`。本 README 只介绍项目与上手流程，**不构成规则来源**；两者不一致时以 `AGENTS.md` 为准。

## 📦 能力概览

- 通过 `MYSQL_ENABLED` / `REDIS_ENABLED` 条件化装载依赖模块，未启用时应用仍可启动。
- 统一响应包装、全局异常过滤器、Winston 访问日志、限流与健康检查。
- 后台认证：内置 admin 初始化、JWT 登录、profile 与全端登出。
- `template-api` 示例模块演示标准 CRUD、分页与显式响应 DTO。

## 🚀 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

后端在**没有 `.env`** 时也能启动：MySQL、Redis、限流与 HTTP 日志均为关闭状态，服务使用默认端口 `3000` 与 API 前缀 `backend`。需要接入数据库或 Redis 时复制示例文件：

```powershell
Copy-Item .env.example .env
```

变量清单以 [.env.example](.env.example) 为准；`src/config/app.config.ts` 的约定是「`.env` 中声明过的变量必须有非空值」，一旦写入变量就必须填写有效值，否则启动直接报错。

### 3. 启动开发服务

```bash
pnpm run start:dev
```

| 服务             | 地址                                                       |
| ---------------- | ---------------------------------------------------------- |
| 后端 API         | http://localhost:3000/backend                              |
| 健康检查         | http://localhost:3000/backend/v1/health                    |
| Knife4j 接口文档 | http://localhost:3000/backend/doc.html （仅开发/测试环境） |

开发或测试环境可通过 Knife4j 查看自动生成的接口文档，OpenAPI JSON 地址为 `http://localhost:3000/backend/api-json`。应用启动时会对已启用的 MySQL 与 Redis 执行 `ping`；开发和测试环境的健康检查返回最近一次连通性状态，生产环境仅返回服务存活状态。

### 4. 初始化管理员账号

需要实际登录时，先启用 MySQL 与 Redis 并配置 `JWT_SECRET`，然后在 `backend/` 中执行：

```bash
pnpm run admin:init
```

该命令先构建再运行，仅写入缺失的账号，不自动修改表结构，也不会覆盖已有密码；创建成功后终端仅显示一次随机密码。详见「后台认证」。

### 5. 构建生产版本

```bash
pnpm run build
pnpm run start:prod
```

## 📁 目录结构

```text
backend/
├── .agents/            # 后端专项规则与技能
├── src/
│   ├── common/         # 公共过滤器、日志、Redis、限流、健康检查与工具
│   ├── config/         # app / database / redis 配置与命名策略
│   ├── modules/        # 业务模块（auth/admin、template-api、access-log）
│   ├── types/          # 模块类型定义
│   ├── app.module.ts   # 应用主模块（条件化导入）
│   └── main.ts         # 应用入口
├── test/               # 单元测试（*.test.mjs）
├── test-integration/   # 集成测试（*.integration.mjs）
├── .env.example        # 环境变量示例
├── AGENTS.md           # 开发规则入口
└── package.json        # 依赖与脚本
```

模块分层、公共 DTO 与新增模块流程见 [AGENTS.md](AGENTS.md)；示例模块见 [template-api 模块说明](src/modules/template-api/README.md)。

## 🗄️ 数据库与 Redis

MySQL 与 Redis 均由环境变量开关控制；未启用 MySQL 时，所有依赖 TypeORM 的模块（含认证、`template-api`、`access-log`）都不会被加载，这是 `app.module.ts` 条件化导入的预期行为。连接参数与开关以 [.env.example](.env.example) 为准，Redis 用于缓存与认证相关状态。

### 数据库结构策略

表结构以 `src/**/entities` 下的 TypeORM 实体为准，不维护 SQL 迁移文件；开发约束见 [AGENTS.md](AGENTS.md)。

- 本地 development / test 环境可使用 `DB_SYNCHRONIZE=true` 自动建表或改表。启用 MySQL 后，其他环境开启该选项会阻止启动。自动同步可能直接执行 `ALTER` / `DROP`，删除实体字段可能删除对应列及其数据；MySQL DDL 隐式提交，不能依赖事务回滚恢复。
- 新实体需在所属模块注册，并将模块加入 `src/app.module.ts` 的 MySQL 条件化导入；删除实体不会自动删除库表，遗留表需要人工确认和清理。

共享或生产环境按以下顺序准备与核验：

1. 根据实体导出基线 SQL，覆盖表、索引与外键，纳入版本管理；执行前核对目标数据库、环境和 `DB_SYNCHRONIZE=false`。
2. 首次部署时人工执行基线 SQL；后续改表先更新实体，再准备与差异对应的人工 SQL，并在本节记录具体 SQL 文件、执行顺序及核验方式。
3. 执行后通过 `SHOW CREATE TABLE`、`SHOW INDEX` 等核对表结构、索引与外键，启动应用并验证受影响接口；不能只以健康检查通过作为结构变更完成的依据。

基线 SQL 的准备状态登记在根 [TODO.md](../TODO.md)，由该文件跟踪部署前待办。

## 后台认证

认证模块为后台用户提供登录、当前用户信息、全端登出与内置 admin 初始化，位于 `src/modules/auth/admin/`，随 MySQL 条件化导入。

- `pnpm run admin:init` 初始化 `admin` 账号：先构建再运行，仅写入缺失账号，重复/并发执行不覆盖密码，终端仅显示一次随机密码，且不修改表结构。
- 启用 MySQL 时必须同时启用 Redis，并配置非空 `JWT_SECRET`；MySQL 关闭时不加载认证模块。相关变量见 [.env.example](.env.example)。
- 认证接口为 `v1/admin/auth/login`、`profile`、`logout`（位于全局前缀之后）；请求与响应字段、错误语义以 Knife4j 文档和根 [AGENTS.md](../AGENTS.md#跨端接口约定) 为准。
- 回归：`pnpm run test` 运行 `test/` 下单元测试；`pnpm run test:integration` 运行 `test-integration/` 下集成测试，需要可创建测试库的 MySQL 与 Redis。

## 🧩 示例模块 template-api

`template-api` 演示标准 RESTful 开发模式：Controller / Service / DTO / Entity 分层、分页查询与显式响应 DTO。接口路径为 `/{API_PREFIX}/v1/admin/template-api`，请求与响应示例见 Knife4j 文档；模块结构与复制步骤见 [模块说明](src/modules/template-api/README.md)。新增业务模块按 [AGENTS.md](AGENTS.md) 的后台 / 用户端分层约定组织。

## ✅ 测试与检查

| 命令                        | 说明                                                    |
| --------------------------- | ------------------------------------------------------- |
| `pnpm run build`            | 构建生产版本                                            |
| `pnpm run lint`             | ESLint 检查并自动修复                                   |
| `pnpm run lint:check`       | ESLint 检查，不修改文件（适用于 CI）                    |
| `pnpm run format`           | 使用 Prettier 格式化 `src/**/*.ts`                      |
| `pnpm run format:check`     | 校验格式，不修改文件（适用于 CI）                       |
| `pnpm run test`             | 运行 `test/` 下单元测试（先构建）                       |
| `pnpm run test:integration` | 运行 `test-integration/` 下集成测试（需 MySQL / Redis） |

完整脚本以 [package.json](package.json) 为准；完成 TypeScript 修改后的必跑检查见 [AGENTS.md](AGENTS.md)。

## 💻 技术栈

- **运行时**：Node.js
- **框架**：NestJS 11.x
- **语言**：TypeScript 5.x
- **数据库**：MySQL + TypeORM（经 `@nestjs/typeorm` 接入）
- **缓存**：Redis + ioredis
- **日志**：Winston + nest-winston
- **验证**：class-validator + class-transformer
- **文档**：@nestjs/swagger + nestjs-knife4j-plus
- **限流与安全**：@nestjs/throttler、helmet

## 📋 开发规范

开发规则入口为 [AGENTS.md](AGENTS.md)，包含模块分层、接口前缀、响应 DTO、分页、JSDoc、编码与验证要求；代码风格以本目录 ESLint 与 Prettier 配置为准，提交信息与钩子由仓库根统一提供。本 README 只介绍项目，不重复登记接口、配置与规则细节。

## License

UNLICENSED
