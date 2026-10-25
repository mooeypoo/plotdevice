import { defineConfig } from 'vitest/config'

// Performance limits (Milestone 6): run alone and one file at a time, so other tests don't skew the timings.
export default defineConfig({ test: { include: ['packages/*/test/**/*.perf.ts'], fileParallelism: false, testTimeout: 120_000 } })
