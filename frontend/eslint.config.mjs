// ESLint 扁平配置（frontend）
//
// 职责边界：ESLint 只负责「代码质量」，格式化统一交给 Prettier。
// 因此引号、分号、缩进、行宽等格式类规则不在本文件声明，改由数组末尾的
// eslint-config-prettier 兜底关闭，避免 ESLint 与 Prettier 相互覆盖。
//
// 参考：https://eslint.org/docs/latest/use/configure/configuration-files

// 从 ESLint 插件中导入推荐配置
import pluginJs from '@eslint/js'
import prettierConfig from 'eslint-config-prettier'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default [
  // 指定文件匹配规则
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx,vue}']
  },
  // 指定全局变量和环境
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    }
  },
  // 扩展配置
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  // 自定义规则（仅保留代码质量类，格式类规则交由 Prettier）
  {
    // 针对所有 JavaScript、TypeScript 和 Vue 文件应用以下配置
    files: ['**/*.{js,mjs,cjs,ts,tsx,vue}'],

    rules: {
      'no-var': 'error', // 要求使用 let 或 const 而不是 var
      'no-unexpected-multiline': 'error', // 禁止空余的多行
      '@typescript-eslint/no-explicit-any': 'off', // 禁用 any 检查
      'vue/multi-word-component-names': 'off' // 禁用对 Vue 组件名称的多词要求检查
    }
  },
  // vue 规则
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser }
    }
  },
  // 关闭所有与 Prettier 冲突的格式化规则（须位于自定义规则之后才会生效）
  prettierConfig,
  // 例外：eslint-config-prettier 会把 no-unexpected-multiline 一并关闭（其 special rules 清单），
  // 但该规则拦截的是无分号风格下的 ASI 陷阱，属于代码正确性而非排版，项目需要保留，
  // 因此在 prettierConfig 之后重新开启（扁平配置后者覆盖前者）。
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx,vue}'],
    rules: {
      'no-unexpected-multiline': 'error'
    }
  },
  // 忽略文件
  {
    ignores: ['node_modules', '**/dist', 'public', '.vscode/**', 'src/assets/**', '**/*.local/**']
  }
]
