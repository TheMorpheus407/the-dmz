<script lang="ts">
  import Button from '$lib/ui/components/Button.svelte';

  import { getRiskColor, getRiskLabel, formatShortDate, type RiskLevel } from './document-viewer';

  interface ThreatIndicator {
    id: string;
    category: string;
    name: string;
    description: string;
    severity: RiskLevel;
    detected: boolean;
  }

  interface FactionIntel {
    factionId: string;
    factionName: string;
    threatLevel: RiskLevel;
    knownActivities: string[];
    confidence: number;
  }

  interface RecommendedAction {
    id: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    estimatedImpact: string;
  }

  interface ThreatAssessmentData {
    assessmentId: string;
    emailId: string;
    overallRiskLevel: RiskLevel;
    overallScore: number;
    generatedAt: string;
    factionIntel: FactionIntel[];
    indicators: ThreatIndicator[];
    recommendedActions: RecommendedAction[];
    summary: string;
  }

  interface Props {
    data: ThreatAssessmentData;
    highlightedFieldId?: string | null;
    onFieldClick?: (documentId: string, field: string) => void;
    onLinkClick?: (url: string) => void;
    onActionClick?: (actionId: string) => void;
    onIndicatorToggle?: (indicatorId: string) => void;
  }

  const {
    data,
    highlightedFieldId = null,
    onFieldClick,
    onLinkClick,
    onActionClick,
    onIndicatorToggle,
  }: Props = $props();

  let expandedCategories = $state<Set<string>>(new Set(['faction', 'indicators']));

  function toggleCategory(category: string) {
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const newSet = new Set(expandedCategories);
    if (newSet.has(category)) {
      newSet.delete(category);
    } else {
      newSet.add(category);
    }
    expandedCategories = newSet;
  }

  function getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      faction: '🎯',
      indicators: '🚩',
      actions: '⚡',
    };
    return icons[category] || '📋';
  }

  function getCategoryTitle(category: string): string {
    const titles: Record<string, string> = {
      faction: 'FACTION INTELLIGENCE',
      indicators: 'THREAT INDICATORS',
      actions: 'RECOMMENDED ACTIONS',
    };
    return titles[category] || category;
  }

  const indicatorCategories = $derived([...new Set(data.indicators.map((i) => i.category))]);

  function getIndicatorsByCategory(category: string): ThreatIndicator[] {
    return data.indicators.filter((i) => i.category === category);
  }

  function handleIndicatorClick(indicatorId: string) {
    onIndicatorToggle?.(indicatorId);
  }

  function handleActionClick(actionId: string) {
    onActionClick?.(actionId);
  }

  function isFieldHighlighted(fieldId: string): boolean {
    return highlightedFieldId === fieldId;
  }

  function handleFieldClick(fieldId: string) {
    onFieldClick?.(data.emailId, fieldId);
  }

  function handleLinkClick(url: string, event: MouseEvent) {
    event.preventDefault();
    onLinkClick?.(url);
  }

  function getIndicatorSeverityClass(severity: RiskLevel): string {
    return `threat-assessment__indicator--${severity.toLowerCase()}`;
  }
</script>

