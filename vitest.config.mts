import vue from '@vitejs/plugin-vue'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  // Compiles .vue files for component tests, which opt into a DOM with
  // `// @vitest-environment happy-dom`. Everything else runs in plain Node.
  plugins: [vue()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tools/**/*.test.ts', 'fixtures/*.test.ts'],
    // The dependency-rule fixture contains dummy *.test.ts files that are data, not tests.
    exclude: [...configDefaults.exclude, 'tools/dependency-rules/fixture/**']
  }
})
