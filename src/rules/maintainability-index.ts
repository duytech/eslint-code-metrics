import type { Rule } from 'eslint';
import { getBand } from '../metrics/index.js';
import { createFunctionVisitor } from '../utils/function-visitor.js';

export interface MaintainabilityIndexOptions {
  /** Report functions whose Maintainability Index is below this value. Default `20`. */
  threshold?: number;
  ignoreTypeAnnotations?: boolean;
}

const DETAILS = 'Cyclomatic complexity: {{cc}}, Halstead volume: {{hv}}, lines of code: {{loc}}.';

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce a minimum Maintainability Index (Visual Studio formula) per function',
      recommended: true,
    },
    schema: [
      {
        type: 'object',
        properties: {
          threshold: { type: 'number', minimum: 0, maximum: 100 },
          ignoreTypeAnnotations: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      low: `{{name}} has a maintainability index of {{mi}} ({{band}}), below the threshold of {{threshold}}. ${DETAILS}`,
      veryLow: `{{name}} has a very low maintainability index of {{mi}} (red). ${DETAILS}`,
    },
  },
  create(context) {
    const { threshold = 20, ignoreTypeAnnotations }: MaintainabilityIndexOptions = context.options[0] ?? {};

    return createFunctionVisitor(context, { ignoreTypeAnnotations }, ({ metrics, name, loc }) => {
      const mi = metrics.maintainabilityIndex;
      if (mi >= threshold) return;

      const band = getBand(mi);
      context.report({
        loc,
        messageId: band === 'red' ? 'veryLow' : 'low',
        data: {
          name,
          mi: String(mi),
          band,
          threshold: String(threshold),
          cc: String(metrics.cyclomaticComplexity),
          hv: String(Math.round(metrics.halstead.volume)),
          loc: String(metrics.linesOfCode),
        },
      });
    });
  },
};

export default rule;
