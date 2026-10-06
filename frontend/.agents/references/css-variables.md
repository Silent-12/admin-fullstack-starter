# CSS 变量速查

[返回主索引](../../AGENTS.md) · [样式规则](../rules/styles.md)

本文件用于查找变量用途。数值为迁移时的参考快照，使用前以**布局包仓库**的 `src/styles/` 下 `theme.scss`、`dark.scss`、`app.scss` 及宿主 `src/assets/styles/el-ui.scss` 为准（布局包安装产物只发布 `dist`，宿主侧以 `@ao/admin-layout/styles.css` 即其 `dist/index.css` 为实际生效结果，不保留其源码副本）。变量变更时同步维护本表。

### 样式整理语义变量

| 变量 | 用途 |
| --- | --- |
| `--ao-white` / `--ao-black` | 白色、黑色及其透明混合的基础色 |
| `--ao-shadow-05` / `--ao-shadow-08` / `--ao-shadow-10` / `--ao-shadow-12` / `--ao-shadow-15` / `--ao-shadow-20` | 阴影透明度 |
| `--ao-badge-dot` / `--ao-badge-text-bg` | 徽章圆点和文字徽章背景 |
| `--ao-menu-dark-bg` / `--ao-menu-dark-hover-bg` / `--ao-popup-menu-dark-active-bg` | 暗色菜单状态背景 |
| `--ao-login-yellow-start` / `--ao-login-yellow-end` / `--ao-login-blue-shadow` | 登录页装饰色和阴影 |
| `--ao-login-dark-shadow` / `--ao-login-light-shadow` / `--ao-login-banner-dark` | 登录页暗色主题及横幅辅助色 |

### 语义色变量（布局包仓库 `src/styles/theme.scss`）

| 变量名           | 亮色值 (`:root`)         | 暗色值 (`.dark`) | 典型用途 |
| ---------------- | ------------------------ | ---------------- | -------- |
| `--ao-primary`   | `oklch(0.7 0.23 260)`    | 继承亮色         | 主色调   |
| `--ao-secondary` | `oklch(0.72 0.19 231.6)` | 继承亮色         | 次要色   |
| `--ao-error`     | `oklch(0.73 0.15 25.3)`  | 继承亮色         | 错误色   |
| `--ao-info`      | `oklch(0.58 0.03 254.1)` | 继承亮色         | 信息色   |
| `--ao-success`   | `oklch(0.78 0.17 166.1)` | 继承亮色         | 成功色   |
| `--ao-warning`   | `oklch(0.78 0.14 75.5)`  | 继承亮色         | 警告色   |
| `--ao-danger`    | `oklch(0.68 0.22 25.3)`  | 继承亮色         | 危险色   |

### 灰度色阶变量（亮暗反转）

| 变量名          | 亮色值    | 暗色值    | 典型用途        |
| --------------- | --------- | --------- | --------------- |
| `--ao-gray-100` | `#f9fafb` | `#110f0f` | 最浅背景/填充   |
| `--ao-gray-200` | `#f2f4f5` | `#17171c` | 浅背景/分隔     |
| `--ao-gray-300` | `#e6eaeb` | `#393946` | 边框/分割线背景 |
| `--ao-gray-400` | `#dbdfe1` | `#505062` | 中等边框        |
| `--ao-gray-500` | `#949eb7` | `#73738c` | 占位文字/禁用态 |
| `--ao-gray-600` | `#7987a1` | `#8f8fa3` | 辅助文字颜色    |
| `--ao-gray-700` | `#4d5875` | `#ababba` | 次要文字颜色    |
| `--ao-gray-800` | `#383853` | `#c7c7d1` | 主要文字颜色    |
| `--ao-gray-900` | `#323251` | `#e3e3e8` | 最深文字/标题色 |

### 背景与容器变量

| 变量名                | 亮色值    | 暗色值    | 典型用途             |
| --------------------- | --------- | --------- | -------------------- |
| `--ao-color`          | `#ffffff` | `#000000` | 基础色（组件内底色） |
| `--default-bg-color`  | `#ffffff` | `#161618` | 页面全局背景         |
| `--default-box-color` | `#ffffff` | `#161618` | 卡片/弹窗/容器背景   |

### 边框变量

