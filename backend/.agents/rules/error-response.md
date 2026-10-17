# 错误响应与诊断

[返回规则入口](../../AGENTS.md)。本文中的源码路径均相对 `backend/` 目录。

适用于 `src/**` 中面向客户端的 HTTP 错误响应、异常抛出、Swagger 错误声明与异常日志；健康探针、文件下载、流式响应等按各自协议处理的端点除外。可参考实现：`src/common/filters/all-exceptions.filter.ts`、`src/common/utils/dependency-unavailable.util.ts`、`src/common/utils/error-message.util.ts`。

## 客户端提示与诊断分离

- 客户端只收到可操作的通用提示；原始异常、堆栈、SQL、依赖名称、连接地址、第三方响应细节与配置值只写入服务端 `Logger`。
- 详细异常记录在产生异常的类或集中异常过滤器的 `Logger`，业务代码不得使用 `console`。
- 客户端提示不因环境变化而返回不同详细程度；不得在非生产环境向业务接口响应附加诊断字段。

## 基础设施不可用统一 503

- 数据库、缓存、队列等硬依赖不可用时统一返回 503，提示固定取 `getDefaultErrorMessage(HttpStatus.SERVICE_UNAVAILABLE)`，不得使用异常 message 作为响应。
- 不得用 500 掩盖依赖不可用，也不得为不同依赖返回不同状态码或不同提示。
- 业务层抛出的 `ServiceUnavailableException` 同样使用该通用文案，故障细节只写服务端日志。

## 统一判定与文案复用

- 依赖不可用判定统一复用 `isDependencyUnavailable`；新增依赖类型、错误码或提示特征时只扩展该工具，不在业务代码或过滤器中重复判断。
- 5xx 与基础设施不可用的对外文案统一从 `getDefaultErrorMessage` 取得，禁止散落同义字符串或自建 5xx 文案映射；4xx 业务提示可按场景具体化，但同一场景不得出现多个同义文案，且不得在 Controller 中硬编码本应复用的业务提示。
- 全局异常过滤器是错误响应的唯一出口：4xx `HttpException` 业务消息可透传；5xx 与未识别异常一律返回状态码对应的通用提示，并保持 `ApiResponseDto` 结构。
- 新增业务异常必须经全局过滤器输出；不得在 Controller、守卫或中间件中直接写错误响应（限流中间件等明确绕过管道的场景除外，其对外提示同样不得暴露内部信息）。

## 禁止暴露的内部信息

- 响应与接口文档不得出现依赖名称（如 MySQL、Redis、TypeORM、连接池）、连接地址与端口、库名与账号、驱动名称与版本、SQL 语句、堆栈、第三方原始错误、环境变量或内部配置项。
- Swagger `@ApiResponse` 的 4xx 描述可说明业务失败原因；5xx 描述统一为通用提示（如“服务暂时不可用，请稍后再试”），不得写“认证数据库暂不可用”等依赖信息。
- 错误响应中的 `data` 不得携带实体、内部状态或诊断数据；4xx 业务附加数据仅限调用方需要的字段。

## 健康探针例外

- 健康检查等探针端点按协议返回，不套用业务响应包裹；生产环境只暴露存活状态，不得返回依赖名称、连接状态或版本。
- 非生产环境可返回依赖连通性供本地诊断，但不得返回连接串、账号、原始错误或堆栈。

## 验证要求

- 新增或修改异常分支时，需有单元测试覆盖：依赖不可用与 `ServiceUnavailableException` 脱敏为 503 通用提示、可识别连接错误收敛为 503、普通异常返回 500 默认提示、4xx 业务消息透传。
- 完成 TypeScript 修改后按 [backend/AGENTS.md](../../AGENTS.md) 执行 `pnpm run lint` 与 `pnpm run build`。
