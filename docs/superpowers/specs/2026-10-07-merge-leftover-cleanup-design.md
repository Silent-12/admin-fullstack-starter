# 合并遗留清理设计

> 对象仓库：`admin-fullstack-starter`
> 来源模板：`admin-template-vue`（前端）、`backend-template-nest`（后端）
> 记录时间：2026-10-07 ｜ 基线提交：`6e813c7`
> 性质：设计清单，经确认后作为实现依据

---

## 1. 背景

本仓库由两个独立模板仓库合并而成。经三路审计（前端 / 后端 / 根级配置）与逐文件比对，得出一个关键事实：

**合并只改动了结构与文档配置层，没有改动任何业务源码。**

| 范围 | 比对结果 |
| --- | --- |
| `frontend/src` | 119 个文件与 `admin-template-vue/src` **MD5 全等** |
| `backend/src` | 与 `backend-template-nest/src` 全等；唯一差异是 `main.ts` 的 6 行 Prettier 重排（后端行宽由 160 收到 140 所致，无功能变化） |
| 前端非源码层 | 改动 `AGENTS.md`、`README.md`、`eslint.config.mjs`、`package.json`、`pnpm-lock.yaml`、`.prettierignore`、`.agents/rules/{typescript,workflow}.md`；5 个共用技能上移根 `.agents/skills/` |
| 后端非源码层 | 改动 `AGENTS.md`、`README.md`、`eslint.config.mjs`、`package.json`、`package-lock.json`、`.prettierrc`；新增 `.prettierignore`；移除 `.vscode/`；5 个共用技能上移 |

由此，问题被清晰地分为两类：

- **甲类**：合并引入、或合并后暴露的——集中在文档、配置与根级编排。
- **乙类**：模板自带、被原样搬入的源码——**不属于本次清理对象**（见第 5 节）。

---

## 2. 判断标准

本仓库是**模板脚手架**，会被下游复制与继承。据此确立三条标准：

1. **"当前未使用"不等于"冗余"**。模板的价值恰恰在于提供待业务页面消费的能力。前端组件、工具模块、类型定义、指令，后端的 Redis 方法、错误工具等，均为**待用能力**，保留。删除它们等于削掉脚手架的供给面。
2. **"指向不存在的东西"才算失效**。配置若指向不存在的目录、文件或产物，则不是预留而是缺陷，应当清理。
3. **规则与实现必须自洽**。仓库自带的 `AGENTS.md` / 规则文件若与参考实现互相矛盾，等于教错下游；宣称了却不生效的能力比没有更糟。

---

## 3. 范围总览

| 层 | 内容 | 是否改动行为 |
| --- | --- | --- |
| 第一层 | 文档与配置纠正、冗余文件删除、失效配置清理、安全规则补缺 | 几乎否。仅 `.gitignore`、两端依赖声明与删除自动导入产物三处会触及工程行为；删除产物后需确认无被掩盖的类型错误（第 8 节） |
| 第二层 | 能力代码 | **不清理**，明确保留（第 5 节） |
| 第三层 | 结构性修正（迁移机制、参考模板合规、日志接通、索引对齐） | 是，逐项说明 |

---

## 4. 第一层：文档与配置纠正

### 4.1 安全：补齐 `.env` 忽略规则

| 项 | 内容 |
| --- | --- |
| 现状 | `git check-ignore -v backend/.env` 返回未忽略。根 `.gitignore:18-21` 只覆盖 `.env.local`/`.env.*.local`/`*.local`；`backend/.gitignore:24` 只写 `.env*.local` |
| 影响 | 根 `README.md:99-104` 明确指导 `Copy-Item .env.example .env`，`.env` 内含 `DB_PASSWORD`、`REDIS_PASSWORD`、`KNIFE4J_PASSWORD`。按文档操作后该文件会以未跟踪状态出现在 `git status`，极易被 `git add .` 误提交 |
| 纠正 | 根 `.gitignore` 的「本地环境变量」段增加 `backend/.env`，保留 `backend/.env.example` 可提交 |

> 注：`frontend/.env`、`.env.development`、`.env.production` 是**有意提交**的模板配置（不含凭据），不在清理范围。

### 4.2 删除冗余文件

