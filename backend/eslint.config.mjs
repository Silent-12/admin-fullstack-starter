// ESLint 扁平配置（backend）
//
// 职责边界：ESLint 只负责「代码质量」，格式化统一交给 Prettier。
// 通过 eslint-config-prettier 关闭所有与 Prettier 冲突的规则（置于数组末尾），
// 不再引入 eslint-plugin-prettier —— 避免「把 Prettier 当作 ESLint 规则执行」带来的
// 重复计算与两套报错口径。
//
// 参考：https://typescript-eslint.io/getting-started/typed-linting/

// @ts-check
import eslint from '@eslint/js';
import prettierConfig from 'eslint-config-prettier/flat';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'dist/', 'node_modules/', 'commitlint.config.js'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      // package.json 已声明 "type": "module"，与 tsconfig 的 nodenext 保持一致
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // 允许保留告警级别的 console（error/warn）
      'no-console': [
        'warn',
        {
          allow: ['error', 'warn'],
        },
      ],
      'no-constant-binary-expression': 'error',
      'object-shorthand': [
        'error',
        'always',
        {
          avoidQuotes: true,
        },
      ],
      'prefer-const': [
        'error',
        {
          destructuring: 'all',
        },
      ],

      // TypeScript 风格与安全相关规则
      '@typescript-eslint/consistent-generic-constructors': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/consistent-type-exports': [
        'error',
        {
          fixMixedExportsWithInlineTypeSpecifier: true,
        },
      ],
      '@typescript-eslint/consistent-type-imports': ['error'],
      '@typescript-eslint/member-ordering': ['error'],
      '@typescript-eslint/no-redundant-type-constituents': ['warn'],
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/prefer-optional-chain': ['error'],
      '@typescript-eslint/no-use-before-define': [
        'error',
        {
          functions: false,
          typedefs: false,
        },
      ],
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': ['error'],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  // 关闭与 Prettier 冲突的格式化规则；必须置于最后以取得最高优先级
  prettierConfig,
);
