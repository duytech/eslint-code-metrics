# Changelog

## 0.2.0

### Changed

- `cyclomatic-complexity` and the cyclomatic complexity used by `maintainability-index` now count default
  values (`a = 1` in parameters and destructuring) and optional chaining (`a?.b`, `a?.()`). The value is now the
  same as the core `complexity` rule. Functions that use these features get a higher complexity and can get a
  lower Maintainability Index than with 0.1.0.
- `cyclomatic-complexity` and `lines-of-code` accept `max: 0`.
- `meta.version` of the plugin is read from `package.json`.

### Added

- Tests for JSX, class members, TypeScript-only syntax and real-world code.
- Smoke test of the packed package with ESLint 9 and 10, through ESM and CommonJS configs.
- GitHub Actions CI.

## 0.1.0

- First release: `maintainability-index`, `halstead-volume`, `cyclomatic-complexity` and `lines-of-code` rules,
  with `recommended` and `strict` configs.
