import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tools/**/*.test.ts', 'fixtures/*.test.ts'],
    // The dependency-rule fixture contains dummy *.test.ts files that are data, not tests.
    exclude: [...configDefaults.exclude, 'tools/dependency-rules/fixture/**']
  }
})
