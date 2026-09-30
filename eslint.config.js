import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        // Explicit list rather than projectService: the service resolves the
        // nearest tsconfig.json, which excludes tests and config files.
        project: ['./tsconfig.json', './tsconfig.test.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
  {
    // Config files are plain JS and are not part of any tsconfig project.
    files: ['eslint.config.js'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    // Browser client script: runs in the page, not in Node, so it needs the
    // web environment globals and none of the type-checked rules.
    files: ['public/**/*.js'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      parserOptions: { project: false },
      globals: {
        document: 'readonly',
        window: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
      },
    },
  },
  {
    files: ['tests/**/*.ts', 'vitest.config.ts'],
    ...tseslint.configs.disableTypeChecked,
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
);