| 变量名                    | 亮色值             | 暗色值                   | 典型用途      |
| ------------------------- | ------------------ | ------------------------ | ------------- |
| `--default-border`        | `#e2e8ee`          | `rgba(255,255,255,0.1)`  | 实线默认边框  |
| `--default-border-dashed` | `#dbdfe9`          | `#363843`                | 虚线/分隔边框 |
| `--ao-card-border`        | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.08)` | 卡片边框      |

### 交互状态变量

| 变量名                 | 亮色值    | 暗色值    | 典型用途            |
| ---------------------- | --------- | --------- | ------------------- |
| `--ao-hover-color`     | `#edeff0` | `#252530` | 鼠标悬停背景        |
| `--ao-active-color`    | `#f2f4f5` | `#202226` | 点击激活背景        |
| `--ao-el-active-color` | `#f2f4f5` | `#2e2e38` | Element组件选中背景 |

### 布局尺寸变量

| 变量名                       | 值 / 来源                  | 典型用途         |
| ---------------------------- | -------------------------- | ---------------- |
| `--ao-header-height`         | 运行时写入                 | 头部实测高度     |
| `--ao-content-header-height` | 运行时写入                 | 内容头部实测高度 |
| `--ao-full-height`           | 布局包 `app.scss` 组合计算 | 内容区全高       |

`--ao-full-height` 在布局包 `app.scss` 中由 `100vh` 减去运行时写入的头部高度组合而成；内容区上下留白由各容器自身内边距提供（如搜索栏 `10px`、表格卡片体 `10px`、`.page-content` `20px`），不设全局页面间距变量。脚本只负责把头部高度写入 `--ao-header-height` / `--ao-content-header-height`，不参与间距计算。

### Element Plus 桥接变量（`src/assets/styles/el-ui.scss`）

| 变量名                         | 说明                                          |
| ------------------------------ | --------------------------------------------- |
| `--main-color`                 | 指向 `var(--el-color-primary)`，主题色别名    |
| `--theme-color`                | 指向 `var(--main-color)`                      |
| `--el-component-custom-height` | 组件统一高度（固定 `36px`）                   |
| `--el-component-size`          | Element Plus 组件尺寸（跟随上面）             |
| `--custom-radius`              | 全局圆角基数（固定 `0.75rem`）                |
| `--el-border-radius-base`      | Element 基础圆角（由 `--custom-radius` 计算） |
| `--el-border-radius-small`     | Element 小圆角（由 `--custom-radius` 计算）   |

### Element Plus 暗色覆盖（布局包仓库 `src/styles/dark.scss`，仅 `html.dark` 下生效）

| 变量名                    | 暗色值                     |
| ------------------------- | -------------------------- |
| `--el-bg-color`           | `var(--default-box-color)` |
| `--el-text-color-regular` | `rgba(255,255,255,0.85)`   |

### 富文本编辑器变量（仅 `html.dark` 下生效）

| 变量名                            | 暗色值                         |
| --------------------------------- | ------------------------------ |
| `--w-e-toolbar-bg-color`          | `#18191c`                      |
| `--w-e-toolbar-color`             | `var(--ao-gray-600)`           |
| `--w-e-toolbar-active-bg-color`   | `#25262b`                      |
| `--w-e-toolbar-active-color`      | `var(--ao-gray-800)`           |
| `--w-e-toolbar-border-color`      | `var(--default-border-dashed)` |
| `--w-e-textarea-bg-color`         | `#090909`                      |
| `--w-e-textarea-border-color`     | `var(--default-border-dashed)` |
| `--w-e-textarea-slight-bg-color`  | `#090909`                      |
| `--w-e-modal-button-bg-color`     | `#090909`                      |
| `--w-e-modal-button-border-color` | `var(--default-border-dashed)` |

### 预定义工具类（可直接复用，无需自定义颜色）

| 工具类               | 效果                                                  |
| -------------------- | ----------------------------------------------------- |
| `.border-full-d`     | `border: 1px solid var(--default-border)`             |
| `.border-b-d`        | `border-bottom: 1px solid var(--default-border)`      |
| `.border-t-d`        | `border-top: 1px solid var(--default-border)`         |
| `.border-l-d`        | `border-left: 1px solid var(--default-border)`        |
| `.border-r-d`        | `border-right: 1px solid var(--default-border)`       |
| `.rounded-custom-xs` | `border-radius: calc(var(--custom-radius) / 2)`       |
| `.rounded-custom-sm` | `border-radius: calc(var(--custom-radius) / 2 + 2px)` |
