/**
 * commitlint 配置（仓库级）
 * @description 统一 frontend/ 与 backend/ 的提交信息规范。类型枚举取两个子模板的并集，
 * 并保留更严格的格式约束，避免合并后出现两套校验口径。
 * 参考：https://commitlint.js.org/#/reference-rules
 */
module.exports = {
  // 继承 Conventional Commits 基础规则
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 提交类型枚举：合并 frontend（含 wip）与 backend 的合法类型
    'type-enum': [
      2,
      'always',
      [
        'feat', // 新增功能
        'fix', // 修复缺陷
        'docs', // 文档变更
        'style', // 代码格式（不影响功能）
        'refactor', // 代码重构
        'perf', // 性能优化
        'test', // 测试相关
        'build', // 构建流程或外部依赖变更
        'ci', // CI 配置或脚本变更
        'revert', // 回滚提交
        'chore', // 辅助工具或非源码改动
        'wip' // 进行中的工作
      ]
    ],
    // 类型必须小写
    'type-case': [2, 'always', 'lower-case'],
    // 描述不能为空
    'subject-empty': [2, 'never'],
    // 描述结尾不加句号
    'subject-full-stop': [2, 'never', '.'],
    // 描述大小写不做校验
    'subject-case': [0]
  }
}
