import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'electron-vite'
import type { Plugin } from 'vite'

// No inline scripts or styles, no remote content. Colours are set through the CSSOM, which this allows.
const STRICT_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  // No frame-ancestors: Chromium ignores it in a <meta> policy, and the app already refuses embedding.
].join('; ')
// The dev server injects styles and talks to its client over a websocket for hot reload.
const DEV_CSP = STRICT_CSP.replace("style-src 'self'", "style-src 'self' 'unsafe-inline'").replace(
  "connect-src 'self'",
  "connect-src 'self' ws:",
)

function contentSecurityPolicy(): Plugin {
  let serving = false
  return {
    name: 'plotdevice-csp',
    configResolved: (config) => {
      serving = config.command === 'serve'
    },
    transformIndexHtml: (html) => html.replace('%PLOTDEVICE_CSP%', serving ? DEV_CSP : STRICT_CSP),
  }
}

// Workspace packages are devDependencies, so electron-vite bundles them; only Electron stays external.
export default defineConfig({
  main: {},
  // Sandboxed preload scripts must be CommonJS.
  preload: { build: { rollupOptions: { output: { format: 'cjs', entryFileNames: '[name].cjs' } } } },
  renderer: { plugins: [vue(), contentSecurityPolicy()] },
})
