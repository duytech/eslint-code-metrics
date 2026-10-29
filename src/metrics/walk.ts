import type { SourceCode } from 'eslint';
import type { Node } from 'estree';

export type Range = [number, number];

/** Loose node shape so TypeScript-only nodes (TSTypeAnnotation, ...) can be handled by type name. */
export interface AnyNode {
  type: string;
  range?: Range;
  [key: string]: unknown;
}

export const FUNCTION_TYPES = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);

/** Nodes that only carry TypeScript type information. */
const TYPE_ONLY_TYPES = new Set([
  'TSTypeAnnotation',
  'TSTypeParameterDeclaration',
  'TSTypeParameterInstantiation',
  'TSTypeAliasDeclaration',
  'TSInterfaceDeclaration',
]);

/** Expressions whose `typeAnnotation` child is a bare type (`x as T`, `x satisfies T`, `<T>x`). */
const TYPE_ASSERTION_TYPES = new Set(['TSAsExpression', 'TSSatisfiesExpression', 'TSTypeAssertion']);

export interface FunctionBody {
  /** Every node inside the function, excluding nested functions and type-only nodes. */
  nodes: AnyNode[];
  /** Ranges of directly nested functions. */
  nestedFunctionRanges: Range[];
  /** Ranges of TypeScript type-only syntax. */
  typeRanges: Range[];
}

function isNode(value: unknown): value is AnyNode {
  return typeof value === 'object' && value !== null && typeof (value as AnyNode).type === 'string';
}

function childrenOf(node: AnyNode, visitorKeys: SourceCode.VisitorKeys): AnyNode[] {
  const keys = visitorKeys[node.type] ?? Object.keys(node).filter((key) => key !== 'parent');
  const children: AnyNode[] = [];
  for (const key of keys) {
    const value = node[key];
    if (Array.isArray(value)) {
      children.push(...value.filter(isNode));
    } else if (isNode(value)) {
      children.push(value);
    }
  }
  return children;
}

/**
 * Collects the nodes that belong to `fn` itself. Nested functions are measured on their own,
 * so the walk stops at them and only remembers their ranges.
 */
export function collectFunctionBody(fn: Node, sourceCode: SourceCode): FunctionBody {
  const body: FunctionBody = { nodes: [], nestedFunctionRanges: [], typeRanges: [] };
  const visitorKeys = sourceCode.visitorKeys;

  const visit = (node: AnyNode): void => {
    if (FUNCTION_TYPES.has(node.type)) {
      if (node.range) body.nestedFunctionRanges.push(node.range);
      return;
    }
    if (TYPE_ONLY_TYPES.has(node.type)) {
      if (node.range) body.typeRanges.push(node.range);
      return;
    }
    body.nodes.push(node);
    for (const child of childrenOf(node, visitorKeys)) {
      if (TYPE_ASSERTION_TYPES.has(node.type) && child === node.typeAnnotation) {
        if (child.range) body.typeRanges.push(child.range);
        continue;
      }
      visit(child);
    }
  };

  for (const child of childrenOf(fn as unknown as AnyNode, visitorKeys)) {
    visit(child);
  }
  return body;
}

export function isInRanges(range: Range, ranges: Range[]): boolean {
  return ranges.some(([start, end]) => range[0] >= start && range[1] <= end);
}
