---
alwaysApply: true
scene: git_message
---

# Git Commit 提交规范

## Commit 格式

```txt
<type>(<scope>): <subject>
```

示例：

```txt
feat(auth): 新增短信验证码登录
fix(order): 修复支付回调重复执行问题
refactor(permission): 优化权限树加载逻辑
docs(readme): 更新 Docker 部署文档
```

---

# Type 类型说明

| Type     | 说明                               |
| -------- | ---------------------------------- |
| feat     | 新功能                             |
| fix      | Bug 修复                           |
| refactor | 代码重构（不新增功能、不修复 Bug） |
| perf     | 性能优化                           |
| docs     | 文档修改                           |
| style    | 代码格式调整（不影响逻辑）         |
| test     | 测试相关                           |
| build    | 构建系统、依赖、Docker 修改        |
| ci       | CI/CD 配置修改                     |
| chore    | 杂项修改                           |
| revert   | 回滚提交                           |
| wip      | 进行中的工作                       |

---

# Scope 模块说明（推荐）

常见模块：

```txt
auth
user
order
payment
wechat
sms
admin
api
database
redis
docker
jenkins
config
permission
```

示例：

```txt
feat(wechat): 新增微信小程序登录
fix(auth): 修复 token 续期失效问题
perf(redis): 优化缓存查询逻辑
```

---

# Subject 编写规范

## 要求

- 提交描述使用中文
- 简洁明确
- 描述本次核心改动
- 不要写无意义内容
- 不要以句号结尾
- 一条 commit 只做一件事

---

# 推荐写法

## 新功能

```txt
feat(auth): 新增短信验证码登录
feat(payment): 接入微信支付 V3
feat(user): 支持用户头像上传
```

## Bug 修复

```txt
fix(order): 修复支付状态更新异常
fix(api): 修复参数为空时报错
fix(auth): 修复 token 失效问题
```

## 重构优化

```txt
refactor(permission): 重构权限校验逻辑
perf(cache): 优化 Redis 查询性能
```

## 构建部署

```txt
build(docker): 新增生产环境 Dockerfile
ci(jenkins): 增加自动部署流水线
```

## 文档修改

```txt
docs(readme): 更新项目部署步骤
docs(api): 补充接口参数说明
```

---

# 多行 Commit 示例

复杂功能建议增加详细描述：

```txt
feat(auth): 新增微信小程序登录功能

1. 支持 wx.login 登录
2. 支持手机号绑定
3. 自动注册新用户
4. 登录成功后生成 JWT
```

---

# 禁止提交内容

禁止：

```txt
update
test
修改
最终版
修复bug
111
提交代码
```

---

# Commit 粒度规范

## 正确示例

```txt
feat(user): 新增用户头像上传
fix(payment): 修复微信回调签名校验
perf(permission): 优化菜单树加载性能
```

## 错误示例

```txt
feat: 修改登录、支付、权限、Docker配置
```

---

# 分支命名规范（推荐）

| 分支        | 用途       |
| ----------- | ---------- |
| main/master | 生产环境   |
| develop     | 开发主分支 |
| feature/\*  | 功能开发   |
| fix/\*      | Bug 修复   |
| hotfix/\*   | 紧急修复   |
| release/\*  | 发布分支   |

示例：

```txt
feature/wechat-login
fix/payment-callback
hotfix/jwt-expire
```

---

# 推荐工具（可选）

提交钩子与提交信息校验均由仓库根统一提供：`core.hooksPath` 指向根 `.husky/`，`commit-msg` 调用根 `commitlint.config.cjs`。**不要在本子项目内安装或初始化 husky**——子目录执行 husky 会覆盖 `core.hooksPath`，导致根钩子静默失效（见根 [AGENTS.md](../../../AGENTS.md)）。

---

# 推荐团队规范

建议统一：

- Git Commit 规范
- 分支命名规范
- PR 审核规范
- 自动化校验规范

实现效果：

- 提交历史清晰
- 方便生成 Changelog
- 提高团队协作效率
- 降低维护成本
