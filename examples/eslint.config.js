import tsParser from '@typescript-eslint/parser';
import codeMetrics from '../dist/index.js';

export default [
  codeMetrics.configs.strict,
  {
    files: ['**/*.ts'],
    languageOptions: { parser: tsParser },
  },
];