每项均已以 `git grep` / `grep -r` 复核零引用。

| 文件 | 依据 |
| --- | --- |
| `frontend/commitlint.config.cjs` | 根 `.husky/commit-msg` 以仓库根为工作目录执行 `pnpm exec commitlint`，命中的始终是根 `commitlint.config.cjs`。该文件无人调用，且类型枚举更弱（缺 `type-case`/`subject-empty`/`subject-full-stop`），构成同一规则的第二个真源。另：其 `wip` 条目的注释错抄成了 `chore` 的说明 |
| `backend/commitlint.config.js` | 同上；且使用 `export default`、类型枚举缺 `wip`，与根配置已实质漂移 |
| `backend/d_node_modules.cmd` | 内容仅 `rd /s /q node_modules` 一行，全仓库无任何文档或脚本引用；删除的是"当前工作目录"下的 `node_modules`，从错误目录执行会误删 |
| `frontend/.husky/pre-commit`、`frontend/.husky/commit-msg` | `core.hooksPath` 已指向根 `.husky/_`，git 只会解析根钩子，这两个文件永不执行 |
| `backend/.husky/pre-commit`、`backend/.husky/commit-msg` | 同上 |

> **需要你留意的决定**：删除两端 `.husky/` 推翻了 `README.md:230` 中「子项目 `.husky/` 保留为记录」的既有决定。理由：源模板的原始配置已由 git 历史完整保存，无人在代码库中考古；而在本轮同时移除子项目 `husky`/`@commitlint/*` 依赖后（见 4.4），这两个文件引用的二进制将不复存在，留着反而误导。根 `README.md:230` 的对应行需同步改写为「已删除」。

### 4.3 文档纠正

#### 4.3.1 `frontend/README.md`（整篇仍是独立模板仓库口吻）

| 位置 | 现状 | 纠正 |
| --- | --- | --- |
| `:3` | "仓库名为 `admin-template-vue`，`package.json` 中的项目名为 `ao-design-pro`" | 改为说明这是 `admin-fullstack-starter` 的前端子项目 |
| `:29-30` | `git clone https://github.com/Silent-12/admin-template-vue.git` + `cd admin-template-vue` | 删除模板克隆步骤，改为在仓库根执行 `pnpm run install:frontend` |
| `:56-79` | "项目由三个独立 Git 仓库协作维护"，把 `admin-template-vue` 列为"当前业务宿主" | 改为说明 `@ao/admin-components`、`@ao/admin-layout` 是外部 git 依赖 |
| `:71-74` | 安装版本写 `#v1` / `#v2` | 实际为 `#v4` / `#v5`（`package.json:45-46`） |
| `:107` | 目录树根名 `admin-template-vue/` | 改为 `frontend/` |
| `:117` | 目录树列出 `hooks/`（"可复用组合式逻辑"） | 删除该项：该目录为空且不被 git 跟踪 |
| `:154` | 环境变量表列出 `VITE_OPEN_ROUTE_INFO` | 删除：全仓库唯一出现处是 `.env:22` 与该文档行，无任何读取点 |

#### 4.3.2 `frontend/AGENTS.md`

| 位置 | 现状 | 纠正 |
| --- | --- | --- |
| `:3` | "本项目是纯前端后台管理模板 `Ao Design Pro`，无后端、数据库或 Redis/MQ" | 与根 `AGENTS.md:5` 的全栈定位直接冲突；改为"本目录是全栈仓库的前端子项目，后端位于 `../backend/`" |

#### 4.3.3 `frontend/.agents/rules/`（7 个文件）

`api.md:3`、`coding.md:3`、`module-structure.md:3`、`state-storage.md:3`、`styles.md:3`、`typescript.md:3`、`workflow.md:3` 统一写着"本文中的源码路径均相对**仓库根目录**"。合并后该基准失真——正文路径（`src/utils/http/index.ts` 等）实为相对 `frontend/`，仓库根下没有 `src/`。统一改为"相对 `frontend/` 目录"。

#### 4.3.4 其余前端规则文件

