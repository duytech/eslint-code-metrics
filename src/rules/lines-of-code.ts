import type { Rule } from 'eslint';
import { createFunctionVisitor } from '../utils/function-visitor.js';

export interface LinesOfCodeOptions {
  /** Maximum allowed lines of code per function. Default `60`. */
  max?: number;
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Enforce a maximum number of lines of code per function (blank lines, comments and nested functions excluded)',
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
      tooMany: '{{name}} has {{loc}} {{lines}} of code. Maximum allowed is {{max}}.',
    },
  },
  create(context) {
    const { max = 60 }: LinesOfCodeOptions = context.options[0] ?? {};

    return createFunctionVisitor(context, {}, ({ metrics, name, loc }) => {
      const lines = metrics.linesOfCode;
      if (lines <= max) return;

      context.report({
        loc,
        messageId: 'tooMany',
        data: { name, loc: String(lines), lines: lines === 1 ? 'line' : 'lines', max: String(max) },
      });
    });
  },
};

export default rule;
