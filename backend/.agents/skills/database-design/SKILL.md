---
name: database-design
description: 规范 NestJS + MySQL 项目的数据库设计、Entity、Migration、SQL 与 CRUD。当涉及建表、修改表结构、字段类型、索引、金额/时间字段、软删除、Repository/TypeORM 数据访问层等场景时触发。
---

# NestJS + MySQL 数据库设计规范

本 Skill 用于规范 NestJS + MySQL 项目中的数据库设计、Entity、Migration、Repository、DAO、SQL 与 CRUD 操作，结合工程安全与长期维护要求形成通用规范。数据库名称由项目环境配置提供，迁移目录、迁移历史和部署记录要求由项目 `AGENTS.md` 定义；执行前必须读取并遵守。

## 定位与触发

**触发条件**：任务涉及建表 / 修改表结构 / CRUD / 数据访问层（Repository、TypeORM、QueryBuilder、Entity）/ 金额·订单·支付·用户·权限等数据库相关业务时，自动触发。

**规范优先级**（高 → 低）：

```text
项目业务安全要求  >  本 Skill 规范  >  ORM 默认行为
```

禁止因 ORM 默认行为违反本 Skill。例如 TypeORM 默认自增 ID，但敏感业务禁止使用自增 ID。

---

## 命名规范

| 对象 | 规则 | 正例 | 反例 |
| --- | --- | --- | --- |
| 表名 | 小写 snake_case、单数名词、禁用保留字 | `user`、`order_item` | `User`、`users`、`order`（保留字） |
| 字段名 | 小写 snake_case | `user_id`、`create_time` | `userId`、`createTime` |
| 表名语义 | 推荐「业务 + 作用」 | `payment_record`、`device_usage` | `data`、`info`、`record` |

- 数据库层统一 snake_case；NestJS Entity 可通过 ORM 映射为 camelCase，但数据库字段必须保持 snake_case。
- 表名表达实体类型而非数量，故用单数。
- 业务名称易与关键字（`desc`、`range`、`order`、`select`、`group`…）冲突时重新命名，不依赖反引号强行使用。

---

## 主键规范

**所有表必须存在明确主键。**

主键类型按业务安全等级选择：

| 业务等级 | 适用场景 | 主键类型 |
| --- | --- | --- |
| 普通内部业务 | 不会对外暴露主键：内部配置、字典、任务、日志 | `BIGINT UNSIGNED AUTO_INCREMENT` |
| 敏感业务 | 对外可访问资源：用户、订单、支付、退款、充值、余额、资金、交易、权限、设备、SIM/eSIM、卡、API Key、Token、优惠券、兑换码等 | UUID / 雪花 ID / 随机 ID，禁止自增 |

**敏感业务禁自增的原因**：防止 ID 枚举（`/order/10001` 逐个探测）、防止业务量推测、降低 IDOR 风险。

主键示例：

```sql
id VARCHAR(36) NOT NULL COMMENT '订单ID'
-- 或
id BIGINT UNSIGNED NOT NULL COMMENT '订单ID，雪花算法生成'
```

使用雪花 ID 时须保证生成规则不暴露可预测业务信息。

---

## 索引规范

**命名**：

| 索引类型 | 前缀 | 示例 |
| --- | --- | --- |
| 主键索引 | `pk_` | `pk_id` |
| 唯一索引 | `uk_` | `uk_order_no` |
| 普通索引 | `idx_` | `idx_user_id` |
| 联合索引 | `idx_字段1_字段2` | `idx_user_id_status` |

**设计原则**：

- 索引必须服务于查询，禁止「以后可能用到」而无业务依据地建索引。
- 联合索引遵循最左匹配，字段顺序按 `等值查询 → 范围查询 → 排序字段` 排列。
- 避免重复索引：已有 `idx_user_id_status` 时，通常不再单独建 `idx_user_id`，除非有明确查询场景。
- 业务唯一性必须由数据库唯一约束保证，禁止仅靠「先查再插」防重（并发下会重复）。

```sql
PRIMARY KEY (id),
UNIQUE KEY uk_order_no (order_no),
KEY idx_user_id (user_id),
KEY idx_user_id_status (user_id, status)
```

---

## 字段类型规范

### 金额

统一 `INT` + **最小货币单位**（人民币：1 元 = 100 分）。

```sql
amount INT NOT NULL DEFAULT 0 COMMENT '订单金额，单位：分'
-- 1.00元 → 100，10.50元 → 1050，99.99元 → 9999
```

禁止 `FLOAT` / `DOUBLE` 存金额（精度损失）。金额统一用 INT 存储最小货币单位，而非 DECIMAL。

### 非金额小数

比例、重量、测量值、折扣率、坐标等**非金额小数**，按业务精度选 `DECIMAL`，不得套用金额规范误用 INT；同样禁 `FLOAT` / `DOUBLE`。

