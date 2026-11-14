import { defineConfig } from 'vitest/config';

// Vitest uses Vite internally for isolated tests; Next.js runs/builds the application.
export default defineConfig({
  envDir: false,
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
    restoreMocks: true,
  },
});
