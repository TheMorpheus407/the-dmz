<script lang="ts">
  import Button from '$lib/ui/components/Button.svelte';

  import { formatShortDate, getRiskColor, getRiskLabel, type RiskLevel } from './document-viewer';

  interface ThreatIndicator {
    id: string;
    type: string;
    description: string;
    source: string;
    confidence: number;
  }

  interface ActionItem {
    id: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    deadline?: string;
  }

  interface IntelligenceBriefData {
    briefId: string;
    title: string;
    classification: string;
    generatedAt: string;
    summary: string;
    threatActors: {
      name: string;
      aliases: string[];
      motivation: string;
      capability: string;
      intent: RiskLevel;
    }[];
    indicators: ThreatIndicator[];
    campaigns: {
      name: string;
      status: 'active' | 'dormant' | 'attributed';
      targetSectors: string[];
      associatedIndicators: number;
    }[];
    actionItems: ActionItem[];
    sources: string[];
    redactions: string[];
  }

  interface Props {
    data: IntelligenceBriefData;
    highlightedFieldId?: string | null;
    onFieldClick?: (documentId: string, field: string) => void;
    onActionClick?: (actionId: string) => void;
  }

  const { data, highlightedFieldId = null, onFieldClick, onActionClick }: Props = $props();

  function isFieldHighlighted(fieldId: string): boolean {
    return highlightedFieldId === fieldId;
  }

  function handleFieldClick(fieldId: string) {
    onFieldClick?.(`brief-${data.briefId}`, fieldId);
  }

  let showAllIndicators = $state(false);
  const visibleIndicators = $derived(
    showAllIndicators ? data.indicators : data.indicators.slice(0, 5),
  );

  function getIntentColor(intent: RiskLevel): string {
    return getRiskColor(intent);
  }
</script>

