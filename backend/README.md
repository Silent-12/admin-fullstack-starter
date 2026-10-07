# NestJS 后端模板项目 🚀

一个基于 NestJS 的企业级后端模板项目，集成了 MySQL、Redis、TypeORM，提供规范的代码结构和开发最佳实践。

> **开发规则**：本目录的开发规则见 [`AGENTS.md`](AGENTS.md)，后端专项规则与技能位于 `.agents/`。本 README 仅作使用说明，**不构成规则来源**；两者不一致时以 `AGENTS.md` 为准。

## 项目简介 📦

本项目是一个 NestJS 后端开发模板，旨在提供一套开箱即用的企业级开发框架。项目集成了常用的中间件和工具库，包括：

- **🏗️ NestJS** - 渐进式 Node.js 框架
- **🗄️ TypeORM** - ORM 框架，支持 MySQL 数据库
- **⚡ Redis** - 缓存和会话存储
- **📖 Knife4j** - 基于 OpenAPI 的 API 文档界面
- **📝 Winston** - 日志记录
- **✨ ESLint + Prettier** - 代码规范和格式化
- **✅ Commitlint** - 提交信息规范（由仓库根 `.husky/` 与根 `commitlint.config.cjs` 统一提供）

## 目录结构 📁

```
backend/
├── AGENTS.md                     # 本目录规则入口（开发规则以此为准）
├── .agents/                      # 后端专项规则与技能
│   ├── rules/                    # 专项规则（ponytail.md）
│   └── skills/                   # 专项技能（database-design）
├── src/                          # 源代码目录
│   ├── common/                   # 公共模块
│   │   ├── database/             # 数据库健康检查服务
│   │   ├── filters/              # 全局异常过滤器
│   │   ├── logger/               # 日志模块（Winston）
│   │   ├── middleware/           # 中间件（请求日志等）
│   │   ├── redis/                # Redis 服务
│   │   ├── types/                # 公共类型定义
│   │   └── utils/                # 工具函数
│   ├── config/                   # 配置文件
│   │   ├── app.config.ts         # 应用配置
│   │   ├── database.config.ts    # 数据库配置
│   │   ├── database-naming-strategy.ts  # 数据库命名策略
│   │   └── redis.config.ts       # Redis 配置
│   ├── database/                 # 数据库相关
│   │   ├── migrations/           # 数据库迁移文件
│   │   └── run-migrations.ts     # SQL 迁移执行器
│   ├── health/                   # 健康检查模块
│   ├── modules/                  # 业务模块目录
│   │   ├── access-log/           # 访问日志模块
│   │   │   ├── entities/         # 数据库实体
│   │   │   └── *.ts              # 模块文件
│   │   └── template-api/         # 模板 API 模块（示例）
│   │       ├── dto/              # 数据传输对象
│   │       ├── entities/         # 数据库实体
│   │       ├── README.md         # 模块模板说明
│   │       └── *.ts              # 控制器、服务、模块
│   ├── types/                    # 类型定义
│   ├── app.module.ts             # 应用主模块
│   └── main.ts                   # 应用入口文件
├── .env.example                  # 环境变量示例
├── .prettierrc                   # Prettier 配置
├── eslint.config.mjs             # ESLint 配置
├── .prettierignore               # Prettier 忽略清单
├── nest-cli.json                 # NestJS CLI 配置
├── package.json                  # 项目依赖和脚本
└── tsconfig.json                 # TypeScript 配置
```

## 代码规范 📏

### ESLint 配置 🔍

项目使用 ESLint 9.x 进行代码质量检查，主要规则包括：

- **基础规则**：基于 `eslint:recommended` 和 `typescript-eslint` 的类型检查推荐规则
- **代码风格**：
  - 使用 `Interface` 定义类型（而非 `type`）
  - 一致的导入/导出语法
  - 对象简写语法
  - 优先使用 `const`
- **安全规则**：
  - 禁止常量二元表达式
  - 优先使用可选链操作符
  - 禁止未使用的变量
- **允许的规则**：
  - 允许 `console.error` 和 `console.warn`
  - `@typescript-eslint/no-explicit-any` 为警告级别

### Prettier 配置 💅

```json
{
  "printWidth": 140, // 单行最大字符数
  "quoteProps": "consistent", // 对象属性引号保持一致
  "semi": false, // 不使用分号
  "singleQuote": true, // 使用单引号
  "endOfLine": "auto" // 换行符交由编辑器决定，避免 Windows CRLF 被误判
}
```

### Git Hooks 🎣

