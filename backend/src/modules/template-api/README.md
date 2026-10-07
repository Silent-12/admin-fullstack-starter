# Template API 模块模板

> 本文档用于指导如何复制本目录并改造为新的业务模块。复制后只需修改标记为「**必改**」的内容，无需逐文件阅读。

---

## 目录结构

```
template-api/
├── README.md                          # 本文档（复制后可保留或删除）
├── dto/
│   ├── pagination-meta.dto.ts         # 分页元信息 DTO（通用，无需修改）
│   ├── template-item-response.dto.ts # 列表与详情的响应体（显式字段映射）
│   ├── create-template-item.dto.ts    # 创建请求体 DTO
│   ├── update-template-item.dto.ts    # 更新请求体 DTO
│   └── query-template-item.dto.ts     # 查询参数 DTO
├── entities/
│   └── template-item.entity.ts        # 数据库实体
├── template-api.controller.ts         # 控制器（路由定义）
├── template-api.service.ts            # 业务逻辑层
└── template-api.module.ts             # NestJS 模块
```

---

## 文件说明与改造清单

### 通用文件（无需修改）

| 文件 | 作用 |
|------|------|
| `src/common/dto/api-response.dto.ts` | 统一响应包装类，所有接口返回 `{ code, message, data, timestamp }` 结构 |
| `dto/pagination-meta.dto.ts` | 分页元信息类，包含 `page`、`pageSize`、`total`、`totalPages` |

---

### 需要改造的文件

#### 1. `entities/template-item.entity.ts`

| 项目 | 说明 |
|------|------|
| **作用** | 定义数据库表结构，TypeORM 实体类 |
| **必改** | 类名 `TemplateItem` → 新实体名（如 `User`） |
| **必改** | `@Entity('template_items')` → 新表名（如 `users`） |
| **必改** | 字段定义（`@Column`）根据业务需求增删 |
| **必改** | 实体当前未声明 `@Index`；如新模块的查询需要索引，请在实体上显式添加并通过新的迁移文件建索引。 |

#### 2. `dto/create-*.dto.ts`

| 项目 | 说明 |
|------|------|
| **作用** | 创建接口的请求体 DTO，包含 `class-validator` 校验规则 |
| **必改** | 文件名 `create-template-item.dto.ts` → `create-xxx.dto.ts` |
| **必改** | 类名 `CreateTemplateItemDto` → `CreateXxxDto` |
| **必改** | 字段定义和校验装饰器（`@IsString`、`@MaxLength` 等）根据业务调整 |

#### 3. `dto/update-*.dto.ts`

| 项目 | 说明 |
|------|------|
| **作用** | 更新接口的请求体 DTO，所有字段为可选（部分更新） |
| **必改** | 文件名 `update-template-item.dto.ts` → `update-xxx.dto.ts` |
| **必改** | 类名 `UpdateTemplateItemDto` → `UpdateXxxDto` |
| **必改** | 字段定义和校验装饰器根据业务调整 |

#### 4. `dto/query-*.dto.ts`

| 项目 | 说明 |
|------|------|
| **作用** | 列表查询接口的 Query 参数 DTO，包含分页和筛选字段 |
| **必改** | 文件名 `query-template-item.dto.ts` → `query-xxx.dto.ts` |
| **必改** | 类名 `QueryTemplateItemDto` → `QueryXxxDto` |
| **可选** | 增加/删除筛选字段（如按状态、分类等） |

#### 5. `dto/*-response.dto.ts`

| 项目 | 说明 |
|------|------|
| **作用** | 列表与详情的响应体 DTO，逐个字段声明对外暴露的内容，由 `fromEntity` 从实体显式映射 |
| **必改** | 文件名 `template-item-response.dto.ts` → `xxx-response.dto.ts` |
| **必改** | 类名 `TemplateItemResponseDto` → `XxxResponseDto` |
| **必改** | 字段及其 `@ApiProperty` 的 `description`、`example` 随新业务调整 |
| **必改** | `fromEntity` 中的逐字段赋值：实体新增字段必须显式补入，未补入的字段不会出现在响应里 |

#### 6. `template-api.controller.ts`

| 项目 | 说明 |
|------|------|
| **作用** | 定义路由和 HTTP 方法（POST/GET/PUT/DELETE），配置 Swagger 文档 |
| **必改** | 文件名 `template-api.controller.ts` → `xxx-api.controller.ts` |
| **必改** | 类名 `TemplateApiController` → `XxxApiController` |
| **必改** | `@Controller('v1/template-api')` → 新路由前缀（如 `v1/users`） |
| **必改** | `@ApiTags('模板 API')` → 新标签名（如 `用户管理`） |
| **必改** | 所有 DTO import 路径和类型引用 |
| **必改** | 所有 `@ApiResponse` 的 `type` 泛型参数 |

#### 7. `template-api.service.ts`

| 项目 | 说明 |
|------|------|
| **作用** | 业务逻辑层，处理数据库操作和响应包装 |
| **必改** | 文件名 `template-api.service.ts` → `xxx-api.service.ts` |
| **必改** | 类名 `TemplateApiService` → `XxxApiService` |
| **必改** | `@InjectRepository(TemplateItem)` → 新实体 |
| **必改** | 所有 Repository 类型和泛型参数 |
| **必改** | `ApiResponseDto` 的 `message` 文案（如「创建成功」→「用户创建成功」） |
| **必改** | 新模块必须同步新增自己的 `{ModuleName}ResponseDto`（放在 `dto/` 下，逐个字段实现 `fromEntity`），列表与详情经它显式映射后返回，不得把实体实例直接塞进 `data`（禁止直接序列化 Entity） |
| **可选** | 增加/修改查询条件（`where` 对象） |

#### 8. `template-api.module.ts`

| 项目 | 说明 |
|------|------|
| **作用** | NestJS 模块定义，注册 Controller、Provider 和 Entity |
| **必改** | 文件名 `template-api.module.ts` → `xxx-api.module.ts` |
| **必改** | 类名 `TemplateApiModule` → `XxxApiModule` |
| **必改** | `TypeOrmModule.forFeature([TemplateItem])` → 新实体 |
| **必改** | Controller 和 Service 的 import 路径 |

---

## 改造步骤（复制后）

1. **复制目录**：`cp -r src/modules/template-api src/modules/xxx-api`
2. **全局替换**：在 `xxx-api/` 目录下执行全局替换
   - `template-api` → `xxx-api`
   - `TemplateApi` → `XxxApi`
   - `template-item` → `xxx`
   - `TemplateItem` → `Xxx`
3. **修改实体**：编辑 `entities/xxx.entity.ts`，定义表名和字段
4. **修改 DTO**：编辑 `dto/` 下四个业务 DTO，调整字段和校验规则
5. **修改路由**：编辑 `xxx-api.controller.ts` 的 `@Controller('v1/xxx')` 和 `@ApiTags`
6. **修改消息**：编辑 `xxx-api.service.ts` 的成功/错误消息文案
7. **注册模块**：在 `app.module.ts` 中 import 并添加到 `imports` 数组
8. **验证编译**：运行 `npm run build` 确认无错误

---

## 统一响应格式

所有接口均返回以下结构：

```json
{
  "code": 200,
  "message": "操作成功",
  "data": { ... },
  "timestamp": "2026-05-22T09:00:00.000Z"
}
```

| 场景 | `data` 内容 |
|------|-------------|
| 创建/更新/删除 | `null` |
| 查询单条 | 响应 DTO（显式字段映射，见 `dto/template-item-response.dto.ts`） |
| 列表查询 | `{ list: [...], pagination: { page, pageSize, total, totalPages } }` |
