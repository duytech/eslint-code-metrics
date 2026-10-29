import type { SourceCode } from 'eslint';
import type { Node } from 'estree';
import { computeCyclomaticComplexity } from './cyclomatic.js';
import { computeHalstead, type HalsteadMetrics } from './halstead.js';
import { computeLinesOfCode } from './loc.js';
import { computeMaintainabilityIndex } from './maintainability.js';
import { collectFunctionBody, isInRanges, type Range } from './walk.js';

export { computeCyclomaticComplexity } from './cyclomatic.js';
export { computeHalstead, type HalsteadMetrics } from './halstead.js';
export { computeLinesOfCode } from './loc.js';
export { computeMaintainabilityIndex, getBand, type MaintainabilityBand } from './maintainability.js';

export interface MetricOptions {
  /** Skip TypeScript type syntax when counting Halstead operators and operands. Default `true`. */
  ignoreTypeAnnotations?: boolean;
}

export interface FunctionMetrics {
  cyclomaticComplexity: number;
  halstead: HalsteadMetrics;
  linesOfCode: number;
  maintainabilityIndex: number;
}

export function computeFunctionMetrics(fn: Node, sourceCode: SourceCode, options: MetricOptions = {}): FunctionMetrics {
  const { ignoreTypeAnnotations = true } = options;
  const body = collectFunctionBody(fn, sourceCode);

  const ownTokens = sourceCode
    .getTokens(fn)
    .filter((token) => !isInRanges(token.range as Range, body.nestedFunctionRanges));
  const halsteadTokens = ignoreTypeAnnotations
    ? ownTokens.filter((token) => !isInRanges(token.range as Range, body.typeRanges))
    : ownTokens;

  const cyclomaticComplexity = computeCyclomaticComplexity(body.nodes);
  const halstead = computeHalstead(halsteadTokens);
  const linesOfCode = computeLinesOfCode(ownTokens);

  return {
    cyclomaticComplexity,
    halstead,
    linesOfCode,
    maintainabilityIndex: computeMaintainabilityIndex(halstead.volume, cyclomaticComplexity, linesOfCode),
  };
}
