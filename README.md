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

前端登录：登录页表单预填 `Super / 123456`（另有 `Admin`、`User` 两个演示账号，密码同为 `123456`）。登录与用户信息已改为调用后端 `POST /backend/v1/auth/login` 与 `GET /backend/v1/user/info`（见 `frontend/src/api/auth.ts`），本地 Mock 已移除；后端认证模块尚未提供，接口就绪前无法登录。

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
| `pnpm run lint` | 依次对前后端执行 ESLint（含自动修复） |
| `pnpm run lint:check` | 依次对前后端执行 ESLint 检查，不修改文件（适用于 CI） |
| `pnpm run lint:frontend` / `lint:backend` | 单独执行某一端的 ESLint |
| `pnpm run format` | 依次用 Prettier 格式化前后端 |
| `pnpm run format:check` | 依次校验前后端格式，不修改文件（适用于 CI） |
| `pnpm run format:frontend` / `format:backend` | 单独格式化某一端 |
| `pnpm run start:backend` | 以生产模式启动后端（需先构建） |
| `pnpm run install:frontend` | 仅安装前端依赖（等价于在 `frontend/` 执行 `pnpm install`） |
| `pnpm run install:backend` | 仅安装后端依赖（`cd backend && npm install`） |
| `pnpm run lint:check:frontend` / `lint:check:backend` | 只读校验单端的 ESLint |
| `pnpm run format:check:frontend` / `format:check:backend` | 只读校验单端的格式 |

---

## 🧹 代码规范工具链（ESLint + Prettier）

两端各自持有独立的 ESLint 9（扁平配置）与 Prettier 配置，互不干扰；仓库根只负责统一入口与 Git 钩子。

### 职责划分

| 工具 | 负责范围 | 配置文件 |
| --- | --- | --- |
| ESLint | 代码质量与潜在缺陷（未使用变量、类型安全、Vue 模板约束等） | `frontend/eslint.config.mjs`、`backend/eslint.config.mjs` |
| Prettier | 纯排版（缩进、引号、分号、行宽、换行符） | `frontend/.prettierrc`、`backend/.prettierrc` |
| eslint-config-prettier | 关闭与 Prettier 冲突的格式化规则，避免两套工具互相覆盖 | 由两端 ESLint 配置**末尾**引入 |
| Stylelint | 仅前端样式（SCSS / CSS / Vue） | `frontend/.stylelintrc.cjs` |
| EditorConfig | 跨编辑器排版基线（缩进、换行、编码） | 根 `.editorconfig` |

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
pnpm run lint:check:frontend
pnpm run format:check:backend

# 5. 验证提交钩子（提交信息须符合 type(scope): subject）
git commit -m "chore(eslint): verify hooks"
```

`lint:check` 与 `format:check` 以**退出码**表达结果：`0` 表示通过，非 `0` 表示存在待修复问题，可直接用于 CI 门禁。

---

## 🔗 前后端联调约定

合并后两端**尚未接通**，当前状态与联调要点如下：

1. **前端已移除 Mock**：登录、用户信息、用户/角色/菜单管理示例页面均通过 `frontend/src/api/` 调用后端接口，请求路径由 `VITE_API_URL`（`/backend`）与 `/v1/...` 拼接而成。
2. **开发代理指向本地后端**：`frontend/.env.development` 的 `VITE_API_PROXY_URL` 为 `http://localhost:3000`，`vite.config.ts` 将 `/backend` 前缀的请求转发到该地址。
3. **路径前缀已对齐**：前端 baseURL 与后端全局前缀同为 `backend`，接口路径统一为 `/backend/v1/...`。
4. **后端现有端点**：`GET /backend/v1/health`（健康检查，始终可用）、`/backend/v1/template-api`（CRUD 示例，仅在 `MYSQL_ENABLED=true` 时注册）。

> 后端 `MYSQL_ENABLED=false` 时，所有依赖 TypeORM 的模块（含 `template-api`、`access-log`）都不会被加载，这是 `app.module.ts` 中的条件化导入设计，属于预期行为。

---

## 🔀 相对两个源模板的调整

为让合并后的仓库在单一 Git 仓库下正常协作，做了以下**最小必要调整**，未改动任何业务代码：

| 调整项 | 说明 |
| --- | --- |
| 新增根 `package.json` | 提供统一的安装、开发、构建、检查脚本。运行类脚本用 `pnpm --dir frontend run` 与 `npm --prefix backend run` 委托；**安装类脚本是例外**——`install:backend` 必须写成 `cd backend && npm install`，原因见 `AGENTS.md` 的根级工程约定 |
| 新增根 `.husky/` | Git 钩子提升到仓库级。子项目各自的 `.husky/` 无法在合并仓库中生效，因为 `core.hooksPath` 是仓库级配置 |
| 移除子项目 `prepare` 脚本 | 删除 `frontend`/`backend` 的 `"prepare": "husky"`。否则在子目录安装依赖时会重写 `core.hooksPath` 指向子目录，导致根钩子静默失效 |
| 合并 commitlint 规则 | 根 `commitlint.config.cjs` 取两个模板类型枚举的并集（含 `wip`），并保留 `type-case`、`subject-empty`、`subject-full-stop` 约束 |
| 移除子项目 `.husky/` 与 commitlint 配置 | 钩子已提升到仓库级，子项目副本不再生效；同时移除子项目已失去调用方的 `husky`、`@commitlint/*` 依赖。原始配置见两个源模板仓库的 git 历史 |
| 未纳入版本管理的目录 | 复制时排除了 `node_modules`、`dist`、`.git` 与 husky 生成的 `.husky/_/` |

两个源模板仓库保持原样，未做任何修改。

---

## 📚 开发规范入口

仓库根 [AGENTS.md](AGENTS.md) 说明规则加载顺序。子项目各自维护独立的规则体系，按任务涉及的目录读取对应规则：

- 前端规则入口：[frontend/AGENTS.md](frontend/AGENTS.md)，专项规则位于 `frontend/.agents/rules/`
- 后端规则入口：[backend/AGENTS.md](backend/AGENTS.md)，专项规则位于 `backend/.agents/`
- 跨端共用技能：位于根 `.agents/skills/`（`commit-msg`、`git-commit-changelog`、`code-review`、`karpathy-guidelines`、`typedoc-style`）。`frontend/AGENTS.md` 以 `../.agents/skills/` 相对路径引用；`backend/AGENTS.md` 以文字说明指向同一目录。子项目内不再重复维护

**提交信息规范**：`feat` / `fix` / `docs` / `style` / `refactor` / `perf` / `test` / `build` / `ci` / `revert` / `chore` / `wip`，格式为 `type(scope): subject`。

---

## ⚠️ 已知差距

以下内容**不在**本次合并范围内，属于后续需要补齐的能力。逐项分析、目标接口契约、决策点与建议执行顺序见 [TODO.md](TODO.md)：

- **后端缺少用户、角色、权限、菜单模块**。当前 `backend/src/modules/` 仅有 `template-api`（CRUD 示例）与 `access-log`（访问日志），后端尚未提供认证与权限管理接口。
- **前端接口已接通，等待后端实现**。用户/角色/菜单管理页面已改为调用 `frontend/src/api/` 中的真实请求，后端对应模块补齐前这些页面无法加载数据。
- **响应契约已对齐**。前端 `BaseResponse`（见 `frontend/src/types/common/response.ts`）与后端 `ApiResponseDto`（见 `backend/src/common/dto/api-response.dto.ts`）字段一致，均为 `code`、`message`、`data`、`timestamp`；请求成败以后端 HTTP 状态码判定，前端不再判断响应体的 `code`。
