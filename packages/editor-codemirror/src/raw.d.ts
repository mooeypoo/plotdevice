// Tests load fixtures as text through Vite's `?raw` imports, so this package needs no Node APIs.
declare module '*?raw' {
  const content: string
  export default content
}
