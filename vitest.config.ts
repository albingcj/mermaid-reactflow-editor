import { defineConfig } from 'vitest/config';
import path from 'path';

// Vitest configuration for unit tests.
// NOTE: this file takes precedence over vite.config.ts's test block (if any)
// when running `vitest`/`npm test`, so the `@` path alias used throughout the
// app source must be declared here too, or any test importing app modules via
// `@/...` fails to resolve.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,         // enable global test APIs (describe, it, expect)
    environment: 'node',    // run tests in Node environment
    include: ['test/utils/**/*.test.ts'], // pattern for test files
    coverage: {
      reporter: ['text', 'html'], // coverage reporters
      exclude: ['test/**'],        // exclude test files from coverage
    },
  },
});
