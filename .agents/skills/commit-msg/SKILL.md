---
name: commit-msg
description: Generate a single-line Chinese commit message based on Conventional Commits by reading the project's git staged area, then execute the commit locally. Use when the user asks for a commit message, says "msg", "commit msg", "写提交信息", or wants one-line text that covers all staged changes. Output should follow standard Conventional Commits and summarize all staged changes in one line.
---

# Commit Message 生成规范

## 目标

**一、准确概括提交内容** — 基于当前 **git 暂存区** 生成一行 commit message，覆盖本次提交包含的全部改动。

**二、遵循中文规范** — 优先使用标准 Conventional Commits 语义和格式，并用中文撰写 subject，而不是依赖最近一次提交风格。

## 核心原则

> commit message 不是对 diff 的逐文件罗列，而是对这次提交意图的压缩表达。先读暂存区，再归纳，再输出一行。

## 触发场景

当用户提及以下任一情况时使用本 skill：

- 要写 commit message、提交信息
- 说「msg」且语境是 git 提交
- 需要根据当前改动生成一句提交说明
- 想让 agent 按 staged changes 总结一行提交标题

## 基本规则

### 一、默认只看暂存区

默认只根据 **staged changes** 生成 message，因为真正会被提交的是暂存区内容。

若用户明确说「包含未暂存内容」或「按全部改动写」，才额外查看 `git diff`。

### 二、默认执行本地提交

生成 commit message 后，默认自动执行 `git commit -m "<message>"` 将改动提交到本地仓库。提交完成后输出提交结果。

除非用户明确要求「只生成不提交」或「预览」，才仅展示 message 而不执行提交。

## 执行步骤

### 1. 读取 git 状态和暂存区

必须先获取以下信息，再生成 message。不要猜测，也不要只凭文件名写。

**建议执行的命令：**

```bash
git status --short
git diff --cached --stat
git diff --cached
```

- `git status --short`：确认哪些文件已 stage，是否还有未 stage 内容。
- `git diff --cached --stat`：快速把握改动范围。
- `git diff --cached`：查看实际提交内容，这是生成 message 的依据。

### 2. 先判断是否能生成

若暂存区为空：

- 不要编造 message。
- 明确说明当前没有 staged changes，无法基于提交区生成准确的一行 commit message。

### 3. 归纳这次提交的主语义

根据 `git diff --cached` 的结果：

1. 找出本次提交的**主要目的**：新功能、修 bug、文档修改、重构、测试、性能优化、脚本或依赖调整等。
2. 识别**主要影响范围**：模块名、目录名、功能区域等。
3. 若包含多个文件或多类小改动，用一个更高层级的概括覆盖全部，不要逐项拼接成长句。

### 4. 对齐标准规范

优先使用标准 Conventional Commits 形式。常见格式：

```text
<type>(<scope>): <subject>
```

或

```text
<scope>: <subject>
```

注意：

- 不要为了贴合历史提交而偏离标准 Conventional Commits。
- 如果无法确定 scope，允许省略 scope，但 type 和 subject 仍应保持规范。
- subject 使用中文表达，确保简洁、准确、可直接用于提交。

### 5. 生成一行 message

输出应满足：

- **一行**
- **覆盖全部 staged changes**
- **简洁**
- **与仓库风格一致**
- **可直接拿去提交**

### 6. 执行本地提交

生成 message 后，立即执行本地提交，**禁止推送远程**：

```bash
git commit -m "<生成的 commit message>"
```

- 直接使用最终生成的一行 message 作为 `-m` 参数提交到本地仓库
- 提交后输出 `git log --oneline -1` 确认提交结果
- **禁止**执行 `git push` 或任何推送远程的命令

## 写法要求

### 标题格式

优先使用以下格式：

```text
<type>(<scope>): <subject>
```

scope 为可选。例如：

- `feat(login): 新增 OAuth2 登录支持`
- `fix: 修复数据解析中的空指针问题`
- `docs: 更新 API 使用示例`
- `refactor(core): 提取共享校验逻辑`
- `chore: 升级依赖版本`

### 标题规则

- 使用祈使语气，写现在要做什么，如 `新增` / `修复` / `更新` / `重构`
- 首字母**不要大写**
- 结尾**不要句号**
- 尽量控制在 **72 个字符内**
- 不要出现 `WIP`、`misc`、`update files` 这类空泛表述

### type 选择

标准 Conventional Commits 类型：

| type | 含义 | 使用场景 |
|------|------|----------|
| `feat` | 新功能 | 新增用户可见的功能特性 |
| `fix` | 修复 | 修复 bug 或缺陷 |
| `docs` | 文档 | 仅文档、注释、README 等改动 |
| `style` | 样式 | 不影响代码逻辑的格式调整（空格、格式化、分号等） |
| `refactor` | 重构 | 既非新增功能也非修复 bug 的代码改动 |
| `perf` | 性能 | 提高性能的代码改动 |
| `test` | 测试 | 新增或修改测试代码 |
| `build` | 构建 | 构建系统、打包工具、依赖等改动 |
| `ci` | CI | CI 配置、脚本等改动 |
| `chore` | 杂项 | 其他杂项（依赖、脚本、工程配置等） |
| `revert` | 回滚 | 回滚之前的提交 |

不确定时：

- 有用户可见行为修正，优先 `fix`
- 功能增强或新增，优先 `feat`
- 只是文字、示例、说明更新，优先 `docs`
- 只是工具链、依赖、脚本调整，优先 `chore`

### scope 选择

- 改动集中在单个模块或组件时，用模块名，如 `login`、`core`、`api`
- 改动集中在目录或功能区域时，用 `docs`、`scripts`、`config`
- 若没有明确 scope，允许省略
- scope 应使用**小写字母**或项目约定的命名风格

## 边界情况

### 多类改动混在一起

如果 staged changes 混合了文档、样式、类型、小修复等内容：

- 优先找**主目的**
- 如果没有单一主目的，用更上层的概括
- 目标是"诚实地覆盖全部改动"，不是把每个点都塞进标题

### 提交内容过于分散

若暂存区包含明显不相关的多组改动：

- 仍然给出一个尽量诚实的一行 message
- 不要假装这些改动只有一个很具体的目的
- 可使用较宽的概括，如 `chore(auth,ui): clean up styles, types and docs`

## 安全规则

### 一、禁止推送远程

- **严禁** 执行 `git push`、`git push origin` 或任何形式的远程推送操作
- 所有提交仅限于本地仓库
- 若用户要求推送，提醒用户手动执行或另行说明

## 禁止

- 不读取 `git diff --cached` 就写 message
- 只根据文件名猜测内容
- 只描述部分文件或部分改动，忽略其他已 stage 内容
- 输出多行说明，把分析当成 commit message
- 为了套格式而违背仓库已有风格
- 写超过 72 个字符的冗长标题，除非很难避免
- **推送远程** — 任何形式的 `git push` 均在禁止之列