| 文件 | 问题 | 纠正 |
| --- | --- | --- |
| `git-commit-message.md:29-40` | Type 表含 `security`（根 `commitlint.config.cjs` 的 `type-enum` **不允许**，提交会被拒），且缺 `wip`（根配置允许） | 与根配置对齐 |
| `git-commit-message.md:199-216` | 建议在 frontend 内 `pnpm add -D husky` | 与根 `AGENTS.md:37`「子项目不得再声明 `prepare: husky`」直接冲突；改为指向根配置 |
| `git-commit-message.md:234-237` | 文末残留一对空代码围栏 | 删除 |
| `css-variables.md:112-122`、`styles.md:75` | 登记 `.border-full-d`、`.rounded-custom-sm` 等 7 个"预定义工具类"，`grep` 仅命中文档自身，两个 `@ao` 包产物中均不存在 | 删除该表 |
| `css-variables.md:22-28` | 语义色写成固定 `oklch(...)`；实际产物是 `--ao-primary: var(--el-color-primary)` 等别名 | 改为别名说明 |
| `css-variables.md:5` | 指引读者以布局包 `src/styles/theme.scss` 为准 | 该包 `files` 仅发布 `dist`，本地无 `src/`；基准改为 `dist/index.css` |
| `css-variables.md:83` | 把 `--theme-color` 归入宿主 `el-ui.scss` | 该变量由布局包提供 |
| `state-storage.md:5` | 举例 store 含 `setting.ts`、`worktab.ts` | 实际只有 `user.ts`、`menu.ts`；`setting`/`worktab` 由 `@ao/admin-layout` 提供 |
| `typescript.md:5` | 声称 `src/types/` 已存在 `component/` | 实际无该目录 |
| `module-structure.md:6` | 列举 `forms/`、`others/`、`tables/` 子目录 | 均不存在；`text-effect/`、`theme/` 未登记 |
| `module-structure.md:7` | 举例 `src/components/layouts/AoFastEnter.vue` | 该文件不存在 |
| `module-structure.md:18` | 规定 Composable 放 `src/hooks/core/`，举例 `useTable`/`useAuth`/`useTheme` | 目录为空且不存在 `core/`；这些 Composable 由 `@ao` 包提供，与同句"不要重复实现包内能力"矛盾 |

#### 4.3.5 `backend/README.md`

| 位置 | 现状 | 纠正 |
| --- | --- | --- |
| `:15` | 特性列表含 "Husky + lint-staged"、"Commitlint" | 钩子已由仓库根统一提供；改为注明归属 |
| `:60` | 目录树列出 `commitlint.config.js` | 该文件本轮删除；标注提交规范由仓库根负责 |
| `:90` | Prettier 片段 `printWidth: 160` | 实际 `backend/.prettierrc:2` 是 `140`；片段还遗漏 `endOfLine: "auto"`。注：此错误源自模板，且与根 `README.md:172` 的 `140` 自相矛盾 |
| `:97-100` | "Git Hooks：pre-commit 自动执行 lint-staged" | 改为指向仓库根 `.husky/` |
| `:203` | `template-api` 结构图把 `api-response.dto.ts` 列在 `dto/` 下 | 实际位于 `src/common/dto/api-response.dto.ts` |
| `:236,269,292,315,332,345` | 响应示例 `"timestamp": 1716379200000`（数字） | `api-response.dto.ts:18,27` 实际为 `string`（`new Date().toISOString()`） |
| `:258-259,289-290` | `"createdAt": "2026-05-22T10:00:00.000Z"` | `template-item.entity.ts:49,55` 实际为 `type: 'int'` 的 Unix 秒 |
| `:158-159` | 数据库示例 `123456` / `demo` | 与 `.env.example:36,38` 的 `root` / `nestjs_demo` 不一致，统一 |

#### 4.3.6 `backend/src/modules/template-api/README.md`

| 位置 | 现状 | 纠正 |
| --- | --- | --- |
| `:13`、`:33` | 把 `api-response.dto.ts` 列在 `template-api/dto/` 下并称"通用，无需修改" | 实际位于 `src/common/dto/` |
| `:139` | `timestamp` 写成 ISO 字符串（此处反而是对的） | 与 4.3.5 统一口径后保持一致 |
| `:48` | 建议"按查询需求调整 `@Index` 索引定义" | `template-item.entity.ts` 中并无任何 `@Index`；改为如实描述或补索引（见第三层） |

