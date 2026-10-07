# 合并遗留清理实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `admin-fullstack-starter` 的每一处描述都与实际一致，清掉指向不存在目标的失效配置与重复真源，并让仓库自带的规则（迁移机制、参考模板合规、日志能力）真正落地。

**Architecture:** 分三层推进——① 文档与配置纠正（不改行为）；② 待用能力代码全部保留（本计划不产出任何相关任务）；③ 四项结构性修正（迁移执行器、参考模板合规、日志接通、索引对齐）。每层内按文件分组提交，任一任务可独立评审与回滚。

**Tech Stack:** Vue 3 + Vite 7（前端，pnpm）；NestJS 11 + TypeORM + MySQL（后端，npm，ESM）；仓库根用 pnpm 编排。

**Spec:** `docs/superpowers/specs/2026-10-07-merge-leftover-cleanup-design.md`

## Global Constraints

- **无测试框架**：前后端均无 `test` 脚本，未安装 jest。本计划的每个任务以「具体验证命令 + lint/build 闸门」替代单元测试，验证步骤必须实跑并核对输出。
- **后端是 ESM**：`backend/package.json` 的 `"type": "module"`，所有相对 import 必须带 `.js` 后缀（如 `./dto/foo.dto.js`）。
- **后端 tsconfig 严格项**：`strict`、`exactOptionalPropertyTypes`、`noUncheckedIndexedAccess`、`noFallthroughCasesInSwitch` 均开启，新增代码必须通过。
- **`no-console`**：后端 ESLint 仅允许 `console.error` 与 `console.warn`，禁止 `console.log`。
- **提交规范**：`type(scope): subject`，允许的 type 见根 `commitlint.config.cjs`；subject 结尾不加句号。
- **删除前必须复核**：任何文件删除前先跑 `git grep -n "<文件名或符号>"` 确认零引用，并把命令与输出记入任务说明。
- **工作分支**：`chore/merge-leftover-cleanup`（已创建，设计文档已在 `ca00f25` 提交）。
- **不清理待用能力代码**：`frontend/src` 下的组件、工具、类型、指令，`backend/src` 下的 Redis 方法、错误工具、类型声明，以及它们的配套依赖，一律保留。

---

## 文件结构

| 文件 | 职责 | 本计划中的动作 |
| --- | --- | --- |
| `.gitignore`（根） | 仓库级忽略规则 | 增加 `backend/.env` |
| `frontend/commitlint.config.cjs` | 模板遗留的重复提交规范 | 删除 |
| `backend/commitlint.config.js` | 模板遗留的重复提交规范 | 删除 |
| `backend/d_node_modules.cmd` | 模板遗留的删除脚本 | 删除 |
| `frontend/.husky/`、`backend/.husky/` | 失效的钩子副本 | 删除 |
| `frontend/.auto-import.json`、`frontend/src/types/generated/auto-imports.d.ts` | 未安装插件留下的孤儿产物 | 删除 |
| `frontend/.prettierignore`、`frontend/.stylelintignore` | 格式忽略清单 | 删除失效条目 |
| `frontend/eslint.config.mjs` | 前端 lint 配置 | 删除失效 ignore 项 |
| `frontend/vite.config.ts`、`frontend/tsconfig.json` | 别名配置 | 删除指向空目录的别名 |
| `frontend/src/types/config/index.ts` | 配置类型 | 删除三个不存在的环境变量字段 |
| `frontend/package.json`、`backend/package.json` | 子项目依赖与脚本 | 移除钩子相关依赖；后端增加迁移脚本 |
| `frontend/README.md`、`frontend/AGENTS.md` | 前端说明与规则入口 | 纠正为合并后身份 |
| `frontend/.agents/rules/*.md` | 前端专项规则 | 纠正基准路径与失效内容 |
| `backend/README.md`、`backend/AGENTS.md` | 后端说明与规则入口 | 纠正与实际不符处 |
| `backend/src/modules/template-api/README.md` | 参考模块说明 | 纠正 DTO 路径与时间戳类型 |
| `README.md`、`TODO.md`（根） | 仓库说明与待办登记 | 纠正命令表、行号、数量口径 |
| `backend/src/modules/access-log/entities/access-log.entity.ts` | 访问日志实体 | 补齐缺失索引并对齐注释 |
| `backend/src/database/migrations/V2__template_items.sql` | 模板条目建表 | 新建 |
| `backend/src/database/run-migrations.ts` | SQL 迁移执行器 | 新建 |
| `backend/src/modules/template-api/dto/template-item-response.dto.ts` | 模板条目响应 DTO | 新建 |
| `backend/src/modules/template-api/template-api.service.ts`、`template-api.controller.ts` | 参考模块实现 | 改为返回响应 DTO |
| `backend/src/common/logger/logger.service.ts` | 日志服务 | 修正注入令牌 |
| `backend/src/app.module.ts`、`backend/src/main.ts` | 应用装配 | 注册并启用 Winston 日志 |

---

## 对设计文档的技术修正（实现前必读）

设计文档第 6.1 节写的是「新增 `src/database/data-source.ts` 供 TypeORM CLI 使用；新增 `migration:run` / `migration:revert` 脚本」。**该方案不可行**：TypeORM 的 `migration:run` 只接受实现 `up`/`down` 的 TS/JS 迁移类，无法执行原始 `.sql` 文件。而 `AGENTS.md:25` 明确规定迁移文件是 `V{序号}__{描述}.sql`，是唯一事实来源。

因此 Task 9 改为：**新增一个读取并执行 `src/database/migrations/*.sql` 的迁移执行器**（`src/database/run-migrations.ts`），用 `schema_migrations` 表记录已应用文件。这样既保留 `.sql` 作为唯一事实来源，又让 `migration:run` 真实可用。执行器用 `mysql2`（`backend/package.json` 的直接依赖，`^3.22.3`），compile 后由 node 运行，避免 ts-node 的 ESM 兼容问题。

---

### Task 1: 安全规则补缺与冗余文件删除

**Files:**
- Modify: `.gitignore`（根，第 18-21 行的「本地环境变量」段）
- Modify: `backend/eslint.config.mjs:20`（ignores 数组）
- Delete: `frontend/commitlint.config.cjs`、`backend/commitlint.config.js`、`backend/d_node_modules.cmd`、`frontend/.husky/pre-commit`、`frontend/.husky/commit-msg`、`backend/.husky/pre-commit`、`backend/.husky/commit-msg`

**Interfaces:**
- Consumes: 无
- Produces: 无（本任务不改变任何代码接口）

- [ ] **Step 1: 复核每个待删文件确实零引用**

```bash
cd D:/kpwxproject/admin-fullstack-starter
git grep -n "commitlint.config" -- ':!*.lock' ':!package-lock.json' ':!node_modules'
git grep -n "d_node_modules"
git grep -n "frontend/.husky\|backend/.husky"
```

Expected: `commitlint.config` 只命中三个配置文件自身与根 `.husky/commit-msg` 的调用（该调用走 `pnpm exec commitlint`，由 cosmiconfig 从仓库根解析到根配置，不依赖子项目文件）；`d_node_modules` 零命中；`.husky` 只命中根 `README.md` 的记录行与文件自身。**若任一项出现预期外的引用，停止并报告。**

- [ ] **Step 2: 在根 `.gitignore` 增加后端 `.env` 规则**

把第 18-21 行的：

```
# ==================== 本地环境变量（示例文件需保留）====================
*.local
.env.local
.env.*.local
```

替换为：

```
# ==================== 本地环境变量（示例文件需保留）====================
*.local
.env.local
.env.*.local
# 后端本地环境变量：内含数据库与 Redis 密码，禁止提交
backend/.env
!backend/.env.example
```

- [ ] **Step 3: 验证忽略规则生效**

```bash
git check-ignore -v backend/.env
git check-ignore -v backend/.env.example; echo "exit=$?"
```

Expected: 第一条输出命中 `.gitignore` 的 `backend/.env` 规则；第二条退出码为 `1`（未被忽略），确认示例文件仍可提交。

- [ ] **Step 4: 删除冗余文件**

```bash
git rm frontend/commitlint.config.cjs backend/commitlint.config.js backend/d_node_modules.cmd
git rm frontend/.husky/pre-commit frontend/.husky/commit-msg backend/.husky/pre-commit backend/.husky/commit-msg
```

- [ ] **Step 5: 清理后端 ESLint 中指向已删文件的 ignore 项**

把 `backend/eslint.config.mjs:20` 的：

```js
    ignores: ['eslint.config.mjs', 'dist/', 'node_modules/', 'commitlint.config.js'],
```

