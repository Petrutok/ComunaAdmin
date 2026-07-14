// ESLint flat config (the `next lint` CLI is deprecated; CI runs
// `npm run lint` and treats ERRORS as blocking, warnings as advisory).
//
// Rule philosophy: correctness rules stay at their default (error);
// stylistic rules that would flag hundreds of legacy-but-harmless
// patterns are downgraded so the signal stays readable. Tighten them
// gradually, one rule per PR, not all at once.

import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const config = [
  {
    ignores: [
      '.next/**',
      'out/**',
      'node_modules/**',
      'android/**',
      'public/**', // service worker + static JS, not part of the app bundle
      'generated/**', // stale local artifacts (gitignored)
      'next-env.d.ts',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // Firestore documents are schemaless; the codebase types them as
      // `any` at the read boundary by convention
      '@typescript-eslint/no-explicit-any': 'off',
      // Legacy code keeps some unused vars/imports; advisory until cleaned
      '@typescript-eslint/no-unused-vars': 'warn',
      // Romanian copy uses quotes/apostrophes inside JSX text freely
      'react/no-unescaped-entities': 'off',
      // Advisory (default), listed explicitly so the choice is documented
      'react-hooks/exhaustive-deps': 'warn',
      '@next/next/no-img-element': 'warn',
    },
  },
  {
    // CommonJS config files legitimately use require()
    files: ['*.config.{js,ts}', 'tailwind.config.{js,ts}'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];

export default config;
