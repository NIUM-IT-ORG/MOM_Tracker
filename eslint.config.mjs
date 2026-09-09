import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    // The prototype is a delivered artefact, not source. Never lint it.
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/node_modules/**',
      'prototype/**',
      'docs/**',
      'apps/web/next-env.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      // Non-negotiable rule: no `any`. See CLAUDE.md.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
    },
  },
  {
    // Node globals. Everything here runs on Node or is a Node build script.
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        NodeJS: 'readonly',
      },
    },
  },
  {
    /**
     * NestJS resolves constructor dependencies from `emitDecoratorMetadata`,
     * which needs the imported class present at runtime. `import type` erases
     * it and dependency injection then fails at boot with an unhelpful message,
     * so the rule is off for the API rather than worked around per file.
     */
    files: ['apps/api/**/*.ts'],
    rules: { '@typescript-eslint/consistent-type-imports': 'off' },
  },
  {
    // Seeds, scripts and tests legitimately log and use loose typing at the edges.
    files: ['prisma/**/*.{ts,mjs}', 'scripts/**/*.ts', '**/*.spec.ts', '**/*.test.ts'],
    rules: {
      'no-console': 'off',
    },
  },
);
