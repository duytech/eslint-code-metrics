# Project journal

Work log for `eslint-plugin-code-metrics`, from an empty folder to version 0.2.0 on npm. All work happened on
2026-10-29.

## 1. Goal and design

The goal: an ESLint plugin that computes the Maintainability Index (MI) for JavaScript and TypeScript, the same
way Visual Studio does for .NET
([Microsoft docs](https://learn.microsoft.com/en-us/visualstudio/code-quality/code-metrics-maintainability-index-range-and-meaning)):

```
MI = MAX(0, (171 - 5.2 * ln(Halstead Volume) - 0.23 * Cyclomatic Complexity - 16.2 * ln(Lines of Code)) * 100 / 171)
```

Bands: 20–100 green, 10–19 yellow, 0–9 red.

Decisions:

- Plugin written in TypeScript. It supports JavaScript and TypeScript source code.
- Metrics are reported per function. A nested function is measured on its own and is not part of its parent.
- Default thresholds follow Microsoft (report below 20).
- The first plan named the package `eslint-plugin-maintainability-index`. One plugin can hold many rules, so
  the scope grew to `eslint-plugin-code-metrics` with four rules: `maintainability-index`, `halstead-volume`,
  `cyclomatic-complexity` and `lines-of-code`. They share one metrics module.
- An ESLint rule has only one severity, so warn/error cannot be split by band. Workaround: two configs
  (`recommended` = MI rule as `warn`, `strict` = all rules as `error`) and the `threshold` option.

## 2. First implementation (0.1.0)

Setup: `git init` on `main`, Node 24, ESLint 10, TypeScript, tsup (ESM + CJS + `.d.ts`), Vitest.

Structure:

- `src/metrics/walk.ts`: walks the AST of one function and stops at nested functions. It records the ranges of
  nested functions and of TypeScript type-only syntax.
- `src/metrics/cyclomatic.ts`, `halstead.ts`, `loc.ts`, `maintainability.ts`: one metric per file.
- `src/utils/function-visitor.ts`: shared rule listener. It uses `getFunctionNameWithKind` and
  `getFunctionHeadLocation` from `@eslint-community/eslint-utils`.
- `src/rules/*.ts`: the four rules. `src/index.ts`: plugin object and configs.

Halstead counting is token based: identifiers and literals are operands, keywords and punctuators are
operators, and closing brackets are skipped so a pair counts once. TypeScript type syntax is skipped by default
(`ignoreTypeAnnotations`).

### Mistakes and fixes

| Problem | Cause | Fix |
| --- | --- | --- |
| A Bash command that wrote many files failed with `unexpected EOF while looking for matching '` | Long multi-file heredoc in one shell command | Wrote each file with the file-writing tool instead of the shell |
| `@typescript-eslint/utils` would force TypeScript on JavaScript users | It has `typescript` as a peer dependency | Removed it. Used the `eslint` and `estree` types and `@eslint-community/eslint-utils` only |
| Type error: `Property 'afterAll' does not exist on type 'typeof RuleTester'` | ESLint 10 `RuleTester` has no `afterAll` hook | Removed that line from the test setup |
| `RuleTester` failed: "Hydrated message ... does not match" | A test gave only part of the message `data` | Gave the full `data` object |
| The message said "(yellow)" for a function with MI 90 when `threshold` was 100 | The band was hard-coded in the message | The message now uses a `{{band}}` placeholder and shows the threshold |
| The "yellow band" test failed | A guessed function size (28 branches) gave MI 34, which is green | Measured MI for several sizes and used 60 branches (MI 17) |
| Only a default export | tsup `cjsInterop` makes `require()` return the plugin only when there is a single default export | Kept only the default export, so CommonJS configs can `require()` the plugin directly |

Result: 30 tests passed, build OK, a lint run on `examples/` reported the expected problems. First commit:
`feat: add code metric rules`.

## 3. License

The first request was a license that keeps copyright, forbids redistribution, and allows free use including
commercial use. These goals conflict: an open source license (OSI definition) must allow redistribution.

Options discussed:

- MIT or Apache-2.0: open source. The author keeps the copyright, and every copy must keep the copyright
  notice.
- A source-available license such as PolyForm Internal Use: forbids redistribution, but is not open source and
  many companies block it.
- For reference, `mhutchie/vscode-git-graph` uses a modified MIT license that forbids publishing derivative
  works. GitHub shows it as "Other".

Decision: standard MIT. Added `LICENSE`, `author` in `package.json`, and a License section in the README.

## 4. GitHub

- Added the remote `https://github.com/duytech/eslint-code-metrics.git`.
- **Mistake:** the first push failed with `403 Permission to duytech/eslint-code-metrics.git denied`.
  Cause: the fine-grained personal access token did not include the new repository.
  Fix: the owner gave the token write access to the repository, then the push succeeded.
- Added `repository`, `homepage` and `bugs` to `package.json` so that npm links back to GitHub.

## 5. Publishing 0.1.0 to npm

- Checked that the name `eslint-plugin-code-metrics` was free and that the npm login worked.
- Ran tests, build and `npm pack --dry-run` (7 files: LICENSE, README, package.json, 4 files in `dist/`).
- **Mistake:** `npm publish` failed with `403 Forbidden - Two-factor authentication ... is required to publish
  packages`. Cause: 2FA was not enabled on the npm account.
  Fix: the owner enabled 2FA and ran `npm publish` in a terminal to enter the OTP.
- Right after the publish, `npm view` showed only a placeholder version `0.0.0-stage`. The registry was still
  processing. A background check confirmed `0.1.0` a few minutes later, with license MIT and the GitHub link.
- Created and pushed the annotated tag `v0.1.0`.

## 6. Test review and the cyclomatic complexity bug

A review of the test coverage found these gaps: no test on ESLint 9 or on Node versions other than 24, few
syntax edge cases, no test of the package as installed from npm, no real-world code, no CI.

### Bug found in 0.1.0

While writing a comparison test against the core ESLint `complexity` rule, the core rule source showed that it
also counts:

- default values (`AssignmentPattern`, for example `a = 1` in parameters and destructuring),
- optional chaining (`a?.b`, `a?.()`),
- logical assignment (`&&=`, `||=`, `??=`).

The plugin did not count the first two. The README also said, wrongly, that the plugin differed from the core
rule because it counted logical assignment. So the published 0.1.0 gave a lower cyclomatic complexity (and a
higher MI) for functions that use default values or optional chaining.

Fix (commit `fix: count default values and optional chaining in cyclomatic complexity`): count
`AssignmentPattern` and `MemberExpression`/`CallExpression` with `optional: true`. Also allowed `max: 0`, like
the core rule. The README was corrected.

### New tests and their problems

`tests/syntax.test.ts` covers JSX, async functions, generators, class fields, getters, setters, private
methods, constructors, object methods, IIFEs, functions in default parameters, CRLF line endings, multi-line
templates, unicode identifiers, TypeScript overloads, abstract methods, interfaces, decorators, parameter
properties, `as`, `satisfies`, non-null assertions, enums and namespaces.

| Problem | Cause | Fix |
| --- | --- | --- |
| JSX test expected 6 lines of code, got 7 | Wrong manual count in the test | Corrected the expectation to 7 |
| Unicode test expected 3 operands, got 4 | Forgot that the literal `1` is an operand | Corrected the expectation |

`tests/real-world.test.ts` runs all four rules on all source files of ESLint itself and compares cyclomatic
complexity with the core rule. It also lints the plugin's own source with the `recommended` config.

| Problem | Cause | Fix |
| --- | --- | --- |
| No messages at all (0 functions) | `Linter` ignores files inside `node_modules` by default, and the real path was passed as file name | Passed a virtual file name (`input.js`) |
| Core reported extra items | The core rule also measures class field initializers and static blocks. The plugin measures functions only | Excluded those messages from the comparison and documented it in the README |
| Values did not match by location | The core rule reports some arrow functions at the property key (another column or line) and names computed methods differently | Compared the sorted list of complexities per file instead of locations |
| "Expected more than 5000 functions" failed | Guessed number; ESLint has 4138 functions | Set the minimum to 4000 |

Result: the plugin and the core rule give the same complexity for all 4138 functions.

`scripts/smoke-test.mjs` (`npm run test:smoke -- <eslint version>`) packs the package, installs it in a new
project with a given ESLint version, and lints the examples through an ESM config and a CommonJS config.

| Problem | Cause | Fix |
| --- | --- | --- |
| Node warning `DEP0190` (arguments passed with `shell: true`) | `execFileSync` with `shell` on Windows | Used `execSync` with one command string (all arguments are fixed values) |
| The script would fail on Node 18 | `import.meta.dirname` exists only on Node 20.11+ | Used `fileURLToPath(new URL('..', import.meta.url))` |

`.github/workflows/ci.yml`:

- `test` job: typecheck, tests and build on Node 22 and 24, on Ubuntu and Windows. The dev tools (Vitest, tsup,
  ESLint 10) need Node 22+.
- `compat` job: smoke test of the built package with ESLint 9 on Node 18.18, 20 and 22, and with ESLint 10 on
  Node 20.19, 22 and 24.

The first CI run passed all 10 jobs. It showed a warning that `actions/*@v4` use the deprecated Node 20
runtime.

## 7. Release 0.2.0

- Updated the actions to `checkout@v7`, `setup-node@v7`, `upload-artifact@v7` and `download-artifact@v8`
  (all run on Node 24).
- **Mistake fixed:** `meta.version` was hard-coded in `src/index.ts` and would get out of sync with
  `package.json`. It is now imported from `package.json`. The bundler inlines only `name` and `version`. A new
  test checks that `meta` matches `package.json`.
- Added `CHANGELOG.md` (also shipped in the npm package). It says that complexity values can go up compared to
  0.1.0.
- `npm version minor` created version 0.2.0 and the tag `v0.2.0`. Commits and tag were pushed. CI passed all
  10 jobs, without the Node 20 warning.
- The owner ran `npm publish` for 0.2.0. Right after the publish the registry still showed `latest: 0.1.0`
  (processing delay, same as for 0.1.0). A background check confirmed a few minutes later that `latest` is
  0.2.0, with 8 files (CHANGELOG.md added).

- Added this journal (`docs/journal.md`). It is not part of the npm package.

## 8. Testing in another project and release 0.2.1

The owner installed 0.2.0 from npm in another project. The suggested test config reported every function
(`threshold: 100`, `max: 0`) and enabled the core `complexity` rule next to `cyclomatic-complexity` to compare
the values. No calculation bug was found, but three small problems were reported:

| Problem | Cause | Fix |
| --- | --- | --- |
| The README listed `ignoreTypeAnnotations` only for `maintainability-index`, but `halstead-volume` accepts it too | Options were documented inside the Maintainability Index section only | Added an Options section with a table of every option of every rule: type, default and allowed values |
| `threshold: 101` made ESLint reject the config, and the README did not say why | The schema allows 0 to 100 (MI is never above 100), but the limit was not documented | Kept the limit and documented it. The README also says that `threshold: 100` does not report functions with MI 100, for example empty functions |
| The message said "has 1 lines of code" | The message text always used the plural | The message uses a `{{lines}}` placeholder: "1 line", "4 lines". Added a test for one line |

Also a mistake in this journal: these changes were first committed without a journal entry. This section was
added afterwards.

Release steps for 0.2.1: renamed the "Unreleased" changelog section to 0.2.1, ran `npm version patch` (tag
`v0.2.1`), ran the 54 tests, built `dist/` (`meta.version` is 0.2.1), and pushed the commits and the tag.
Publishing to npm is done by the owner because it needs the 2FA code.

## Current state

- npm: `latest` is 0.2.0. 0.1.0 is still available and has the complexity bug. 0.2.1 is ready but not
  published yet.
- GitHub: `main` with tags `v0.1.0`, `v0.2.0` and `v0.2.1`.
- 54 tests, plus smoke tests in CI.

## Known limitations

- Values are not identical to Visual Studio. The formula is the same, but Halstead volume and lines of code are
  measured on JavaScript tokens, not on C# syntax or IL.
- Code outside functions (top-level code, class field initializers, static blocks) is not measured.
- Not tested with other parsers such as Vue or Svelte.
- One severity per rule, so the yellow and red bands cannot have different severities in one rule.

## Lessons

- Check the behavior of the reference implementation (here the core `complexity` rule) before writing
  documentation that compares with it. A comparison test on real code found a bug that hand-written examples
  missed.
- Compute expected test values instead of guessing them.
- New tokens (GitHub fine-grained PAT) and new accounts (npm 2FA) often lack permissions. Check them before a
  release.
- Keep version numbers in one place (`package.json`).
- Test the published package in a real project. It finds problems that unit tests do not check, such as
  documentation gaps and message wording.
- Update the journal in the same commit as the change it describes.
