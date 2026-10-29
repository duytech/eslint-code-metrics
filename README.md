# eslint-plugin-code-metrics

ESLint rules that measure code metrics per function for JavaScript and TypeScript, modeled on the
[Visual Studio code metrics](https://learn.microsoft.com/en-us/visualstudio/code-quality/code-metrics-maintainability-index-range-and-meaning).

| Rule | Default | Reports when |
| --- | --- | --- |
| `code-metrics/maintainability-index` | `threshold: 20` | Maintainability Index < threshold |
| `code-metrics/halstead-volume` | `max: 1000` | Halstead volume > max |
| `code-metrics/cyclomatic-complexity` | `max: 10` | cyclomatic complexity > max |
| `code-metrics/lines-of-code` | `max: 60` | lines of code > max |

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

Options:

- `threshold` (number, default `20`).
- `ignoreTypeAnnotations` (boolean, default `true`): skip TypeScript type syntax (`: T`, `<T>`, `as T`,
  `satisfies T`, local `type`/`interface`) when counting Halstead operators and operands, so typed code is
  not penalized compared to the same JavaScript.

## How metrics are measured

Each `function`, function expression, method and arrow function is measured separately. A nested function
is not counted in the metrics of its parent.

- **Cyclomatic complexity**: 1 + one per `if`, `?:`, `case` (not `default`), `for`, `for...in`, `for...of`,
  `while`, `do...while`, `catch`, `&&`, `||`, `??`, `&&=`, `||=`, `??=`.
- **Halstead volume**: `N * log2(n)`, from the function tokens. Identifiers, literals, templates, `this` and
  `super` are operands. Keywords and punctuators are operators. Closing brackets are not counted, so a
  bracket pair counts once.
- **Lines of code**: distinct lines with at least one code token. Blank lines and comment-only lines are
  not counted.

Differences from core rules: `cyclomatic-complexity` is close to the core `complexity` rule but also counts
logical assignment operators. `lines-of-code` differs from `max-lines-per-function` because it always
skips blank lines, comments and nested functions.

## Development

```bash
npm install
npm test
npm run build
npm run example
```

`npm run example` lints the files in `examples/` with the built plugin and the `strict` config. It reports
problems on purpose.

## License

[MIT](LICENSE) © Duy Pham
