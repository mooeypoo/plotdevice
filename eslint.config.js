import { defineConfig } from 'eslint/config'
import vue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'

export default defineConfig(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/out/**',
      '**/.tsbuild/**',
      '**/.astro/**',
      '**/test-results/**',
      'tests/fixtures/**',
      'spikes/**',
      'tooling/arch-fixtures/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },
  tseslint.configs.strict,
  vue.configs['flat/essential'],
  { files: ['**/*.vue'], languageOptions: { parserOptions: { parser: tseslint.parser } } },
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration',
          message: 'Use named exports (AGENTS.md); default exports only in Vue files and config files.',
        },
      ],
    },
  },
  { files: ['**/*.vue', '**/*.d.ts', '**/*.config.{js,ts,cjs,mjs}', 'eslint.config.js'], rules: { 'no-restricted-syntax': 'off' } },
)
