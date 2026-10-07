# 🧩 Ao Design Pro

本目录是 `admin-fullstack-starter` 的前端子项目，基于 Vue 3、TypeScript 和 Element Plus，`package.json` 中的项目名为 `ao-design-pro`。后端服务位于同仓库的 `../backend/`；仓库级安装、启动与构建命令见根 [README](../README.md)。

项目提供登录、工作台、用户/角色/菜单管理示例、表格表单示例，以及菜单、标签页和主题等后台基础能力。接口统一通过 `src/api/` 调用后端 `/backend` 服务，默认使用静态路由；本目录不包含后端服务、数据库或消息队列。

## 🚀 快速开始

### 环境准备

| 工具    | 要求                                                       |
| ------- | ---------------------------------------------------------- |
| Node.js | `>=20.19.0`，建议使用满足要求的 LTS 版本                   |
| pnpm    | 建议使用 `packageManager` 指定的 `11.21.0`，与项目保持一致 |
| Git     | 用于克隆项目和安装 GitHub 上的公共包依赖                   |
| 网络    | 能访问 npm registry 和 GitHub                              |

如果尚未安装 pnpm：

```powershell
npm install -g pnpm@11.21.0
```

### 安装与启动

以下命令可在 Windows PowerShell 中逐行执行：

```powershell
# 在仓库根目录执行
pnpm run install:frontend   # 等价于在 frontend/ 执行 pnpm install
pnpm run dev:frontend       # 或 pnpm dev 同时启动前后端
```

默认访问 http://localhost:3006，实际地址以终端输出为准。本目录已提供环境配置文件，首次运行无需另外复制 `.env`。单独在本目录内执行 `pnpm dev` 亦可。

### 演示登录

登录页默认填入 `Super / 123456`，也可以在页面中选择其他演示账号。

登录与用户信息通过 [src/api/auth.ts](src/api/auth.ts) 调用后端 `POST /backend/v1/auth/login` 与 `GET /backend/v1/user/info`。本地 Mock 已移除，后端认证模块尚未提供，接口就绪前登录与用户信息获取不可用。

## 🛠️ 技术栈

| 分类       | 技术                                  |
| ---------- | ------------------------------------- |
| 应用与构建 | Vue 3、TypeScript、Vite               |
| UI 与样式  | Element Plus、SCSS、CSS 变量、Iconify |
| 状态管理   | Pinia、pinia-plugin-persistedstate    |
| 路由与请求 | Vue Router、Axios                     |
| 通用能力   | VueUse、vue-i18n                      |
| 代码检查   | ESLint、Prettier、Stylelint、vue-tsc  |

## 📦 项目与公共包

本子项目持有页面、路由注册、API、用户与菜单数据、业务状态；公共能力通过两个外部 Git 依赖包引入：