<div class="threat-assessment" role="region" aria-labelledby="threat-assessment-title">
  <header class="threat-assessment__header">
    <h1 id="threat-assessment-title" class="threat-assessment__title">THREAT ASSESSMENT SHEET</h1>
    <div class="threat-assessment__meta">
      <button
        type="button"
        class="threat-assessment__meta-item threat-assessment__meta-link"
        class:threat-assessment__meta-link--highlighted={isFieldHighlighted('emailId')}
        onclick={() => handleFieldClick('emailId')}
      >
        Request: #{data.emailId.slice(0, 8)}
      </button>
      <span class="threat-assessment__meta-divider">|</span>
      <span class="threat-assessment__meta-item">Assessment: #{data.assessmentId.slice(0, 8)}</span>
      <span class="threat-assessment__meta-divider">|</span>
      <span class="threat-assessment__meta-item"
        >Generated: {formatShortDate(data.generatedAt)}</span
      >
    </div>
  </header>

  <div class="threat-assessment__score">
    <div class="threat-assessment__score-visual">
      <div
        class="threat-assessment__score-bar"
        style="width: {data.overallScore}%; background-color: {getRiskColor(
          data.overallRiskLevel,
        )};"
        role="progressbar"
        aria-valuenow={data.overallScore}
        aria-valuemin="0"
        aria-valuemax="100"
      ></div>
    </div>
    <div class="threat-assessment__score-info">
      <span class="threat-assessment__score-label">OVERALL RISK:</span>
      <span
        class="threat-assessment__score-value"
        style="color: {getRiskColor(data.overallRiskLevel)};"
      >
        {getRiskLabel(data.overallRiskLevel)} ({data.overallScore}/100)
      </span>
    </div>
  </div>

  <div class="threat-assessment__summary">
    <h2 class="threat-assessment__summary-title">EXECUTIVE SUMMARY</h2>
    <p class="threat-assessment__summary-text">{data.summary}</p>
  </div>

  <section class="threat-assessment__section">
    <button
      type="button"
      class="threat-assessment__section-header"
      onclick={() => toggleCategory('faction')}
      aria-expanded={expandedCategories.has('faction')}
    >
      <span class="threat-assessment__section-icon">{getCategoryIcon('faction')}</span>
      <span class="threat-assessment__section-title">{getCategoryTitle('faction')}</span>
      <span class="threat-assessment__section-toggle">
        {expandedCategories.has('faction') ? '▼' : '▶'}
      </span>
    </button>
    {#if expandedCategories.has('faction')}
      <div class="threat-assessment__section-content">
        {#each data.factionIntel as faction (faction.factionId)}
          <div class="threat-assessment__faction">
            <div class="threat-assessment__faction-header">
              <button
                type="button"
                class="threat-assessment__faction-name"
                class:threat-assessment__faction-name--highlighted={isFieldHighlighted(
                  `faction-${faction.factionId}`,
                )}
                onclick={() => handleFieldClick(`faction-${faction.factionId}`)}
              >
                {faction.factionName}
              </button>
              <span
                class="threat-assessment__faction-risk"
                style="color: {getRiskColor(faction.threatLevel)}"
              >
                [{getRiskLabel(faction.threatLevel)}]
              </span>
            </div>
            <div class="threat-assessment__faction-confidence">
              Confidence: {faction.confidence}%
            </div>
            {#if faction.knownActivities.length > 0}
              <ul class="threat-assessment__faction-activities">
                {#each faction.knownActivities as activity (activity)}
                  <li class="threat-assessment__faction-activity">{activity}</li>
                {/each}
              </ul>
            {/if}
            <div class="threat-assessment__faction-links">
              <a
                href="internal://faction/{faction.factionId}"
                class="threat-assessment__faction-link"
                onclick={(e) => handleLinkClick(`internal://faction/${faction.factionId}`, e)}
              >
                [View Faction Profile]
              </a>
              <a
                href="internal://intelligence/{faction.factionId}"
                class="threat-assessment__faction-link"
                onclick={(e) => handleLinkClick(`internal://intelligence/${faction.factionId}`, e)}
              >
                [Related Intelligence]
              </a>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <section class="threat-assessment__section">
    <button
      type="button"
      class="threat-assessment__section-header"
      onclick={() => toggleCategory('indicators')}
      aria-expanded={expandedCategories.has('indicators')}
    >
      <span class="threat-assessment__section-icon">{getCategoryIcon('indicators')}</span>
      <span class="threat-assessment__section-title">{getCategoryTitle('indicators')}</span>
      <span class="threat-assessment__section-toggle">
        {expandedCategories.has('indicators') ? '▼' : '▶'}
      </span>
    </button>
    {#if expandedCategories.has('indicators')}
      <div class="threat-assessment__section-content">
        {#each indicatorCategories as category (category)}
          <div class="threat-assessment__category">
            <h3 class="threat-assessment__category-title">{category.toUpperCase()}</h3>
            <ul class="threat-assessment__indicators">
              {#each getIndicatorsByCategory(category) as indicator (indicator.id)}
                <li
                  class="threat-assessment__indicator {getIndicatorSeverityClass(
                    indicator.severity,
                  )}"
                >
                  <button
                    type="button"
                    class="threat-assessment__indicator-toggle"
                    class:threat-assessment__indicator-toggle--active={indicator.detected}
                    onclick={() => handleIndicatorClick(indicator.id)}
                    aria-pressed={indicator.detected}
                  >
                    {indicator.detected ? '✓' : '○'}
                  </button>
                  <div class="threat-assessment__indicator-content">
                    <span class="threat-assessment__indicator-name">{indicator.name}</span>
                    <span class="threat-assessment__indicator-description"
                      >{indicator.description}</span
                    >
                  </div>
                  <span
                    class="threat-assessment__indicator-severity"
                    style="color: {getRiskColor(indicator.severity)}"
                  >
                    [{getRiskLabel(indicator.severity)}]
                  </span>
                </li>
              {/each}
            </ul>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <section class="threat-assessment__section">
    <button
      type="button"
      class="threat-assessment__section-header"
      onclick={() => toggleCategory('actions')}
      aria-expanded={expandedCategories.has('actions')}
    >
      <span class="threat-assessment__section-icon">{getCategoryIcon('actions')}</span>
      <span class="threat-assessment__section-title">{getCategoryTitle('actions')}</span>
      <span class="threat-assessment__section-toggle">
        {expandedCategories.has('actions') ? '▼' : '▶'}
      </span>
    </button>
    {#if expandedCategories.has('actions')}
      <div class="threat-assessment__section-content">
        <ul class="threat-assessment__actions">
          {#each data.recommendedActions as action (action.id)}
            <li class="threat-assessment__action threat-assessment__action--{action.priority}">
              <Button variant="secondary" size="sm" onclick={() => handleActionClick(action.id)}>
                EXECUTE
              </Button>
              <div class="threat-assessment__action-content">
                <span class="threat-assessment__action-description">{action.description}</span>
                <span class="threat-assessment__action-impact"
                  >Impact: {action.estimatedImpact}</span
                >
              </div>
              <span class="threat-assessment__action-priority"
                >[{action.priority.toUpperCase()}]</span
              >
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </section>
</div>

<style>
  .threat-assessment {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text);
  }

  .threat-assessment__header {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding-bottom: var(--space-3);
    border-bottom: var(--border-default);
  }

  .threat-assessment__title {
    font-size: var(--text-lg);
    font-weight: 700;
    color: var(--color-amber);
    margin: 0;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .threat-assessment__meta {
    display: flex;
    gap: var(--space-2);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .threat-assessment__meta-divider {
    color: var(--color-phosphor-green-dark);
  }

  .threat-assessment__meta-link {
    background: none;
    border: none;
    padding: 0;
    font-family: inherit;
    font-size: inherit;
    color: inherit;
    cursor: pointer;
    text-decoration: none;
    transition: color 150ms ease;
  }

  .threat-assessment__meta-link:hover {
    color: var(--color-amber);
    text-decoration: underline;
  }

  .threat-assessment__meta-link:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .threat-assessment__meta-link--highlighted {
    background-color: var(--color-warning);
    color: var(--color-bg-primary);
    padding: 2px 4px;
    border-radius: var(--radius-sm);
  }

  .threat-assessment__score {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .threat-assessment__score-visual {
    height: 24px;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-phosphor-green-dark);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .threat-assessment__score-bar {
    height: 100%;
    transition:
      width 300ms ease,
      background-color 300ms ease;
  }

  .threat-assessment__score-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .threat-assessment__score-label {
    font-weight: 600;
    color: var(--color-amber);
  }

  .threat-assessment__score-value {
    font-weight: 700;
  }

  .threat-assessment__summary {
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    border-left: 3px solid var(--color-warning);
  }

  .threat-assessment__summary-title {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-warning);
    margin: 0 0 var(--space-2) 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .threat-assessment__summary-text {
    margin: 0;
    font-family: var(--font-document);
    font-size: var(--text-base);
    color: var(--color-document-white);
    line-height: 1.6;
  }

  .threat-assessment__section {
    border: var(--border-default);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .threat-assessment__section-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border: none;
    cursor: pointer;
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text);
    text-align: left;
    transition: background-color 150ms ease;
  }

  .threat-assessment__section-header:hover {
    background: var(--color-bg-hover);
  }

  .threat-assessment__section-header:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: -2px;
  }

  .threat-assessment__section-icon {
    font-size: var(--text-md);
  }

  .threat-assessment__section-title {
    flex: 1;
    font-weight: 600;
    color: var(--color-amber);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .threat-assessment__section-toggle {
    color: var(--color-text-muted);
    font-size: var(--text-xs);
  }

  .threat-assessment__section-content {
    padding: var(--space-3);
    background: var(--color-bg-secondary);
  }

  .threat-assessment__faction {
    padding: var(--space-2);
    border: 1px solid var(--color-phosphor-green-dark);
    border-radius: var(--radius-sm);
    margin-bottom: var(--space-2);
  }

  .threat-assessment__faction:last-child {
    margin-bottom: 0;
  }

  .threat-assessment__faction-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .threat-assessment__faction-name {
    font-weight: 600;
    color: var(--color-text-document);
    background: none;
    border: none;
    padding: 0;
    font-family: inherit;
    font-size: inherit;
    cursor: pointer;
    text-align: left;
  }

  .threat-assessment__faction-name:hover {
    color: var(--color-amber);
    text-decoration: underline;
  }

  .threat-assessment__faction-name:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .threat-assessment__faction-name--highlighted {
    background-color: var(--color-warning);
    color: var(--color-bg-primary);
    padding: 2px 4px;
    border-radius: var(--radius-sm);
  }

  .threat-assessment__faction-risk {
    font-weight: 600;
  }

  .threat-assessment__faction-links {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-2);
    padding-top: var(--space-2);
    border-top: 1px solid var(--color-phosphor-green-dark);
  }

  .threat-assessment__faction-link {
    font-size: var(--text-xs);
    color: var(--color-info);
    text-decoration: none;
    cursor: pointer;
    transition: color 150ms ease;
  }

  .threat-assessment__faction-link:hover {
    color: var(--color-amber);
    text-decoration: underline;
  }

  .threat-assessment__faction-link:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .threat-assessment__faction-confidence {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    margin-top: var(--space-1);
  }

  .threat-assessment__faction-activities {
    list-style: none;
    margin: var(--space-2) 0 0 0;
    padding: 0;
  }

  .threat-assessment__faction-activity {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    padding: var(--space-1) 0;
    padding-left: var(--space-3);
    border-left: 2px solid var(--color-phosphor-green-dark);
  }

  .threat-assessment__category {
    margin-bottom: var(--space-3);
  }

  .threat-assessment__category:last-child {
    margin-bottom: 0;
  }

  .threat-assessment__category-title {
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--color-phosphor-green-dim);
    margin: 0 0 var(--space-2) 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .threat-assessment__indicators {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .threat-assessment__indicator {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    padding: var(--space-2);
    border: 1px solid var(--color-phosphor-green-dark);
    border-radius: var(--radius-sm);
    border-left-width: 3px;
  }

  .threat-assessment__indicator--low {
    border-left-color: var(--color-safe);
  }

  .threat-assessment__indicator--medium {
    border-left-color: var(--color-warning);
  }

  .threat-assessment__indicator--high {
    border-left-color: var(--color-danger);
  }

  .threat-assessment__indicator--critical {
    border-left-color: var(--color-critical);
  }

  .threat-assessment__indicator-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-phosphor-green-dark);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  .threat-assessment__indicator-toggle--active {
    background: var(--color-warning);
    border-color: var(--color-warning);
    color: var(--color-bg-primary);
  }

  .threat-assessment__indicator-toggle:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .threat-assessment__indicator-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-0);
  }

  .threat-assessment__indicator-name {
    font-weight: 500;
    color: var(--color-text-document);
  }

  .threat-assessment__indicator-description {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    font-family: var(--font-document);
  }

  .threat-assessment__indicator-severity {
    font-weight: 600;
    font-size: var(--text-xs);
    flex-shrink: 0;
  }

  .threat-assessment__actions {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .threat-assessment__action {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2);
    border: 1px solid var(--color-phosphor-green-dark);
    border-radius: var(--radius-sm);
    border-left-width: 3px;
  }

  .threat-assessment__action--low {
    border-left-color: var(--color-safe);
  }

  .threat-assessment__action--medium {
    border-left-color: var(--color-warning);
  }

  .threat-assessment__action--high {
    border-left-color: var(--color-danger);
  }

  .threat-assessment__action-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-0);
  }

  .threat-assessment__action-description {
    color: var(--color-text-document);
  }

  .threat-assessment__action-impact {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .threat-assessment__action-priority {
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--color-text-muted);
  }
</style>