替换为：

```js
    ignores: ['eslint.config.mjs', 'dist/', 'node_modules/'],
```

- [ ] **Step 6: 验证钩子链路未被破坏**

```bash
git config core.hooksPath
git hook run pre-commit 2>&1 | head -5
pnpm run lint:check
```

Expected: `core.hooksPath` 为 `.husky/_`；`pre-commit` 正常执行并输出「已跳过」类提示（因暂存区只有删除项）；`lint:check` 退出码 `0`。

- [ ] **Step 7: 提交**

```bash
git add .gitignore backend/eslint.config.mjs
git commit -m "chore: 补齐 backend/.env 忽略规则并删除模板遗留的重复提交配置"
```

---

### Task 2: 失效配置清理

**Files:**
- Delete: `frontend/.auto-import.json`、`frontend/src/types/generated/auto-imports.d.ts`
- Modify: `frontend/.prettierignore`、`frontend/.stylelintignore`、`frontend/eslint.config.mjs`、`frontend/vite.config.ts`、`frontend/tsconfig.json`、`frontend/src/types/config/index.ts`

**Interfaces:**
- Consumes: 无
- Produces: `EnvConfig` 接口移除 `VITE_USE_MOCK`、`VITE_USE_GZIP`、`VITE_USE_CDN` 三个字段（其余字段与 `AppConfig` 保持不变）

- [ ] **Step 1: 复核自动导入产物确实无生成者**

```bash
cd D:/kpwxproject/admin-fullstack-starter/frontend
grep -n "auto-import\|unplugin" package.json vite.config.ts
ls node_modules/unplugin-auto-import 2>&1
grep -rn "AutoImport(" .
```

Expected: `package.json` 只有 `unplugin-vue-components`；`node_modules/unplugin-auto-import` 不存在；无任何 `AutoImport(` 调用。

- [ ] **Step 2: 复核别名与 ignore 条目指向的目标不存在**

```bash
ls -d src/assets/icons src/plugins 2>&1
ls -d preview 2>&1
grep -rn "@icons\|@plugins" src/ index.html
grep -rn "visualizer" vite.config.ts package.json
```

Expected: 两个目录均不存在；`preview/` 不存在；`@icons`/`@plugins` 在 `src/` 与 `index.html` 中零命中；无 `rollup-plugin-visualizer`。

- [ ] **Step 3: 删除自动导入孤儿产物**

```bash
git rm frontend/.auto-import.json frontend/src/types/generated/auto-imports.d.ts
rmdir frontend/src/types/generated 2>/dev/null || true
```

- [ ] **Step 4: 清理 `.prettierignore`**

把 `frontend/.prettierignore` 全文替换为：

```
# 依赖与构建产物
/node_modules/*
/dist/*

# 锁文件
/pnpm-lock.yaml

# 静态资源目录（favicon、模板 HTML 等无需格式化）
/public/*
```

- [ ] **Step 5: 清理 `.stylelintignore`**

把 `frontend/.stylelintignore` 全文替换为：

```
dist
node_modules
public
.husky
.vscode

src/assets
```

- [ ] **Step 6: 删除指向空目录的别名**

`frontend/vite.config.ts` 第 40 行，删除：

```ts
        '@icons': resolvePath('src/assets/icons'),
```

`frontend/tsconfig.json` 第 19 行与第 22 行，删除：

```json
      "@icons/*": ["src/assets/icons/*"],
```

```json
      "@plugins/*": ["src/plugins/*"],
```

保留 `@utils/*`、`@stores/*`（目标目录存在，属正常预留）。

- [ ] **Step 7: 删除 `eslint.config.mjs` 中指向不存在文件的 ignore 项**

`frontend/eslint.config.mjs:72`，删除该行：

```js
      'src/utils/console.ts',
```

- [ ] **Step 8: 删除 `EnvConfig` 中三个不存在的环境变量字段**

`frontend/src/types/config/index.ts:96-101`，把：

```ts
  // 路由来源
  VITE_ROUTE_SOURCE: 'static' | 'dynamic'
  // 是否开启 Mock
  VITE_USE_MOCK?: string
  // 是否开启压缩
  VITE_USE_GZIP?: string
  // 是否开启 CDN
  VITE_USE_CDN?: string
}
```

替换为：

```ts
  // 路由来源
  VITE_ROUTE_SOURCE: 'static' | 'dynamic'
  // 跨域请求是否携带 Cookie
  VITE_WITH_CREDENTIALS: string
}
```

- [ ] **Step 9: 验证类型检查未被破坏（关键闸门）**

```bash
cd D:/kpwxproject/admin-fullstack-starter/frontend
pnpm exec vue-tsc --noEmit
echo "TSC_EXIT=$?"
```

Expected: 退出码 `0`，无输出。**若出现类型错误，说明此前被 `auto-imports.d.ts` 掩盖，逐条修复后再继续——这是本任务的预期收益，不要通过恢复该文件来绕过。**

- [ ] **Step 10: 验证 lint 与构建**

```bash
cd D:/kpwxproject/admin-fullstack-starter
pnpm run lint:check:frontend
pnpm run format:check:frontend
pnpm run build:frontend
```

Expected: 三条命令退出码均为 `0`，`frontend/dist` 正常产出。

- [ ] **Step 11: 提交**

```bash
git add -A frontend
git commit -m "chore(frontend): 清理失效的自动导入产物、空目录别名与无用忽略项"
```

---

### Task 3: 移除子项目钩子依赖

**Files:**
- Modify: `frontend/package.json`、`backend/package.json`、`frontend/pnpm-lock.yaml`、`backend/package-lock.json`

**Interfaces:**
- Consumes: Task 1 已删除两端 `.husky/` 与 commitlint 配置文件
- Produces: 无

- [ ] **Step 1: 确认这些依赖在子项目内已无调用方**

```bash
cd D:/kpwxproject/admin-fullstack-starter
grep -rn "lint-staged" frontend/package.json backend/package.json
ls frontend/.husky backend/.husky 2>&1
cat .husky/commit-msg .husky/pre-commit
```

Expected: `.husky/` 目录已不存在；根 `commit-msg` 用 `pnpm exec commitlint`（根依赖），根 `pre-commit` 调用的是**两端各自的 `lint-staged` 二进制**——因此 `lint-staged` 必须保留，只删 `husky`、`@commitlint/cli`、`@commitlint/config-conventional`。

- [ ] **Step 2: 从 `frontend/package.json` 移除三个依赖**

删除 `devDependencies` 中的：

```json
    "@commitlint/cli": "^19.4.1",
    "@commitlint/config-conventional": "^19.4.1",
    "husky": "^9.1.5",
```

保留 `lint-staged`。

- [ ] **Step 3: 从 `backend/package.json` 移除三个依赖**

删除 `devDependencies` 中的：

```json
    "@commitlint/cli": "^19.8.1",
    "@commitlint/config-conventional": "^19.8.1",
    "husky": "^9.1.7",
```

保留 `lint-staged`。

- [ ] **Step 4: 重新安装并生成锁文件**

```bash
cd D:/kpwxproject/admin-fullstack-starter
pnpm --dir frontend install
cd backend && npm install && cd ..
```

Expected: 两条命令均成功；`frontend/pnpm-lock.yaml` 与 `backend/package-lock.json` 中不再含 `husky` 与 `@commitlint/*`。

- [ ] **Step 5: 验证锁文件与依赖清单一致**

```bash
cd D:/kpwxproject/admin-fullstack-starter
node -e "const p=require('./backend/package.json');const l=require('./backend/package-lock.json');const d={...p.dependencies,...p.devDependencies};const ld=l.packages[''];const all={...ld.dependencies,...ld.devDependencies};const diff=Object.keys({...d,...all}).filter(k=>d[k]!==all[k]);console.log('MISMATCH:',diff)"
grep -c "husky" frontend/pnpm-lock.yaml backend/package-lock.json
```

Expected: `MISMATCH: []`；两个 lock 中 `husky` 计数为 `0`。

- [ ] **Step 6: 验证提交钩子仍可用**

```bash
cd D:/kpwxproject/admin-fullstack-starter
printf 'chore: verify hooks\n' > /tmp/msg.txt && pnpm exec commitlint --edit /tmp/msg.txt && echo "COMMITLINT_OK"
printf 'bogus: verify hooks\n' > /tmp/msg2.txt && (pnpm exec commitlint --edit /tmp/msg2.txt && echo "UNEXPECTED_PASS" || echo "REJECTED_AS_EXPECTED")
```

