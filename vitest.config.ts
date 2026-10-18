import { defineConfig } from 'vitest/config';

// Config terpisah dari vite.config.ts supaya plugin React Router tidak ikut jalan saat test.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: { include: ['app/**/*.test.ts'], environment: 'node' },
});
