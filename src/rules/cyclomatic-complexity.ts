import type { Rule } from 'eslint';
import { createFunctionVisitor } from '../utils/function-visitor.js';

export interface CyclomaticComplexityOptions {
  /** Maximum allowed cyclomatic complexity per function. Default `10`. */
  max?: number;
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce a maximum cyclomatic complexity per function',
      recommended: false,
    },
    schema: [
      {
        type: 'object',
        properties: {
          max: { type: 'integer', minimum: 0 },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      tooHigh: '{{name}} has a cyclomatic complexity of {{cc}}. Maximum allowed is {{max}}.',
    },
  },
  create(context) {
    const { max = 10 }: CyclomaticComplexityOptions = context.options[0] ?? {};

    return createFunctionVisitor(context, {}, ({ metrics, name, loc }) => {
      const cc = metrics.cyclomaticComplexity;
      if (cc <= max) return;

      context.report({ loc, messageId: 'tooHigh', data: { name, cc: String(cc), max: String(max) } });
    });
  },
};

export default rule;
