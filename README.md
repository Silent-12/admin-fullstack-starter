# 🧱 admin-fullstack-starter

基于 **Vue 3** 与 **NestJS** 的后台管理系统全栈基础模板。项目采用**类 Monorepo** 结构：`frontend/` 与 `backend/` 保持各自独立的 `package.json`、锁文件与依赖目录，仓库根目录负责统一的依赖安装、开发启动、构建、代码检查与 Git 提交规范。

本仓库由两个独立模板合并而成，合并来源与对应关系如下：

| 子项目 | 来源仓库 | `package.json` 名称 |
| --- | --- | --- |
| `frontend/` | `admin-template-vue` | `ao-design-pro` |
| `backend/` | `backend-template-nest` | `backend-template-nest` |

---

## 📁 目录结构

```
admin-fullstack-starter/
├── frontend/                 # 前端：Vue 3 + Vite + TypeScript + Element Plus
│   ├── src/                  # 页面、路由、API、状态、工具
│   ├── .env                  # 通用环境变量（端口、基础路径、路由来源）
│   ├── .env.development      # 开发环境变量（含 Vite 代理目标）
│   ├── .env.production       # 生产环境变量
│   ├── vite.config.ts        # 构建与代理配置
│   ├── AGENTS.md             # 前端项目规则入口
│   └── .agents/              # 前端专项规则与技能
├── backend/                  # 后端：NestJS + TypeORM + MySQL + Redis
│   ├── src/
│   │   ├── modules/          # 业务模块（当前含 template-api、access-log）
│   │   ├── common/           # 公共过滤器、拦截器、日志、Redis、限流
│   │   ├── config/           # app / database / redis 配置
│   │   └── database/         # SQL 迁移文件
│   ├── .env.example          # 环境变量示例（需自行复制为 .env）
│   ├── AGENTS.md             # 后端项目规则入口
│   └── .agents/              # 后端专项规则与技能
├── .husky/                   # 仓库级 Git 钩子（唯一生效入口）
│   ├── pre-commit            # 按改动归属分别执行子项目 lint-staged
│   └── commit-msg            # 统一提交信息校验
├── commitlint.config.cjs     # 仓库级提交信息规范
├── package.json              # 根级编排脚本
├── .gitignore                # 仓库级忽略规则
├── AGENTS.md                 # 仓库级规则加载入口
└── README.md
```

---

## 🛠️ 技术栈

| 分层 | 技术 |
| --- | --- |
| 前端应用 | Vue 3、Vite 7、TypeScript、Element Plus、Pinia、Vue Router、Axios |
| 前端样式与工具 | SCSS、CSS 变量、Iconify、VueUse、vue-i18n |
| 前端检查 | ESLint 9、Prettier、Stylelint、vue-tsc |
| 后端运行时 | NestJS 11、TypeORM、MySQL、ioredis |
| 后端基础能力 | Knife4j / Swagger 文档、Winston 日志、Helmet、限流（Throttler） |
| 后端检查 | ESLint 9、Prettier、TypeScript 严格模式 |
| 仓库工程化 | pnpm（前端）、npm（后端）、Husky、lint-staged、commitlint |

---

## ✅ 环境要求

| 工具 | 要求 |
| --- | --- |
| Node.js | `>=20.19.0`（建议 LTS） |
| pnpm | `11.21.0`（与 `frontend/package.json` 的 `packageManager` 一致） |
| npm | 随 Node.js 安装，用于后端依赖管理 |
| Git | 用于安装 GitHub 上的公共包依赖与提交钩子 |
| 网络 | 能访问 npm registry 与 GitHub（前端依赖含 git tag 形式的公共包） |

```powershell
npm install -g pnpm@11.21.0
```

---

## 🚀 快速开始

### 1. 安装依赖

```powershell
# 仓库根目录执行，一次装齐根依赖 + 前后端依赖
pnpm install            # 安装根依赖并初始化 Git 钩子
pnpm run install:all    # 安装 frontend 与 backend 依赖
```

也可以分开安装：

```powershell
pnpm run install:frontend   # 等价于在 frontend/ 执行 pnpm install
pnpm run install:backend    # 等价于在 backend/ 执行 npm install
```

### 2. 配置后端环境变量（可选）

后端在**没有 `.env`** 时也能启动：此时 MySQL、Redis、限流、HTTP 日志均为关闭状态，服务使用默认端口 `3000` 与 API 前缀 `backend`。需要接入数据库或 Redis 时再创建配置文件：

```powershell
cd backend
Copy-Item .env.example .env
```

> 注意：`backend/src/config/app.config.ts` 的约定是「`.env` 中声明过的变量必须有非空值」，一旦把某个变量写进 `.env`，就必须为其填写有效值，否则启动会直接报错。

### 3. 启动开发服务

```powershell
# 前后端并行启动
pnpm dev

# 或单独启动
pnpm run dev:frontend
pnpm run dev:backend
```

| 服务 | 地址 |
| --- | --- |
| 前端 | http://localhost:3006 |
| 后端 API | http://localhost:3000/backend |
| 后端健康检查 | http://localhost:3000/backend/v1/health |
| Knife4j 接口文档 | http://localhost:3000/backend/doc.html （仅开发/测试环境） |

前端演示登录：默认账号 `Super / 123456`，登录逻辑来自 `frontend/src/mock/auth.ts`。

---

## 🧾 常用命令

所有命令均在**仓库根目录**执行。

