# 🧱 admin-fullstack-starter

基于 **Vue 3** 与 **NestJS** 的后台管理系统全栈基础模板。项目采用**类 Monorepo** 结构：`web/` 与 `backend/` 保持各自独立的 `package.json`、锁文件与依赖目录，仓库根目录负责统一的依赖安装、开发启动、构建、代码检查与 Git 提交规范。

本仓库由两个独立模板合并而成，合并来源与对应关系如下：

| 子项目     | 来源仓库                | `package.json` 名称     |
| ---------- | ----------------------- | ----------------------- |
| `web/`     | `admin-template-vue`    | `ao-design-pro`         |
| `backend/` | `backend-template-nest` | `backend-template-nest` |

---

## 📁 目录结构

```
admin-fullstack-starter/
├── web/                      # 前端：Vue 3 + Vite + TypeScript + Element Plus
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
│   │   └── config/           # app / database / redis 配置
│   ├── .env.example          # 环境变量示例（需自行复制为 .env）
│   ├── AGENTS.md             # 后端项目规则入口
│   └── .agents/              # 后端专项规则与技能
├── .agents/                  # 跨端共用技能（提交信息、改动说明、代码审查）
├── .husky/                   # 仓库级 Git 钩子（唯一生效入口）
│   ├── pre-commit            # 按改动归属分别执行子项目 lint-staged
│   └── commit-msg            # 统一提交信息校验
├── .vscode/                  # 编辑器推荐扩展与统一格式化设置（仓库级）
├── .editorconfig             # 跨编辑器排版基线（缩进、换行、编码）
├── commitlint.config.cjs     # 仓库级提交信息规范
├── package.json              # 根级编排脚本
├── .gitignore                # 仓库级忽略规则
├── AGENTS.md                 # 仓库级规则加载入口
└── README.md
```

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
| Node.js | `>=20.19.0`（建议 LTS）                                             |
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

也可以分开安装：

```powershell
pnpm run install:web       # 等价于在 web/ 执行 pnpm install
pnpm run install:backend   # 等价于在 backend/ 执行 pnpm install
```

两个子项目各自维护依赖，`pnpm-workspace.yaml` 仅配置 `allowBuilds` 等设置，不声明 workspace 包。若安装报 `ERR_PNPM_IGNORED_BUILDS`，请检查对应文件，为报错依赖的构建脚本明确配置 `true`（允许）或 `false`（禁止）。源码直接引用的依赖需要在对应子项目声明，不能依赖传递依赖提升。

根脚本通过 `pnpm --dir <子项目>` 委托执行，以保证工作目录正确：前端 Vite 根据 `process.cwd()` 加载环境文件，后端也据此加载环境文件并扫描 `dist/` 下的实体。

### 2. 配置后端环境变量（可选）

后端在**没有 `.env`** 时也能启动：此时 MySQL、Redis、限流、HTTP 日志均为关闭状态，服务使用默认端口 `3000` 与 API 前缀 `backend`。需要接入数据库或 Redis 时再创建配置文件：

```powershell
cd backend
Copy-Item .env.example .env
```

> 注意：`backend/src/config/app.config.ts` 的约定是「`.env` 中声明过的变量必须有非空值」，一旦把某个变量写进 `.env`，就必须为其填写有效值，否则启动会直接报错。数据库表结构由实体维护，本地开发需把 `DB_SYNCHRONIZE` 设为 `true` 才能自动建表；该开关在非 development / test 环境会在启动阶段直接报错。

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

---

## 🧾 常用命令

所有命令均在**仓库根目录**执行。

| 命令                                                 | 用途                                                      |
| ---------------------------------------------------- | --------------------------------------------------------- |
| `pnpm install`                                       | 安装根依赖并初始化 Git 钩子                               |
| `pnpm run install:all`                               | 安装 web 与 backend 依赖                                  |
| `pnpm dev`                                           | 并行启动前后端开发服务                                    |
| `pnpm run dev:web`                                   | 仅启动前端（Vite，端口 3006）                             |
| `pnpm run dev:backend`                               | 仅启动后端（Nest watch 模式，端口 3000）                  |
| `pnpm run build`                                     | 依次构建前后端                                            |
| `pnpm run build:web`                                 | 仅构建前端（先 `vue-tsc` 类型检查，再输出 `web/dist`）    |
| `pnpm run build:backend`                             | 仅构建后端（输出 `backend/dist`）                         |
| `pnpm run lint`                                      | 依次对前后端执行 ESLint（含自动修复）                     |
| `pnpm run lint:check`                                | 依次对前后端执行 ESLint 检查，不修改文件（适用于 CI）     |
| `pnpm run lint:web` / `lint:backend`                 | 单独执行某一端的 ESLint                                   |
| `pnpm run format`                                    | 依次用 Prettier 格式化前后端                              |
| `pnpm run format:check`                              | 依次校验前后端格式，不修改文件（适用于 CI）               |
| `pnpm run format:web` / `format:backend`             | 单独格式化某一端                                          |
| `pnpm run start:backend`                             | 以生产模式启动后端（需先构建）                            |
| `pnpm run install:web`                               | 仅安装前端依赖（等价于在 `web/` 执行 `pnpm install`）     |
| `pnpm run install:backend`                           | 仅安装后端依赖（等价于在 `backend/` 执行 `pnpm install`） |
| `pnpm run lint:check:web` / `lint:check:backend`     | 只读校验单端的 ESLint                                     |
| `pnpm run format:check:web` / `format:check:backend` | 只读校验单端的格式                                        |

---

## 🧹 代码规范工具链（ESLint + Prettier）

两端各自持有独立的 ESLint 9（扁平配置）与 Prettier 配置，互不干扰；仓库根只负责统一入口与 Git 钩子。

