# 🧩 Ao Design Pro

本目录是 `admin-fullstack-starter` 的前端子项目，基于 Vue 3、TypeScript 和 Element Plus，`package.json` 中的项目名为 `ao-design-pro`。后端服务位于同仓库的 `../backend/`；仓库级安装、启动与构建命令见根 [README](../README.md)。

项目提供登录、工作台、用户、角色、菜单与接口权限管理、表格表单示例，以及菜单、标签页和主题等后台基础能力。接口统一通过 `src/api/` 调用后端，业务路由默认来自后端授权菜单，也支持本地路由调试；本目录不包含后端服务、数据库或消息队列。

## 🚀 快速开始

环境要求与仓库级命令见根 [README](../README.md)；本目录的依赖与脚本以 [package.json](package.json) 为准。

```powershell
# 在仓库根目录执行
pnpm run install:web   # 等价于在 web/ 执行 pnpm install
pnpm run dev:web       # 或 pnpm dev 同时启动前后端
```

默认访问 http://localhost:3006，实际地址以终端输出为准。本目录已提供环境配置文件，首次运行无需另外复制 `.env`；单独在本目录内执行 `pnpm dev` 亦可。

### 用户登录

使用后端 `pnpm run admin:init` 初始化的 `admin` 账号及 `ADMIN_INIT_PASSWORD` 配置的密码登录，不提供默认演示密码；初始化步骤与认证接口见后端 [后台认证](../backend/README.md#后台认证)。

登录、用户信息与退出通过 [src/api/auth.ts](src/api/auth.ts) 对接后端，会话状态由 [src/store/modules/user.ts](src/store/modules/user.ts) 管理。认证回归测试：`pnpm run test:auth`；令牌、持久化与工作区约束见 [状态管理与持久化](.agents/rules/state-storage.md)。

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

| 包                                                                    | 职责                                                                                      |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [@ao/admin-components](https://github.com/Silent-12/admin-components) | 公共组件：`AoTable`、`AoForm`、`AoSearchBar`、`AoButtonTable` 等                          |
| [@ao/admin-layout](https://github.com/Silent-12/admin-layout)         | 布局骨架、侧栏、头部、标签页、设置面板、主题底座，以及 `setting` / `app` / `worktab` 状态 |

业务数据由本项目持有，通过 [src/main.ts](src/main.ts) 的插件安装配置注入公共包，包括菜单、用户信息、路由、语言、登出回调、权限和本地资源解析能力。

组件与类型只从包入口导入，包样式在 [src/main.ts](src/main.ts) 全局引入，业务页面无需重复引入，也不要深引包内的 `src/` 或 `dist/` 文件。依赖以 [package.json](package.json) 中的 Git 标签为准，具体提交由 [pnpm-lock.yaml](pnpm-lock.yaml) 锁定；升级时修改标签、执行 `pnpm install`，再运行 `pnpm run lint` 与 `pnpm run build` 并回归受影响页面。

## 📁 目录结构

```text
web/
├── .agents/          # 前端专项规则、技能与参考资料（跨端共用技能在仓库根 .agents/）
├── public/           # 无需构建处理的静态资源
├── src/
│   ├── api/          # 后端接口方法
│   ├── components/   # 宿主侧通用组件
│   ├── router/       # 公共路由、路由守卫与菜单路由服务
│   ├── store/        # Pinia 用户与菜单状态
│   ├── types/        # API 与业务类型
│   ├── utils/        # HTTP、导航与存储工具
│   └── views/        # 登录、系统管理与示例页面
├── .env*             # 环境配置（通用 / 开发 / 生产）
├── AGENTS.md         # 开发规则入口
├── package.json      # 依赖与脚本
└── vite.config.ts    # 开发代理、别名与构建配置
```

## ⚙️ 环境配置

Vite 先加载 [`.env`](.env)，再按运行模式加载 [`.env.development`](.env.development) 或 [`.env.production`](.env.production)，同名变量由模式配置覆盖；修改环境变量后需重启开发服务，生产环境需重新构建。配置项以这三个文件为准，新增变量的命名、文件同步与类型声明要求见 [开发流程与验证](.agents/rules/workflow.md)，开发代理配置见 [vite.config.ts](vite.config.ts)。

## 🔌 接口对接

本地 Mock 已移除，页面统一通过 [src/api](src/api) 与默认 `request` 实例（[src/utils/http/index.ts](src/utils/http/index.ts)）调用后端。跨端契约（响应包裹、分页、路径前缀与认证头）以根 [AGENTS.md](../AGENTS.md#跨端接口约定) 为准，分页类型定义在 [src/types/api/common.d.ts](src/types/api/common.d.ts)；功能缺口与待实现接口见根 [TODO.md](../TODO.md)。

获取当前用户可访问菜单由 [MenuRouteService](src/router/services/MenuRouteService.ts) 负责，与菜单管理页的完整菜单树语义不同，不得混用。

## 🗺️ 页面与路由开发

- 公共路由定义在 [src/router/routes/public.ts](src/router/routes/public.ts)，业务路由通过 [MenuRouteService](src/router/services/MenuRouteService.ts) 装配。可通过 [`.env`](.env) 的路由来源开关切换后端授权菜单与 [本地调试菜单](src/router/routes/applications/index.ts)，修改后需重启开发服务；本地模式不请求后端授权、不执行按钮权限展示过滤，仍需登录且后端继续校验接口权限。
- 页面放在 `src/views/`；路由 `component: '/system/user'` 对应 `src/views/system/user/index.vue`，也支持对应路径下的单文件 `.vue` 页面。
- 业务表格使用 `AoTable`，搜索栏通过其 `search-items` 集成；页面示例见 [用户管理](src/views/system/user/index.vue) 与 [组件示例](src/views/example/data-showcase/index.vue)。
- 页面私有组件放在页面的 `components/` 下；不要在宿主内重建已抽离到公共包的同名组件。

当前使用 Hash 路由，页面地址形如 `/#/auth/login`。新增页面、路由和组件的详细约定见 [目录、路由与组件](.agents/rules/module-structure.md)。

## 🚢 构建与部署

```powershell
pnpm install --frozen-lockfile
pnpm run build
pnpm run serve   # 本地预览构建产物
```

构建产物位于 `dist/`，可部署到静态站点服务或 Nginx。根路径部署时保留 `VITE_BASE_URL=/`，部署到 `/admin/` 等子目录时在构建前设置相应基础路径；生产环境需配置可访问的后端 API 地址，当前 `VITE_API_URL` 为同源相对路径 `/backend`，由部署环境反向代理到后端服务。

## 📚 开发约定

从 [AGENTS.md](AGENTS.md) 查看项目规则入口，按任务加载对应专项规范：

- [编码与注释](.agents/rules/coding.md)：UTF-8 无 BOM、JSDoc 与代码维护要求。
- [类型定义](.agents/rules/typescript.md)：类型组织与声明规范。
- [状态管理与持久化](.agents/rules/state-storage.md)：业务状态使用 Pinia，持久化通过 `persist` 配置。
- [SCSS 与深色模式](.agents/rules/styles.md)：样式使用 SCSS 和 CSS 变量，兼容深色模式。
- [Git 提交规范](.agents/rules/git-commit-message.md)：提交信息约定。

新增业务页面和路由文案默认直接使用中文；需要多语言适配时再明确扩展。公共能力优先复用现有组件、Composable 和路由服务。
