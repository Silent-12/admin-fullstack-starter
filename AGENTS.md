# 仓库规则入口（admin-fullstack-starter）

## 项目定位

本仓库是 **Vue 3 + NestJS** 的后台管理系统全栈基础模板，采用**类 Monorepo** 结构：`frontend/` 与 `backend/` 各自拥有独立的 `package.json`、锁文件与依赖目录，**不使用** pnpm workspace 提升依赖。仓库根目录只承担编排职责：统一安装、开发启动、构建、检查与 Git 提交规范。

- 不包含具体业务模块。前端提供登录、工作台与用户/角色/菜单管理示例；后端提供健康检查、访问日志与 CRUD 模板模块。
- 两个子项目来自独立模板仓库（`admin-template-vue`、`backend-template-nest`），合并后**各自保留原有规则体系**。

## 规则加载与优先级

1. 本文件优先于子项目 `AGENTS.md`，用于处理**跨端、根级配置与仓库整体**的约定。
2. 任务只涉及单端时，按改动路径读取对应子项目规则，并遵循其内部优先级：
   - 改动 `frontend/` → 读取 [frontend/AGENTS.md](frontend/AGENTS.md)，再按其中的「按需加载索引」加载 `frontend/.agents/rules/` 与 `frontend/.agents/skills/` 中的匹配项。
   - 改动 `backend/` → 读取 [backend/AGENTS.md](backend/AGENTS.md)，再按任务加载 `backend/.agents/rules/` 与 `backend/.agents/skills/`。
   - 两端共用的技能（提交信息生成、改动说明生成、代码审查、编码行为准则、TypeDoc 注释规范）统一位于根 `.agents/skills/`，两端以 `../.agents/skills/` 引用，**不得在子项目内重复实现同名技能**。
3. 两端规则冲突时，以**改动所在子项目的规则**为准；根级配置（脚本、钩子、提交规范）以本文件与根目录实现为准。
4. 用户明确要求优先于上述项目规则。

## 目录职责边界

| 路径 | 职责 | 改动注意 |
| --- | --- | --- |
| `frontend/` | 前端应用：页面、路由、API、状态、样式 | 遵循前端规则；请求统一走 `src/utils/http` 的默认 `request` 实例 |
| `backend/` | 后端服务：Controller、Service、Entity、迁移 | 遵循后端规则；写操作响应统一 `data: null`；数据库变更走 `src/database/migrations` |
| `package.json`（根） | 编排脚本 | 新增脚本需同时更新根 `README.md` 的命令表 |
| `.agents/skills/`（根） | 跨端共用技能：提交信息、改动说明、代码审查、编码准则、TypeDoc 规范 | **唯一真源**，禁止在 `frontend/`、`backend/` 内重复放置同名技能 |
| `.husky/`、`commitlint.config.cjs` | 仓库级提交规范 | **唯一生效的钩子入口**，不要改为依赖子项目 `.husky/` |
| `AGENTS.md`、`README.md`（根） | 仓库级文档 | 结构调整后同步更新 |

## 根级工程约定

- **包管理器分工固定**：`frontend/` 使用 pnpm（`pnpm-lock.yaml`），`backend/` 使用 npm（`package-lock.json`），根目录使用 pnpm。不要跨端混用，也不要新增根 `pnpm-workspace.yaml`。
- **子项目不得再声明 `prepare: husky`**：`core.hooksPath` 是仓库级配置，子目录执行 `husky` 会覆盖根钩子指向，导致根 `.husky/` 静默失效。
- **根脚本委托方式**：调用前端用 `pnpm --dir frontend run <script>`，调用后端用 `npm --prefix backend run <script>`。两者都会把工作目录切到对应子项目，这对前端 `vite.config.ts`（依赖 `process.cwd()` 加载 `.env`）与后端实体扫描（依赖 `process.cwd()/dist`）是必需的。
- **后端安装依赖不得使用 `npm --prefix backend install`**：该写法在仓库根执行时，npm 会把根 `package.json` 当作上层包，向 `backend/package.json` 注入 `"admin-fullstack-starter": "file:.."` 依赖、生成指向仓库根的自链接软链，并污染 `backend/package-lock.json`。安装统一使用 `cd backend && npm install`（即根 `install:backend` 脚本的写法）。
- **提交信息**：遵循根 `commitlint.config.cjs`，格式 `type(scope): subject`；`pre-commit` 按改动归属分别执行子项目 `lint-staged`。

## 合并状态说明

两端尚未联调，且后端缺少用户、角色、权限、菜单模块。接口契约上，前端期望 `{ code, msg, data }`，后端返回 `{ code, message, data, timestamp }`，字段名不一致。补齐这些能力前，请勿默认前端 Mock 数据与后端接口已经对齐。详见根 [README.md](README.md) 的「已知差距」。
