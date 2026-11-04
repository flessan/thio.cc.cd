// `tsc` only needs this to resolve `.vue` imports from the smoke test; the real
// SFC compilation is done by Vite/VitePress.
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}