Expected: 第一条输出 `COMMITLINT_OK`；第二条输出 `REJECTED_AS_EXPECTED`（根配置仍生效）。

- [ ] **Step 7: 提交**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml backend/package.json backend/package-lock.json
git commit -m "chore: 移除子项目已失效的 husky 与 commitlint 依赖"
```

---

### Task 4: 前端文档纠正（README 与 AGENTS.md）

**Files:**
- Modify: `frontend/README.md`、`frontend/AGENTS.md`

**Interfaces:**
- Consumes: Task 2 已删除 `frontend/.auto-import.json`、`src/types/generated/auto-imports.d.ts` 与 `src/hooks` 相关描述对象
- Produces: 无

- [ ] **Step 1: 核对文档中所有待纠正点仍然成立**

```bash
cd D:/kpwxproject/admin-fullstack-starter/frontend
sed -n '3p;29,33p;56,60p;71,74p;107p;117p;154p' README.md
grep -n "@ao/admin-components\"\|@ao/admin-layout\"" package.json
ls src/hooks 2>&1
grep -rn "VITE_OPEN_ROUTE_INFO" src/ vite.config.ts
```

Expected: README 仍写 `#v1`/`#v2` 而 `package.json` 是 `#v4`/`#v5`；`src/hooks` 为空目录；`VITE_OPEN_ROUTE_INFO` 在 `src/` 与 `vite.config.ts` 中零命中。

- [ ] **Step 2: 改写 `frontend/README.md:3`**

把：

```
基于 Vue 3、TypeScript 和 Element Plus 的前端后台管理模板，仓库名为 `admin-template-vue`，`package.json` 中的项目名为 `ao-design-pro`。
```

替换为：

```
本目录是 `admin-fullstack-starter` 的前端子项目，基于 Vue 3、TypeScript 和 Element Plus，`package.json` 中的项目名为 `ao-design-pro`。后端服务位于同仓库的 `../backend/`；仓库级安装、启动与构建命令见根 [README](../README.md)。
```

- [ ] **Step 3: 改写 `frontend/README.md:24-35` 的安装启动段**

把该段的克隆步骤：

```powershell
git clone https://github.com/Silent-12/admin-template-vue.git
cd admin-template-vue
pnpm install --frozen-lockfile
pnpm dev
```

替换为：

```powershell
# 在仓库根目录执行
pnpm run install:frontend   # 等价于在 frontend/ 执行 pnpm install
pnpm run dev:frontend       # 或 pnpm dev 同时启动前后端
```

并把紧随其后的说明句改为：「默认访问 http://localhost:3006，实际地址以终端输出为准。本目录已提供环境配置文件，首次运行无需另外复制 `.env`。单独在本目录内执行 `pnpm dev` 亦可。」

- [ ] **Step 4: 改写 `frontend/README.md:54-64` 的仓库协作表**

把标题与表格：

```
## 📦 项目与公共包

项目由三个独立 Git 仓库协作维护：

| 仓库 / 包 | 职责 |
| --- | --- |
| [admin-template-vue](https://github.com/Silent-12/admin-template-vue) | 当前业务宿主：页面、路由注册、API、用户与菜单数据、业务状态 |
| [@ao/admin-components](https://github.com/Silent-12/admin-components) | 公共组件：`AoTable`、`AoForm`、`AoSearchBar`、`AoButtonTable` 等 |
| [@ao/admin-layout](https://github.com/Silent-12/admin-layout) | 布局骨架、侧栏、头部、标签页、设置面板、主题底座，以及 `setting` / `app` / `worktab` 状态 |
```

替换为：

```
## 📦 项目与公共包

本子项目持有页面、路由注册、API、用户与菜单数据、业务状态；公共能力通过两个外部 Git 依赖包引入：

| 包 | 职责 |
| --- | --- |
| [@ao/admin-components](https://github.com/Silent-12/admin-components) | 公共组件：`AoTable`、`AoForm`、`AoSearchBar`、`AoButtonTable` 等 |
| [@ao/admin-layout](https://github.com/Silent-12/admin-layout) | 布局骨架、侧栏、头部、标签页、设置面板、主题底座，以及 `setting` / `app` / `worktab` 状态 |
```

- [ ] **Step 5: 修正 `frontend/README.md:71-74` 的版本号**

把：

```json
{
  "@ao/admin-components": "git+https://github.com/Silent-12/admin-components.git#v1",
  "@ao/admin-layout": "git+https://github.com/Silent-12/admin-layout.git#v2"
}
```

替换为：

```json
{
  "@ao/admin-components": "git+https://github.com/Silent-12/admin-components.git#v4",
  "@ao/admin-layout": "git+https://github.com/Silent-12/admin-layout.git#v5"
}
```

并把紧随其后的 `#v1` / `#v2` 说明句改为 `#v4` / `#v5`。

- [ ] **Step 6: 修正目录树**

`frontend/README.md:107` 把 `admin-template-vue/` 改为 `frontend/`。

`frontend/README.md:117` 删除该行：

```
│   ├── hooks/               # 可复用组合式逻辑
```

- [ ] **Step 7: 修正环境变量表**

`frontend/README.md:154` 删除该行：

```
| `VITE_OPEN_ROUTE_INFO`  | 路由信息调试开关        | `false`                             |
```

- [ ] **Step 8: 改写 `frontend/AGENTS.md:3`**

把：

```
- 本项目是纯前端后台管理模板 `Ao Design Pro`，无后端、数据库或 Redis/MQ；数据通过 `src/api/` 对接后端。
```

替换为：

```
- 本目录是 `admin-fullstack-starter` 的前端子项目 `Ao Design Pro`，后端服务位于同仓库的 `../backend/`（NestJS + MySQL + Redis）；本目录内不含后端、数据库或 Redis/MQ 代码，数据通过 `src/api/` 对接后端。
```

- [ ] **Step 9: 验证文档中的相对链接仍可解析**

```bash
cd D:/kpwxproject/admin-fullstack-starter/frontend
grep -oP '\]\(\K[^)#][^)]*' README.md AGENTS.md | sed 's/^[^:]*://' | sort -u | while read -r p; do [ -e "$p" ] || echo "BROKEN: $p"; done
```

Expected: 无 `BROKEN` 输出。若出现，修正对应链接后再继续。

- [ ] **Step 10: 提交**

```bash
cd D:/kpwxproject/admin-fullstack-starter
git add frontend/README.md frontend/AGENTS.md
git commit -m "docs(frontend): 将 README 与规则入口纠正为合并后的子项目身份"
```

---

### Task 5: 前端规则文件纠正

**Files:**
- Modify: `frontend/.agents/rules/api.md`、`coding.md`、`module-structure.md`、`state-storage.md`、`styles.md`、`typescript.md`、`workflow.md`、`git-commit-message.md`、`frontend/.agents/references/css-variables.md`

**Interfaces:**
- Consumes: 无
- Produces: 无

- [ ] **Step 1: 复核每条待纠正内容仍成立**

```bash
cd D:/kpwxproject/admin-fullstack-starter/frontend
sed -n '3p' .agents/rules/api.md .agents/rules/coding.md .agents/rules/module-structure.md .agents/rules/state-storage.md .agents/rules/styles.md .agents/rules/typescript.md .agents/rules/workflow.md
grep -n "security\|wip" .agents/rules/git-commit-message.md
ls src/store/modules src/types
ls src/components
grep -rn "border-full-d\|rounded-custom-sm" src/ node_modules/@ao/admin-layout/dist/index.css node_modules/@ao/admin-components/dist/index.css
```

Expected: 七个文件第 3 行均为「相对仓库根目录」；`git-commit-message.md` 含 `security`、不含 `wip`；`src/store/modules` 只有 `user.ts`/`menu.ts`；`src/types` 无 `component/`；`src/components` 无 `forms/`、`others/`、`tables/`；七个工具类零命中。

- [ ] **Step 2: 统一七个规则文件的基准路径表述**

对这七个文件的第 3 行：

```
[返回主索引](../../AGENTS.md)。本文中的源码路径均相对仓库根目录。
```

统一替换为：

```
[返回主索引](../../AGENTS.md)。本文中的源码路径均相对 `frontend/` 目录。
```

文件清单：`.agents/rules/api.md`、`coding.md`、`module-structure.md`、`state-storage.md`、`styles.md`、`typescript.md`、`workflow.md`。

- [ ] **Step 3: 对齐 `git-commit-message.md` 的 Type 表**

把表格中该行：

```
| security | 安全相关修复                       |
```

替换为：

```
| wip      | 进行中的工作                       |
```

