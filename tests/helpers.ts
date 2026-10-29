import tsParser from '@typescript-eslint/parser';
import { Linter, type Rule } from 'eslint';
import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../src/index.js';
import { computeFunctionMetrics, type FunctionMetrics, type MetricOptions } from '../src/metrics/index.js';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

export { tsParser };

export interface ParseOptions {
  typescript?: boolean;
  jsx?: boolean;
}

export interface Measured extends FunctionMetrics {
  name: string;
}

function languageOptions({ typescript, jsx }: ParseOptions): Linter.LanguageOptions {
  return {
    ...(typescript ? { parser: tsParser } : {}),
    parserOptions: { ecmaFeatures: { jsx: Boolean(jsx) } },
  };
}

function verify(code: string, config: Linter.Config, options: ParseOptions): Linter.LintMessage[] {
  const messages = new Linter().verify(
    code,
    [{ files: ['**/*.ts'], languageOptions: languageOptions(options), ...config }],
    'input.ts',
  );
  const fatal = messages.find((message) => message.fatal);
  if (fatal) throw new Error(`${fatal.message} (line ${fatal.line})`);
  return messages;
}

/** Runs the metric computation on every function in `code`, in exit order (inner functions first). */
export function measure(code: string, options: MetricOptions & ParseOptions = {}): Measured[] {
  const results: Measured[] = [];
  const capture: Rule.RuleModule = {
    create(context) {
      const handle = (node: Rule.Node): void => {
        const id = (node as { id?: { name: string } | null }).id;
        results.push({
          name: id?.name ?? '<anonymous>',
          ...computeFunctionMetrics(node as never, context.sourceCode, options),
        });
      };
      return {
        'FunctionDeclaration:exit': handle,
        'FunctionExpression:exit': handle,
        'ArrowFunctionExpression:exit': handle,
      };
    },
  };

  verify(code, { plugins: { test: { rules: { capture } } }, rules: { 'test/capture': 'error' } }, options);
  return results;
}

/** Lints `code` with the plugin registered as `code-metrics` (core rules are available too). */
export function lint(code: string, rules: Linter.RulesRecord, options: ParseOptions = {}): Linter.LintMessage[] {
  return verify(code, { plugins: { 'code-metrics': plugin }, rules }, options);
}

/** Generates a long function with many branches, far below the Maintainability Index threshold. */
export function bigFunction(branches: number): string {
  const lines = ['function big(x) {', '  let result = 0;'];
  for (let i = 0; i < branches; i++) {
    lines.push(`  if (x === ${i} && result < ${i * 3}) { result += x * ${i + 7} - helper${i}(x); }`);
  }
  lines.push('  return result;', '}');
  return lines.join('\n');
}
