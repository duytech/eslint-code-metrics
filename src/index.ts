import type { ESLint, Linter, Rule } from 'eslint';
import { name, version } from '../package.json';
import cyclomaticComplexity from './rules/cyclomatic-complexity.js';
import halsteadVolume from './rules/halstead-volume.js';
import linesOfCode from './rules/lines-of-code.js';
import maintainabilityIndex from './rules/maintainability-index.js';

const rules: Record<string, Rule.RuleModule> = {
  'maintainability-index': maintainabilityIndex,
  'halstead-volume': halsteadVolume,
  'cyclomatic-complexity': cyclomaticComplexity,
  'lines-of-code': linesOfCode,
};

const plugin = {
  meta: { name, version },
  rules,
  configs: {} as Record<'recommended' | 'strict', Linter.Config>,
} satisfies ESLint.Plugin;

plugin.configs.recommended = {
  name: 'code-metrics/recommended',
  plugins: { 'code-metrics': plugin },
  rules: {
    'code-metrics/maintainability-index': 'warn',
  },
};

plugin.configs.strict = {
  name: 'code-metrics/strict',
  plugins: { 'code-metrics': plugin },
  rules: {
    'code-metrics/maintainability-index': 'error',
    'code-metrics/halstead-volume': 'error',
    'code-metrics/cyclomatic-complexity': 'error',
    'code-metrics/lines-of-code': 'error',
  },
};

export default plugin;
