# 开发流程与验证

[返回主索引](../../AGENTS.md)。本文中的源码路径均相对 `frontend/` 目录。

## 代码检索与复用

- 修改/新增代码前，先搜索项目已有相关方法或组件，优先复用；无则新增。

- 需要理解或定位业务代码时，先检查仓库根目录是否存在 `.codegraph/`。已索引仓库先用 `codegraph explore <query>`（或可用的 `codegraph_explore` MCP 工具），再按需使用 `query`、`node`、`callers`、`callees`、`impact`、`files`、`status` 聚焦查询。
- CodeGraph 输出只作为导航和上下文；下结论、修改或测试前，必须读取实际源码和对应行范围。
- 已安装 CLI 来自 `@colbymchenry/codegraph`，没有单独的 `codegrep` 可执行程序。`rg` 用于精确或局部匹配，或在 CodeGraph 不可用、仓库未索引时回退使用。
- 未索引时说明状态；仅在索引属于任务范围时运行 `codegraph init`，不得默认创建索引。

## 环境配置

- 后续凡是在 `.env` / `.env.development` / `.env.production` 中新增环境变量，必须以 `VITE_` 前缀开头，并同步更新到其余两个环境文件保持字段对齐；新增的环境变量在代码中使用前需在 `src/env.d.ts` 或 `src/types/` 中补充类型声明。

## 完成检查

- 涉及源码改动的任务完成后，都需要执行 `package.json` 中与改动范围对应的检查；默认至少执行 `pnpm run lint`（会自动修复）。涉及样式改动时一并执行 `pnpm run lint:stylelint`，存在格式化差异时执行 `pnpm run format`；涉及构建链路、路由装配、类型声明或样式变量调整时，应补充执行 `pnpm run build`。

- 样式整理完成后必须执行 `pnpm run lint`、`pnpm run lint:stylelint`、`pnpm run format` 和 `pnpm run build`；涉及选择器归并时还应执行 `git diff --check` 并检查最终 diff 只包含预期的样式结构、格式和 CSS 变量调整。

- `lint`、`lint:stylelint` 和 `format` 会自动写入文件，执行后复查 diff，避免混入无关修改。
- 仅修改文档时，检查内容完整性、相对链接、UTF-8 无 BOM 编码与 Markdown 格式，并执行 `git diff --check`；无需运行源码构建。现有 `format` 脚本不覆盖 Markdown，可用 `pnpm exec prettier --check <本次修改的文档路径>` 定向检查。
