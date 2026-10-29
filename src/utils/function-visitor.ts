import { getFunctionHeadLocation, getFunctionNameWithKind } from '@eslint-community/eslint-utils';
import type { Rule } from 'eslint';
import type { ArrowFunctionExpression, FunctionDeclaration, FunctionExpression, SourceLocation } from 'estree';
import { computeFunctionMetrics, type FunctionMetrics, type MetricOptions } from '../metrics/index.js';

export type FunctionNode = FunctionDeclaration | FunctionExpression | ArrowFunctionExpression;

export interface MeasuredFunction {
  node: FunctionNode;
  metrics: FunctionMetrics;
  /** e.g. "Function 'foo'", "Method 'bar'", "Arrow function". */
  name: string;
  /** Location of the function head, used as the report location. */
  loc: SourceLocation;
}

function upperCaseFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Builds a rule listener that measures every function when its traversal ends. */
export function createFunctionVisitor(
  context: Rule.RuleContext,
  metricOptions: MetricOptions,
  onFunction: (fn: MeasuredFunction) => void,
): Rule.RuleListener {
  const { sourceCode } = context;

  const handle = (node: FunctionNode): void => {
    const fn = node as Parameters<typeof getFunctionNameWithKind>[0];
    onFunction({
      node,
      metrics: computeFunctionMetrics(node, sourceCode, metricOptions),
      name: upperCaseFirst(getFunctionNameWithKind(fn, sourceCode)),
      loc: getFunctionHeadLocation(fn, sourceCode) ?? node.loc!,
    });
  };

  return {
    'FunctionDeclaration:exit': handle,
    'FunctionExpression:exit': handle,
    'ArrowFunctionExpression:exit': handle,
  } as Rule.RuleListener;
}
