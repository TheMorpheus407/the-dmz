export const promptTemplateCategories = [
  'email_phishing',
  'email_legitimate',
  'intel_brief',
  'incident_summary',
  'scenario_variation',
  'micro_lesson',
] as const;

export type PromptTemplateCategory = (typeof promptTemplateCategories)[number];

const promptTemplateCategorySet = new Set<string>(promptTemplateCategories);

export const isPromptTemplateCategory = (value: unknown): value is PromptTemplateCategory =>
  typeof value === 'string' && promptTemplateCategorySet.has(value);
