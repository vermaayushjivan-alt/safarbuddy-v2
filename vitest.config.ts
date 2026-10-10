import { defineConfig } from 'vitest/config';
import path from 'path';

// GOLIVE-18 — unit tests live in /verify (pure logic + simulated money-path tests).
// Run with: npm test
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // `server-only` throws outside a Next.js server build; tests run in plain Node.
      'server-only': path.resolve(__dirname, 'verify/stubs/server-only.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['verify/**/*.test.ts'],
  },
});
