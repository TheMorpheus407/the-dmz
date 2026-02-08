import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

const WCAG_21_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] as const;
const MAX_NODES_PER_VIOLATION = 5;
const WHITESPACE_REGEX = /\s+/g;

type AxeResults = Awaited<ReturnType<InstanceType<typeof AxeBuilder>['analyze']>>;
type AxeViolation = AxeResults['violations'][number];
type AxeViolationNode = AxeViolation['nodes'][number];

const formatSingleLine = (value: string | undefined): string => {
  if (!value) {
    return 'N/A';
  }

  return value.trim().replace(WHITESPACE_REGEX, ' ');
};

const formatViolationNode = (node: AxeViolationNode, index: number): string => {
  const selector = node.target.length > 0 ? node.target.join(', ') : 'unknown selector';

  return [
    `    ${index + 1}. Element: ${selector}`,
    `       HTML: ${formatSingleLine(node.html)}`,
    `       Suggested fix: ${formatSingleLine(node.failureSummary)}`,
  ].join('\n');
};

const formatViolation = (violation: AxeViolation): string => {
  const lines = [
    `- Rule ID: ${violation.id}`,
    `  Description: ${formatSingleLine(violation.description)}`,
    `  Rule summary: ${formatSingleLine(violation.help)}`,
    `  WCAG reference: ${violation.helpUrl}`,
    `  Affected elements (${violation.nodes.length}):`,
    ...violation.nodes
      .slice(0, MAX_NODES_PER_VIOLATION)
      .map((node, index) => formatViolationNode(node, index)),
  ];

  if (violation.nodes.length > MAX_NODES_PER_VIOLATION) {
    lines.push(`    ... ${violation.nodes.length - MAX_NODES_PER_VIOLATION} more element(s).`);
  }

  return lines.join('\n');
};

const formatViolationsMessage = (violations: AxeResults['violations']): string => {
  return [
    `Axe found ${violations.length} WCAG 2.1 AA accessibility violation(s).`,
    'Each item includes rule details, affected HTML, WCAG reference, and a suggested fix.',
    '',
    ...violations.map((violation) => formatViolation(violation)),
  ].join('\n');
};

export const expectAccessible = async (page: Page): Promise<void> => {
  const { violations } = await new AxeBuilder({ page }).withTags([...WCAG_21_AA_TAGS]).analyze();

  expect(violations, formatViolationsMessage(violations)).toEqual([]);
};
