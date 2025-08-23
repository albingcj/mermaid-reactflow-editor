import { defineConfig } from 'vitest/config';

// Vitest configuration for unit tests
export default defineConfig({
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
