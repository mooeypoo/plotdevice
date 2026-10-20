import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'
import eslintPluginVue from 'eslint-plugin-vue'
import eslintConfigPrettier from 'eslint-config-prettier'

export default defineConfig(
  {
    ignores: [
      '**/node_modules',
      '**/dist',
      '**/out',
      'fixtures/sample-novel/**',
      'tools/dependency-rules/fixture/**',
      'docs/.vitepress/cache'
    ]
  },
  tseslint.configs.strictTypeChecked,
  eslintPluginVue.configs['flat/recommended'],
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.vue']
      }
    }
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser
      }
    }
  },
  {
    files: ['**/*.{ts,vue}'],
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/block-lang': ['error', { script: { lang: 'ts' } }],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration',
          message: 'Use named exports (AGENTS.md, "Code style").'
        }
      ]
    }
  },
  {
    // Vue SFCs (and their module declaration) and tool configs need a default export.
    files: [
      '**/*.vue',
      'src/renderer/src/env.d.ts',
      '*.config.{ts,mts,mjs}',
      'docs/.vitepress/config.mts',
      'docs/.vitepress/theme/index.ts'
    ],
    rules: { 'no-restricted-syntax': 'off' }
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked]
  },
  {
    files: ['**/*.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' }
  },
  eslintConfigPrettier
)