（根 `commitlint.config.cjs` 的 `type-enum` 不含 `security`、含 `wip`；保留 `wip` 在表格末位即可。）

- [ ] **Step 4: 改写 `git-commit-message.md:199-216` 的「推荐工具」段**

把该段中建议在子项目内安装钩子依赖的内容，替换为：

```
提交钩子与提交信息校验均由仓库根统一提供：`core.hooksPath` 指向根 `.husky/`，`commit-msg` 调用根 `commitlint.config.cjs`。**不要在本子项目内安装或初始化 husky**——子目录执行 husky 会覆盖 `core.hooksPath`，导致根钩子静默失效（见根 [AGENTS.md](../../../AGENTS.md)）。
```

- [ ] **Step 5: 删除 `git-commit-message.md` 文末的空代码围栏**

删除文件末尾成对出现、内容为空的两个 ``` 围栏（位于「降低维护成本」列表之后）。

- [ ] **Step 6: 删除 `css-variables.md` 中不存在的工具类表**

删除 `.agents/references/css-variables.md:112-122` 的「预定义工具类（可直接复用）」表格整段。

同时把 `.agents/rules/styles.md:75` 中引用 `.border-*-d` 等类名的示例改为：

```scss
border: 1px solid var(--default-border);
```

- [ ] **Step 7: 修正 `css-variables.md` 的语义色与基准说明**

把 `:22-28` 的语义色固定值改为别名说明：

```
| 变量 | 取值 | 说明 |
| --- | --- | --- |
| `--ao-primary` | `var(--el-color-primary)` | 主色，别名到 Element Plus |
| `--ao-success` | `var(--el-color-success)` | 成功色 |
| `--ao-warning` | `var(--el-color-warning)` | 警告色 |
| `--ao-danger` | `var(--el-color-danger)` | 危险色 |
| `--ao-info` | `var(--el-color-info)` | 信息色 |
```

把 `:5` 的「以布局包仓库的 `src/styles/theme.scss`、`dark.scss` 为准」改为：

```
以下变量以安装后的 `node_modules/@ao/admin-layout/dist/index.css` 与 `node_modules/@ao/admin-components/dist/index.css` 为准（包仅发布 `dist`）。
```

- [ ] **Step 8: 修正 `css-variables.md:83` 的 `--theme-color` 归属**

把 `--theme-color` 从 `src/assets/styles/el-ui.scss` 分组移出，归入「由 `@ao/admin-layout` 提供」分组。

- [ ] **Step 9: 修正 store 与类型目录描述**

`state-storage.md:5` 把：

```
模块定义在 `src/store/modules/` 下，每个 store 一个文件，命名与业务域对应（如 `user.ts`、`menu.ts`、`setting.ts`、`worktab.ts`）
```

替换为：

```
模块定义在 `src/store/modules/` 下，每个 store 一个文件，命名与业务域对应（当前为 `user.ts`、`menu.ts`）；`setting` 与 `worktab` 由 `@ao/admin-layout` 提供，不在本目录重复实现
```

`typescript.md:5` 从目录枚举中删除 `component/`，改为：

```
当前已存在目录包括：`api/`、`common/`、`config/`、`directive/`、`generated/`、`router/`、`store/`。
```

- [ ] **Step 10: 修正 `module-structure.md` 的目录与示例**

`:6` 把子目录枚举改为实际存在的集合：

```
  - 通用基础组件放在 `src/components/` 下，按类别（`base/`、`banners/`、`layouts/`、`media/`、`text-effect/`、`theme/` 等）分子目录；
```

`:7` 把示例 `src/components/layouts/AoFastEnter.vue` 改为实际存在的 `src/components/base/AoBackToTop.vue`。

`:18` 把：

```
- 复用逻辑优先抽成 Composable，放置在 `src/hooks/core/` 下，命名以 `use` 开头（如 `useTable`、`useAuth`、`useTheme`）；不要在组件内重复实现已存在的 hook 能力。
```

替换为：

```
- 复用逻辑优先抽成 Composable。公共 Composable（如 `useTable`、`useAuth`、`useTheme`）由 `@ao/admin-layout` 与 `@ao/admin-components` 提供，禁止在本目录重复实现；本地 `src/hooks/` 目录当前为空，仅在确有宿主专属逻辑时新增，命名以 `use` 开头。
```

- [ ] **Step 11: 验证规则文件链接与格式**

```bash
cd D:/kpwxproject/admin-fullstack-starter
pnpm run format:check:frontend
grep -rn "相对仓库根目录" frontend/.agents/ || echo "OK: 无残留"
grep -rn "security" frontend/.agents/rules/git-commit-message.md || echo "OK: security 已移除"
```

Expected: `format:check` 退出码 `0`；无「相对仓库根目录」残留；`security` 不再出现。

- [ ] **Step 12: 提交**

```bash
git add frontend/.agents
git commit -m "docs(frontend): 纠正规则文件中的路径基准与失效内容"
```

---

### Task 6: 后端文档纠正

**Files:**
- Modify: `backend/README.md`、`backend/AGENTS.md`、`backend/src/modules/template-api/README.md`

**Interfaces:**
- Consumes: Task 1 已删除 `backend/commitlint.config.js`
- Produces: 无

- [ ] **Step 1: 复核每条待纠正内容仍成立**

```bash
cd D:/kpwxproject/admin-fullstack-starter/backend
sed -n '90p;97,100p;203p;236p;258,259p;158,159p' README.md
ls src/common/dto/api-response.dto.ts
sed -n '2p' .prettierrc
sed -n '36,38p' .env.example
```

Expected: README 写 `printWidth: 160` 而 `.prettierrc` 是 `140`；`api-response.dto.ts` 实际在 `src/common/dto/`；`.env.example` 为 `root`/`nestjs_demo`。

- [ ] **Step 2: 修正 `backend/README.md:15` 的特性列表**

删除该行：

```
- **🐶 Husky + lint-staged** - Git 钩子和代码提交检查
```

并把 `- **✅ Commitlint** - 提交信息规范` 改为：

```
- **✅ Commitlint** - 提交信息规范（由仓库根 `.husky/` 与根 `commitlint.config.cjs` 统一提供）
```

- [ ] **Step 3: 修正 `backend/README.md:60` 的目录树**

把：

```
├── commitlint.config.js          # Commitlint 配置
```

替换为：

```
├── .prettierignore               # Prettier 忽略清单
```

（提交规范已由仓库根负责，本目录不再持有 commitlint 配置。）

- [ ] **Step 4: 修正 `backend/README.md:86-95` 的 Prettier 片段**

把：

```json
{
  "printWidth": 160, // 单行最大字符数
  "quoteProps": "consistent", // 对象属性引号保持一致
  "semi": false, // 不使用分号
  "singleQuote": true // 使用单引号
}
```

替换为：

```json
{
  "printWidth": 140, // 单行最大字符数
  "quoteProps": "consistent", // 对象属性引号保持一致
  "semi": false, // 不使用分号
  "singleQuote": true, // 使用单引号
  "endOfLine": "auto" // 换行符交由编辑器决定，避免 Windows CRLF 被误判
}
```

- [ ] **Step 5: 改写 `backend/README.md:97-100` 的 Git Hooks 段**

把整段替换为：

```
### Git Hooks 🎣

提交钩子统一由**仓库根**提供：`core.hooksPath` 指向根 `.husky/`，`pre-commit` 按改动归属调用本目录的 `lint-staged`，`commit-msg` 使用根 `commitlint.config.cjs` 校验提交信息。本目录不再持有钩子文件与 commitlint 配置，详见根 [README](../README.md) 的「相对两个源模板的调整」。
```

- [ ] **Step 6: 修正 `backend/README.md:203` 的 DTO 路径**

把模块结构图中的：

```
│   ├── api-response.dto.ts         # 统一响应包装
│   ├── pagination-meta.dto.ts      # 分页元信息
```

替换为：

```
│   ├── pagination-meta.dto.ts      # 分页元信息
```

并在该代码块下方补一句：

```
> 统一响应包装 `ApiResponseDto` 为全局公共 DTO，位于 `src/common/dto/api-response.dto.ts`，**不在本模块的 `dto/` 目录内**。
```

- [ ] **Step 7: 修正 `backend/README.md` 全部响应示例中的 `timestamp` 类型**

把文中 6 处（原 `:236`、`:269`、`:292`、`:315`、`:332`、`:345`）：

```json
  "timestamp": 1716379200000
```

替换为：

```json
  "timestamp": "2026-05-22T10:00:00.000Z"
