---
name: 'typedoc-style'
description: 'TypeScript 类型定义的 JSDoc + // 双层注释规范。Invoke when writing or modifying TypeScript type definition files (.d.ts or type annotations).'
---

# TypeScript TypeDoc 注释规范

本 skill 定义了 TypeScript 类型定义文件的注释规范，采用 **JSDoc + // 双层注释** 格式。

## 核心规则

### 1. 类型/接口声明注释格式

每个 `type` 或 `interface` 声明前使用 **双行 JSDoc 注释块**：

- **第一行**：简短描述，说明类型/接口的名称或作用
- **第二行**：`@description` 标签，详细描述类型/接口的用途

```typescript
/**
 * 类型的简短描述
 * @description 详细说明这个类型的作用和使用场景。
 */
export type TypeName = ...;

/**
 * 接口的简短描述
 * @description 详细说明这个接口的用途和包含的内容。
 */
export interface InterfaceName {
  // 字段注释
  field1: string;
}
```

### 2. 字段注释格式

**禁止**在 JSDoc 的 @param 中描述字段，所有字段注释必须使用 `//` 单行注释，放在字段**上方**。

**字段之间不需要空行**，保持紧凑排列。

```typescript
/**
 * 用户信息接口
 * @description 描述用户基本信息的数据结构
 */
export interface UserInfo {
  // 用户唯一标识符
  id: string
  // 用户显示名称
  name: string
  // 用户邮箱地址
  email?: string
}
```

### 3. 必填 vs 可选字段注释规范

- **必填字段**：注释应说明字段的用途
- **可选字段**：注释应说明"可选的"以及字段的用途

```typescript
/**
 * 初始化配置选项
 * @description 描述系统初始化时所需的配置参数
 */
export interface InitOptions {
  // 必填的主上报地址
  endpoint: string
  // 可选的 gif 兜底上报地址
  gifEndpoint?: string
}
```

### 4. 模块/类方法注释格式

对于类方法、构造函数等，保留 `@param` 和 `@returns` 标签：

```typescript
/**
 * 构造函数
 * @param config 配置对象，包含初始化参数
 */
constructor(config: Config)

/**
 * 发送短信
 * @description 调用短信服务发送验证码
 * @param request 发送请求参数
 * @returns 发送响应对象
 */
sendSms(request: SendSmsRequest): Promise<SendSmsResponse>
```

## 错误示例 ❌

```typescript
/**
 * @description 定义初始化配置
 * @param endpoint - 必填的主上报地址
 * @param gifEndpoint - 可选的 gif 兜底地址
 * @return 返回初始化配置类型
 */
export interface InitOptions {
  endpoint: string
  gifEndpoint?: string
}
```

## 正确示例 ✅

```typescript
/**
 * 初始化配置接口
 * @description 定义系统初始化时所需的配置参数
 */
export interface InitOptions {
  // 必填的主上报地址
  endpoint: string
  // 可选的 gif 兜底上报地址
  gifEndpoint?: string
}
```

## 应用场景

- 编写 `.d.ts` 类型定义文件
- 定义 SDK 的公开 API 类型
- 编写库的类型声明
- 为 TypeScript 项目创建类型文档

## 优点

1. **清晰性**：类型级别描述和字段级别描述分离，各司其职
2. **可读性**：字段上方的 `//` 注释在代码阅读时一目了然
3. **工具兼容**：保持 JSDoc 格式，IDE 和文档工具仍可识别
4. **简洁性**：避免冗长的 @param 注释块
