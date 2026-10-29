import { RuleTester } from 'eslint';
import cyclomaticComplexity from '../../src/rules/cyclomatic-complexity.js';
import halsteadVolume from '../../src/rules/halstead-volume.js';
import linesOfCode from '../../src/rules/lines-of-code.js';
import { tsParser } from '../helpers.js';

const ruleTester = new RuleTester();

ruleTester.run('halstead-volume', halsteadVolume, {
  valid: [
    'function add(a, b) { return a + b; }',
    { code: 'function add(a, b) { return a + b; }', options: [{ max: 40 }] },
    {
      // Types are ignored by default: same volume as the JavaScript version.
      code: 'function add(a: number, b: number): number { return a + b; }',
      options: [{ max: 40 }],
      languageOptions: { parser: tsParser },
    },
  ],
  invalid: [
    {
      code: 'function add(a, b) { return a + b; }',
      options: [{ max: 39 }],
      errors: [{ messageId: 'tooHigh', data: { name: "Function 'add'", volume: '40', max: '39' } }],
    },
    {
      code: 'function add(a: number, b: number): number { return a + b; }',
      options: [{ max: 40, ignoreTypeAnnotations: false }],
      languageOptions: { parser: tsParser },
      errors: [{ messageId: 'tooHigh' }],
    },
  ],
});

ruleTester.run('cyclomatic-complexity', cyclomaticComplexity, {
  valid: [
    'function f(a) { if (a) {} }',
    { code: 'function f(a, b) { if (a && b) {} }', options: [{ max: 3 }] },
  ],
  invalid: [
    {
      code: 'const f = (a, b) => { if (a && b) {} return a ?? b; };',
      options: [{ max: 3 }],
      errors: [{ messageId: 'tooHigh', data: { name: "Arrow function 'f'", cc: '4', max: '3' } }],
    },
  ],
});

ruleTester.run('lines-of-code', linesOfCode, {
  valid: [
    { code: 'function f() {\n  // comment\n\n  return 1;\n}', options: [{ max: 3 }] },
  ],
  invalid: [
    {
      code: 'function f() {\n  const a = 1;\n  return a;\n}',
      options: [{ max: 3 }],
      errors: [{ messageId: 'tooMany', data: { name: "Function 'f'", loc: '4', lines: 'lines', max: '3' } }],
    },
    {
      code: 'const f = () => 1;',
      options: [{ max: 0 }],
      errors: [{ message: "Arrow function 'f' has 1 line of code. Maximum allowed is 0." }],
    },
  ],
});
