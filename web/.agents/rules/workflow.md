# 开发流程与验证

> 作用域：`web/`（源码路径相对 `web/`）。规则入口：[web/AGENTS.md](../../AGENTS.md)。

## 代码检索与复用

- 修改或新增代码前必须检索已有实现；复用判断与实现阶梯：见 [最小实现原则](../../.agents/rules/ponytail.md)。
- 仓库根存在 `.codegraph/` 时，理解或定位业务代码必须先执行 `codegraph explore <query>`（或 `codegraph_explore` MCP 工具），再按需使用 `query`、`node`、`callers`、`callees`、`impact`、`files`、`status` 聚焦查询。
- CodeGraph 输出只作为导航与上下文；下结论、修改或测试前必须读取实际源码与对应行范围。
- 已安装 CLI 来自 `@colbymchenry/codegraph`，没有单独的 `codegrep` 可执行程序；精确或局部匹配使用 `rg`，CodeGraph 不可用或仓库未索引时回退 `rg`。
- 仓库未索引时必须说明状态；仅在索引属于任务范围时执行 `codegraph init`，禁止默认创建索引。

## 环境配置

- 在 `.env` / `.env.development` / `.env.production` 新增环境变量必须以 `VITE_` 前缀开头，并同步到其余两个文件保持字段对齐。
- 新增环境变量在代码中使用前必须在 `src/env.d.ts` 或 `src/types/` 补充类型声明。

## 完成检查

- 涉及源码改动必须执行 `package.json` 中与改动范围对应的检查；默认至少执行 `pnpm run lint`（会自动修复）。
- 涉及样式改动时一并执行 `pnpm run lint:stylelint`；存在格式化差异时执行 `pnpm run format`。
- 涉及构建链路、路由装配、类型声明或样式变量调整时必须补充执行 `pnpm run build`。
- `lint`、`lint:stylelint` 与 `format` 会自动写入文件；执行后必须复查 diff，禁止混入无关修改。
- 样式整理完成后必须执行 `pnpm run lint`、`pnpm run lint:stylelint`、`pnpm run format` 与 `pnpm run build`；涉及选择器归并时还必须执行 `git diff --check`，并检查最终 diff 只包含预期的样式结构、格式与 CSS 变量调整。
- 仅修改文档时必须检查内容完整性、相对链接、编码（按 [根级工程约定](../../../AGENTS.md#根级工程约定)）与 Markdown 排版（标题层级、列表缩进、表格对齐、代码块语言标注），并执行 `git diff --check`；禁止运行源码构建。
- `*.md` 不纳入 Prettier（两端 `.prettierignore` 已排除）；禁止用 Prettier 格式化或校验文档。
