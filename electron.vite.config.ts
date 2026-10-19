import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { '@shared': resolve('src/shared') } },
    build: { rollupOptions: { input: { index: resolve('src/main/index.ts') } } }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { '@shared': resolve('src/shared') } },
    // preload بصيغة CJS حتى يعمل مع sandbox: true (ESM preload يتطلب تعطيل sandbox)
    build: { rollupOptions: { input: { index: resolve('src/preload/index.ts') }, output: { format: 'cjs', entryFileNames: '[name].js' } } }
  },
  renderer: {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': resolve('src/renderer/src'),
        '@shared': resolve('src/shared')
      }
    },
    build: { rollupOptions: { input: { index: resolve('src/renderer/index.html') } } }
  }
})