### 日期时间

统一 `INT` + **10 位 Unix 秒级时间戳**。

```sql
create_time INT NOT NULL COMMENT '创建时间，Unix时间戳，单位：秒'
```

- 禁止 10 位秒级与 13 位毫秒级混用，项目统一秒级。
- 业务时间禁止 `DATETIME` / `TIMESTAMP`，为跨服务 / 跨语言 / 跨时区统一改为 Unix 秒级时间戳。

### 字符串

| 场景 | 类型 | 说明 |
| --- | --- | --- |
| 普通字符串 | `VARCHAR` | 长度建议 ≤ 5000；超过应改用 TEXT 并独立表存储，避免影响其他字段索引效率 |
| 固定长度字符串 | `VARCHAR` | **禁止使用 `CHAR`**，统一 `VARCHAR`（如 UUID 用 `VARCHAR(36)`） |
| 大文本 / 快照 / JSON 序列化 / 富文本 / 第三方原始响应 | `LONGTEXT` | 见「快照数据规范」 |

### 布尔与状态

- 布尔类字段：`TINYINT UNSIGNED`，命名 `is_xxx`（`is_deleted`、`is_enabled`、`is_active`、`is_verified`），禁用 `BOOLEAN`。
- 状态字段：`TINYINT UNSIGNED`，必须在 COMMENT 中明确枚举值。

```sql
is_enabled TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '是否启用：0否，1是'
status TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '订单状态：1待支付，2已支付，3已取消'
```

---

## 表必备字段与软删除

### 必备字段

每张业务表必须包含：

| 字段 | 定义 |
| --- | --- |
| `id` | 主键，类型按业务安全等级决定 |
| `create_time` | `INT NOT NULL`，创建时间，Unix 秒 |
| `update_time` | `INT NOT NULL`，更新时间，Unix 秒 |
| `is_deleted` | `TINYINT UNSIGNED NOT NULL DEFAULT 0`，0 未删除 / 1 已删除 |

### 软删除

- 所有业务表默认软删除，禁止默认物理 `DELETE`。

```sql
UPDATE user SET is_deleted = 1, update_time = ? WHERE id = ? AND is_deleted = 0;
```

- 查询默认过滤 `is_deleted = 0`。
- 仅临时数据、缓存、中间数据、明确允许清理的日志 / 永久删除的数据允许物理删除；业务核心数据默认禁物理删除。

### NULL 规范

字段是否允许 NULL 须按业务含义明确设计；业务一定存在的字段用 `NOT NULL`，避免无业务意义的大量 NULL。

---

## COMMENT 规范

- 每张表必须有表 COMMENT：`COMMENT='用户表'`。
- 每个字段必须有字段 COMMENT，且说明业务含义与单位。

```sql
amount INT NOT NULL COMMENT '订单金额，单位：分'   -- 好
amount INT COMMENT '金额'                          -- 差：缺单位
status TINYINT NOT NULL COMMENT '状态'              -- 差：缺枚举值
```

---

## 快照数据规范

- 快照统一 `LONGTEXT` 存储 JSON 字符串，禁止用 `JSON` 类型。

```sql
snapshot LONGTEXT NULL COMMENT '业务快照数据，JSON字符串'
```

- 快照用于保存历史状态，**不作为业务查询字段**。
- NestJS 写入 `entity.productSnapshot = JSON.stringify(product)`，读取 `JSON.parse(entity.productSnapshot)`。

---

## SQL 与 CRUD 规范

### SQL 通用

- **禁止 `SELECT *`**，须明确字段。
- **禁止无条件 `UPDATE` / `DELETE`**，必须带 WHERE。
- 列表接口必须考虑分页、索引、查询条件、排序，避免一次性读取大量数据。
- 大数据量场景优先基于主键 / 唯一索引的游标分页（`WHERE id > ? ORDER BY id LIMIT 20`），避免长期 `LIMIT 100000, 20`。
- 时间范围查询用左闭右开 `[start, end)`（`create_time >= ? AND create_time < ?`），避免 `<= end` 边界重复统计。
- 默认不使用 MySQL 外键强约束，通过业务层维护关联、字段 + 索引表达关联（便于分库分表与迁移）；是否需要数据库级约束按实际一致性要求决定。

### CRUD 必备操作

| 操作 | 必备处理 |
| --- | --- |
| Create | 设置 `id`、`create_time`、`update_time`、`is_deleted = 0` |
| Read | 默认过滤 `is_deleted = 0` |
| Update | 必须更新 `update_time`，必须带 WHERE |
| Delete | 默认软删除：`is_deleted = 1` 且更新 `update_time` |

---

## NestJS Entity 与 Migration 规范

