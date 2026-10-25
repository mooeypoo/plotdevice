import { defineConfig } from '@playwright/test'

// End-to-end tests drive the real built app (run `pnpm build` first; `pnpm e2e` does).
export default defineConfig({
  testDir: 'apps/desktop/e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 60_000,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: { trace: 'retain-on-failure' },
})
