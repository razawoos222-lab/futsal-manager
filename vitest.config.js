import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['harness/tests/**/*.test.js'],
    environment: 'node',
    testTimeout: 15000,
  },
});
