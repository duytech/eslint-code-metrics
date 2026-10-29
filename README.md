# eslint-plugin-code-metrics

ESLint rules that measure code metrics per function for JavaScript and TypeScript, modeled on the
[Visual Studio code metrics](https://learn.microsoft.com/en-us/visualstudio/code-quality/code-metrics-maintainability-index-range-and-meaning).

| Rule | Reports when |
| --- | --- |
| `code-metrics/maintainability-index` | Maintainability Index < `threshold` |
| `code-metrics/halstead-volume` | Halstead volume > `max` |
| `code-metrics/cyclomatic-complexity` | cyclomatic complexity > `max` |
| `code-metrics/lines-of-code` | lines of code > `max` |

## Install

```bash
npm install --save-dev eslint-plugin-code-metrics
```

Requires ESLint 9+ (flat config). For TypeScript files, use `@typescript-eslint/parser`.

## Usage

```js
// eslint.config.js
import codeMetrics from 'eslint-plugin-code-metrics';

export default [codeMetrics.configs.recommended];
```

- `recommended`: `maintainability-index` as `warn`.
- `strict`: all four rules as `error`, with default options.

Custom options:

```js
import tsParser from '@typescript-eslint/parser';
import codeMetrics from 'eslint-plugin-code-metrics';

export default [
  {
    plugins: { 'code-metrics': codeMetrics },
    rules: {
      'code-metrics/maintainability-index': ['error', { threshold: 10 }],
      'code-metrics/cyclomatic-complexity': ['warn', { max: 15 }],
    },
  },
  { files: ['**/*.ts'], languageOptions: { parser: tsParser } },
];
```

## Options

| Rule | Option | Type | Default | Allowed values |
| --- | --- | --- | --- | --- |
| `maintainability-index` | `threshold` | number | `20` | 0 to 100 |
| `maintainability-index` | `ignoreTypeAnnotations` | boolean | `true` | |
| `halstead-volume` | `max` | number | `1000` | 0 or more |
| `halstead-volume` | `ignoreTypeAnnotations` | boolean | `true` | |
| `cyclomatic-complexity` | `max` | integer | `10` | 0 or more |
| `lines-of-code` | `max` | integer | `60` | 0 or more |

A value outside the allowed range (for example `threshold: 101`) makes ESLint reject the config.

- `threshold`: the Maintainability Index is never above 100, so `threshold: 100` reports every function
  except the ones with MI 100 (for example empty functions).
- `ignoreTypeAnnotations`: skip TypeScript type syntax (`: T`, `<T>`, `as T`, `satisfies T`, local
  `type`/`interface`) when counting Halstead operators and operands, so typed code is not penalized compared
  to the same JavaScript. It changes the Halstead volume, so it affects both rules that use it.
- `max: 0` reports every function, which is useful to see the value of each function.

## Maintainability Index

Same formula as Visual Studio:

```
MI = MAX(0, (171 - 5.2 * ln(Halstead Volume) - 0.23 * Cyclomatic Complexity - 16.2 * ln(Lines of Code)) * 100 / 171)
```

| Range | Band | Meaning |
| --- | --- | --- |
| 20–100 | green | good maintainability |
| 10–19 | yellow | moderately maintainable |
| 0–9 | red | low maintainability |

The rule uses message `veryLow` for the red band and `low` otherwise. An ESLint rule has one severity,
so to split the bands use the threshold: `['warn', { threshold: 20 }]` reports yellow and red,
`['error', { threshold: 10 }]` reports only red.

## How metrics are measured

Each `function`, function expression, method and arrow function is measured separately. A nested function
is not counted in the metrics of its parent.

- **Cyclomatic complexity**: 1 + one per `if`, `?:`, `case` (not `default`), `for`, `for...in`, `for...of`,
  `while`, `do...while`, `catch`, `&&`, `||`, `??`, `&&=`, `||=`, `??=`, default value (`a = 1`) and optional
  chaining (`a?.b`, `a?.()`). This is the same count as the core `complexity` rule.
- **Halstead volume**: `N * log2(n)`, from the function tokens. Identifiers, literals, templates, `this` and
  `super` are operands. Keywords and punctuators are operators. Closing brackets are not counted, so a
  bracket pair counts once.
- **Lines of code**: distinct lines with at least one code token. Blank lines and comment-only lines are
  not counted.

Code outside functions (top-level code, class field initializers, static blocks) is not measured.

Differences from core rules: `cyclomatic-complexity` gives the same value as the core `complexity` rule for
every function, but does not measure class field initializers. `lines-of-code` differs from
`max-lines-per-function` because it always skips blank lines, comments and nested functions.

The values are not identical to Visual Studio: the formula is the same, but Halstead volume and lines of code
are measured on JavaScript tokens, not on C# syntax or IL.

## Development

```bash
npm install
npm test
npm run build
npm run example
```

`npm run example` lints the files in `examples/` with the built plugin and the `strict` config. It reports
problems on purpose.

`npm run test:smoke -- <eslint version>` (after `npm run build`) packs the package, installs it in a new
project with that ESLint version, and lints the examples through an ESM and a CommonJS config. CI runs it with
ESLint 9 and 10 on Node 18.18 to 24.

## License

[MIT](LICENSE) © Duy Pham
