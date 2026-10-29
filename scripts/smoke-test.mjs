// Installs the packed package into a fresh project and lints the examples with it, through both an
// ESM and a CommonJS config. Run `npm run build` first.
//
// Usage: node scripts/smoke-test.mjs [eslint version range, default "9"]

import { execSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Not `import.meta.dirname`: the script must also run on Node 18.
const root = fileURLToPath(new URL('..', import.meta.url));
const eslintVersion = process.argv[2] ?? '9';
function run(command, args, cwd) {
  // Run through a shell: npm and npx are .cmd files on Windows. All arguments are fixed values without spaces.
  return execSync([command, ...args].join(' '), { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

const project = mkdtempSync(join(tmpdir(), 'code-metrics-smoke-'));
try {
  const tarball = run('npm', ['pack', '--silent', '--pack-destination', project], root).trim().split('\n').pop();
  console.log(`Packed ${tarball}`);

  writeFileSync(join(project, 'package.json'), JSON.stringify({ name: 'smoke', private: true, type: 'module' }));
  run('npm', ['install', '--silent', `./${tarball}`, `eslint@${eslintVersion}`, '@typescript-eslint/parser'], project);
  console.log(`Installed with eslint ${run('npx', ['eslint', '--version'], project).trim()} on Node ${process.version}`);

  copyFileSync(join(root, 'examples/sample.js'), join(project, 'sample.js'));
  copyFileSync(join(root, 'examples/sample.ts'), join(project, 'sample.ts'));

  writeFileSync(
    join(project, 'eslint.config.js'),
    `import tsParser from '@typescript-eslint/parser';
import codeMetrics from 'eslint-plugin-code-metrics';

export default [
  codeMetrics.configs.strict,
  { files: ['**/*.ts'], languageOptions: { parser: tsParser } },
];
`,
  );
  writeFileSync(
    join(project, 'eslint.config.cjs'),
    `const tsParser = require('@typescript-eslint/parser');
const codeMetrics = require('eslint-plugin-code-metrics');

module.exports = [
  codeMetrics.configs.strict,
  { files: ['**/*.ts'], languageOptions: { parser: tsParser } },
];
`,
  );

  const expected = ['code-metrics/cyclomatic-complexity:5', 'code-metrics/halstead-volume:5'];

  for (const config of ['eslint.config.js', 'eslint.config.cjs']) {
    let output;
    try {
      output = run('npx', ['eslint', '-c', config, '--format', 'json', 'sample.js', 'sample.ts'], project);
    } catch (error) {
      // ESLint exits with 1 when it reports problems, which is expected here.
      if (error.status !== 1) throw error;
      output = error.stdout;
    }
    const results = JSON.parse(output);
    const actual = results
      .flatMap((result) => result.messages)
      .map((message) => `${message.ruleId}:${message.line}`)
      .sort();

    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`${config}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
    console.log(`${config}: OK (${actual.join(', ')})`);
  }
} finally {
  rmSync(project, { recursive: true, force: true });
}
