import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['__tests__/**/*.test.{ts,tsx}'],
    exclude: ['__tests__/e2e/**/*', 'node_modules'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.next/',
        'drizzle/',
        '__tests__/',
        '*.config.*',
        'vitest.setup.ts',
      ],
      thresholds: {
        global: {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      // `server-only` 는 Next 번들러 전용 가드라 vitest 가 해석하지 못한다.
      // 서버 모듈(sitemap·stock-server 등)을 테스트하려면 no-op 으로 치환해야 한다.
      'server-only': path.resolve(__dirname, './__tests__/stubs/server-only.ts'),
    },
  },
})
