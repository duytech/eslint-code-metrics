import { describe, expect, it } from 'vitest';
import { computeMaintainabilityIndex, getBand } from '../src/metrics/index.js';
import { bigFunction, measure } from './helpers.js';

describe('Halstead', () => {
  it('counts operators and operands of a simple function', () => {
    // Operators: function ( , { return + ;   Operands: add a b a b
    const [add] = measure('function add(a, b) { return a + b; }');
    expect(add!.halstead).toMatchObject({ n1: 7, n2: 3, N1: 7, N2: 5, vocabulary: 10, length: 12 });
    expect(add!.halstead.volume).toBeCloseTo(12 * Math.log2(10), 5);
  });

  it('ignores TypeScript type annotations by default', () => {
    const [js] = measure('function f(a) { return String(a); }');
    const [ts] = measure('function f<T>(a: number): string { return String(a as unknown as T); }', {
      typescript: true,
    });
    const [tsWithTypes] = measure('function f<T>(a: number): string { return String(a as unknown as T); }', {
      typescript: true,
      ignoreTypeAnnotations: false,
    });
    // `as` keywords remain operators, so compare without the assertion.
    const [tsPlain] = measure('function f(a: number): string { return String(a); }', { typescript: true });

    expect(tsPlain!.halstead.volume).toBeCloseTo(js!.halstead.volume, 5);
    expect(tsWithTypes!.halstead.volume).toBeGreaterThan(ts!.halstead.volume);
  });
});

describe('cyclomatic complexity', () => {
  it('counts every decision point', () => {
    const [f] = measure(`
      function f(a, b, c, d, x) {
        if (a && b) {} else if (c ?? d) {}
        for (;;) {}
        switch (a) { case 1: break; default: }
        try {} catch {}
        x ||= 1;
        return a ? 1 : 2;
      }
    `);
    // if, &&, else if, ??, for, case 1, catch, ||=, ?: => 1 + 9
    expect(f!.cyclomaticComplexity).toBe(10);
  });

  it('measures nested functions on their own', () => {
    const [inner, outer] = measure(`
      function outer(x) {
        const g = () => {
          if (x) { return 1; }
          return 2;
        };
        return g;
      }
    `);
    expect(inner!.cyclomaticComplexity).toBe(2);
    expect(inner!.linesOfCode).toBe(4);
    expect(outer!.cyclomaticComplexity).toBe(1);
    // Line 3 (`const g = () => {`) and line 6 (`};`) hold outer tokens too.
    expect(outer!.linesOfCode).toBe(5);
  });
});

describe('lines of code', () => {
  it('skips blank and comment-only lines', () => {
    const [f] = measure(`
      function f() {
        // comment

        /* block
           comment */
        return 1;
      }
    `);
    expect(f!.linesOfCode).toBe(3);
  });
});

describe('maintainability index', () => {
  it('matches the Visual Studio formula', () => {
    const [add] = measure('function add(a, b) { return a + b; }');
    const expected = ((171 - 5.2 * Math.log(12 * Math.log2(10)) - 0.23) * 100) / 171;
    expect(add!.maintainabilityIndex).toBe(Math.round(expected));
    expect(add!.maintainabilityIndex).toBe(89);
  });

  it('is 100 for an empty function and clamps at 0', () => {
    expect(computeMaintainabilityIndex(0, 1, 1)).toBe(100);
    expect(computeMaintainabilityIndex(1e12, 500, 10000)).toBe(0);
  });

  it('drops low for long branchy functions', () => {
    const [big] = measure(bigFunction(150));
    expect(getBand(big!.maintainabilityIndex)).toBe('red');
  });

  it('maps values to Visual Studio bands', () => {
    expect(getBand(100)).toBe('green');
    expect(getBand(20)).toBe('green');
    expect(getBand(19)).toBe('yellow');
    expect(getBand(10)).toBe('yellow');
    expect(getBand(9)).toBe('red');
    expect(getBand(0)).toBe('red');
  });
});
