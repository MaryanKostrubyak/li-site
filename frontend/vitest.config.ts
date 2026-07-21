import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) }
  },
  test: {
    environment: 'jsdom',
    include: ['lib/**/*.test.ts', 'components/**/*.test.tsx'],
    exclude: ['e2e/**', 'node_modules/**'],
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['lib/booking.ts', 'lib/datetime.ts', 'components/shared/status-badge.tsx'],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 75 }
    }
  }
});
