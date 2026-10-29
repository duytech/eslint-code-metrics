import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';
import plugin from '../src/index.js';
import { tsParser } from './helpers.js';

const root = join(import.meta.dirname, '..');

function listFiles(dir: string, extension: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith(extension))
    .map((file) => join(dir, file));
}

const COMPLEXITY_PATTERN = / has a (?:cyclomatic )?complexity of (\d+)\./;

// The core rule also measures class field initializers and static blocks; this plugin measures functions only.
const NON_FUNCTION_PATTERN = /^Class (field initializer|static block)/;

/**
 * Sorted complexities of all functions in a file. Report locations are not compared: the core rule reports
 * some arrow functions at the property key, which can be on another line.
 */
function complexities(messages: Linter.LintMessage[], ruleId: string): number[] {
  return messages
    .filter((message) => message.ruleId === ruleId && !NON_FUNCTION_PATTERN.test(message.message))
    .map((message) => Number(COMPLEXITY_PATTERN.exec(message.message)![1]))
    .sort((a, b) => a - b);
}

describe('real-world code', () => {
  it('matches the core complexity rule on every function of ESLint itself', () => {
    const files = listFiles(join(root, 'node_modules/eslint/lib'), '.js');
    expect(files.length).toBeGreaterThan(300);

    const linter = new Linter();
    const config: Linter.Config[] = [
      {
        files: ['**/*.js'],
        languageOptions: { sourceType: 'commonjs' },
        plugins: { 'code-metrics': plugin },
        rules: {
          complexity: ['error', 0],
          'code-metrics/cyclomatic-complexity': ['error', { max: 0 }],
          'code-metrics/maintainability-index': ['error', { threshold: 100 }],
          'code-metrics/halstead-volume': ['error', { max: 0 }],
          'code-metrics/lines-of-code': ['error', { max: 0 }],
        },
      },
    ];

    let functions = 0;
    for (const file of files) {
      // A virtual file name: the real path is inside node_modules, which ESLint ignores by default.
      const messages = linter.verify(readFileSync(file, 'utf8'), config, 'input.js');
      expect(messages.filter((message) => message.fatal)).toEqual([]);

      const core = complexities(messages, 'complexity');
      const ours = complexities(messages, 'code-metrics/cyclomatic-complexity');
      expect({ file, complexity: ours }).toEqual({ file, complexity: core });
      functions += core.length;
    }
    expect(functions).toBeGreaterThan(4000);
  }, 120_000);

  it('reports nothing on its own TypeScript sources with the recommended config', () => {
    const linter = new Linter();
    for (const file of listFiles(join(root, 'src'), '.ts')) {
      const messages = linter.verify(
        readFileSync(file, 'utf8'),
        [{ files: ['**/*.ts'], languageOptions: { parser: tsParser } }, plugin.configs.recommended],
        file,
      );
      expect({ file, messages }).toEqual({ file, messages: [] });
    }
  });
});
