# 项目定位

- 本目录是 `admin-fullstack-starter` 的前端子项目 `Ao Design Pro`，后端服务位于同仓库的 `../backend/`（NestJS + MySQL + Redis）；本目录内不含后端、数据库或 Redis/MQ 代码，数据通过 `src/api/` 对接后端。
- 技术栈：Vue 3、Vite、TypeScript、Pinia、Vue Router、Element Plus、Axios、SCSS、vue-i18n。
- 使用 `pnpm`，Node.js 要求 `>=20.19.0`；开发与调试命令必须兼容 Windows PowerShell。

# 规则加载与优先级

- **作用域**：本文件仅管辖 `frontend/` 目录，是本端规则的入口。仓库根 [AGENTS.md](../AGENTS.md) 只负责跨端与根级约定（包管理器分工、钩子入口、脚本委托方式、提交规范），处理跨端或根级改动时需一并读取；前端范围内的实现细节以本文件及其索引为准。
- 项目内规则优先级：本文件 > 专项 rules > skills 与参考资料；系统、开发者指令和用户明确要求按各自优先级执行。
- 开始任务先读 [开发流程与验证](.agents/rules/workflow.md)；分析、编写、修改或审查相关内容前，按下表显式读取**所有匹配项**。跨主题任务累加加载，影响范围扩大时补读；当前会话已读且未变更的文件可复用。
- 不依赖工具自动扫描 `.agents`，未命中的专项规则和技能无需全量加载。详细约束集中在 `rules/`，任务流程放在 `skills/`，速查资料放在 `references/`。跨端共用的技能位于仓库根 `.agents/skills/`，在本表中以 `../.agents/skills/` 相对路径引用。
- 若规则与实际目录或实现不符，以仓库现状为准，先同步更新对应规则及索引再继续；新增规则需补充触发条件与链接，避免多处维护同一详细规范。

# 核心约定

- 页面与路由文案默认直接使用中文文本，不做 i18n 适配、不新增语言包键值，除非用户明确提出需要适配 i18n。
- 先检索、再复用，遵循现有架构，按软件工程最佳实践新增、修改或重构功能；无用字段、变量、引入和组件及时清理，无需保留无用兼容代码。
- 请求统一通过默认 `request` 实例，响应使用 `BaseResponse<T>`；类型集中在 `src/types/`，业务持久化通过 Pinia `persist`。
- 布局与公共组件已抽离为独立包：`@ao/admin-layout`（布局骨架、setting/app/worktab store、主题底座）与 `@ao/admin-components`（AoTable、AoForm 等表格表单组件），经 git tag 依赖安装，只允许从包入口导入、禁止深引内部路径；业务数据由本项目持有，经 `main.ts` 的 install 注入。公共逻辑优先复用组件、Composable 和路由服务。
- 样式使用 SCSS 与 CSS 变量，兼容深色模式；源码使用 UTF-8 无 BOM，业务函数同步维护 JSDoc。
- 完成后执行与改动范围对应的检查，并说明实际验证结果与未验证项；具体命令见必读流程。

# 按需加载索引

| 级别 / 任务触发条件 | 必须读取 |
| --- | --- |
| 通用：所有任务 | [开发流程与验证](.agents/rules/workflow.md) |
| 专项：编写、修改、重构或审查代码 | [编码与注释](.agents/rules/coding.md)、[Ponytail](.agents/rules/ponytail.md)、[Karpathy Guidelines](../.agents/skills/karpathy-guidelines/SKILL.md) |
| 专项：新增或修改类型声明、类型注释 | [类型定义](.agents/rules/typescript.md)、[TypeDoc 技能](../.agents/skills/typedoc-style/SKILL.md) |
| 专项：HTTP 请求、API 或响应结构 | [接口请求与响应](.agents/rules/api.md) |
| 专项：目录、组件、页面、表单、表格、搜索、路由、指令或 Hook | [目录、路由与组件](.agents/rules/module-structure.md) |
| 专项：Store、持久化或本地存储 | [状态管理与持久化](.agents/rules/state-storage.md) |
| 专项：新增或修改任何 Vue / SCSS 文件，或整理样式 | [SCSS 与深色模式](.agents/rules/styles.md) |
| 技能：移除功能及关联资源 | [Feature Removal](.agents/skills/feature-removal/SKILL.md) |
| 技能：审查当前未提交改动 | [Code Review](../.agents/skills/code-review/SKILL.md)，并加载改动涉及的专项规则 |
| 技能：提交或生成提交信息 | [Git 提交规范](.agents/rules/git-commit-message.md)、[Commit Msg](../.agents/skills/commit-msg/SKILL.md) |
| 技能：根据指定提交生成改动或测试说明 | [Git Commit Changelog](../.agents/skills/git-commit-changelog/SKILL.md) |
| 参考：查询颜色、阴影、暗色变量及工具类 | [CSS 变量速查](.agents/references/css-variables.md) |