提交钩子统一由**仓库根**提供：`core.hooksPath` 指向根 `.husky/`，`pre-commit` 按改动归属调用本目录的 `lint-staged`，`commit-msg` 使用根 `commitlint.config.cjs` 校验提交信息。本目录不再持有钩子文件与 commitlint 配置，详见根 [README](../README.md) 的「相对两个源模板的调整」。

### 提交信息规范 📝

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 类型**：

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建/工具/配置

**示例**：

```bash
feat(template-api): 添加模板查询接口
fix(database): 修复数据库连接池配置
docs(readme): 更新项目说明文档
```

## 数据库集成 🗄️

### TypeORM + MySQL 🔵

项目集成了 TypeORM 作为 ORM 框架，使用 MySQL 作为数据库。

**配置文件**：[`src/config/database.config.ts`](src/config/database.config.ts)

**主要特性**：

- 从环境变量加载配置
- 支持开关控制（`MYSQL_ENABLED`）
- 连接池配置（最大连接数 10）
- 自定义命名策略（蛇形命名）
- 可选的 SQL 日志记录

**环境变量配置**：

```bash
# 数据库开关
MYSQL_ENABLED=true

# 数据库连接配置
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=root
DB_DATABASE=nestjs_demo

# 开发配置
DB_SYNCHRONIZE=false    # 自动同步表结构（生产环境禁止开启）
DB_LOGGING=false        # SQL 执行日志
```

### Redis 🔴

项目集成了 Redis 用于缓存和会话存储。

**配置文件**：[`src/config/redis.config.ts`](src/config/redis.config.ts)

**主要特性**：

- 基于 `ioredis` 客户端
- 从环境变量加载配置
- 支持开关控制（`REDIS_ENABLED`）
- 提供健康检查服务

**环境变量配置**：

```bash
# Redis 开关
REDIS_ENABLED=true

# Redis 连接配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

## 示例 API - Template API 📚

项目提供了一个完整的示例模块 `template-api`，演示了标准的 RESTful API 开发模式。

> **路径前缀说明**：`template-api` 属基础模板示例模块，按 [AGENTS.md](AGENTS.md) 的归属豁免规则保留在 `src/modules/` 根目录，因此路径为 `/backend/v1/template-api`，而非 `/backend/v1/admin/...`。新增业务模块仍须遵循「后台接口用 `admin` 前缀、用户端用 `user` 分层」的约定。

### 模块结构 🏗️

```
src/modules/template-api/
├── dto/
│   ├── pagination-meta.dto.ts      # 分页元信息
│   ├── template-item-response.dto.ts # 列表与详情的响应体（显式字段映射）
│   ├── create-template-item.dto.ts # 创建请求体
│   ├── update-template-item.dto.ts # 更新请求体
│   └── query-template-item.dto.ts  # 查询参数
├── entities/
│   └── template-item.entity.ts     # 数据库实体
├── template-api.controller.ts      # 控制器
├── template-api.service.ts         # 业务逻辑层
└── template-api.module.ts          # 模块定义
```

> 统一响应包装 `ApiResponseDto` 为全局公共 DTO，位于 `src/common/dto/api-response.dto.ts`，**不在本模块的 `dto/` 目录内**。

### API 接口 🔌

#### 1. 创建模板条目

```http
POST /backend/v1/template-api
Content-Type: application/json