- Entity 必须与数据库设计保持一致；Migration 必须与 Entity 保持一致。
- 禁止只改 Entity 不改 Migration，也禁止只改数据库不同步 Entity。
- 新增 / 修改表时同步检查：主键、索引、字段类型、字段 COMMENT、表 COMMENT、`create_time` / `update_time` / `is_deleted`。

Entity 示例：

```ts
@Entity('order_item')
export class OrderEntity {
  @PrimaryColumn({ type: 'varchar', length: 36, comment: '订单ID' })
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36, comment: '用户ID' })
  userId: string;

  @Column({ name: 'amount', type: 'int', comment: '订单金额，单位：分' })
  amount: number;

  @Column({ name: 'status', type: 'tinyint', unsigned: true, comment: '订单状态：1待支付，2已支付，3已取消' })
  status: number;

  @Column({ name: 'create_time', type: 'int', comment: '创建时间，Unix时间戳，单位：秒' })
  createTime: number;

  @Column({ name: 'update_time', type: 'int', comment: '更新时间，Unix时间戳，单位：秒' })
  updateTime: number;

  @Column({ name: 'is_deleted', type: 'tinyint', unsigned: true, default: 0, comment: '是否删除：0否，1是' })
  isDeleted: number;
}
```

---

## 标准建表示例

```sql
CREATE TABLE `order_item` (
    id VARCHAR(36) NOT NULL COMMENT '订单ID',
    user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
    order_no VARCHAR(64) NOT NULL COMMENT '订单编号',
    amount INT NOT NULL DEFAULT 0 COMMENT '订单金额，单位：分',
    status TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '订单状态：1待支付，2已支付，3已取消',
    product_snapshot LONGTEXT NULL COMMENT '商品快照数据，JSON字符串',
    create_time INT NOT NULL COMMENT '创建时间，Unix时间戳，单位：秒',
    update_time INT NOT NULL COMMENT '更新时间，Unix时间戳，单位：秒',
    is_deleted TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '是否删除：0否，1是',
    PRIMARY KEY (id),
    UNIQUE KEY uk_order_no (order_no),
    KEY idx_user_id (user_id),
    KEY idx_user_id_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';
```

---

## 审查 Checklist

涉及建表、改表结构或 CRUD 时逐项检查。

**表结构与命名**
- [ ] 表名小写 snake_case、单数、非保留字
- [ ] 存在主键，且主键类型符合业务安全要求（敏感业务禁自增）
- [ ] 存在 `create_time` / `update_time` / `is_deleted`
- [ ] 表 COMMENT 完整

**字段**
- [ ] 字段名小写 snake_case
- [ ] 每个字段有 COMMENT；状态字段枚举值完整
- [ ] 金额用 INT 且为最小货币单位；非金额小数用 DECIMAL
- [ ] 时间用 INT 10 位 Unix 秒级
- [ ] 布尔 / 状态用 `TINYINT UNSIGNED` + `is_xxx`
- [ ] 字符串用 VARCHAR（禁 CHAR）；大文本 / 快照用 LONGTEXT（禁 JSON 存快照）
- [ ] 无 FLOAT / DOUBLE 存金额或精确小数

**索引**
- [ ] 主键 `pk_`、唯一 `uk_`、普通 `idx_` 命名规范
- [ ] 无重复索引、无无业务依据索引
- [ ] 联合索引顺序合理，覆盖查询与排序
- [ ] 业务唯一字段有唯一约束

**CRUD**
- [ ] Create 设置 `create_time` / `update_time` / `is_deleted = 0`
- [ ] Read 默认过滤 `is_deleted = 0`
- [ ] Update 更新 `update_time` 且带 WHERE
- [ ] Delete 默认软删除
- [ ] 无 `SELECT *`、无无条件 `UPDATE` / `DELETE`

---

## 执行原则

生成或修改数据库相关代码时，除「SQL 能否执行」外，必须同时检查：**业务安全 + 数据类型 + 数据一致性 + 索引设计 + 软删除 + 字段语义 + ORM 映射 + 长期维护性**。

最终目标：NestJS Entity / Repository / DAO → Migration → MySQL 统一遵循同一套规则。**不要为减少代码量、迎合 ORM 默认行为或临时开发方便而降低数据库设计标准。**

---

## 核心规范汇总

本 Skill 核心强制项：

1. 敏感业务禁止自增主键
2. 金额统一 INT + 最小货币单位
3. 时间统一 INT + 10 位 Unix 秒级时间戳
4. 所有业务表必须 `create_time` / `update_time` / `is_deleted`
5. 所有业务表及其字段必须 COMMENT
6. 字符串统一 VARCHAR，**禁止使用 CHAR**
7. 快照统一 LONGTEXT，禁 JSON 类型
8. 默认软删除，查询默认过滤 `is_deleted = 0`
