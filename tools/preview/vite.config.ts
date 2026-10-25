import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

/**
 * Builds only the dev-only preview page (src/renderer/preview.html) to out/preview, with the
 * renderer's settings. The app build (electron-vite) never includes it.
 */
export default defineConfig({
  root: resolve(import.meta.dirname, '../../src/renderer'),
  base: './',
  plugins: [vue()],
  resolve: { alias: { '@renderer': resolve(import.meta.dirname, '../../src/renderer/src') } },
  build: {
    outDir: resolve(import.meta.dirname, '../../out/preview'),
    emptyOutDir: true,
    rollupOptions: { input: resolve(import.meta.dirname, '../../src/renderer/preview.html') }
  }
})
