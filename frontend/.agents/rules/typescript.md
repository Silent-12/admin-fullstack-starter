# 类型定义

[返回主索引](../../AGENTS.md)。本文中的源码路径均相对仓库根目录。

- 所有的 TS 类型定义统一放在 `src/types/` 下，按域分目录。当前已存在目录包括：`api/`、`common/`、`component/`、`config/`、`directive/`、`generated/`、`router/`、`store/`。新增类型前先复用现有目录与文件命名方式；API 类型当前按业务模块拆分在 `src/types/api/*.d.ts`，通用响应类型定义在 `src/types/common/response.ts`。

- TypeScript 类型定义文件（`.ts` / `.d.ts`）的注释规则：`type`、`interface`、`class` 等类型声明前仅保留一段 JSDoc，第一行写简短说明，使用 `@description` 补充用途；字段注释统一使用字段上方的单行 `//` 注释，不在类型 JSDoc 中使用 `@param` 描述字段。类型声明前禁止额外添加与 JSDoc 重复的 `//` 标题注释。类方法和构造函数仍按函数注释规则使用 `@description`、`@param`、`@return`。

- `src/types/` 下新增的多单词类型文件优先使用小驼峰命名，例如 `systemManage.d.ts`、`versionControl.d.ts`；若历史文件仍使用中划线命名，应先尊重当前仓库现状，在重命名时同步调整全部引用后再统一收敛。

类型注释示例见 [typedoc-style](../skills/typedoc-style/SKILL.md)。
