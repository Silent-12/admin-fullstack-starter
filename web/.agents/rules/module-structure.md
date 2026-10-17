# 目录、路由与组件

[返回主索引](../../AGENTS.md)。本文中的源码路径均相对 `frontend/` 目录。

- 组件目录分层规则（布局与 Ao 表格/表单组件已抽离至 `@ao/admin-layout` / `@ao/admin-components` 包，模板内不得重建同名组件）：
  - 通用基础组件放在 `src/components/` 下，按类别（`base/`、`banners/`、`layouts/`、`media/`、`text-effect/`、`theme/` 等）分子目录；
  - 无子组件或私有资源的通用组件直接使用大驼峰文件名（如 `src/components/base/AoBackToTop.vue`）；包含子组件或私有资源的组件保留大驼峰目录和 `index.vue` 入口，组件私有样式同名 `style.scss`，主题样式同名 `theme.scss`。
  - 仅服务单一业务的组件放在对应页面的 `src/views/<业务模块>/components/` 下，并由业务页面显式引入，不作为通用组件注册。
  - 业务页面放在 `src/views/` 下，按业务模块分子目录（如 `system/user/`、`system/role/`、`system/menu/`）；页面内的弹窗、抽屉等子模块放在对应模块的 `components/` 子目录中。

- 路由相关：
  - 公共路由定义在 `src/router/routes/public.ts`；本地业务系统路由定义在 `src/router/routes/applications/` 下。
  - 路由核心能力放在 `src/router/services/` 下，扩展时优先复用既有 `RouteRegistry`、`MenuRouteService`、`RouteTransformer`、`RouteComponentLoader`、`RouteConfigValidator` 等能力。
  - 路由守卫在 `src/router/guards/`，禁止在业务页面内手写路由拦截。

- 自定义指令统一放在 `src/directives/` 根目录（`auth`、`highlight`），通过 `src/directives/index.ts` 统一注册。

- 复用逻辑优先抽成 Composable。公共 Composable（如 `useTable`、`useAuth`、`useTheme`）由 `@ao/admin-layout` 与 `@ao/admin-components` 提供，禁止在本目录重复实现；本地 `src/hooks/` 目录当前为空，仅在确有宿主专属逻辑时新增，命名以 `use` 开头。

## 业务表格与搜索

- 无间距且主体为表格的页面，在路由页面根容器添加 `page-flush-table`，并在直接子级 `AoTable` 添加 `page-main-table`（`AoTable` 须为根容器首个元素子级且页面内容头部为空，否则上边框不消除；全屏路由页不参与衔接）。布局包统一消除与顶栏、桌面侧栏相接的重复外框；页面不得自行覆盖这些边框。有页面间距、独立卡片或弹窗内表格不添加此标记。

- 所有业务表格统一使用 `@ao/admin-components` 导出的 `AoTable`，页面布局参考 `src/views/system/user/index.vue`：页面容器使用 `ao-full-height`，`ao-table-card` 表格卡片与表格头部由 `AoTable` 内部按需渲染，业务页面只需传入 `:search-items` / `:search-rules` / `v-model:search-form` / `v-model:column-checks` 并编写 `#header-left` / `#header-right` 插槽；搜索栏显隐开关默认启用（有搜索项时默认显示搜索栏，头部搜索按钮可切换显隐）；页面需自定义初始显隐或接管状态时额外绑定 `v-model:show-search-bar`；禁止在业务页面直接使用 `el-table`。

- 所有业务搜索区域统一使用项目封装的 `AoSearchBar`，它已由 `AoTable` 通过 `search-items` 集成，业务页面无需再单独引入；搜索项配置以 `searchItems` 内联在对应业务页面中，不再为每个页面创建 `components/XxxSearch.vue` 包装组件；`AoTable` 的 `#footer` 插槽用于表格底部左侧内容，分页器固定靠右，弹窗和抽屉放在表格同级。
- 表格列的 `prop` 沿用 `ElTableColumn` 原生语义，支持直接字段名和 `meta.title` 等点路径，由 Element Plus 负责取值，不增加自定义路径解析或纠错兼容层；操作列由业务页面声明 `#operation` 插槽自动启用，不在 `columns` 中配置；其他无对应数据字段的展示列使用原生 `columnKey` 标识。简单格式化沿用 `ElTableColumn` 的 `formatter`；填写 `slotName` 即启用定义在 `AoTable` 上的同名插槽，无需额外开关，插槽透传原生作用域，不额外计算 `value`。分页状态使用 `currentPage`、`pageSize`、`total`，交互沿用原生 `size-change`、`current-change` 事件，分页重置与请求由页面处理。

## 表单与关键操作

- 表单必填字段除了在视图层做必填校验（`rules`），还应在提交前于业务层显式判空；对关键业务操作（删除、批量操作等）必须二次确认。
