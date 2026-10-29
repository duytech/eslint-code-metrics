import type { AnyNode } from './walk.js';

const BRANCH_TYPES = new Set([
  'IfStatement',
  'ConditionalExpression',
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'WhileStatement',
  'DoWhileStatement',
  'CatchClause',
]);

const LOGICAL_OPERATORS = new Set(['&&', '||', '??']);
const LOGICAL_ASSIGNMENT_OPERATORS = new Set(['&&=', '||=', '??=']);

function isDecisionPoint(node: AnyNode): boolean {
  switch (node.type) {
    case 'SwitchCase':
      // `default:` is not a decision point.
      return node.test != null;
    case 'LogicalExpression':
      return LOGICAL_OPERATORS.has(node.operator as string);
    case 'AssignmentExpression':
      return LOGICAL_ASSIGNMENT_OPERATORS.has(node.operator as string);
    default:
      return BRANCH_TYPES.has(node.type);
  }
}

/** McCabe cyclomatic complexity: 1 + number of decision points. */
export function computeCyclomaticComplexity(nodes: AnyNode[]): number {
  return 1 + nodes.filter(isDecisionPoint).length;
}