#### 4.3.7 `backend/AGENTS.md`

`:11`、`:22` 措辞为"当前模板技术栈为…"、"当前模板默认 `backend`"。取值本身正确，但未反映"这是 `admin-fullstack-starter` 的后端子项目"，统一措辞。

#### 4.3.8 根 `README.md`

| 位置 | 现状 | 纠正 |
| --- | --- | --- |
| `:226` | "通过 `pnpm --dir frontend` 与 `npm --prefix backend` 委托到各子项目" | `install:backend` 实为 `cd backend && npm install`（`AGENTS.md:39` 要求的例外）；补明这一例外 |
| `:230` | "子项目 `.husky/` 保留为记录" | 本轮已删除，改写为"已删除，原始配置见 git 历史" |
| `:243` | "由**两端**规则入口以 `../.agents/skills/` 引用" | 仅 `frontend/AGENTS.md` 使用该相对路径；`backend/AGENTS.md:4` 为文字说明 |
| `:126` | "默认账号 `Super / 123456`，登录逻辑来自 `frontend/src/mock/auth.ts`" | `mock/auth.ts:9-18` 只校验账号密码非空，任何非空组合均可登录且返回用户名 `admin`；`Super/123456` 实为 `login/index.vue:94-116` 的表单预填值 |
| `:132-150` | 命令表缺 `prepare`、`install:frontend`、`install:backend`、`lint:check:*`、`format:check:*` | 补齐，以符合 `AGENTS.md:27`「新增脚本需同时更新根 README 的命令表」 |
| `:172` | 已正确写 `140` | 无需改动，作为 4.3.5 的对齐基准 |

#### 4.3.9 `TODO.md`

| 位置 | 现状 | 纠正 |
| --- | --- | --- |
| `:65` | `frontend/src/directives/auth.ts:45` | 实际 `includes(binding.value)` 在 `:43` |
| `:54` | `frontend/src/utils/http/index.ts:177` | `config.data = config.params` 在 `:182`（`:177` 为 `if (` 起始行） |
| `:15`、`:19` | "前端 5 处页面…"、"5 处调用点" | `from '@/mock'` 实际命中 **6** 处，与 `:319`、`:351` 的"6 处"矛盾 |

### 4.4 失效配置清理

| 位置 | 问题 | 纠正 |
| --- | --- | --- |
| `frontend/.auto-import.json`、`frontend/src/types/generated/auto-imports.d.ts`、`.prettierignore:9` | `unplugin-auto-import` 既不在 `package.json`、不在 `vite.config.ts`、也不在 `node_modules`（`vite.config.ts:7-8` 只注册了 `unplugin-vue-components`）。而该 `.d.ts` 声明了 300+ 全局符号并被 `tsconfig.json:26` 收编，会让下游漏写的 import 通过类型检查却在构建时失败。已核实 `src/` 下所有文件均**显式** `import { computed, ref } from 'vue'`（如 `login/index.vue:72`、`user/index.vue:71`、`AoBackToTop.vue:18`），无任何代码依赖自动导入 | 删除两个产物文件与 `.prettierignore` 对应条目 |
| `vite.config.ts:40` `@icons`、`tsconfig.json:19` `@icons/*` | 指向 `src/assets/icons`，该目录不存在 | 删除别名 |
| `tsconfig.json:22` `@plugins/*` | 指向 `src/plugins`，该目录不存在；且 `vite.config.ts` 中**根本没有**该别名——类型可解析但构建无法解析 | 删除 |
| `.prettierignore:4-5` `/preview/*`、`/stats.html`；`.stylelintignore:8` `stats.html` | 仓库无 `preview/` 目录，也未安装 `rollup-plugin-visualizer`，产物永不生成 | 删除这些条目 |
| `frontend/eslint.config.mjs:72` `'src/utils/console.ts'` | 该文件不存在 | 删除该 ignore 项 |
| `frontend/package.json` 的 `husky`、`@commitlint/cli`、`@commitlint/config-conventional`；`backend/package.json` 的同三项 | 两端 `prepare` 脚本已在合并时移除，`core.hooksPath` 指向根，子项目 `.husky/` 本轮删除后这些依赖彻底无调用方。根 `AGENTS.md:37` 亦明令子项目不得再接入 husky | 从两端 devDependencies 移除，重新生成 `frontend/pnpm-lock.yaml` 与 `backend/package-lock.json` |