| 包 | 职责 |
| --- | --- |
| [@ao/admin-components](https://github.com/Silent-12/admin-components) | 公共组件：`AoTable`、`AoForm`、`AoSearchBar`、`AoButtonTable` 等 |
| [@ao/admin-layout](https://github.com/Silent-12/admin-layout) | 布局骨架、侧栏、头部、标签页、设置面板、主题底座，以及 `setting` / `app` / `worktab` 状态 |

业务数据由本项目持有，通过 [src/main.ts](src/main.ts) 的插件安装配置注入公共包，包括菜单、用户信息、路由、语言、登出回调、权限和本地资源解析能力。

### 安装版本

[package.json](package.json) 当前配置为：

```json
{
  "@ao/admin-components": "git+https://github.com/Silent-12/admin-components.git#v4",
  "@ao/admin-layout": "git+https://github.com/Silent-12/admin-layout.git#v5"
}
```

`git+https` 表示从 GitHub 仓库安装，`#v4` / `#v5` 指定 Git 标签；[pnpm-lock.yaml](pnpm-lock.yaml) 进一步锁定对应提交和依赖版本。两个依赖仓库目前公开，读取它们无需配置 GitHub 登录凭据。

公共包仓库保存完整的 `src/`、`playground/`、构建配置、发布脚本和 `dist/`。安装到 `node_modules` 后主要看到 `dist/`，是因为包的 `files` 配置控制了安装包内容，不代表 Git 仓库只保存构建产物。开发模板时无需同时克隆两个包；修改公共能力时，再克隆相应仓库开发。

### 使用方式

组件与类型从包入口导入，样式使用公开的样式入口：

```ts
import { AoTable, AoButtonTable } from '@ao/admin-components'
import { AppLayout } from '@ao/admin-layout'

import '@ao/admin-components/styles.css'
import '@ao/admin-layout/styles.css'
```

本项目已在 `src/main.ts` 全局引入两份包样式，业务页面无需重复引入。不要深引包内的 `src/` 或 `dist/` 文件。

### 升级公共包

1. 在对应包仓库修改源码、完成验证，并通过该仓库的 `pnpm run release` 发布新整数标签。
2. 在本项目的 `package.json` 中，将对应依赖改为已发布的新标签。
3. 执行 `pnpm install` 更新依赖和锁文件，再执行 `pnpm run lint`、`pnpm run build`，回归受影响的页面。
4. 将 `package.json` 与 `pnpm-lock.yaml` 一起提交。

公共包 `main` 分支新增提交不会让本项目自动升级。布局包还依赖组件包，升级时需核对两者的兼容关系。

## 📁 目录结构

```text
frontend/
├── .agents/                 # 前端专项规则、技能与参考资料（跨端共用技能见仓库根 .agents/）
├── public/                  # 无需构建处理的静态资源
├── src/
│   ├── api/                 # 真实业务接口方法
│   ├── assets/              # 图片、图标、SVG 与全局样式
│   ├── components/          # 宿主侧通用组件
│   ├── config/              # 系统名称、主题、头部栏等配置
│   ├── directives/          # 权限、高亮等指令
│   ├── enums/               # 枚举定义
│   ├── locales/             # 宿主语言包与 i18n 初始化
│   ├── router/
│   │   ├── guards/          # 路由守卫
│   │   ├── routes/          # 公共路由与业务系统路由
│   │   └── services/        # 路由加载、转换、校验与注册
│   ├── store/               # Pinia 初始化、用户和菜单状态
│   ├── types/               # API、路由及业务类型
│   ├── utils/               # HTTP、导航、存储等基础工具
│   ├── views/               # 登录、系统管理与示例页面
│   ├── App.vue              # 根组件
│   └── main.ts              # 应用初始化与公共包注入
├── .env                     # 通用环境配置
├── .env.development         # 开发环境配置
├── .env.production          # 生产环境配置
├── AGENTS.md                # 开发规则入口
├── package.json             # 依赖与脚本
├── pnpm-lock.yaml           # 依赖版本锁定
├── pnpm-workspace.yaml      # 依赖构建脚本许可配置
└── vite.config.ts           # 开发代理、别名与构建配置
```

## ⚙️ 环境配置

Vite 先加载 [`.env`](.env)，再按运行模式加载 [`.env.development`](.env.development) 或 [`.env.production`](.env.production)；同名变量由模式配置覆盖。修改环境变量后需要重启开发服务，生产环境需重新构建。

| 变量                    | 作用                    | 当前配置                            |
| ----------------------- | ----------------------- | ----------------------------------- |
| `VITE_APP_NAME`         | 应用名称                | `Ao Design Pro`                     |
| `VITE_APP_VERSION`      | 应用展示版本            | `1.0.0`                             |
| `VITE_PORT`             | 开发服务端口            | `3006`                              |
| `VITE_BASE_URL`         | 部署基础路径            | `/`                                 |
| `VITE_ROUTE_SOURCE`     | 菜单路由来源            | `static`；可改为 `dynamic`          |
| `VITE_API_URL`          | HTTP 请求基础地址       | `/backend`，与后端 `API_PREFIX` 一致 |
| `VITE_API_PROXY_URL`    | 开发代理目标            | `http://localhost:3000`             |
| `VITE_WITH_CREDENTIALS` | 跨域请求是否携带 Cookie | `false`                             |

开发代理在 [vite.config.ts](vite.config.ts) 中配置：`/backend` 请求转发到 `VITE_API_PROXY_URL`，保留 `/backend` 路径前缀。接入本地后端时，修改代理目标即可。

新增环境变量的命名、文件同步和类型声明要求见 [开发流程与验证](.agents/rules/workflow.md)。

## 🔌 接口对接

本地 Mock 已移除，登录页、路由守卫的用户信息获取，以及用户、角色、菜单管理示例页面均直接调用后端接口。请求路径由 `VITE_API_URL`（`/backend`）与 [src/api](src/api) 中的 `/v1/...` 拼接而成：

| 调用方   | 请求路径                              |
| -------- | ------------------------------------- |
| 登录页   | `POST /backend/v1/auth/login`         |
| 路由守卫 | `GET /backend/v1/user/info`           |
| 用户管理 | `GET /backend/v1/user/list`           |
| 角色管理 | `GET /backend/v1/role/list`           |
| 菜单管理 | `GET /backend/v1/system/menus/simple` |

上述接口的后端实现尚未提供，后端补齐前这些页面无法正常加载数据；新增、修改、删除等写操作也需按业务接入 [src/api](src/api)。

`VITE_ROUTE_SOURCE` 只控制菜单路由来源。动态菜单由 [MenuRouteService](src/router/services/MenuRouteService.ts) 调用 `/backend/v1/system/menus/simple`。

所有 HTTP 请求统一通过 [src/utils/http/index.ts](src/utils/http/index.ts) 的默认 `request` 实例发起。后端响应遵循 [BaseResponse](src/types/common/response.ts)：

```json
{
  "code": 200,
  "message": "成功",
  "data": {},
  "timestamp": "2026-10-07T07:00:00.000Z"
}
```

后端以 HTTP 状态码表达成败，非 2xx 响应由封装统一转为错误对象并展示后端返回的 `message`；成功响应将 `data` 解包后返回给调用方，同时处理登录令牌、错误提示及未授权退出。接口约定见 [接口请求与响应](.agents/rules/api.md)。

## 🗺️ 页面与路由开发

- 公共路由定义在 [src/router/routes/public.ts](src/router/routes/public.ts)，包括登录、异常页和 iframe 容器。
- 本地业务路由定义在 [src/router/routes/applications/](src/router/routes/applications/)，新增系统后需加入该目录下的 `index.ts`。现有结构可参考 [example.ts](src/router/routes/applications/example.ts)。
- 页面放在 `src/views/`；路由 `component: '/system/user'` 对应 `src/views/system/user/index.vue`，也支持对应路径下的单文件 `.vue` 页面。
- 业务表格使用 `AoTable`，搜索栏通过其 `search-items` 集成；页面示例见 [用户管理](src/views/system/user/index.vue) 和 [组件示例](src/views/example/data-showcase/index.vue)。
- 页面私有组件放在页面的 `components/` 下；不要在宿主内重建已抽离到公共包的同名组件。

当前使用 Hash 路由，页面地址形如 `/#/auth/login`。新增页面、路由和组件的详细约定见 [目录、路由与组件](.agents/rules/module-structure.md)。

## ✅ 常用命令

| 命令                                   | 用途                                      |
| -------------------------------------- | ----------------------------------------- |
| `pnpm install --frozen-lockfile`       | 按已有锁文件安装，适用于首次克隆和 CI     |
| `pnpm dev`                             | 启动开发服务                              |
| `pnpm run build`                       | 先执行 TypeScript 检查，再构建到 `dist/`  |
| `pnpm run serve`                       | 本地预览已生成的构建产物                  |
| `pnpm run lint`                        | 执行 ESLint 检查并自动修复                |
| `pnpm run lint:check`                  | 执行 ESLint 检查，不修改文件（适用于 CI） |
| `pnpm run format`                      | 用 Prettier 格式化脚本、JSON、Vue 与样式  |
| `pnpm run format:check`                | 校验格式是否符合 Prettier，不修改文件     |
| `pnpm run lint:stylelint`              | 检查并自动修复样式                        |
| `pnpm exec prettier --check README.md` | 单独检查 README 格式                      |

带自动修复或格式化的命令会修改文件，运行后应检查 Git diff。项目目前没有独立的 `test` 脚本；按改动范围执行检查，并回归相关页面。完整要求见 [开发流程与验证](.agents/rules/workflow.md)。

## 🚢 构建与部署

```powershell
pnpm install --frozen-lockfile
pnpm run build
pnpm run serve
```

构建产物位于 `dist/`，可部署到静态站点服务或 Nginx。`pnpm run serve` 用于本地检查构建结果，正式部署使用实际的静态资源服务。

- 根路径部署时保留 `VITE_BASE_URL=/`；部署到 `/admin/` 等子目录时，构建前设置相应基础路径。
- 生产环境需配置可访问的后端 API 地址；当前 `VITE_API_URL` 为同源相对路径 `/backend`，由部署环境配置反向代理转发到后端服务。开发服务器的代理配置不会打包进 `dist/`。

## 📚 开发约定

从 [AGENTS.md](AGENTS.md) 查看项目规则入口，按任务加载对应专项规范：

- [编码与注释](.agents/rules/coding.md)：UTF-8 无 BOM、JSDoc 与代码维护要求。
- [类型定义](.agents/rules/typescript.md)：类型组织与声明规范。
- [状态管理与持久化](.agents/rules/state-storage.md)：业务状态使用 Pinia，持久化通过 `persist` 配置。
- [SCSS 与深色模式](.agents/rules/styles.md)：样式使用 SCSS 和 CSS 变量，兼容深色模式。
- [Git 提交规范](.agents/rules/git-commit-message.md)：提交信息约定。

新增业务页面和路由文案默认直接使用中文；需要多语言适配时再明确扩展。公共能力优先复用现有组件、Composable 和路由服务。
