import { defineConfig } from '@playwright/test'

// End-to-end tests against the packaged app, as installed (Milestone 7). Run `pnpm package:dir` first,
// or point PLOTDEVICE_PACKAGED at an installed executable.
export default defineConfig({
  testDir: 'apps/desktop/e2e-packaged',
  testMatch: '**/*.e2e.ts',
  timeout: 60_000,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: { trace: 'retain-on-failure' },
})