> `lint-staged` **不在移除之列**：根 `.husky/pre-commit` 显式调用两端 `lint-staged` 二进制，是活依赖。

---

## 5. 第二层：明确保留的能力代码（不清理）

以下经审计确认"当前零引用"，但按第 2 节标准 1 属于**待用能力**，本设计**不做任何删除**：

| 范围 | 保留项 |
| --- | --- |
| 前端组件 | `AoBackToTop.vue`、`AoCountTo.vue`、`AoCutterImg.vue`、`AoVideoPlayer.vue` |
| 前端工具 | `utils/index.ts` 桶、`utils/form/`、`utils/ui/{colors,tabs,emoji}.ts`、`utils/navigation/jump.ts`、`utils/storage/index.ts` |
| 前端类型 | `types/config` 的 `EnvConfig`/`AppConfig`、`WorkTab`、`SettingState`/`SettingStoreState` 等 |
| 前端指令 | `v-highlight`（`directives/highlight.ts`） |
| 前端别名 | `@utils`、`@stores`（目标目录存在，属正常预留） |
| 后端 | `redis.service.ts` 的 `set`/`setIfAbsent`/`get`/`del`、`createErrorResponse`、`types/response.d.ts` |
| 配套依赖 | `xgplayer`、`vue-img-cutter`、`highlight.js`、`@nestjs/mapped-types`、`@types/ioredis`、`source-map-support`、`ts-loader`、`ts-node`、`tsconfig-paths` 等 |

> 保留 `AoVideoPlayer`/`AoCutterImg`/`v-highlight` 即意味着保留 `xgplayer`/`vue-img-cutter`/`highlight.js`——删组件却留依赖才是真正的自相矛盾。

**唯一例外（字段级）**：`EnvConfig`（`types/config/index.ts:97-101`）内的 `VITE_USE_MOCK`、`VITE_USE_GZIP`、`VITE_USE_CDN` 三个字段，在任何 `.env*` 中都无定义、也无任何读取点。它们属于**指向不存在变量的声明**（标准 2），而非待用能力，故移除这三个字段；`EnvConfig`/`AppConfig` 两个接口本身保留，`types/config/index.ts` 中经活接口间接存活的 `ThemeSetting`/`SystemBasicConfig`/`FeatureConfigItem` 等一律不动。

**另记一（保留但需你知悉）**：`backend/package.json` 的 `@types/ioredis@^4.28.10` 是 ioredis v4 的已废弃类型桩包，而实际安装的是 `ioredis@5.x`（自带类型）。实测 `tsc --noEmit` 通过，暂无实际影响，故按"配套依赖"一并保留；若你倾向清理，它可单独移除且不影响构建。

**另记二（登记不修改）**：`frontend/src/main.ts:31-47` 的 `import.meta.glob('@/assets/svg/**/*.svg')` 所匹配的 `src/assets/svg/` 下没有任何 `.svg` 文件（真实 SVG 在 `src/assets/images/svg/`），该回调恒为空转。因其涉及源码行为、且属"待补齐素材"而非冗余，登记在 `TODO.md` 而不在本轮修改。

---

## 6. 第三层：结构性修正

### 6.1 补 `template_items` 迁移并让迁移机制可用

