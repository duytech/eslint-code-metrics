import { describe, expect, it } from 'vitest';
import { lint, measure } from './helpers.js';

/** Names reported by `maintainability-index` with a threshold that reports every non-empty function. */
function reportedNames(code: string, options: Parameters<typeof lint>[2] = {}): string[] {
  return lint(code, { 'code-metrics/maintainability-index': ['error', { threshold: 100 }] }, options).map(
    (message) => message.message.split(' has ')[0]!,
  );
}

describe('cyclomatic complexity matches the core complexity rule', () => {
  it.each([
    ['default parameter values', 'function f(a = 1, { b = 2 } = {}) { return a + b; }', 4],
    ['optional chaining', 'function f(a) { return a?.b.c?.(); }', 3],
    ['logical assignment', 'function f(a) { a.x ||= 1; a.y &&= 2; a.z ??= 3; }', 4],
    ['do...while', 'function f(i) { do { i--; } while (i > 0); }', 2],
    ['labeled loops', 'function f(rows) { outer: for (const r of rows) { for (const c of r) { if (c) continue outer; } } }', 4],
    ['switch without default', 'function f(x) { switch (x) { case 1: case 2: return 1; } }', 3],
    ['template literal', 'function f(a, b) { return `${a ? b : "none"}`; }', 2],
  ])('%s', (_label, code, expected) => {
    const [fn] = measure(code);
    expect(fn!.cyclomaticComplexity).toBe(expected);

    const [core] = lint(code, { complexity: ['error', 0] });
    expect(core!.message).toContain(`complexity of ${expected}.`);
  });
});

describe('JavaScript syntax', () => {
  it('measures async functions and generators', () => {
    const [asyncFn, generator] = measure(`
      async function load(url) { const res = await fetch(url); return res.ok ? res.json() : null; }
      function* range(n) { for (let i = 0; i < n; i++) yield i; yield* [n]; }
    `);
    expect(asyncFn!.cyclomaticComplexity).toBe(2);
    expect(generator!.cyclomaticComplexity).toBe(2);
    expect(generator!.halstead.volume).toBeGreaterThan(0);
  });

  it('names class members and object methods', () => {
    const names = reportedNames(`
      class Counter {
        #count = 0;
        handler = (e) => { if (e) this.#count++; };
        get count() { return this.#count; }
        set count(v) { this.#count = v ?? 0; }
        static create() { return new Counter(); }
        #increment() { this.#count++; }
        constructor() { this.#count = 1; }
      }
      const api = { get(id) { return id; }, put: function (id) { return id; }, del: (id) => id };
    `);
    expect(names).toEqual([
      "Method 'handler'",
      "Getter 'count'",
      "Setter 'count'",
      "Static method 'create'",
      'Private method #increment',
      'Constructor',
      "Method 'get'",
      "Method 'put'",
      "Method 'del'",
    ]);
  });

  it('counts private names as operands', () => {
    const [fn] = measure('class A { #x = 1; m() { return this.#x; } }');
    // Operators: ( { return . ;   Operands: this #x
    expect(fn!.halstead).toMatchObject({ n1: 5, N1: 5, n2: 2, N2: 2 });
  });

  it('measures JSX and keeps callbacks separate', () => {
    const [callback, component] = measure(
      `
      function List({ items }) {
        return (
          <ul className="list">
            {items.map((item) => <li key={item.id}>{item.done ? 'done' : item.name}</li>)}
          </ul>
        );
      }
    `,
      { jsx: true },
    );
    expect(callback!.cyclomaticComplexity).toBe(2);
    expect(callback!.linesOfCode).toBe(1);
    expect(component!.cyclomaticComplexity).toBe(1);
    // The callback line also holds tokens of the component (`{items.map(` and `)}`).
    expect(component!.linesOfCode).toBe(7);
  });

  it('measures functions in default parameters and IIFEs separately', () => {
    const results = measure('(function main(cb = () => { if (a) b(); }) { return cb(); })();');
    expect(results.map((r) => [r.name, r.cyclomaticComplexity])).toEqual([
      ['<anonymous>', 2],
      ['main', 2],
    ]);
  });

  it('ignores code outside functions', () => {
    expect(measure('const a = 1; if (a) { console.log(a); } class A { static { init(); } }')).toEqual([]);
  });

  it('counts multi-line template literals and handles CRLF line endings', () => {
    const [fn] = measure('function f() {\r\n  // note\r\n\r\n  return `a\r\nb\r\nc`;\r\n}\r\n');
    expect(fn!.linesOfCode).toBe(5);
  });

  it('supports unicode identifiers', () => {
    const [fn] = measure('function tổng(số) { return số + 1; }');
    // Operands: tổng số số 1
    expect(fn!.halstead).toMatchObject({ n2: 3, N2: 4 });
  });
});

describe('TypeScript syntax', () => {
  const ts = { typescript: true };

  it('skips overload signatures, abstract methods and interfaces', () => {
    const names = reportedNames(
      `
      function parse(input: string): string;
      function parse(input: number): number;
      function parse(input: unknown) { return input; }
      abstract class Shape { abstract area(): number; describe() { return this.area(); } }
      interface Repo { find(id: string): Promise<unknown>; }
      declare function external(): void;
    `,
      ts,
    );
    expect(names).toEqual(["Function 'parse'", "Method 'describe'"]);
  });

  it('measures decorated methods and parameter properties', () => {
    const names = reportedNames(
      `
      class Service {
        constructor(private readonly repo: Repo) {}
        @log() find(@inject() id: string) { return this.repo.find(id); }
      }
    `,
      ts,
    );
    expect(names).toEqual(['Constructor', "Method 'find'"]);
  });

  it('ignores generics, assertions, satisfies and non-null when ignoring types', () => {
    const code = `
      function f<T extends object>(value: unknown) {
        type Box = { v: T };
        interface Named { name: string }
        const items = new Map<string, Box>();
        return (value as Named).name satisfies string ? items.get<string>!('x') : <Box>value;
      }
    `;
    const [withoutTypes] = measure(code, ts);
    const [withTypes] = measure(code, { ...ts, ignoreTypeAnnotations: false });
    expect(withTypes!.halstead.volume).toBeGreaterThan(withoutTypes!.halstead.volume);
    // Type tokens never reach the operand list.
    expect(withoutTypes!.halstead.n2).toBeLessThan(withTypes!.halstead.n2);
    // Lines that only declare types still count as code lines.
    expect(withoutTypes!.linesOfCode).toBe(withTypes!.linesOfCode);
  });

  it('handles enums and namespaces inside modules', () => {
    const results = measure(
      `
      enum Color { Red, Green }
      namespace Util { export function pick(c: Color) { return c === Color.Red ? 'r' : 'g'; } }
    `,
      ts,
    );
    expect(results.map((r) => [r.name, r.cyclomaticComplexity])).toEqual([['pick', 2]]);
  });
});