```

（`api-response.dto.ts:18,27` 实际为 `string`，由 `new Date().toISOString()` 生成。）

- [ ] **Step 8: 修正列表与详情示例中的时间字段类型**

把 `backend/README.md` 中 4 处（原 `:258-259`、`:289-290`）：

```json
        "createdAt": "2026-05-22T10:00:00.000Z",
        "updatedAt": "2026-05-22T10:00:00.000Z"
```

与

```json
    "createdAt": "2026-05-22T10:00:00.000Z",
    "updatedAt": "2026-05-22T10:00:00.000Z"
```

统一替换为对应的 Unix 秒形式：

```json
        "createdAt": 1779444000,
        "updatedAt": 1779444000
```

（`template-item.entity.ts:49,55` 为 `type: 'int'`，由 `dayjs().unix()` 写入。缩进按所在示例层级保持一致。）

- [ ] **Step 9: 对齐数据库示例值**

把 `backend/README.md:155-159` 的：

```bash
DB_USERNAME=root
DB_PASSWORD=123456
DB_DATABASE=demo
```

替换为：

```bash
DB_USERNAME=root
DB_PASSWORD=root
DB_DATABASE=nestjs_demo
```

（与 `.env.example:34-38` 一致，该文件才是用户复制使用的来源。）

- [ ] **Step 10: 修正 `template-api/README.md`**

`:13` 与 `:33` 中把 `api-response.dto.ts` 从 `template-api/dto/` 的列举中移除，并把「通用，无需修改」改为指向 `src/common/dto/api-response.dto.ts`。

`:139` 的响应示例保持 ISO 字符串形式（与 Step 7 方向一致），确认与 `backend/README.md` 口径相同。

`:48` 把「按查询需求调整 `@Index` 索引定义」改为：

```
实体当前未声明 `@Index`；如新模块的查询需要索引，请在实体上显式添加并通过新的迁移文件建索引。
```

- [ ] **Step 11: 修正 `backend/AGENTS.md` 措辞**

`:11` 把「当前模板技术栈为 NestJS、MySQL、Redis、TypeORM 与 TypeScript」改为「本子项目（`admin-fullstack-starter/backend`）技术栈为 NestJS、MySQL、Redis、TypeORM 与 TypeScript」。

`:22` 把「当前模板默认 `backend`」改为「本子项目默认 `backend`」。

- [ ] **Step 12: 验证**

```bash
cd D:/kpwxproject/admin-fullstack-starter
pnpm run format:check:backend
grep -n "printWidth.*160\|timestamp\": 1716379200000" backend/README.md || echo "OK: 已无过时值"
grep -n "api-response.dto.ts" backend/README.md backend/src/modules/template-api/README.md
```

Expected: `format:check` 退出码 `0`；无过时值残留；`api-response.dto.ts` 的出现处均指向 `src/common/dto/`。

- [ ] **Step 13: 提交**

```bash
git add backend/README.md backend/AGENTS.md backend/src/modules/template-api/README.md
git commit -m "docs(backend): 修正 README 中与实际不符的配置、路径与示例类型"
```

---

### Task 7: 根文档与 TODO 纠正

**Files:**
- Modify: `README.md`（根）、`TODO.md`

**Interfaces:**
- Consumes: Task 1 已删除两端 `.husky/`（根 README:230 需同步）、Task 4/5/6 已纠正子项目文档
- Produces: 无

- [ ] **Step 1: 复核待纠正点**

```bash
cd D:/kpwxproject/admin-fullstack-starter
sed -n '126p;226p;230p;243p' README.md
sed -n '15p;19p;54p;65p;319p;351p' TODO.md
grep -rn "from '@/mock" frontend/src | wc -l
sed -n '43p' frontend/src/directives/auth.ts
sed -n '182p' frontend/src/utils/http/index.ts
grep -n "\.\./\.agents/skills" backend/AGENTS.md || echo "OK: 后端无该相对路径"
```

Expected: `from '@/mock'` 计数为 `6`；`auth.ts:43` 为 `includes(binding.value)`；`http/index.ts:182` 为 `config.data = config.params`；`backend/AGENTS.md` 无 `../.agents/skills`。

- [ ] **Step 2: 修正根 `README.md:226` 的委托方式描述**

把：

```
| 新增根 `package.json` | 提供统一的安装、开发、构建、检查脚本，通过 `pnpm --dir frontend` 与 `npm --prefix backend` 委托到各子项目 |
```

替换为：

```
| 新增根 `package.json` | 提供统一的安装、开发、构建、检查脚本。运行类脚本用 `pnpm --dir frontend run` 与 `npm --prefix backend run` 委托；**安装类脚本是例外**——`install:backend` 必须写成 `cd backend && npm install`，原因见 `AGENTS.md` 的根级工程约定 |
```

- [ ] **Step 3: 改写根 `README.md:230` 的钩子记录行**

把：

```
| 子项目 `.husky/` 保留为记录 | 保留原钩子文件并加注说明，仅用于追溯模板原始配置，不再生效 |
```

替换为：

```
| 移除子项目 `.husky/` 与 commitlint 配置 | 钩子已提升到仓库级，子项目副本不再生效；同时移除子项目已失去调用方的 `husky`、`@commitlint/*` 依赖。原始配置见两个源模板仓库的 git 历史 |
```

- [ ] **Step 4: 修正根 `README.md:243` 的技能引用描述**

把：

```
- 跨端共用技能：位于根 `.agents/skills/`（`commit-msg`、`git-commit-changelog`、`code-review`、`karpathy-guidelines`、`typedoc-style`），由两端规则入口以 `../.agents/skills/` 引用，子项目内不再重复维护
```

替换为：

```
- 跨端共用技能：位于根 `.agents/skills/`（`commit-msg`、`git-commit-changelog`、`code-review`、`karpathy-guidelines`、`typedoc-style`）。`frontend/AGENTS.md` 以 `../.agents/skills/` 相对路径引用；`backend/AGENTS.md` 以文字说明指向同一目录。子项目内不再重复维护
```

- [ ] **Step 5: 修正根 `README.md:126` 的登录说明**

把：

```
前端演示登录：默认账号 `Super / 123456`，登录逻辑来自 `frontend/src/mock/auth.ts`。
```

替换为：

```
前端演示登录：登录页表单预填 `Super / 123456`（另有 `Admin`、`User` 两个演示账号，密码同为 `123456`）。Mock 只校验账号密码非空——**任意非空组合均可登录**，返回的用户名固定为 `admin`。逻辑见 `frontend/src/mock/auth.ts`。
```

- [ ] **Step 6: 补齐根 `README.md:132-150` 的命令表**

在表格中补齐缺失的根脚本，追加以下行：

```
| `pnpm run install:frontend` | 仅安装前端依赖（等价于在 `frontend/` 执行 `pnpm install`） |
| `pnpm run install:backend` | 仅安装后端依赖（`cd backend && npm install`） |
| `pnpm run lint:check:frontend` / `lint:check:backend` | 只读校验单端的 ESLint |
| `pnpm run format:check:frontend` / `format:check:backend` | 只读校验单端的格式 |
```

- [ ] **Step 7: 修正 `TODO.md` 的行号与数量口径**

`:65` 把 `frontend/src/directives/auth.ts:45` 改为 `frontend/src/directives/auth.ts:43`。

`:54` 把 `frontend/src/utils/http/index.ts:177` 改为 `frontend/src/utils/http/index.ts:182`。

`:15` 把「前端 5 处页面与路由守卫无法脱离 Mock」改为「前端 6 处页面与路由守卫无法脱离 Mock」。

`:19` 把「前端 5 处调用点仍指向 `@/mock`」改为「前端 6 处调用点仍指向 `@/mock`」。

- [ ] **Step 8: 在 `TODO.md` 登记本轮保留的已知缺陷**

在「5. 待确认问题」之后、附录之前，插入：

```markdown
---

## 6. 已登记未修复项（2026-10-07 清理中确认，按"模板待用能力"保留）

以下各项经审计确认当前无引用，但按「模板项目中未使用 ≠ 冗余」的判断标准保留，登记备查：