| 项 | 内容 |
| --- | --- |
| 现状 | 全仓库仅 `V1__access_logs.sql` 一个迁移；`template-item.entity.ts:8` 声明的 `template_items` 表无任何建表脚本。`backend/README.md:375` 却指示"新建数据库直接执行 `V1__access_logs.sql`"，而 `.env.example:40` 的 `DB_SYNCHRONIZE=false`，照做后 `/backend/v1/template-api` 必然报表不存在 |
| 深层问题 | `app.module.ts:34-55` 的 DataSource 选项中没有 `migrations`/`migrationsRun`；仓库无 `data-source.ts`/`ormconfig`，TypeORM CLI 不可用；无 `db:migrate` 类脚本。`nest-cli.json` 也无 `compilerOptions.assets`，`.sql` 不会进入 `dist/`。**`AGENTS.md:25`「迁移文件是数据库变更的唯一事实来源」目前没有落地机制** |
| 纠正 | ① 新增 `src/database/migrations/V2__template_items.sql`，列定义与 `template-item.entity.ts` 对齐；② 新增 `src/database/data-source.ts` 供 TypeORM CLI 使用；③ `package.json` 增加 `migration:run` / `migration:revert` 脚本；④ `backend/README.md` 更新建库步骤 |
| **实现修正（实施时）** | 上条「纠正」的 ②③ **不可行，已废弃**：TypeORM 的 `migration:run` 只接受实现 `up`/`down` 的 TS/JS 迁移类，**无法执行原始 `.sql` 文件**，而 `AGENTS.md:25` 又规定迁移文件是 `V{序号}__{描述}.sql`。实际交付为：新增 `src/database/run-migrations.ts`（按文件名中版本号**数值**升序执行 `src/database/migrations/*.sql`，用 `schema_migrations` 表记录已应用文件，可重复执行），`package.json` 只提供 `migration:run`，**没有 `migration:revert`**；回滚方式见 `backend/document/deployment-change-record.md`。**照本设计文档的 ②③ 操作会失败——以本行为准** |
| 明确不做 | 不开启 `migrationsRun`（不在应用启动时自动跑迁移），不改 `DB_SYNCHRONIZE` 默认值 |

### 6.2 让 `template-api` 符合它自己引用的规则

| 项 | 内容 |
| --- | --- |
| 现状 | `template-api.controller.ts:43` 返回 `ApiResponseDto<{ list: TemplateItem[]; ... }>`、`:58` 返回 `ApiResponseDto<TemplateItem>`；`template-api.service.ts:63,77` 把 `TemplateItem` 实体实例原样放入 `data`，透出 `id`、`isEnabled`、`createdAt`、`updatedAt`。这与 `backend/AGENTS.md:18`「禁止直接序列化 Entity」冲突 |
| 影响面 | `backend/README.md:426` 明确引导"新增业务模块时参考 `template-api` 模块结构"，`template-api/README.md` 本身即以"复制该目录改名"为既定工作流——违规会被持续复制 |
| 纠正 | 新增 `TemplateItemResponseDto`，显式声明对外字段；Controller/Service 返回该 DTO 而非实体。**响应字段与现状基本一致**（把隐式序列化改为显式声明），同步修正 `README.md` 示例 |
| 取舍说明 | `AGENTS.md:19` 关于自增 `id` 的限制留有"后台内部接口确有必要时可用主键"的例外，而 `id` 是 get/update/delete 的路径参数，故保留 `id`，仅解决"直接序列化实体"这一问题 |

### 6.3 接通 `LoggerModule`

| 项 | 内容 |
| --- | --- |
| 现状 | `logger.module.ts:15` 的 `LoggerModule` 除自身定义外**零引用**，`app.module.ts:61-125` 的 `imports` 中未注册；`logger.config.ts`、`logger.service.ts` 仅被该模块引用。连带 `nest-winston`、`winston`、`winston-daily-rotate-file` 三个依赖完全不生效 |
| 判断依据 | 该能力属"待用能力"而非冗余（标准 1）：`logger.config.ts` 已完整设计控制台与按日滚动落盘的文件 transport，`.gitignore:5` 早已忽略 `logs/`，`AGENTS.md:15` 也以"集中异常过滤器的 Logger"为前提书写规则——意图明确为"忘了接上"。同时根 `README.md:58` 与 `backend/README.md:15,32,411` 共 4 处宣称该能力 |
| 纠正 | ① `app.module.ts` 注册 `LoggerModule`；② `main.ts` 使用 Winston logger 替代默认 Logger；③ 不改动 `logger.config.ts` 既有的落盘策略 |
| **实现修正（实施后）** | 原配置的第三路 `logs/access/` 已**移除**：它未设任何过滤（`level: 'info'`，而基础级别同为 `info`），与 `logs/combined/` 逐行重复；且 HTTP 访问记录实际由 `LoggingMiddleware` 经 `AccessLogService` 写入数据库 `access_logs` 表，**从不经过 Winston**，该文件名具有误导性。现落盘为控制台 + `logs/error` + `logs/combined`，并在 `logger.config.ts` 留有注释说明为何不应恢复该 transport |
| 影响 | 应用日志输出格式与落盘行为会变化，属预期的行为修正 |

