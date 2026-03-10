import { createHash } from 'node:crypto';

import type { PromptAssembly, PromptTemplateInput } from './ai-pipeline.types.js';
import type { PromptTemplate } from '../../db/schema/ai/prompt-templates.js';

type PromptTemplateLike = Pick<PromptTemplate, 'systemPrompt' | 'userTemplate' | 'outputSchema'> &
  Pick<PromptTemplateInput, 'systemPrompt' | 'userTemplate' | 'outputSchema'>;

const serializeContextValue = (value: unknown): string => {
  if (value == null) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return value.toString();
  }

  return JSON.stringify(value);
};

const flattenContext = (
  value: Record<string, unknown>,
  prefix = '',
  output: Record<string, string> = {},
): Record<string, string> => {
  for (const [key, entry] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(entry)) {
      output[path] = JSON.stringify(entry);
      continue;
    }

    if (entry && typeof entry === 'object') {
      flattenContext(entry as Record<string, unknown>, path, output);
      continue;
    }

    output[path] = serializeContextValue(entry);
  }

  return output;
};

const interpolateTemplate = (template: string, context: Record<string, unknown>): string => {
  const flat = flattenContext(context);
  return template.replace(/{{\s*([\w.]+)\s*}}/g, (_match, token: string) => flat[token] ?? '');
};

export const buildPrompt = (
  template: PromptTemplateLike,
  context: Record<string, unknown>,
): PromptAssembly => {
  const systemPrompt = template.systemPrompt.trim();
  const renderedTemplate = interpolateTemplate(template.userTemplate, context);
  const schemaBlock = JSON.stringify(template.outputSchema ?? {}, null, 2);
  const userPrompt =
    `${renderedTemplate.trim()}\n\n` +
    `Context JSON:\n${JSON.stringify(context, null, 2)}\n\n` +
    `Output JSON schema:\n${schemaBlock}`;
  const promptHash = createHash('sha256').update(`${systemPrompt}\n${userPrompt}`).digest('hex');

  return {
    systemPrompt,
    userPrompt,
    promptHash,
  };
};
