import { defineConfig } from '@playwright/test'

// `pnpm site:test`: the built site, served as GitHub Pages would, checked in a browser (Milestone 10, decision 9).
export default defineConfig({
  testDir: 'tests',
  testMatch: '**/*.site.ts',
  timeout: 60_000,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:4330' },
  webServer: { command: 'node tests/serve.mjs 4330', url: 'http://localhost:4330/plotdevice/', reuseExistingServer: false },
})
