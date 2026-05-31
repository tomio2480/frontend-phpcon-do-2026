/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    // テスト環境では zimmerframe (CJS 非対応) を要求する devtools を無効化する
    preact({ devToolsEnabled: !process.env.VITEST }),
    tailwindcss(),
  ],
  assetsInclude: ['**/*.wasm', '**/*.php'],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
