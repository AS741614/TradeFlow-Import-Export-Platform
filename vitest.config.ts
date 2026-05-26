import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      all: true,
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        '**/node_modules/**',
        '**/__tests__/**',
        '**/*.test.{ts,tsx}',
        'src/lib/types.ts',          // pure interface declarations
        'src/lib/constants.ts',      // data tables, not logic
        'src/app/**',                // pages — covered in a later phase
        'src/components/**',         // components — covered in a later phase
        'src/app/api/**',            // API routes — covered in a later phase
        '**/*.d.ts',
      ],
      thresholds: {
        perFile: true,
        'src/lib/storage.ts': {
          statements: 100,
          branches: 83,
          functions: 100,
          lines: 100,
        },
        'src/lib/templateEngine.ts': {
          statements: 100,
          branches: 90,
          functions: 100,
          lines: 100,
        },
        'src/lib/utils.ts': {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        'src/lib/importers.ts': {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        'src/lib/email.ts': {
          statements: 100,
          branches: 96,
          functions: 100,
          lines: 100,
        },
      },
    },
  },
});
