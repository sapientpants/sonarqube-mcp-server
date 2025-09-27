import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary', 'lcov'],
      exclude: [
        'coverage/**',
        'dist/**',
        '*.config.js',
        '*.config.ts',
        '.*.js',
        '**/*.d.ts',
        'tests/**',
        'test/**',
        '**/*.spec.ts',
        '**/*.test.ts',
        'docs/**',
        '.github/**',
        '.changeset/**',
        '.claude/**',
        'node_modules/**',
        'src/dev/**', // Development utilities - no coverage required
        '**/*.example.ts', // Example files - not part of production code
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
});
