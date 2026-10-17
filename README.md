# 🧱 admin-fullstack-starter

基于 **Vue 3** 与 **NestJS** 的后台管理系统全栈基础模板。项目采用**类 Monorepo** 结构：`web/` 与 `backend/` 保持各自独立的 `package.json`、锁文件与依赖目录，仓库根目录负责统一的依赖安装、开发启动、构建、代码检查与 Git 提交规范。

本仓库由两个独立模板合并而成：

| 子项目     | 来源仓库                | `package.json` 名称     |
| ---------- | ----------------------- | ----------------------- |
| `web/`     | `admin-template-vue`    | `ao-design-pro`         |
| `backend/` | `backend-template-nest` | `backend-template-nest` |

---

## 📁 目录结构

```text
admin-fullstack-starter/
├── web/                      # 前端子项目（Vue 3 + Vite + TypeScript + Element Plus）
├── backend/                  # 后端子项目（NestJS + TypeORM + MySQL + Redis）
├── .agents/                  # 跨端共用技能
├── .husky/                   # 仓库级 Git 钩子（唯一生效入口）
├── .vscode/                  # 编辑器推荐扩展与统一格式化设置
├── .editorconfig             # 跨编辑器排版基线
├── AGENTS.md                 # 仓库级规则加载入口
├── TODO.md                   # 待办、阶段状态与决策记录
├── commitlint.config.cjs     # 提交信息规范
├── package.json              # 根级编排脚本
└── README.md
```

各子项目的目录、配置与脚本说明见 [web/README.md](web/README.md) 与 [backend/README.md](backend/README.md)。

---

## 🛠️ 技术栈

| 分层           | 技术                                                              |
| -------------- | ----------------------------------------------------------------- |
| 前端应用       | Vue 3、Vite 7、TypeScript、Element Plus、Pinia、Vue Router、Axios |
| 前端样式与工具 | SCSS、CSS 变量、Iconify、VueUse、vue-i18n                         |
| 前端检查       | ESLint 9、Prettier、Stylelint、vue-tsc                            |
| 后端运行时     | NestJS 11、TypeORM、MySQL、ioredis                                |
| 后端基础能力   | Knife4j / Swagger 文档、Winston 日志、Helmet、限流（Throttler）   |
| 后端检查       | ESLint 9、Prettier、TypeScript 严格模式                           |
| 仓库工程化     | pnpm（前端、后端与根）、Husky、lint-staged、commitlint            |

---

## ✅ 环境要求

| 工具    | 要求                                                                |
| ------- | ------------------------------------------------------------------- |
| Node.js | `>=24.0.0`（建议 LTS）                                              |
| pnpm    | `11.21.0`（前端、后端与根 `package.json` 的 `packageManager` 一致） |
| Git     | 用于安装 GitHub 上的公共包依赖与提交钩子                            |
| 网络    | 能访问 npm registry 与 GitHub（前端依赖含 git tag 形式的公共包）    |

```powershell
npm install -g pnpm@11.21.0
```

---

## 🚀 快速开始

### 1. 安装依赖

```powershell
# 仓库根目录执行，一次装齐根依赖 + 前后端依赖
pnpm install            # 安装根依赖并初始化 Git 钩子
pnpm run install:all    # 安装 web 与 backend 依赖
```

两个子项目各自维护依赖，`pnpm-workspace.yaml` 仅配置 `allowBuilds` 等设置。根脚本通过 `pnpm --dir <子项目>` 委托执行，以保证工作目录正确。

### 2. 配置环境变量（可选）

后端在**没有 `.env`** 时也能启动：此时 MySQL、Redis、限流与 HTTP 日志均为关闭状态，服务使用默认端口 `3000` 与 API 前缀 `backend`。需要接入数据库或 Redis 时，复制示例文件：

```powershell
cd backend
Copy-Item .env.example .env
```

变量含义、非空校验与开关约束见 [backend/README.md](backend/README.md)；环境变量的唯一清单是 `backend/.env.example`。

### 3. 启动开发服务

```powershell
# 前后端并行启动
pnpm dev

# 或单独启动
pnpm run dev:web
pnpm run dev:backend
```

| 服务             | 地址                                                       |
| ---------------- | ---------------------------------------------------------- |
| 前端             | http://localhost:3006                                      |
| 后端 API         | http://localhost:3000/backend                              |
| 后端健康检查     | http://localhost:3000/backend/v1/health                    |
| Knife4j 接口文档 | http://localhost:3000/backend/doc.html （仅开发/测试环境） |

首次登录前需要在后端初始化管理员账号，见 [后台认证](backend/README.md#后台认证)。

---

## 🧾 常用命令

所有命令均在**仓库根目录**执行；完整脚本与参数以根 [package.json](package.json) 的 `scripts` 为准。

| 命令                                   | 用途                            |
| -------------------------------------- | ------------------------------- |
| `pnpm install`                         | 安装根依赖并初始化 Git 钩子     |
| `pnpm run install:all`                 | 安装 web 与 backend 依赖        |
| `pnpm dev`                             | 并行启动前后端开发服务          |
| `pnpm run build`                       | 依次构建前后端                  |
| `pnpm run lint` / `pnpm run format`    | 依次检查并自动修复/格式化前后端 |
| `pnpm run lint:check` / `format:check` | 只读校验，适用于 CI             |
| `pnpm run start:backend`               | 以生产模式启动后端（需先构建）  |

---

## 🧹 工程化约定

- 两端各自持有独立的 ESLint 9（扁平配置）、Prettier 与 Stylelint 配置，仓库根只提供统一入口与 Git 钩子；具体检查命令与验证要求见两端规则。
- 提交前由根 `.husky/pre-commit` 按改动归属执行子项目 `lint-staged`，提交信息由根 `commitlint.config.cjs` 校验。
- Markdown 文档不纳入 Prettier（两端 `.prettierignore` 排除 `*.md`），排版由人工维护，避免表格重排产生无关 diff。
- 命令、环境变量、接口字段与配置细节以 `package.json`、`.env.example`、[AGENTS.md](AGENTS.md) 与源码为准，README 只介绍项目与上手路径。

---

## 🔗 跨端约定

- **接口**：契约以根 [AGENTS.md](AGENTS.md#跨端接口约定) 为准；全局前缀由 `backend/.env` 的 `API_PREFIX` 决定，后台接口统一使用 `v1/admin/*`。
- **数据库结构**：表结构以 TypeORM 实体为唯一来源，变更流程见后端 [数据库结构策略](backend/README.md#数据库结构策略)。
- **进度与待办**：[TODO.md](TODO.md) 登记功能缺口、待确认事项与部署准备。

---

## 📚 文档与规则

- 仓库规则入口：[AGENTS.md](AGENTS.md)；前端规则：[web/AGENTS.md](web/AGENTS.md)；后端规则：[backend/AGENTS.md](backend/AGENTS.md)。
- 跨端共用技能位于根 `.agents/skills/`，按任务按需加载。
- 提交信息格式为 `type(scope): subject`，类型包括 `feat`、`fix`、`docs`、`style`、`refactor`、`perf`、`test`、`build`、`ci`、`revert`、`chore`、`wip`。

---
