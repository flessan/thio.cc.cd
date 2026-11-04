import path from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // The real module is produced by the VitePress config at build time.
      'virtual:kerja-shortcuts': path.resolve(__dirname, 'tests/fixtures/shortcuts.ts')
    }
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    reporters: 'default'
  }
})
