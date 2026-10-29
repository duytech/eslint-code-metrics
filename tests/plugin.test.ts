import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import plugin from '../src/index.js';

const packageJson = JSON.parse(readFileSync(join(import.meta.dirname, '../package.json'), 'utf8'));

describe('plugin', () => {
  it('takes its name and version from package.json', () => {
    expect(plugin.meta).toEqual({ name: packageJson.name, version: packageJson.version });
  });

  it('only enables rules that exist in the configs', () => {
    for (const config of Object.values(plugin.configs)) {
      for (const rule of Object.keys(config.rules ?? {})) {
        expect(plugin.rules).toHaveProperty(rule.replace('code-metrics/', ''));
      }
    }
  });
});
