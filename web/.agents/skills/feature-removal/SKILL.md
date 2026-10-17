---
name: Feature Removal
description: 你的任务不是简单删除代码，而是完整、安全地移除一个功能，确保不会留下任何失效代码、样式、资源、组件或配置。
---

# 功能移除（Feature Removal）Skill

## 角色

你是一名资深全栈工程师。

你的任务不是**简单删除代码**，而是**完整、安全地移除一个功能**，确保不会留下任何失效代码、样式、资源、组件或配置。

删除过程中始终遵循以下原则：

- **完整性优先**
- **引用分析优先**
- **安全删除优先**
- **未经确认，不进行全局删除共享资源**

---

# 工作流程

当收到"移除 XXX 功能"、"删除 XXX 页面"、"移除 XXX 模块"等请求时，必须严格按照以下流程执行。

---

## 第一步：分析影响范围（禁止直接删除）

首先分析整个项目，识别待删除功能涉及的所有内容，不允许立即修改代码。

需要检查的范围包括但不限于：

### 页面

- 页面入口
- 子页面
- Tab
- Dialog
- Drawer
- Modal
- Popover

### 路由

检查：

- vue-router
- react-router
- pages.json（UniApp）
- 动态路由
- 权限路由

### 组件

检查所有相关组件，包括：

- 页面组件
- 公共组件
- Layout
- Slot
- Render Component
- Dynamic Component

同时检查：

- import
- components 注册
- defineAsyncComponent
- resolveComponent
- `<component :is="">`

### JS / TS

检查：

- composables
- hooks
- utils
- services
- api
- constants
- enums
- types

### Store

检查：

- Pinia
- Vuex
- Redux
- Zustand

确认是否仍存在依赖。

### API

检查：

- request
- service
- DTO
- interface
- type
- mock
- swagger 类型

### 权限

检查：

- 菜单
- Role
- Permission
- 按钮权限
- 指令权限

### 国际化

检查：

- i18n
- locales
- zh-CN
- en-US
- 其它语言包

### 样式

检查：

- css
- scss
- less
- sass
- module
- scoped
- 全局样式
- mixins
- variables
- theme

### 静态资源

检查：

- svg
- png
- jpg
- iconfont
- 字体
- Lottie
- 视频资源

### 配置

检查：

- env
- config
- feature flag
- constants

### 测试

检查：

- unit test
- e2e
- snapshot
- mock

---

# 第二步：引用分析（必须执行）

对于准备删除的所有资源：

- 页面
- 组件
- Hook
- API
- Store
- Type
- 样式
- 工具函数
- 常量
- 图片

必须分析所有引用。

分析内容包括：

- import
- export
- re-export
- 自动注册
- 插件注册
- 动态引用
- 路由引用
- 配置引用

不得仅说明"存在引用"。

必须列出完整引用信息。

示例：

```text
组件：UserSelect.vue

共发现 5 处引用：

1.
src/pages/order/create.vue

2.
src/pages/order/edit.vue

3.
src/pages/user/detail.vue

4.
src/components/SearchPanel.vue

5.
src/layout/AppHeader.vue
```

---

# 第三步：判断是否允许删除

## 情况一：仅当前功能使用

如果资源仅被当前功能引用，则可以继续删除，包括：

- 页面
- API
- Store
- Hook
- 样式
- 类型
- 图片
- 常量

一起清理。

---

## 情况二：共享资源（禁止直接删除）

如果发现资源被多个页面或模块共同使用，例如：

```text
UploadDialog.vue

共发现 6 处引用。
```

必须暂停删除。

输出类似信息：

```text
检测到共享资源：

UploadDialog.vue

共发现 6 处引用：

1.
...

2.
...

......

请确认：

A.
仅移除当前页面中的使用

B.
彻底删除该组件（影响全部引用页面）
```

**未经用户确认，不允许删除共享组件、共享 Hook、共享 API、共享 Store 或其它公共资源。**

---

# 第四步：执行删除

获得确认后，进行完整删除。

需要同步删除以下内容。

## 页面

删除：

- 页面文件
- 路由
- 菜单
- 权限配置
- 导航入口

---

## 组件

删除：

- import
- 注册
- template
- JSX
- Slot
- 样式

---

## Hook

删除：

- import
- 调用
- 文件（若无其它引用）

---

## API

删除：

- request
- service
- DTO
- interface
- type

若仍存在其它引用，不允许删除。

---

## Store

删除：

- state
- getter
- action
- mutation

若整个 Store 已无任何引用，可建议删除整个 Store 文件。

---

## 样式

删除：

- css class
- scss
- less
- mixins
- variables

不得保留死样式。

---

## 图片资源

删除：

- 未使用图片
- icon
- svg
- 字体
- Lottie
- 视频资源

---

## 国际化

删除：

- zh
- en
- 其它语言包

对应文案。

---

## 类型

删除：

- interface
- type
- enum

所有无引用类型。

---

## 常量

删除：

- constants
- enums
- config

所有无引用内容。

---

## Mock / 测试

删除：

- mock 数据
- unit test
- e2e
- snapshot

与功能对应的测试代码。

---

# 第五步：死代码清理

删除完成后再次扫描项目。

重点检查：

- 未使用 import
- 未使用变量
- 未使用函数
- 未使用组件
- 未使用 Hook
- 未使用 API
- 未使用 Store
- 未使用 Type
- 未使用样式
- 未使用图片
- 未使用常量
- 未使用国际化文案

目标：

> **Zero Dead Code（零死代码残留）**

---

# 第六步：最终检查

确认以下内容：

- 项目能够正常编译
- TypeScript 无新增错误
- ESLint 无新增错误
- 未产生新的循环依赖
- 未产生新的空引用
- 未产生新的运行时异常
- 未保留孤立文件

---

# 第七步：输出删除报告

完成后输出删除报告。

格式如下：

```text
✅ 功能移除完成

本次删除内容：

页面：
- 2 个

路由：
- 2 条

组件：
- 3 个

Hook：
- 2 个

API：
- 4 个

Store：
- 1 个

Type：
- 5 个

常量：
- 4 个

国际化：
- 12 条

样式：
- 8 处

图片：
- 3 个

Mock：
- 2 个

测试：
- 3 个
```

最后补充：

```text
检查结果：

✔ 未发现遗留引用
✔ 未发现死代码
✔ 项目可正常编译
✔ 未发现新增 TypeScript 错误
✔ 未发现新增 ESLint 错误
```

如果存在无法自动确认的共享资源，则输出：

```text
发现以下共享资源仍被多个页面引用：

1.
xxx.vue
共 5 处引用

2.
useXXX.ts
共 3 处引用

3.
userService.ts
共 8 处引用

请确认：

A.
仅移除当前页面使用

B.
彻底删除共享资源

确认后再继续执行删除。
```

---

# 执行要求（必须遵守）

1. 禁止仅删除页面代码而遗留无用组件、API、样式或资源。
2. 禁止删除仍被其它页面使用的共享资源，必须先分析引用并征求用户确认。
3. 每删除一个文件前，必须先确认其引用情况。
4. 优先进行引用分析，再执行删除操作。
5. 删除完成后必须进行死代码扫描和最终检查。
6. 输出完整删除报告，确保用户了解影响范围及删除结果。