| 项 | 现状 | 影响 |
| --- | --- | --- |
| `frontend/src/main.ts:31-47` 的 `import.meta.glob('@/assets/svg/**/*.svg')` | 所匹配的 `src/assets/svg/` 下无任何 `.svg`（真实 SVG 在 `src/assets/images/svg/`），`localSvgModules` 恒为空，传给 `AdminComponents` 的回调为空转 | 本地 SVG 解析能力实际不可用，需补充素材或调整匹配目录 |
| `frontend/package.json` 的 `xgplayer`、`vue-img-cutter`、`highlight.js` | 分别服务于 `AoVideoPlayer.vue`、`AoCutterImg.vue`、`v-highlight` 指令——三者均为待业务页面使用的模板能力 | 无（属预期预留） |
| `backend/src/common/redis/redis.service.ts` 的 `set`/`setIfAbsent`/`get`/`del` | 当前仅有 `getClient()` 与 `getStatus()` 被调用 | 无（属预期预留） |
| `backend/package.json` 的 `@types/ioredis@^4` | ioredis 实际为 v5（自带类型），该桩包为 v4 API 类型 | 暂无实际影响（`tsc` 通过）；建议后续移除 |
| `backend/package.json` 未声明 `dotenv`，但 `src/app.module.ts:6` 直接 `import { config } from 'dotenv'` | 依赖 `@nestjs/config` 的传递依赖被提升后可用 | npm 扁平安装下正常；若改用 pnpm 严格链接会解析失败，建议显式声明 |
| `backend/src/modules/template-api/dto/create-template-item.dto.ts:21-25` 只允许 `active`/`inactive`，而实体注释与默认值含 `archived` | `archived` 状态无法通过接口写入，校验规则与实体注释互相矛盾 | 参考模板的示例数据不一致，建议二者取其一 |
```

- [ ] **Step 9: 验证**

```bash
cd D:/kpwxproject/admin-fullstack-starter
pnpm run format:check
grep -n "5 处" TODO.md || echo "OK: 数量口径已统一"
grep -n "auth.ts:45\|index.ts:177" TODO.md || echo "OK: 行号已修正"
```

Expected: `format:check` 退出码 `0`；无「5 处」残留；旧行号不再出现。

- [ ] **Step 10: 提交**

```bash
git add README.md TODO.md
git commit -m "docs: 修正根 README 与 TODO 的命令表、行号与数量口径并登记保留项"
```

---

### Task 8: 对齐 `access_logs` 实体索引与注释

**Files:**
- Modify: `backend/src/modules/access-log/entities/access-log.entity.ts:8-12`

**Interfaces:**
- Consumes: 无
- Produces: `AccessLog` 实体新增索引声明 `idx_ip_created_at`（列 `['ip', 'createdAt']`）

- [ ] **Step 1: 复核漂移仍存在**

```bash
cd D:/kpwxproject/admin-fullstack-starter/backend
grep -n "INDEX" src/database/migrations/V1__access_logs.sql
grep -n "@Index\|@Entity" src/modules/access-log/entities/access-log.entity.ts
```

Expected: SQL 有 5 个索引（含 `idx_ip_created_at`），实体只声明 4 个。

- [ ] **Step 2: 补齐实体索引并对齐注释**

把 `access-log.entity.ts:8-12`：

```ts
@Entity('access_logs', { comment: '访问日志表' })
@Index('idx_created_at', ['createdAt'])
@Index('idx_status_code', ['statusCode'])
@Index('idx_trace_id', ['traceId'])
@Index('idx_source_created_at', ['source', 'createdAt'])
```

替换为：

```ts
@Entity('access_logs', { comment: 'HTTP 请求访问日志表' })
@Index('idx_created_at', ['createdAt'])
@Index('idx_status_code', ['statusCode'])
@Index('idx_trace_id', ['traceId'])
@Index('idx_source_created_at', ['source', 'createdAt'])
@Index('idx_ip_created_at', ['ip', 'createdAt'])
```

- [ ] **Step 3: 验证**

```bash
cd D:/kpwxproject/admin-fullstack-starter/backend
npx tsc --noEmit -p tsconfig.json && echo "TSC_OK"
npm run lint:check && echo "LINT_OK"
```

Expected: 输出 `TSC_OK` 与 `LINT_OK`。

> 说明：本轮不修改 `V1__access_logs.sql`（`AGENTS.md:25` 规定已执行的迁移不得修改），仅让实体侧与迁移对齐。

- [ ] **Step 4: 提交**

```bash
cd D:/kpwxproject/admin-fullstack-starter
git add backend/src/modules/access-log/entities/access-log.entity.ts
git commit -m "fix(access-log): 补齐实体缺失的 idx_ip_created_at 索引并对齐表注释"
```

---

### Task 9: SQL 迁移执行器与 `template_items` 建表

**Files:**
- Create: `backend/src/database/run-migrations.ts`、`backend/src/database/migrations/V2__template_items.sql`
- Modify: `backend/package.json`（新增 `migration:run` 脚本）、`backend/README.md`（建库步骤）

**Interfaces:**
- Consumes: 无
- Produces: `npm run migration:run` 执行 `src/database/migrations/*.sql` 中未应用的文件，已应用记录写入 `schema_migrations` 表（列：`filename VARCHAR(255) PK`、`applied_at INT`）

- [ ] **Step 1: 确认待建表在数据库中确实不存在映射**

```bash
cd D:/kpwxproject/admin-fullstack-starter/backend
ls src/database/migrations/
grep -rn "template_items" src/ --include=*.sql
grep -n "@Entity" src/modules/template-api/entities/template-item.entity.ts
```

Expected: `migrations/` 下只有 `V1__access_logs.sql`；SQL 中无 `template_items`；实体声明了该表名 → 确认无建表脚本。

- [ ] **Step 2: 新建建表迁移 `V2__template_items.sql`**

```sql
-- ============================================================
-- 模板条目表 (template_items)
-- 说明：CRUD 参考模块 template-api 的数据表，字段与 TemplateItem 实体一一对应
-- 字符集：utf8mb4（支持 emoji 和特殊字符）
-- ============================================================

CREATE TABLE IF NOT EXISTS `template_items` (
  `id`          BIGINT       NOT NULL AUTO_INCREMENT  COMMENT '主键 ID',
  `name`        VARCHAR(255) NOT NULL                 COMMENT '名称',
  `description` VARCHAR(500) DEFAULT NULL             COMMENT '描述',
  `status`      VARCHAR(50)  NOT NULL DEFAULT 'active' COMMENT '状态（active | inactive | archived）',
  `priority`    INT          NOT NULL DEFAULT 0       COMMENT '优先级（数值越大优先级越高）',
  `is_enabled`  TINYINT(1)   NOT NULL DEFAULT 1       COMMENT '是否启用',
  `created_at`  INT          NOT NULL                 COMMENT '创建时间（Unix 时间戳）',
  `updated_at`  INT          NOT NULL                 COMMENT '更新时间（Unix 时间戳）',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模板条目表';
```

列名依据 `SnakeNamingStrategy`（`src/config/database-naming-strategy.ts:18-20` 用 `snakeCase` 转换属性名）。

- [ ] **Step 3: 新建迁移执行器 `run-migrations.ts`**

```ts
import { config } from 'dotenv'
import { readdir, readFile } from 'fs/promises'
import { createConnection, type RowDataPacket } from 'mysql2/promise'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env') })
config({ path: resolve(process.cwd(), '.env.local'), override: true })

const MIGRATIONS_DIR = resolve(process.cwd(), 'src/database/migrations')

/**
 * 执行尚未应用的 SQL 迁移
 * @description 按文件名升序执行 src/database/migrations 下的 .sql 文件，已执行的文件记录在
 * schema_migrations 表中，重复执行不会重复应用。注意 MySQL 的 DDL 语句无法回滚，
 * 单个文件执行失败时需人工确认后修复。
 * @returns 无返回值；全部成功以退出码 0 结束，任一失败以退出码 1 结束
 */
async function runMigrations(): Promise<void> {
  const connection = await createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_DATABASE || 'demo',
    multipleStatements: false,
  })

  try {
    await connection.query(
      "CREATE TABLE IF NOT EXISTS `schema_migrations` (" +
        "`filename` VARCHAR(255) NOT NULL COMMENT '迁移文件名'," +
        "`applied_at` INT NOT NULL COMMENT '应用时间（Unix 时间戳）'," +
        'PRIMARY KEY (`filename`)' +
        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='迁移执行记录表'",
    )

    const [rows] = await connection.query<RowDataPacket[]>('SELECT `filename` FROM `schema_migrations`')
    const applied = new Set(rows.map((row) => String(row.filename)))

    const files = (await readdir(MIGRATIONS_DIR)).filter((name) => name.endsWith('.sql')).sort()

    for (const file of files) {
      if (applied.has(file)) {
        console.warn(`[migration] 跳过（已应用）：${file}`)
        continue
      }
      const sql = await readFile(resolve(MIGRATIONS_DIR, file), 'utf8')
      console.warn(`[migration] 执行：${file}`)
      await connection.query(sql)
      await connection.query('INSERT INTO `schema_migrations` (`filename`, `applied_at`) VALUES (?, ?)', [
        file,
        Math.floor(Date.now() / 1000),
      ])
    }

    console.warn(`[migration] 完成，共 ${files.length} 个迁移文件`)
  } finally {
    await connection.end()
  }
}