### 职责划分

| 工具                   | 负责范围                                                   | 配置文件                                             |
| ---------------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| ESLint                 | 代码质量与潜在缺陷（未使用变量、类型安全、Vue 模板约束等） | `web/eslint.config.mjs`、`backend/eslint.config.mjs` |
| Prettier               | 纯排版（缩进、引号、分号、行宽、换行符）                   | `web/.prettierrc`、`backend/.prettierrc`             |
| eslint-config-prettier | 关闭与 Prettier 冲突的格式化规则，避免两套工具互相覆盖     | 由两端 ESLint 配置**末尾**引入                       |
| Stylelint              | 仅前端样式（SCSS / CSS / Vue）                             | `web/.stylelintrc.cjs`                               |
| EditorConfig           | 跨编辑器排版基线（缩进、换行、编码）                       | 根 `.editorconfig`                                   |

**冲突处理策略**：ESLint 与 Prettier 的重叠部分**只保留一个真源**——格式化规则全部交给 Prettier，ESLint 侧由 `eslint-config-prettier` 兜底关闭。因此两端均**不引入 `eslint-plugin-prettier`**（即不在 ESLint 内执行 Prettier），避免重复计算与两套报错口径。

唯一例外是前端 `no-unexpected-multiline`：它虽然与 Prettier 重叠，但拦截的是无分号风格下的 ASI 陷阱，属于**代码正确性**而非排版，且被 `eslint-config-prettier` 的 special rules 一并关闭。因此该规则在 `prettierConfig` **之后**显式重新开启，请勿当作冗余配置删除。

两端 Prettier 风格**有意保持差异**（前端 `printWidth: 100`、后端 `140`），沿用各自模板原有习惯，不做跨端统一。两端均显式声明 `endOfLine: "auto"`，以免 Windows 工作区的 CRLF 被 Prettier 默认的 `lf` 判定为格式错误。

### 协作方式

1. **构建工具**：`pnpm run build` 保持原有链路不变（前端 `vue-tsc --noEmit && vite build`、后端 `nest build`）。Lint 与格式化不介入构建，构建失败与规范失败互不掩盖。
2. **编辑器**：根 `.vscode/settings.json` 已开启「保存即格式化 + 保存时应用 ESLint 可修复项」，`eslint.workingDirectories` 设为 `auto`，使前后端各自命中自己的配置；首次打开仓库时按 `.vscode/extensions.json` 安装推荐扩展即可。
3. **Git 提交**：`.husky/pre-commit` 按改动归属分别调用子项目 `lint-staged`（执行 `eslint --fix` 与 `prettier --write`，前端 Vue/样式文件额外执行 `stylelint --fix`）；`.husky/commit-msg` 调用根 `commitlint` 校验提交信息格式。

### 验证步骤

```powershell
# 1. 安装依赖（含 Git 钩子初始化）
pnpm install
pnpm run install:all

# 2. 只读校验：不修改任何文件，适用于 CI
pnpm run lint:check     # ESLint（前后端）
pnpm run format:check   # Prettier（前后端）

# 3. 自动修复：会改写文件，运行后请检查 git diff
pnpm run lint
pnpm run format

# 4. 单端校验
pnpm run lint:check:web
pnpm run format:check:backend

# 5. 验证提交钩子（提交信息须符合 type(scope): subject）
git commit -m "chore(eslint): verify hooks"
```

`lint:check` 与 `format:check` 以**退出码**表达结果：`0` 表示通过，非 `0` 表示存在待修复问题，可直接用于 CI 门禁。

---

## 🔗 前后端联调约定

1. **数据库结构**：后端不维护 SQL 迁移文件，表结构以 `backend/src/**/entities` 的 TypeORM 实体为唯一来源；本地开发用 `DB_SYNCHRONIZE=true` 自动建表，非 development / test 环境开启会在启用 MySQL 时阻止启动。操作流程见后端 [数据库结构策略](backend/README.md#数据库结构策略)。
2. **接口与版本**：接口约定以根 [AGENTS.md](AGENTS.md#跨端接口约定) 为准。全局前缀由 `backend/.env` 的 `API_PREFIX` 决定，`backend` 仅为默认值；后台接口（含认证）统一使用 `v1/admin/*`，用户端接口不带 `admin`。未上线阶段直接修改现有 `v1` 接口并同步调用方，不保留兼容版本或旧字段别名。
3. **功能缺口与进度**：认证、用户、角色、菜单等能力的缺口及建库基线 SQL 的准备状态统一登记在 [TODO.md](TODO.md)。

> 后端 `MYSQL_ENABLED=false` 时，所有依赖 TypeORM 的模块（含 `template-api`、`access-log`）都不会被加载，这是 `app.module.ts` 中的条件化导入设计，属于预期行为。

## 📚 开发规范入口

仓库根 [AGENTS.md](AGENTS.md) 说明规则加载顺序。子项目各自维护独立的规则体系，按任务涉及的目录读取对应规则：

- 前端规则入口：[web/AGENTS.md](web/AGENTS.md)，专项规则位于 `web/.agents/rules/`
- 后端规则入口：[backend/AGENTS.md](backend/AGENTS.md)，专项规则位于 `backend/.agents/`
- 跨端共用技能：位于根 `.agents/skills/`（`commit-msg`、`git-commit-changelog`、`code-review`、`karpathy-guidelines`、`typedoc-style`）。`web/AGENTS.md` 以 `../.agents/skills/` 相对路径引用；`backend/AGENTS.md` 以文字说明指向同一目录。子项目内不再重复维护

**提交信息规范**：`feat` / `fix` / `docs` / `style` / `refactor` / `perf` / `test` / `build` / `ci` / `revert` / `chore` / `wip`，格式为 `type(scope): subject`。

---
