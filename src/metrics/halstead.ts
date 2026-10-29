import type { AST } from 'eslint';

export interface HalsteadMetrics {
  /** Distinct operators. */
  n1: number;
  /** Distinct operands. */
  n2: number;
  /** Total operators. */
  N1: number;
  /** Total operands. */
  N2: number;
  vocabulary: number;
  length: number;
  volume: number;
  difficulty: number;
  effort: number;
}

const OPERAND_TOKEN_TYPES = new Set([
  'Identifier',
  'PrivateIdentifier',
  'JSXIdentifier',
  'Numeric',
  'String',
  'Template',
  'RegularExpression',
  'Boolean',
  'Null',
  'JSXText',
]);

const OPERAND_KEYWORDS = new Set(['this', 'super']);

// Brackets are counted once per pair, on the opening token.
const CLOSING_PUNCTUATORS = new Set([')', ']', '}']);

type TokenKind = 'operator' | 'operand' | null;

function classify(token: AST.Token): TokenKind {
  const type = token.type as string;
  if (OPERAND_TOKEN_TYPES.has(type)) return 'operand';
  if (type === 'Keyword') return OPERAND_KEYWORDS.has(token.value) ? 'operand' : 'operator';
  if (type === 'Punctuator') return CLOSING_PUNCTUATORS.has(token.value) ? null : 'operator';
  return null;
}

/** Halstead metrics computed from the tokens of a function. */
export function computeHalstead(tokens: AST.Token[]): HalsteadMetrics {
  const operators = new Set<string>();
  const operands = new Set<string>();
  let N1 = 0;
  let N2 = 0;

  for (const token of tokens) {
    const kind = classify(token);
    if (kind === 'operator') {
      operators.add(token.value);
      N1++;
    } else if (kind === 'operand') {
      operands.add(token.value);
      N2++;
    }
  }

  const n1 = operators.size;
  const n2 = operands.size;
  const vocabulary = n1 + n2;
  const length = N1 + N2;
  const volume = vocabulary > 1 ? length * Math.log2(vocabulary) : 0;
  const difficulty = n2 > 0 ? (n1 / 2) * (N2 / n2) : 0;

  return { n1, n2, N1, N2, vocabulary, length, volume, difficulty, effort: difficulty * volume };
}