runMigrations().catch((error: unknown) => {
  console.error('[migration] 执行失败：', error)
  process.exit(1)
})
```

- [ ] **Step 4: 在 `backend/package.json` 增加脚本**

在 `scripts` 中加入（置于 `build` 之后）：

```json
    "migration:run": "nest build && node dist/database/run-migrations.js",
```

采用先编译再运行的方式，避免 `ts-node` 在 ESM 下的兼容问题。

- [ ] **Step 5: 更新 `backend/README.md` 的建库步骤**

把：

```
新建数据库直接执行 `src/database/migrations/V1__access_logs.sql`。后续迁移文件按 `V{序号}__{描述}.sql` 顺序命名，规则详见 [AGENTS.md](AGENTS.md)。
```

替换为：

```
新建数据库时按顺序执行 `src/database/migrations/` 下的 `.sql` 文件（当前为 `V1__access_logs.sql`、`V2__template_items.sql`），也可直接运行：

```bash
npm run migration:run
```

该命令按文件名升序执行尚未应用的迁移，并把已执行的文件记录在 `schema_migrations` 表中，可重复执行。后续迁移文件按 `V{序号}__{描述}.sql` 顺序命名，规则详见 [AGENTS.md](AGENTS.md)。
```

- [ ] **Step 6: 验证类型与 lint**

```bash
cd D:/kpwxproject/admin-fullstack-starter/backend
npx tsc --noEmit -p tsconfig.json && echo "TSC_OK"
npm run lint:check && echo "LINT_OK"
```

Expected: `TSC_OK` 与 `LINT_OK`。

- [ ] **Step 7: 用真实 MySQL 跑通闭环**

前置：本地 MySQL 可连接，`backend/.env` 已按 `.env.example` 创建且 `MYSQL_ENABLED=true`、`DB_DATABASE` 指向一个**空库**。

```bash
cd D:/kpwxproject/admin-fullstack-starter/backend
npm run migration:run
npm run start:dev
```

另开一个终端：

```bash
curl -s -X POST http://localhost:3000/backend/v1/template-api -H "Content-Type: application/json" -d "{\"name\":\"闭环验证\"}"
curl -s "http://localhost:3000/backend/v1/template-api?page=1&pageSize=10"
curl -s http://localhost:3000/backend/v1/health
```

Expected: 迁移命令输出「执行：V1__access_logs.sql」「执行：V2__template_items.sql」；创建接口返回 `code: 200`；列表接口返回刚创建的条目；健康检查返回 MySQL 连通状态。**停止服务后再次执行 `npm run migration:run`，应全部输出「跳过（已应用）」。**

- [ ] **Step 8: 确认 `logs/` 已忽略**

```bash
cd D:/kpwxproject/admin-fullstack-starter
git status --porcelain | grep -c "logs/" || echo "OK: logs 未进入版本控制"
```

- [ ] **Step 9: 提交**

```bash
git add backend/src/database/run-migrations.ts backend/src/database/migrations/V2__template_items.sql backend/package.json backend/README.md
git commit -m "feat(database): 新增 SQL 迁移执行器与 template_items 建表迁移"
```

---

### Task 10: `template-api` 改为显式响应 DTO

**Files:**
- Create: `backend/src/modules/template-api/dto/template-item-response.dto.ts`
- Modify: `backend/src/modules/template-api/template-api.service.ts`、`template-api.controller.ts`、`backend/src/modules/template-api/README.md`、`backend/README.md`

**Interfaces:**
- Consumes: `TemplateItem` 实体（字段 `id`、`name`、`description`、`status`、`priority`、`isEnabled`、`createdAt`、`updatedAt`）
- Produces: `TemplateItemResponseDto`，含上述 8 个字段，并提供静态方法 `fromEntity(item: TemplateItem): TemplateItemResponseDto`

- [ ] **Step 1: 复核违规仍存在**

```bash
cd D:/kpwxproject/admin-fullstack-starter/backend
grep -n "ApiResponseDto<TemplateItem>\|ApiResponseDto<{ list: TemplateItem" src/modules/template-api/template-api.controller.ts src/modules/template-api/template-api.service.ts
sed -n '18p' AGENTS.md
```

Expected: 控制器与 service 均直接以 `TemplateItem` 作为 `data` 类型；`AGENTS.md:18` 禁止直接序列化 Entity。

- [ ] **Step 2: 新建响应 DTO**

```ts
import { ApiProperty } from '@nestjs/swagger'
import { TemplateItem } from '../entities/template-item.entity.js'

/**
 * 模板条目响应体
 * @description 显式声明对外暴露的字段，避免直接序列化实体。新增字段必须同时在此声明，
 * 以保证「接口字段最小化」的约定不被绕过。
 */
export class TemplateItemResponseDto {
  @ApiProperty({ description: '模板条目 ID', example: 1 })
  id!: number

  @ApiProperty({ description: '名称', example: '示例条目' })
  name!: string

  @ApiProperty({ description: '描述', example: '这是一个示例描述', nullable: true })
  description!: string

  @ApiProperty({ description: '状态', example: 'active' })
  status!: string

  @ApiProperty({ description: '优先级', example: 0 })
  priority!: number

  @ApiProperty({ description: '是否启用', example: true })
  isEnabled!: boolean

  @ApiProperty({ description: '创建时间（Unix 时间戳）', example: 1779444000 })
  createdAt!: number

  @ApiProperty({ description: '更新时间（Unix 时间戳）', example: 1779444000 })
  updatedAt!: number

