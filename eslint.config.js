// @ts-check
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import eslintConfigPrettier from 'eslint-config-prettier';
import * as jsonc from 'eslint-plugin-jsonc';
import jsoncParser from 'jsonc-eslint-parser';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // Ignore patterns
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'sbom.cdx.json'],
  },
  // Base configuration for all JS/TS files
  {
    files: ['**/*.{ts,tsx,js}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2024,
        sourceType: 'module',
      },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      ...tseslint.configs['recommended'].rules,
      'no-console': 'warn',
      'no-debugger': 'error',
    },
  },
  // Type-aware rules for TypeScript files only
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2024,
        sourceType: 'module',
        project: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      ...tseslint.configs['recommended-type-checked'].rules,
    },
  },
  // JSON/JSONC/JSON5 linting configuration
  {
    files: ['**/*.json', '**/*.json5', '**/*.jsonc'],
    languageOptions: {
      parser: jsoncParser,
    },
    plugins: {
      jsonc,
    },
    rules: {
      ...jsonc.configs['recommended-with-json'].rules,
      'jsonc/sort-keys': 'off', // Keep keys in logical order, not alphabetical
      'jsonc/indent': ['error', 2], // Enforce 2-space indentation in JSON files
      'jsonc/key-spacing': 'error', // Enforce consistent spacing between keys and values
      'jsonc/comma-dangle': ['error', 'never'], // No trailing commas in JSON
      'jsonc/quotes': ['error', 'double'], // Enforce double quotes in JSON
      'jsonc/quote-props': ['error', 'always'], // Always quote property names
      'jsonc/no-comments': 'off', // Allow comments in JSONC files
    },
  },
  // Specific rules for package.json
  {
    files: ['**/package.json'],
    rules: {
      'jsonc/sort-keys': [
        'error',
        {
          pathPattern: '^$', // Root object
          order: [
            'name',
            'version',
            'description',
            'keywords',
            'author',
            'license',
            'repository',
            'bugs',
            'homepage',
            'private',
            'type',
            'main',
            'module',
            'exports',
            'files',
            'bin',
            'packageManager',
            'engines',
            'scripts',
            'lint-staged',
            'dependencies',
            'devDependencies',
            'peerDependencies',
            'optionalDependencies',
          ],
        },
      ],
    },
  },
  // Specific rules for tsconfig files
  {
    files: ['**/tsconfig*.json'],
    rules: {
      'jsonc/no-comments': 'off', // Allow comments in tsconfig files
    },
  },
  // Relaxed rules for test files
  {
    files: ['**/__tests__/**/*.ts', '**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
    },
  },
  // Keep Prettier last
  eslintConfigPrettier,
];