{
  "name": "示例模板",
  "description": "这是一个示例模板条目"
}
```

**响应**：

```json
{
  "code": 200,
  "message": "创建成功",
  "data": null,
  "timestamp": "2026-05-22T10:00:00.000Z"
}
```

#### 2. 分页查询模板列表

```http
GET /backend/v1/template-api?page=1&pageSize=10&name=示例
```

**响应**：

```json
{
  "code": 200,
  "message": "查询成功",
  "data": {
    "list": [
      {
        "id": 1,
        "name": "示例模板",
        "description": "这是一个示例模板条目",
        "status": "active",
        "priority": 0,
        "isEnabled": true,
        "createdAt": 1779444000,
        "updatedAt": 1779444000
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "total": 1,
      "totalPages": 1
    }
  },
  "timestamp": "2026-05-22T10:00:00.000Z"
}
```

#### 3. 查询单条模板

```http
GET /backend/v1/template-api/1
```

**响应**：

```json
{
  "code": 200,
  "message": "查询成功",
  "data": {
    "id": 1,
    "name": "示例模板",
    "description": "这是一个示例模板条目",
    "status": "active",
    "priority": 0,
    "isEnabled": true,
    "createdAt": 1779444000,
    "updatedAt": 1779444000
  },
  "timestamp": "2026-05-22T10:00:00.000Z"
}
```

#### 4. 更新模板条目

```http
PUT /backend/v1/template-api/1
Content-Type: application/json

{
  "name": "更新后的模板名称",
  "description": "更新后的描述"
}
```

**响应**：

```json
{
  "code": 200,
  "message": "更新成功",
  "data": null,
  "timestamp": "2026-05-22T10:05:00.000Z"
}
```

#### 5. 删除模板条目

```http
DELETE /backend/v1/template-api/1
```

**响应**：

```json
{
  "code": 200,
  "message": "删除成功",
  "data": null,
  "timestamp": "2026-05-22T10:10:00.000Z"
}
```

### 统一响应格式 📦

所有 API 接口都使用统一的响应包装格式：

```typescript
{
  code: number // HTTP 状态码
  message: string // 响应消息
  data: T | null // 响应数据（泛型）
  timestamp: string // 时间戳
}
```

### Knife4j 文档 📖

开发或测试环境启动项目后，访问 `http://localhost:3000/backend/doc.html` 查看自动生成的 API 文档。OpenAPI JSON 地址为 `http://localhost:3000/backend/api-json`。

设置 `KNIFE4J_AUTH_ENABLED=true` 后，文档入口会使用 `KNIFE4J_USERNAME` 与 `KNIFE4J_PASSWORD` 进行 Basic Auth 保护。

## 快速开始 🚀

### 1. 安装依赖 📥

```bash
npm install
```

### 2. 配置环境变量 ⚙️

复制 `.env.example` 为 `.env`，根据实际需求修改配置。模板默认 API 前缀为 `backend`，Controller 显式携带版本号，因此接口地址统一为 `/backend/v1/...`：

```bash
cp .env.example .env
```

启用 Redis 后可将 `THROTTLE_ENABLED=true` 打开全局 API 限流与未知路由防护。`UPLOAD_DIR` 指定静态上传目录，对外访问地址为 `/backend/uploads/...`。生产环境的跨域示例来源为 `https://www.example.com`，部署前应替换为实际域名。

应用启动时会对已启用的 MySQL 与 Redis 执行 `ping`。开发和测试环境的 `/backend/v1/health` 会返回最近一次 MySQL 与 Redis 连通性状态；生产环境仅返回服务存活状态。

新建数据库时按顺序执行 `src/database/migrations/` 下的 `.sql` 文件（当前为 `V1__access_logs.sql`、`V2__template_items.sql`），也可直接运行：

```bash
npm run migration:run
```

该命令按文件名升序执行尚未应用的迁移，并把已执行的文件记录在 `schema_migrations` 表中，可重复执行。后续迁移文件按 `V{序号}__{描述}.sql` 顺序命名，规则详见 [AGENTS.md](AGENTS.md)。

### 3. 启动开发服务器 ▶️

```bash
npm run start:dev
```

### 4. 构建生产版本 🏗️

```bash
npm run build
npm run start:prod
```

## 开发脚本 🛠️

| 命令                    | 说明                                 |
| ----------------------- | ------------------------------------ |
| `npm run start`         | 启动应用                             |
| `npm run start:dev`     | 开发模式启动（热重载）               |
| `npm run start:debug`   | 调试模式启动                         |
| `npm run start:prod`    | 生产模式启动                         |
| `npm run build`         | 构建生产版本                         |
| `npm run migration:run` | 执行未应用的 SQL 迁移（先构建）      |
| `npm run format`        | 使用 Prettier 格式化 `src/**/*.ts`   |
| `npm run format:check`  | 校验格式，不修改文件（适用于 CI）    |
| `npm run lint`          | ESLint 检查并自动修复                |
| `npm run lint:check`    | ESLint 检查，不修改文件（适用于 CI） |

## 技术栈 💻

- **运行时**：Node.js
- **框架**：NestJS 11.x
- **语言**：TypeScript 5.x
- **数据库**：MySQL + TypeORM 1.x（经 `@nestjs/typeorm` 11.x 接入）
- **缓存**：Redis + ioredis 5.x
- **日志**：Winston + nest-winston
- **验证**：class-validator + class-transformer
- **文档**：@nestjs/swagger + nestjs-knife4j-plus
- **限流**：@nestjs/throttler
- **安全**：helmet
- **工具**：dayjs、reflect-metadata、rxjs

## 项目规范 📋

1. **代码风格**：严格遵循 ESLint 和 Prettier 配置
2. **命名规范**：
   - 文件/目录使用小写 + 连字符（kebab-case）
   - 类名使用大驼峰（PascalCase）
   - 变量/函数使用小驼峰（camelCase）
   - 数据库表名使用蛇形命名（snake_case）
3. **模块开发**：新增业务模块时，参考 `template-api` 模块结构
4. **注释规范**：所有公共方法必须包含 JSDoc 注释
5. **错误处理**：使用全局异常过滤器统一处理错误

## License

UNLICENSED
