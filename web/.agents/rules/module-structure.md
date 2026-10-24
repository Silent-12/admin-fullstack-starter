# 目录、路由与组件

> 作用域：`web/`（源码路径相对 `web/`）。规则入口：[web/AGENTS.md](../../AGENTS.md)。

## 组件目录

- 布局与 Ao 表格/表单组件使用 `@ao/admin-layout` / `@ao/admin-components` 包；禁止在模板内重建同名组件。
- 通用基础组件放在 `src/components/` 下，按 `base/`、`banners/`、`layouts/`、`media/`、`text-effect/`、`theme/` 等类别分子目录。
- 无子组件与私有资源的通用组件使用大驼峰文件名（如 `src/components/base/AoBackToTop.vue`）；含子组件或私有资源的通用组件使用大驼峰目录 + `index.vue` 入口，私有样式同名 `style.scss`，主题样式同名 `theme.scss`。
- 仅服务单一业务的组件放在 `src/views/<业务模块>/components/`，由业务页面显式引入；禁止注册为通用组件。
- 业务页面放在 `src/views/` 下按业务模块分子目录；页面内弹窗、抽屉等子模块放在对应模块的 `components/` 子目录。

## 路由

- 公共路由定义在 `src/router/routes/public.ts`。
- 路由来源模式语义：见 [跨端接口约定](../../../AGENTS.md#跨端接口约定)。
- 路由核心能力放在 `src/router/services/`；扩展时优先复用既有 `RouteRegistry`、`MenuRouteService`、`RouteTransformer`、`RouteComponentLoader`、`RouteConfigValidator`。
- 路由守卫放在 `src/router/guards/`；禁止在业务页面内手写路由拦截。

## 指令与权限

- 自定义指令统一放在 `src/directives/` 根目录（`auth`、`highlight`），通过 `src/directives/index.ts` 统一注册。
- 页面按钮显隐统一使用 `v-auth="'模块.资源.动作'"`。
- 授权数据取自 `auth/authorization` 接口的 `auth`，与用户资料分开保存；权限变化后由用户刷新页面更新显示。
- 操作入口校验使用 `useAuth().hasAuth`，接口权限由后端拦截；页面按钮入口使用 `src/hooks/useAuth.ts`：`static` 模式放行，`dynamic` 模式委托公共包 `useAuth`，禁止复制包内权限逻辑。

## Composable 与 Hook

- 复用逻辑优先抽成 Composable。
- 公共 Composable（`useTable`、`useAuth`、`useTheme`）由 `@ao/admin-layout` / `@ao/admin-components` 提供；禁止在本目录重复实现。
- 本地 `src/hooks/` 只存放宿主专属骨架（`usePagedList` 分页列表、`useDialogForm` 弹窗表单）与宿主策略适配，命名以 `use` 开头；业务页面优先复用已有 Hook，禁止重复实现搜索、分页与弹窗加载逻辑。

## 表格与搜索

- 无间距且主体为表格的页面，在路由页面根容器添加 `page-flush-table`，并在直接子级 `AoTable` 添加 `page-main-table`；`AoTable` 须为根容器首个元素子级且页面内容头部为空。
- 全屏路由页不参与该边框衔接；页面不得自行覆盖布局包消除的边框。
- 有页面间距、独立卡片或弹窗内表格禁止添加 `page-flush-table` / `page-main-table`。
- 业务表格统一使用 `@ao/admin-components` 导出的 `AoTable`；禁止在业务页面直接使用 `el-table`。
- 页面容器使用 `ao-full-height`；表格卡片与表格头部由 `AoTable` 内部按需渲染；页面传入 `:search-items`、`:search-rules`、`v-model:search-form`、`v-model:column-checks` 并编写 `#header-left` / `#header-right` 插槽。
- 搜索栏默认启用：有搜索项时默认显示，头部搜索按钮切换显隐；需自定义初始显隐或接管状态时额外绑定 `v-model:show-search-bar`。
- 业务搜索区域统一使用 `AoSearchBar`，由 `AoTable` 通过 `search-items` 集成；禁止页面单独引入。
- 搜索项配置以 `searchItems` 内联在业务页面中；禁止为每个页面创建 `components/XxxSearch.vue` 包装组件。
- `#footer` 插槽承载表格底部左侧内容；分页器固定靠右；弹窗与抽屉放在表格同级。
- 表格列 `prop` 沿用 `ElTableColumn` 原生语义，支持直接字段名与 `meta.title` 等点路径；禁止增加自定义路径解析或纠错兼容层。
- 操作列由业务页面声明 `#operation` 插槽自动启用；禁止在 `columns` 中配置。
- 无对应数据字段的展示列使用原生 `columnKey` 标识；简单格式化沿用 `ElTableColumn` 的 `formatter`。
- 填写 `slotName` 即启用 `AoTable` 上的同名插槽，无需额外开关；插槽透传原生作用域，禁止额外计算 `value`。
- 分页状态使用 `currentPage`、`pageSize`、`total`，交互沿用原生 `size-change`、`current-change` 事件；分页重置与请求由页面处理。

## 表单

- 使用 `AoForm` 时，只要表单涉及接口请求（详情、选项加载或提交保存），必须显式绑定 `:loading`；复用 `useDialogForm` 的 `loading` 与 `busy`，同时存在加载和保存请求时绑定 `:loading="loading || busy"`，仅有保存请求时绑定提交状态，禁止重复维护加载状态。
- 加载效果必须跟随真实接口生命周期：请求开始前开启，成功后完成数据回填再关闭；多个初始化请求全部完成后才结束等待，禁止使用固定延时关闭。失败时也须在 `finally` 中结束等待并保留错误提示与未就绪时的保存限制；关闭、重新打开或切换记录时沿用请求代次校验，旧请求不得关闭当前请求的 loading 或覆盖表单。
- 表单必填字段必须在视图层 `rules` 校验之外，于提交前在业务层显式判空。
- 关键业务操作（删除、批量操作等）必须二次确认。
- 复杂、多字段表单统一采用简洁、疏朗、层次分明的分组式设计，适用于弹窗、抽屉及页面内表单，参考 [用户表单弹窗](../../src/views/system/user/components/UserDialog.vue)；字段少且语义单一的简单表单无需分组。
- 按业务语义与填写顺序组织字段，使用简短分组标题区分账号信息、基本资料、角色与状态等内容；组间留白清晰，禁止平铺堆叠全部字段。
- 标签统一放在控件上方；桌面端按可用内容宽度采用双列布局，长文本、复杂控件或需完整展示的字段独占一行；窄屏或窄容器降为单列；禁止标签换行、控件过窄或横向溢出。
- 按字段与控件需要设置容器宽度、内边距、列间距与字段间距，为辅助说明及校验错误预留空间；弹窗宽度须受视口约束；内容超出视口时允许滚动，禁止压缩控件与间距硬塞进一屏。
- 输入格式、长度限制等简短说明整合到字段标签，示例或补充引导写入 placeholder；仅在说明较长或需持续可见时使用控件下方独立提示；禁止与校验错误重复展示同一提示。
- 必填、选填与不可编辑状态必须清晰可辨；辅助说明与校验错误不得遮挡或重叠。
- 交互复用现有表单组件能力：选项较多时支持搜索，多选时折叠标签并支持查看完整内容，状态开关提供明确状态文案；提交按钮使用“创建用户”“保存修改”等业务动作文字，加载与提交期间保留禁用与防重复提交处理。
