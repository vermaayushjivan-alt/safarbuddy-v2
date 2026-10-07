import { defineConfig } from 'vitest/config';
import path from 'path';
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, '../src') } },
  test: { environment: 'node', include: ['_verify/**/*.test.ts'], root: path.resolve(__dirname, '..') },
});
