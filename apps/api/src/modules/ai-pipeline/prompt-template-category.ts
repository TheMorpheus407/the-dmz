export const PROMPT_TEMPLATE_CATEGORIES = [
  'email_phishing',
  'email_legitimate',
  'intel_brief',
  'incident_summary',
  'scenario_variation',
  'micro_lesson',
] as const;

export type PromptTemplateCategory = (typeof PROMPT_TEMPLATE_CATEGORIES)[number];

const PROMPT_TEMPLATE_CATEGORY_SET = new Set<string>(PROMPT_TEMPLATE_CATEGORIES);

export const isPromptTemplateCategory = (value: unknown): value is PromptTemplateCategory =>
  typeof value === 'string' && PROMPT_TEMPLATE_CATEGORY_SET.has(value);
