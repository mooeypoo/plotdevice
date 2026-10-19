/// <reference types="vite/client" />

// Lets the plain TypeScript service used by ESLint type `.vue` imports. vue-tsc resolves the real files.
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent
  export default component
}
