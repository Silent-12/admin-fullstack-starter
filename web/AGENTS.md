# 前端规则入口

> 作用域：`web/`（源码路径相对 `web/`）。跨端契约与根级约定：[仓库规则入口](../AGENTS.md)；后端规则：[backend/AGENTS.md](../backend/AGENTS.md)。

## 职责边界

- 本目录只承载前端代码；通过 `src/api/` 对接 `../backend/`。
- 后端、数据库与消息队列代码禁止放入本目录。

## 规则加载与优先级

- 规则加载顺序、共用技能归属、同名技能限制与冲突处理：见 [规则加载与优先级](../AGENTS.md#规则加载与优先级)。
- 多实现先确认、一次一问与冲突先说明：见 [确认门槛](../AGENTS.md#确认门槛)。
- 未上线阶段的直接改写、清理旧实现与禁止过度设计：见 [项目阶段与实现原则](../AGENTS.md#项目阶段与实现原则)。
- 文件编码、命令兼容 Windows 与提交信息：见 [根级工程约定](../AGENTS.md#根级工程约定)。
- 响应包裹、分页口径、权限失败与 `VITE_ROUTE_SOURCE` 模式语义：见 [跨端接口约定](../AGENTS.md#跨端接口约定)。
- 项目内优先级：本文件 > 专项 rules > skills 与参考资料。
- 开始任务必须按「按任务加载」读取全部匹配项；跨主题任务累加加载，影响范围扩大时补读；当前会话已读且未变更的文件可复用。
- 不依赖工具自动扫描 `.agents`；未命中的专项规则与技能不加载。
- 新增内容按职责归置：`rules/`（约束）、`skills/`（流程）、`references/`（速查资料）；跨端共用技能遵循根规则，禁止重复实现同名技能。
- 规则与实际目录或实现不符时，以仓库现状为准：先同步更新对应规则及索引再继续。
- 新增规则必须补充触发条件与链接；同一详细规范只在多处写指针，禁止重复维护。

## 核心约定

- 页面与路由文案默认直接使用中文文本；禁止 i18n 适配与新增语言包键值，除非用户明确要求。
- 实现阶梯、复用判断与最小验证：见 [最小实现原则](../.agents/rules/ponytail.md)。
- 请求实例、响应类型与 API 方法：见 [接口请求与响应](.agents/rules/api.md)。
- 类型组织与声明注释：见 [类型定义](.agents/rules/typescript.md)。
- 状态与持久化：见 [状态管理与持久化](.agents/rules/state-storage.md)。
- 样式、尺寸单位与深色模式：见 [SCSS 与深色模式](.agents/rules/styles.md)。
- 函数与组件注释：见 [编码与注释](.agents/rules/coding.md)。
- 目录、路由、组件、表格与表单：见 [目录、路由与组件](.agents/rules/module-structure.md)。
- 布局与公共组件必须优先复用 `@ao/admin-layout`、`@ao/admin-components`；只允许从包入口导入，禁止深引内部路径；业务数据由本项目持有，通过插件安装配置注入。
- 公共逻辑必须优先复用组件、Composable 与路由服务，禁止重复实现。

## 按任务加载

| 任务 | 必须读取 |
| --- | --- |
| 所有任务 | [开发流程与验证](.agents/rules/workflow.md) |
| 编写、修改、重构或审查代码 | [编码与注释](.agents/rules/coding.md)、[Ponytail](.agents/rules/ponytail.md)、[Karpathy Guidelines](../.agents/skills/karpathy-guidelines/SKILL.md) |
| 新增或修改类型声明、类型注释 | [类型定义](.agents/rules/typescript.md)、[TypeDoc 技能](../.agents/skills/typedoc-style/SKILL.md) |
| HTTP 请求、API 或响应结构 | [接口请求与响应](.agents/rules/api.md) |
| 目录、组件、页面、表单、表格、搜索、状态展示、路由、指令或 Hook | [目录、路由与组件](.agents/rules/module-structure.md) |
| 状态文字颜色 | [SCSS 与深色模式](.agents/rules/styles.md#状态文字颜色) |
| Store、持久化或本地存储 | [状态管理与持久化](.agents/rules/state-storage.md) |
| 新增或修改任何 Vue / SCSS 文件，或整理样式 | [SCSS 与深色模式](.agents/rules/styles.md) |
| 移除功能及关联资源 | [Feature Removal](.agents/skills/feature-removal/SKILL.md) |
| 审查当前未提交改动 | [Code Review](../.agents/skills/code-review/SKILL.md)，并加载改动涉及的专项规则 |
| 提交或生成提交信息 | [Git 提交规范](.agents/rules/git-commit-message.md)、[Commit Msg](../.agents/skills/commit-msg/SKILL.md) |
| 根据指定提交生成改动或测试说明 | [Git Commit Changelog](../.agents/skills/git-commit-changelog/SKILL.md) |
| 查询颜色、阴影、暗色变量及工具类 | [CSS 变量速查](.agents/references/css-variables.md) |

## 验证

- 完成源码改动后必须执行与改动范围对应的检查，并说明实际验证结果与未验证项；命令、减配条件与文档检查项见 [完成检查](.agents/rules/workflow.md#完成检查)。
