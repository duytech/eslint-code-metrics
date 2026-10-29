import { RuleTester } from 'eslint';
import rule from '../../src/rules/maintainability-index.js';
import { bigFunction, tsParser } from '../helpers.js';

const ruleTester = new RuleTester();

ruleTester.run('maintainability-index', rule, {
  valid: [
    'function add(a, b) { return a + b; }',
    'const f = () => 1;',
    'class A { get x() { return this.y; } }',
    {
      code: 'function add(a: number, b: number): number { return a + b; }',
      languageOptions: { parser: tsParser },
    },
    {
      code: bigFunction(150),
      options: [{ threshold: 0 }],
    },
  ],
  invalid: [
    {
      code: 'function add(a, b) { return a + b; }',
      options: [{ threshold: 90 }],
      errors: [
        {
          messageId: 'low',
          data: { name: "Function 'add'", mi: '89', band: 'green', threshold: '90', cc: '1', hv: '40', loc: '1' },
          line: 1,
          column: 1,
        },
      ],
    },
    {
      code: 'class A { run(x) { return x * 2; } }',
      options: [{ threshold: 100 }],
      errors: [
        {
          messageId: 'low',
          data: { name: "Method 'run'", mi: '90', band: 'green', threshold: '100', cc: '1', hv: '22', loc: '1' },
        },
      ],
    },
    {
      // A function in the yellow band (10-19) with the default threshold.
      code: bigFunction(60),
      errors: [
        {
          messageId: 'low',
          data: { name: "Function 'big'", mi: '17', band: 'yellow', threshold: '20', cc: '121', hv: '9097', loc: '64' },
        },
      ],
    },
    {
      code: bigFunction(150),
      errors: [{ messageId: 'veryLow' }],
    },
    {
      // Only the long inner function is reported; the outer one stays small.
      code: `function outer() {\n  return ${bigFunction(150)};\n}`,
      errors: [{ messageId: 'veryLow', line: 2 }],
    },
    {
      code: bigFunction(150).replace('function big(x)', 'function big(x: number): number'),
      languageOptions: { parser: tsParser },
      errors: [{ messageId: 'veryLow' }],
    },
  ],
});