| 命令 | 用途 |
| --- | --- |
| `pnpm install` | 安装根依赖并初始化 Git 钩子 |
| `pnpm run install:all` | 安装 frontend 与 backend 依赖 |
| `pnpm dev` | 并行启动前后端开发服务 |
| `pnpm run dev:frontend` | 仅启动前端（Vite，端口 3006） |
| `pnpm run dev:backend` | 仅启动后端（Nest watch 模式，端口 3000） |
| `pnpm run build` | 依次构建前后端 |
| `pnpm run build:frontend` | 仅构建前端（先 `vue-tsc` 类型检查，再输出 `frontend/dist`） |
| `pnpm run build:backend` | 仅构建后端（输出 `backend/dist`） |
| `pnpm run lint` | 依次对前后端执行 ESLint |
| `pnpm run lint:frontend` / `lint:backend` | 单独执行某一端的 ESLint |
| `pnpm run format:backend` | 使用 Prettier 格式化后端 `src/**/*.ts` |
| `pnpm run start:backend` | 以生产模式启动后端（需先构建） |

---

## 🔗 前后端联调约定

合并后两端**尚未接通**，当前状态与联调要点如下：

1. **前端仍走 Mock**：登录、用户信息、用户/角色/菜单管理示例页面的数据来自 `frontend/src/mock/`，不经过 HTTP 请求。
2. **开发代理指向 Mock 服务**：`frontend/.env.development` 的 `VITE_API_PROXY_URL` 当前指向 Apifox Mock，`vite.config.ts` 将 `/api` 前缀的请求转发到该地址。接入本地后端时，把 `VITE_API_PROXY_URL` 改为 `http://localhost:3000` 即可。
3. **路径前缀不一致**：前端代理使用 `/api` 前缀，后端全局前缀为 `backend`。联调时需二选一并保持两端一致——要么在 Vite 代理中配置 `rewrite` 去掉 `/api`，要么把后端 `.env` 的 `API_PREFIX` 调整为 `api`。
4. **后端现有端点**：`GET /backend/v1/health`（健康检查，始终可用）、`/backend/v1/template-api`（CRUD 示例，仅在 `MYSQL_ENABLED=true` 时注册）。

> 后端 `MYSQL_ENABLED=false` 时，所有依赖 TypeORM 的模块（含 `template-api`、`access-log`）都不会被加载，这是 `app.module.ts` 中的条件化导入设计，属于预期行为。

---

## 🔀 相对两个源模板的调整

为让合并后的仓库在单一 Git 仓库下正常协作，做了以下**最小必要调整**，未改动任何业务代码：

| 调整项 | 说明 |
| --- | --- |
| 新增根 `package.json` | 提供统一的安装、开发、构建、检查脚本，通过 `pnpm --dir frontend` 与 `npm --prefix backend` 委托到各子项目 |
| 新增根 `.husky/` | Git 钩子提升到仓库级。子项目各自的 `.husky/` 无法在合并仓库中生效，因为 `core.hooksPath` 是仓库级配置 |
| 移除子项目 `prepare` 脚本 | 删除 `frontend`/`backend` 的 `"prepare": "husky"`。否则在子目录安装依赖时会重写 `core.hooksPath` 指向子目录，导致根钩子静默失效 |
| 合并 commitlint 规则 | 根 `commitlint.config.cjs` 取两个模板类型枚举的并集（含 `wip`），并保留 `type-case`、`subject-empty`、`subject-full-stop` 约束 |
| 子项目 `.husky/` 保留为记录 | 保留原钩子文件并加注说明，仅用于追溯模板原始配置，不再生效 |
| 未纳入版本管理的目录 | 复制时排除了 `node_modules`、`dist`、`.git` 与 husky 生成的 `.husky/_/` |

两个源模板仓库保持原样，未做任何修改。

---

## 📚 开发规范入口

仓库根 [AGENTS.md](AGENTS.md) 说明规则加载顺序。子项目各自维护独立的规则体系，按任务涉及的目录读取对应规则：

- 前端规则入口：[frontend/AGENTS.md](frontend/AGENTS.md)，专项规则位于 `frontend/.agents/rules/`
- 后端规则入口：[backend/AGENTS.md](backend/AGENTS.md)，专项规则位于 `backend/.agents/`

**提交信息规范**：`feat` / `fix` / `docs` / `style` / `refactor` / `perf` / `test` / `build` / `ci` / `revert` / `chore` / `wip`，格式为 `type(scope): subject`。

---

## ⚠️ 已知差距

以下内容**不在**本次合并范围内，属于后续需要补齐的能力。逐项分析、目标接口契约、决策点与建议执行顺序见 [TODO.md](TODO.md)：

- **后端缺少用户、角色、权限、菜单模块**。当前 `backend/src/modules/` 仅有 `template-api`（CRUD 示例）与 `access-log`（访问日志），后端尚未提供认证与权限管理接口。
- **前端仍依赖 Mock**。前端已具备用户/角色/菜单管理页面，但数据源是 `frontend/src/mock/`，需在后端补齐对应模块后切换到 `frontend/src/api/` 中的真实请求。
- **两端未做接口契约对齐**。响应结构上，前端期望 `{ code, msg, data }`（见 `frontend/src/types/common/response.ts`），后端统一返回 `{ code, message, data }`（见 `backend/src/common/dto/api-response.dto.ts`），字段名 `msg` 与 `message` 不一致，联调时需要统一。