  /**
   * 由实体构造响应体
   * @description 逐个字段显式映射，实体新增字段不会被自动透出。
   * @param item 模板条目实体
   * @returns 对外响应体
   */
  static fromEntity(item: TemplateItem): TemplateItemResponseDto {
    const dto = new TemplateItemResponseDto()
    dto.id = item.id
    dto.name = item.name
    dto.description = item.description
    dto.status = item.status
    dto.priority = item.priority
    dto.isEnabled = item.isEnabled
    dto.createdAt = item.createdAt
    dto.updatedAt = item.updatedAt
    return dto
  }
}
```

- [ ] **Step 3: 修改 service 返回类型与映射**

`template-api.service.ts` 增加 import：

```ts
import { TemplateItemResponseDto } from './dto/template-item-response.dto.js'
```

把 `findAll` 的签名与返回改为：

```ts
  async findAll(
    query: QueryTemplateItemDto,
  ): Promise<ApiResponseDto<{ list: TemplateItemResponseDto[]; pagination: PaginationMetaDto }>> {
```

并把该方法末尾的：

```ts
    const pagination = new PaginationMetaDto(page, pageSize, total)
    return new ApiResponseDto(200, '查询成功', { list, pagination })
```

替换为：

```ts
    const pagination = new PaginationMetaDto(page, pageSize, total)
    const records = list.map((item) => TemplateItemResponseDto.fromEntity(item))
    return new ApiResponseDto(200, '查询成功', { list: records, pagination })
```

把 `findOne` 的签名与返回改为：

```ts
  async findOne(id: number): Promise<ApiResponseDto<TemplateItemResponseDto>> {
    const item = await this.templateItemRepository.findOneBy({ id })
    if (!item) {
      throw new NotFoundException(`模板条目 ID=${id} 不存在`)
    }
    return new ApiResponseDto(200, '查询成功', TemplateItemResponseDto.fromEntity(item))
  }
```

`create`、`update`、`remove` 返回 `ApiResponseDto<null>`，保持不变。

- [ ] **Step 4: 修改 controller 的返回类型**

`template-api.controller.ts` 增加 import：

```ts
import { TemplateItemResponseDto } from './dto/template-item-response.dto.js'
```

把 `findAll` 的返回类型：

```ts
  async findAll(@Query() query: QueryTemplateItemDto): Promise<ApiResponseDto<{ list: TemplateItem[]; pagination: PaginationMetaDto }>> {
```

替换为：

```ts
  async findAll(
    @Query() query: QueryTemplateItemDto,
  ): Promise<ApiResponseDto<{ list: TemplateItemResponseDto[]; pagination: PaginationMetaDto }>> {
```

把 `findOne` 的返回类型：

```ts
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ApiResponseDto<TemplateItem>> {
```

替换为：

```ts
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ApiResponseDto<TemplateItemResponseDto>> {
```

删除 controller 中不再使用的 `TemplateItem` import。

- [ ] **Step 5: 更新 Swagger 响应类型标注**

在 `findAll` 与 `findOne` 上，把 `@ApiResponse({ status: 200, description: '查询成功', type: ApiResponseDto })` 改为：

```ts
  @ApiResponse({ status: 200, description: '查询成功', type: TemplateItemResponseDto })
```

- [ ] **Step 6: 验证类型与 lint**

```bash
cd D:/kpwxproject/admin-fullstack-starter/backend
npx tsc --noEmit -p tsconfig.json && echo "TSC_OK"
npm run lint:check && echo "LINT_OK"
```

Expected: `TSC_OK` 与 `LINT_OK`。

- [ ] **Step 7: 验证响应结构与改动前一致**

启动服务后：

```bash
curl -s "http://localhost:3000/backend/v1/template-api?page=1&pageSize=10"
```

Expected: `data.list[0]` 的键为 `id`、`name`、`description`、`status`、`priority`、`isEnabled`、`createdAt`、`updatedAt`，与改造前完全一致（本次只把隐式实体序列化改为显式声明，不改变下游拿到的字段）。

- [ ] **Step 8: 同步模块 README 与根后端 README**

在 `backend/src/modules/template-api/README.md` 的模块结构图中，把 `dto/` 下的清单补上：

```
│   ├── template-item-response.dto.ts # 列表与详情的响应体（显式字段映射）
```

并在「必改」清单中补充一行，说明新模块应同步新增自己的 `{ModuleName}ResponseDto`，不得直接返回实体。

在 `backend/README.md` 的 `template-api` 模块结构图中同步补上同一行。

- [ ] **Step 9: 提交**

```bash
cd D:/kpwxproject/admin-fullstack-starter
git add backend/src/modules/template-api backend/README.md
git commit -m "refactor(template-api): 以显式响应 DTO 替代实体直接序列化"
```

---

### Task 11: 接通 Winston 日志

**Files:**
- Modify: `backend/src/common/logger/logger.service.ts:1-10`、`backend/src/app.module.ts:15-21,62-72`、`backend/src/main.ts`

**Interfaces:**
- Consumes: `logger.config.ts` 导出的 `winstonConfig`（不变）、`LoggerModule`（不变）
- Produces: `AppModule` 导入 `LoggerModule`；`main.ts` 以 `WinstonModule.createLogger(winstonConfig)` 作为应用 logger；`LoggerService` 改为按 `WINSTON_MODULE_NEST_PROVIDER` 令牌注入

- [ ] **Step 1: 确认缺陷与令牌**

```bash
cd D:/kpwxproject/admin-fullstack-starter/backend
grep -rn "LoggerModule" src/
grep -n "WINSTON_MODULE_NEST_PROVIDER\|provide:" node_modules/nest-winston/dist/winston.providers.js
sed -n '8,12p' src/common/logger/logger.service.ts
```

Expected: `LoggerModule` 只在自身文件出现（未被 `app.module.ts` 引用）；`winston.providers.js` 显示提供的令牌是字符串常量，**没有** `WinstonLogger` 类令牌；`logger.service.ts` 当前按类注入 → 这正是接通后会立刻失败的根因。

- [ ] **Step 2: 修正 `logger.service.ts` 的注入令牌**

把 `logger.service.ts:1-10`：

```ts
import { Injectable } from '@nestjs/common'
import { WinstonLogger } from 'nest-winston'

/**
 * 日志服务
 * @description 封装 Winston 日志功能，提供统一的日志接口
 */
@Injectable()
export class LoggerService {
  constructor(private readonly logger: WinstonLogger) {}
```

替换为：

```ts
import { Inject, Injectable } from '@nestjs/common'
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston'

/**
 * 日志服务
 * @description 封装 Winston 日志功能，提供统一的日志接口
 */
@Injectable()
export class LoggerService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: WinstonLogger,
  ) {}
```

（原因：nest-winston 以字符串常量 `WINSTON_MODULE_NEST_PROVIDER` 作为注入令牌，`WinstonLogger` 类本身未被注册为 provider。）

- [ ] **Step 3: 在 `app.module.ts` 注册 `LoggerModule`**

增加 import：

```ts
import { LoggerModule } from './common/logger/logger.module.js'
```

在 `imports` 数组中、`RedisModule,` 之后加入：

```ts
    /**
     * 日志模块
     * 注册 Winston 日志（控制台 + 三路按日滚动落盘），并使 WINSTON_MODULE_NEST_PROVIDER 全局可注入
     */
    LoggerModule,
```

- [ ] **Step 4: 在 `main.ts` 中启用 Winston logger**

在 `main.ts` 增加 import：

```ts
import { WinstonModule } from 'nest-winston'
import { winstonConfig } from './common/logger/logger.config.js'
```

把 `main.ts:23` 的应用创建语句：

```ts
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true })
```

替换为：

```ts
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    logger: WinstonModule.createLogger(winstonConfig),
  })
```

保留 `rawBody: true`（Webhook 原始报文校验依赖它）。该写法无需 `bufferLogs`/`flushLogs`——日志直接由 Winston 输出。

- [ ] **Step 5: 验证类型、lint 与构建**

```bash
cd D:/kpwxproject/admin-fullstack-starter/backend
npx tsc --noEmit -p tsconfig.json && echo "TSC_OK"
npm run lint:check && echo "LINT_OK"
npm run build && echo "BUILD_OK"
```

Expected: 三个标记全部输出。

- [ ] **Step 6: 验证日志真实生效（关键闸门）**

```bash
cd D:/kpwxproject/admin-fullstack-starter/backend
rm -rf logs
npm run start:dev
```

服务启动约 5 秒后，另开终端：

```bash
curl -s http://localhost:3000/backend/v1/health
ls -R logs
```

Expected: 控制台出现 Nest 格式的彩色日志；`logs/combined/`、`logs/error/` 两个目录下生成对应日志文件，且 `combined` 中有本次启动记录。（原计划为三个目录，`logs/access/` 因与 `combined` 逐行重复已于后续提交移除。）

**若启动报 `Nest can't resolve dependencies of the LoggerService`**，说明注入令牌仍未命中，回到 Step 2 核对；**若报模块解析失败**，检查 Step 3 的 import 路径是否带 `.js` 后缀。

- [ ] **Step 7: 确认日志目录未进入版本控制**

```bash
cd D:/kpwxproject/admin-fullstack-starter
git status --porcelain | grep -c "logs/" || echo "OK: logs 已忽略"
```

Expected: 输出 `OK: logs 已忽略`。

- [ ] **Step 8: 提交**

```bash
git add backend/src/common/logger/logger.service.ts backend/src/app.module.ts backend/src/main.ts
git commit -m "feat(logger): 接通 Winston 日志模块并修正注入令牌"
```

---

## 收尾验证

- [ ] 全量检查

```bash
cd D:/kpwxproject/admin-fullstack-starter
pnpm run lint:check
pnpm run format:check
pnpm run build
```

Expected: 三条命令退出码均为 `0`。

- [ ] 工作区干净

```bash
git status --porcelain
```

Expected: 无输出。

- [ ] 分支提交历史可回溯

```bash
git log --oneline main..HEAD
```

Expected: 12 条提交（设计文档 1 条 + 各任务 11 条），每条对应一个可独立评审的改动单元。

---

## 自查记录

**Spec 覆盖**：设计文档第 4.1（Task 1）、4.2（Task 1）、4.3.1-4.3.2（Task 4）、4.3.3-4.3.4（Task 5）、4.3.5-4.3.7（Task 6）、4.3.8-4.3.9（Task 7）、4.4（Task 2、Task 3）、第 5 节（无任务，为标准声明；保留项登记于 Task 7 Step 8）、6.1（Task 9，含技术修正）、6.2（Task 10）、6.3（Task 11）、6.4（Task 8）、第 8 节验证（各任务验证步骤 + 收尾验证）。

**技术修正**：设计 6.1 的 `data-source.ts` + `typeorm migration:run` 方案不可行（TypeORM CLI 不支持原始 `.sql` 迁移），已在 Task 9 替换为 SQL 迁移执行器；理由见「对设计文档的技术修正」一节。

**新增发现（超出 spec 范围，未纳入本计划，仅登记）**：`create-template-item.dto.ts` 的 `status` 枚举缺 `archived`、`app.module.ts` 直接依赖未声明的 `dotenv`、`@types/ioredis` 版本桩包——三项均已登记在 Task 7 Step 8 的 `TODO.md` 新增章节，待你决定是否单独处理。
