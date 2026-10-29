import type { AST } from 'eslint';

/** Number of distinct lines that hold at least one code token (blank and comment-only lines are ignored). */
export function computeLinesOfCode(tokens: AST.Token[]): number {
  const lines = new Set<number>();
  for (const token of tokens) {
    for (let line = token.loc.start.line; line <= token.loc.end.line; line++) {
      lines.add(line);
    }
  }
  return lines.size;
}