### 6.4 对齐 `V1__access_logs.sql` 与实体

| 项 | 内容 |
| --- | --- |
| 现状 | `V1__access_logs.sql:26` 建有 `INDEX idx_ip_created_at (ip, created_at)`，`access-log.entity.ts:9-12` 只声明 4 个索引，缺该索引；表注释 `V1:27` 为 `'HTTP 请求访问日志表'`，实体 `:8` 为 `'访问日志表'`，字段注释文案亦不完全一致 |
| 影响 | `synchronize=true` 的开发库中 TypeORM 会视该索引为多余并删除；手工执行 SQL 的库中实体又不感知该索引，两边 schema 长期分叉 |
| 纠正 | 在 `access-log.entity.ts` 补 `@Index('idx_ip_created_at', ['ip', 'createdAt'])` 并对齐注释文案。**已执行的迁移文件不改**（`AGENTS.md:25`），仅改实体侧 |
| 备注 | 该迁移相对源模板仅有重命名、内容零改动，说明合并时满足命名规范但未核对内容一致性 |

---

## 7. 明确不做

1. **不删除任何"待用能力"源码**（第 5 节全表）。
2. **不改动 `frontend/src`、`backend/src` 中与上述无关的任何代码。**
3. **不改接口契约**：不统一 `msg`/`message`、不改分页结构、不改路径前缀——这些是 `TODO.md` 中待决策的契约议题，不在本轮。
4. **不动前端三个有意提交的 `.env*` 文件**（`VITE_API_PROXY_URL` 仍指向 Apifox Mock），联调事项见 `TODO.md`。
5. **不动根 `commitlint.config.cjs`、根 `.husky/`**——它们是唯一生效的提交规范入口。
6. **不重构**（无重命名、无目录重组）。

---

## 8. 验证

| 层 | 验证方式 |
| --- | --- |
| 第一层 | 删除的每一项先 `git grep` 复核零引用；`pnpm run lint:check`、`pnpm run format:check` 退出码须仍为 0；改依赖后重跑 `pnpm run install:all` 并确认两端 lock 已同步 |
| 第二层 | 无改动 |
| 第三层 | 前后端各跑一次 `build`；用真实 MySQL 跑一次「空库 → 依次执行 V1、V2 → 启动服务 → template-api CRUD 全通」闭环；确认 `logs/` 下按配置生成 error 与 combined 两路日志 |
| 全局 | 完成后 `git status` 干净；按层分批提交，便于回溯与回滚 |

`frontend` 的 `vue-tsc` 需在删除 `.auto-import.json` + `auto-imports.d.ts` 后单独跑一次，确认没有此前被掩盖的类型错误——若有，逐条修复后再继续。

---

## 9. 风险与回滚

| 风险 | 应对 |
| --- | --- |
| 删除 `auto-imports.d.ts` 后暴露隐藏的类型错误 | 已核实全部源码显式导入 Vue API，预期无影响；若出现则逐条修复（这正是删除该文件的目的） |
| 删除子项目 commitlint 配置后，在子目录手工执行 commitlint | cosmiconfig 会向上查找至根 `commitlint.config.cjs`，行为正确 |
| 接通 Winston 改变日志输出 | 属预期修正；如需回退，移除 `app.module.ts` 的注册与 `main.ts` 的 logger 替换即可 |
| 新增 `V2` 迁移在既有库上执行 | 迁移为纯 `CREATE TABLE`，对已存在的库用 `IF NOT EXISTS` 保护；不触碰既有 `access_logs` |
| 依赖移除后 lock 变更 | 分批提交，`frontend/pnpm-lock.yaml` 与 `backend/package-lock.json` 各自随对应 package.json 同提交 |

---

## 附：变更记录

| 日期 | 变更内容 |
| --- | --- |
| 2026-10-07 | 创建本设计。经三路审计 + 逐文件比对确立范围；确认「模板项目中未使用 ≠ 冗余」，第二层能力代码不清理 |
