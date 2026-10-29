import type { Rule } from 'eslint';
import { createFunctionVisitor } from '../utils/function-visitor.js';

export interface HalsteadVolumeOptions {
  /** Maximum allowed Halstead volume per function. Default `1000`. */
  max?: number;
  ignoreTypeAnnotations?: boolean;
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce a maximum Halstead volume per function',
      recommended: false,
    },
    schema: [
      {
        type: 'object',
        properties: {
          max: { type: 'number', minimum: 0 },
          ignoreTypeAnnotations: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      tooHigh: '{{name}} has a Halstead volume of {{volume}}. Maximum allowed is {{max}}.',
    },
  },
  create(context) {
    const { max = 1000, ignoreTypeAnnotations }: HalsteadVolumeOptions = context.options[0] ?? {};

    return createFunctionVisitor(context, { ignoreTypeAnnotations }, ({ metrics, name, loc }) => {
      const volume = Math.round(metrics.halstead.volume);
      if (volume <= max) return;

      context.report({ loc, messageId: 'tooHigh', data: { name, volume: String(volume), max: String(max) } });
    });
  },
};

export default rule;
