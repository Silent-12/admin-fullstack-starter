# 类型定义

> 作用域：`web/`（源码路径相对 `web/`）。规则入口：[web/AGENTS.md](../../AGENTS.md)。

- 所有 TS 类型定义必须放在 `src/types/` 下按域分目录；现有目录：`api/`、`common/`、`config/`、`directive/`、`generated/`、`router/`、`store/`。
- 新增类型前必须复用现有目录与文件命名方式；API 类型按业务模块拆分在 `src/types/api/*.d.ts`；通用响应类型定义在 `src/types/common/response.ts`。
- 类型声明 JSDoc 与字段注释格式（两行 JSDoc、字段用上方 `//`、不加句号、字段间不留空行、匿名内联对象仅在父字段说明）：见 [TypeDoc 风格](../../../.agents/skills/typedoc-style/SKILL.md)。
- 类型声明前禁止叠加与 JSDoc 重复的 `//` 标题注释。
- 类方法与构造函数的注释按函数规则处理：见 [编码与注释](coding.md)。
- `src/types/` 下新增多单词类型文件使用小驼峰命名（如 `systemManage.d.ts`）；历史中划线命名文件先保留现状，重命名时同步调整全部引用后再收敛。
