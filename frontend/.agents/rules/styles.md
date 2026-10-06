# SCSS 与深色模式

[返回主索引](../../AGENTS.md)。本文中的源码路径均相对仓库根目录。

- 宿主样式统一使用 SCSS，入口为 `src/assets/styles/index.scss`，保留 `mixin.scss`、`reset.scss`、`el-ui.scss`、`el-light.scss`。主题变量、暗色底座、布局和过渡动画由 `@ao/admin-layout/styles.css` 提供，在 `main.ts` 中先于宿主样式引入；不得在宿主保留迁出样式的副本。禁止引入 Tailwind 等原子化 CSS 框架，禁止使用内联 `style=""` 写大段样式（动态样式除外）。

- Vue 组件使用 `<style scoped>` 时，class 命名应尽量收敛：每个组件通常只声明一个顶层模块 class 作为样式作用域入口，内部子节点优先使用简短且语义明确的命名，避免在已具备清晰作用域的组件内机械重复大段 BEM 前缀。

- `<style scoped>` 场景下，布局类名优先使用 `left`、`right`、`top`、`bottom`、`header`、`body`、`footer`、`content`、`main`、`aside`、`actions`、`item` 等简短命名；信息展示类名优先使用 `info`、`title`、`description`、`label`、`value`、`text`、`icon`、`tip` 等简短命名。

- 仅当存在跨组件复用、全局覆盖、Element Plus 深度覆盖、多层状态表达或样式作用域不适合依赖 `scoped` 时，才使用更完整的 BEM 命名。

## 样式整理

- 对于新增或重构的 Vue `<style scoped>` 组件，优先整理为“一个顶层 class + 内部短语义 class”的结构，再在该作用域内使用 SCSS 嵌套；只有确实需要更强语义隔离或跨组件复用时才保留 BEM。

- 同一 BEM 前缀的选择器必须优先使用 SCSS 嵌套，避免重复书写完整类名。例如：

  ```scss
  .breadcrumb {
    &__list {
    }
    &__item {
    }
    &__link {
      &:hover {
      }
    }
  }
  ```

- BEM 修饰符使用 `&--*`，BEM 子元素使用 `&__*`，连字符命名的子块使用 `&-*`；伪类、伪元素、状态类、直接子元素和媒体查询应归属对应父选择器。

- 只有在编译后的 CSS 选择器与原选择器完全一致时才能进行嵌套。禁止因嵌套新增后代层级或改变特异性；全局选择器、Element Plus 覆盖、动画、主题样式和跨组件覆盖必须保留原有作用域。必要时使用显式选择器（如 `& &__header`）保持原 CSS 语义。

- 不重命名现有 class，不改变声明数值、动画、层级和响应式断点；纯样式整理不得修改模板、脚本逻辑、接口、类型或公共 API。

- 同一个声明区块内部不插入无意义的空行。不同语义的选择器、注释、媒体查询和 `@keyframes` 区块之间可保留空行，以保持结构可读性。

- 涉及样式重构时，应扫描全部 `.vue` 和 `.scss` 文件，确认 BEM 选择器已归并、声明区块内部没有多余空行，并通过 Sass 编译或构建核对生成的 CSS 选择器。

- 样式中的颜色必须优先引用现有 CSS 变量；无法映射时，业务专用变量在宿主样式中以 `:root` 和 `.dark` 成对定义，公共主题变量在布局包仓库的 `src/styles/theme.scss` 中维护并发版（安装产物只发布 `dist`，宿主以 `@ao/admin-layout/styles.css` 消费）。脚本配置、组件 props 默认值和主题变量定义中的颜色值不按样式声明处理，但不得将脚本配置颜色误改为 CSS 变量。

- 涉及文本截断、溢出隐藏、多行省略等文本溢出场景时，必须优先使用 `src/assets/styles/mixin.scss` 中定义的 `@include ellipsis` 混入，禁止手动编写 `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` 等重复代码。单行省略调用 `@include ellipsis`，多行省略调用 `@include ellipsis($rowCount)`（如 `@include ellipsis(3)`）。

## 深色模式

系统通过切换 `<html>` 元素的 `class="dark"` 实现主题切换。CSS 变量在 `:root`（亮色）和 `.dark`（暗色）选择器下分别定义不同值，class 切换时自动生效。

**核心要求：凡涉及颜色的样式（背景色、文字色、边框色、阴影色等），必须使用 CSS 变量，禁止硬编码色值（如 `#fff`、`#000`、`rgba(0,0,0,0.1)` 等）。**

变量用途与当前值见 [CSS 变量速查](../references/css-variables.md)，修改样式前按需查阅；具体值以源码为准。

## 深色模式适配强制检查规则

**在新增或修改任何 `.vue` / `.scss` 文件时，必须执行以下检查：**

1. **扫描硬编码颜色值**：检查 `<style>` / `<style scoped>` 块中是否存在裸色值（如 `#fff`、`#ffffff`、`#000`、`#000000`、`#cccccc`、`rgba(0,0,0,...)`、`rgba(255,255,255,...)` 等）。

2. **排除合法场景**：
   - [CSS 变量速查](../references/css-variables.md)中已定义的变量定义代码本身（即布局包仓库 `theme.scss`、`dark.scss` 中的 `:root` / `.dark` 块）可豁免。
   - 纯透明 `transparent`、`rgba(0,0,0,0)` 等完全无视觉影响的颜色可豁免。
   - `box-shadow` 中确实需要固定不随主题变化的阴影（极少场景）可豁免，但需在注释中说明原因。

3. **提醒与替换要求**：一旦检测到不符合条件的硬编码颜色，必须：
   - 明确列出每个硬编码色值所在文件与行号。
   - 给出推荐替换的 CSS 变量名（对照 CSS 变量速查文档）。
   - 如现有变量无法覆盖，按上述变量归属规则在 `:root` 和 `.dark` 中同时新增变量，再引用。
   - **示例输出格式**：
     ```
     ⚠ 深色模式适配警告：以下位置存在硬编码颜色值，暗色模式下可能出现显示异常：

     1. `src/views/xxx/index.vue` 第 45 行 — `color: #333` → 建议替换为 `var(--ao-gray-900)`
     2. `src/views/xxx/index.vue` 第 52 行 — `background: #f5f5f5` → 建议替换为 `var(--ao-gray-200)`
     3. `src/views/xxx/style.scss` 第 10 行 — `border: 1px solid #ddd` → 建议替换为 `.border-full-d` 或 `var(--default-border)`
     ```

4. **不需要等待用户确认**：检测到问题后直接给出警告和替换建议，继续执行后续任务。

检查命令见 [开发流程与验证](workflow.md)，样式整理必须执行其中完整检查。