<div class="intelligence-brief" role="region" aria-labelledby="brief-title">
  <header class="brief__header">
    <div class="brief__title-row">
      <h1 id="brief-title" class="brief__title">INTELLIGENCE BRIEF</h1>
      <span class="brief__classification">{data.classification}</span>
    </div>
    <div class="brief__meta">
      <span class="brief__meta-item">
        <span class="brief__label">Brief ID:</span>
        #{data.briefId}
      </span>
      <span class="brief__meta-divider">|</span>
      <span class="brief__meta-item">
        <span class="brief__label">Generated:</span>
        {formatShortDate(data.generatedAt)}
      </span>
    </div>
  </header>

  <div class="brief__title-section">
    <h2 class="brief__title-text">{data.title}</h2>
  </div>

  <div class="brief__summary">
    <h3 class="brief__section-title">EXECUTIVE SUMMARY</h3>
    <p class="brief__summary-text">{data.summary}</p>
  </div>

  {#if data.threatActors.length > 0}
    <div class="brief__actors">
      <h3 class="brief__section-title">THREAT ACTORS</h3>
      {#each data.threatActors as actor (actor.name)}
        <button
          type="button"
          class="brief__actor"
          class:brief__actor--highlighted={isFieldHighlighted(`actor-${actor.name}`)}
          onclick={() => handleFieldClick(`actor-${actor.name}`)}
        >
          <div class="brief__actor-header">
            <span class="brief__actor-name">{actor.name}</span>
            <span class="brief__actor-intent" style="color: {getIntentColor(actor.intent)}">
              Intent: {getRiskLabel(actor.intent)}
            </span>
          </div>
          <div class="brief__actor-details">
            {#if actor.aliases.length > 0}
              <div class="brief__actor-field">
                <span class="brief__actor-label">Aliases:</span>
                <span class="brief__actor-value">{actor.aliases.join(', ')}</span>
              </div>
            {/if}
            <div class="brief__actor-field">
              <span class="brief__actor-label">Motivation:</span>
              <span class="brief__actor-value">{actor.motivation}</span>
            </div>
            <div class="brief__actor-field">
              <span class="brief__actor-label">Capability:</span>
              <span class="brief__actor-value">{actor.capability}</span>
            </div>
          </div></button
        >
      {/each}
    </div>
  {/if}

  <div class="brief__indicators">
    <h3 class="brief__section-title">INDICATORS ({data.indicators.length})</h3>
    <ul class="brief__indicators-list">
      {#each visibleIndicators as indicator (indicator.id)}
        <li class="brief__indicator">
          <div class="brief__indicator-header">
            <span class="brief__indicator-type">{indicator.type}</span>
            <span class="brief__indicator-confidence">{indicator.confidence}% confidence</span>
          </div>
          <p class="brief__indicator-description">{indicator.description}</p>
          <span class="brief__indicator-source">Source: {indicator.source}</span>
        </li>
      {/each}
    </ul>
    {#if data.indicators.length > 5}
      <Button variant="ghost" size="sm" onclick={() => (showAllIndicators = !showAllIndicators)}>
        {showAllIndicators ? 'Show Less' : `Show All (${data.indicators.length})`}
      </Button>
    {/if}
  </div>

  {#if data.campaigns.length > 0}
    <div class="brief__campaigns">
      <h3 class="brief__section-title">ACTIVE CAMPAIGNS</h3>
      {#each data.campaigns as campaign (campaign.name)}
        <div class="brief__campaign">
          <div class="brief__campaign-header">
            <span class="brief__campaign-name">{campaign.name}</span>
            <span class="brief__campaign-status">[{campaign.status.toUpperCase()}]</span>
          </div>
          <div class="brief__campaign-details">
            <span class="brief__campaign-sectors">Targets: {campaign.targetSectors.join(', ')}</span
            >
            <span class="brief__campaign-indicators"
              >{campaign.associatedIndicators} indicators</span
            >
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if data.actionItems.length > 0}
    <div class="brief__actions">
      <h3 class="brief__section-title">RECOMMENDED ACTIONS</h3>
      <ul class="brief__actions-list">
        {#each data.actionItems as item (item.id)}
          <li
            class="brief__action brief__action--{item.priority}"
            class:brief__action--highlighted={isFieldHighlighted(`action-${item.id}`)}
          >
            <Button
              variant="secondary"
              size="sm"
              onclick={() => {
                handleFieldClick(`action-${item.id}`);
                onActionClick?.(item.id);
              }}
            >
              EXECUTE
            </Button>
            <div class="brief__action-content">
              <span class="brief__action-description">{item.description}</span>
              {#if item.deadline}
                <span class="brief__action-deadline">Deadline: {item.deadline}</span>
              {/if}
            </div>
            <span class="brief__action-priority">[{item.priority.toUpperCase()}]</span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  <div class="brief__sources">
    <h3 class="brief__section-title">SOURCES</h3>
    <ul class="brief__sources-list">
      {#each data.sources as source (source)}
        <li class="brief__source">{source}</li>
      {/each}
    </ul>
  </div>

  {#if data.redactions.length > 0}
    <div class="brief__redactions">
      <h3 class="brief__section-title">REDACTED SECTIONS</h3>
      <ul class="brief__redactions-list">
        {#each data.redactions as redaction (redaction)}
          <li class="brief__redaction">{redaction}</li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style>
  .intelligence-brief {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text);
  }

  .brief__header {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding-bottom: var(--space-3);
    border-bottom: var(--border-default);
  }

  .brief__title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .brief__title {
    font-size: var(--text-lg);
    font-weight: 700;
    color: var(--color-amber);
    margin: 0;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .brief__classification {
    padding: var(--space-1) var(--space-2);
    background: var(--color-danger);
    color: var(--color-bg-primary);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    font-weight: 600;
    text-transform: uppercase;
  }

  .brief__meta {
    display: flex;
    gap: var(--space-2);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .brief__meta-item {
    display: flex;
    gap: var(--space-1);
  }

  .brief__label {
    color: var(--color-phosphor-green-dim);
  }

  .brief__meta-divider {
    color: var(--color-phosphor-green-dark);
  }

  .brief__title-section {
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    border-left: 3px solid var(--color-amber);
  }

  .brief__title-text {
    font-size: var(--text-md);
    font-weight: 600;
    color: var(--color-text-document);
    margin: 0;
    font-family: var(--font-document);
  }

  .brief__summary,
  .brief__actors,
  .brief__indicators,
  .brief__campaigns,
  .brief__actions,
  .brief__sources,
  .brief__redactions {
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .brief__section-title {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-amber);
    margin: 0 0 var(--space-2) 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .brief__summary-text {
    margin: 0;
    font-family: var(--font-document);
    font-size: var(--text-base);
    color: var(--color-document-white);
    line-height: 1.6;
  }

  .brief__actor {
    display: block;
    width: 100%;
    padding: var(--space-2);
    background: var(--color-bg-primary);
    border-radius: var(--radius-sm);
    margin-bottom: var(--space-2);
    border: 1px solid transparent;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    font-size: inherit;
    color: inherit;
  }

  .brief__actor:last-child {
    margin-bottom: 0;
  }

  .brief__actor--highlighted {
    border-color: var(--color-warning);
    box-shadow: 0 0 8px var(--color-warning);
  }

  .brief__actor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-2);
  }

  .brief__actor-name {
    font-weight: 600;
    color: var(--color-danger);
  }

  .brief__actor-intent {
    font-size: var(--text-xs);
    font-weight: 600;
  }

  .brief__actor-details {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .brief__actor-field {
    display: flex;
    gap: var(--space-2);
    font-size: var(--text-xs);
  }

  .brief__actor-label {
    color: var(--color-phosphor-green-dim);
    min-width: 80px;
  }

  .brief__actor-value {
    color: var(--color-text-document);
    font-family: var(--font-document);
  }

  .brief__indicators-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .brief__indicator {
    padding: var(--space-2);
    background: var(--color-bg-primary);
    border-radius: var(--radius-sm);
    border-left: 2px solid var(--color-info);
  }

  .brief__indicator-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--space-1);
  }

  .brief__indicator-type {
    font-weight: 600;
    color: var(--color-info);
    font-size: var(--text-xs);
  }

  .brief__indicator-confidence {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .brief__indicator-description {
    margin: 0 0 var(--space-1) 0;
    font-family: var(--font-document);
    font-size: var(--text-sm);
    color: var(--color-text-document);
  }

  .brief__indicator-source {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .brief__campaign {
    padding: var(--space-2);
    background: var(--color-bg-primary);
    border-radius: var(--radius-sm);
    margin-bottom: var(--space-2);
  }

  .brief__campaign:last-child {
    margin-bottom: 0;
  }

  .brief__campaign-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--space-1);
  }

  .brief__campaign-name {
    font-weight: 600;
    color: var(--color-text-document);
  }

  .brief__campaign-status {
    font-size: var(--text-xs);
    color: var(--color-warning);
    font-weight: 600;
  }

  .brief__campaign-details {
    display: flex;
    flex-direction: column;
    gap: var(--space-0);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .brief__actions-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .brief__action {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    background: var(--color-bg-primary);
    border-radius: var(--radius-sm);
    border-left: 3px solid;
  }

  .brief__action--low {
    border-left-color: var(--color-safe);
  }

  .brief__action--medium {
    border-left-color: var(--color-warning);
  }

  .brief__action--high {
    border-left-color: var(--color-danger);
  }

  .brief__action--highlighted {
    box-shadow: 0 0 8px var(--color-warning);
  }

  .brief__action-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-0);
  }

  .brief__action-description {
    color: var(--color-text-document);
    font-family: var(--font-document);
  }

  .brief__action-deadline {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .brief__action-priority {
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--color-text-muted);
  }

  .brief__sources-list,
  .brief__redactions-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .brief__source,
  .brief__redaction {
    padding: var(--space-1) var(--space-2);
    background: var(--color-bg-primary);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .brief__redaction {
    color: var(--color-warning);
    font-style: italic;
  }
</style>
