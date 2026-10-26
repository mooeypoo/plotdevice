import { defineConfig } from '@playwright/test'

// `pnpm site:screenshots`: drives the real, built app to make the site's screenshots (Milestone 10, decision 5).
export default defineConfig({
  testDir: 'screenshots',
  testMatch: '**/*.shots.ts',
  timeout: 120_000,
  workers: 1,
  reporter: 'list',
})
