# 部署变更记录

本文件登记涉及数据库、Redis Key、环境变量、部署脚本等需要人工操作的部署变更，要求见 [../AGENTS.md](../AGENTS.md) 的「通用规则」。迁移 SQL 仍是数据库变更的唯一执行来源，本记录只作说明与追溯，不替代迁移文件。

## 2026-10-07 新增 SQL 迁移执行器与 template_items 建表迁移

**目的**：为 `template-api` 参考模块提供建表脚本，并让 `AGENTS.md` 中「迁移文件是数据库变更的唯一事实来源」具备可执行机制——本项目没有独立的初始化脚本，新库的表结构由迁移文件建起。

**影响范围**：

- 新增 `template_items` 表，建表脚本为 `src/database/migrations/V2__template_items.sql`。
- 新增 `schema_migrations` 表，由执行器在首次运行时自动创建（`CREATE TABLE IF NOT EXISTS`），记录已应用的迁移文件名与应用时间。
- 新增 `npm run migration:run` 脚本，实现位于 `src/database/run-migrations.ts`：先 `nest build`，再运行 `dist/database/run-migrations.js`。
- 新库首次执行时会一并应用此前已有的 `V1__access_logs.sql`。

**执行顺序**：

1. 在 `backend/` 目录下执行 `npm run migration:run`（依赖 `.env` 中的 `DB_*` 连接配置）。
2. 执行器按文件名中的版本号数值升序执行尚未应用的 `.sql` 文件，已应用的输出「跳过（已应用）」。
3. 新增迁移一律追加到 `src/database/migrations/`，按 `V{序号}__{描述}.sql` 命名；单个迁移文件只能包含一条语句。

**回滚方式**：

- 删除本次变更新建的表：`DROP TABLE template_items;`
- 删除迁移记录：`DELETE FROM schema_migrations WHERE filename = 'V2__template_items.sql';`
- `schema_migrations` 表由执行器按需创建，如确认不再使用迁移机制可一并删除。

**验证结果**：

- 在 MySQL 5.7.44 空库上首次执行，建出 8 列表结构，逐列与 `TemplateItem` 实体一致。
- 第二、三次执行全部输出「跳过（已应用）」，未重复应用。
- `/backend/v1/template-api` 的 CRUD 闭环（创建 / 列表 / 详情 / 更新 / 删除）均返回 200。
