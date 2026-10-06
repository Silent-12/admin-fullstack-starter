---
name: typedoc-style
description: TypeScript 类型定义的 JSDoc 与字段注释规范；在编写或修改 .d.ts 文件时使用。
---

# TypeScript 类型注释规范

每个 `type` 或 `interface` 前使用两行 JSDoc：第一行简短说明，第二行使用 `@description` 描述用途。

字段注释使用字段上方的 `//` 单行注释，不使用 `@param` 描述字段；字段之间不留空行。必填字段说明用途，可选字段明确其可选含义。

```typescript
/**
 * 用户信息接口
 * @description 描述用户基本信息的数据结构。
 */
export interface UserInfo {
  // 用户唯一标识符
  id: string
  // 可选的用户显示名称
  name?: string
}
```
