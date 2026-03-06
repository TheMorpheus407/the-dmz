<script lang="ts">
  import Button from '$lib/ui/components/Button.svelte';
  import type { EmailInstance } from '@the-dmz/shared';

  import {
    createWorksheetAnalysis,
    toggleIndicator,
    setIndicatorNote,
    setOverrideScore,
    setColumnNotes,
    getRiskLabel,
    getRiskColor,
    type WorksheetAnalysis,
  } from './phishing-worksheet';

  interface Props {
    email: EmailInstance;
    onSaveAndReturn?: (analysis: WorksheetAnalysis) => void;
    onSaveAndDecide?: (analysis: WorksheetAnalysis) => void;
  }

  const { email, onSaveAndReturn, onSaveAndDecide }: Props = $props();

  let analysis = $state<WorksheetAnalysis>(createWorksheetAnalysis(email));

  function handleToggleIndicator(indicatorId: string) {
    analysis = toggleIndicator(analysis, indicatorId);
  }

  function handleIndicatorNoteChange(indicatorId: string, note: string) {
    analysis = setIndicatorNote(analysis, indicatorId, note);
  }

  function handleOverrideChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = target.value === '' ? null : parseInt(target.value, 10);
    if (value !== null && (isNaN(value) || value < 0 || value > 100)) {
      return;
    }
    analysis = setOverrideScore(analysis, value);
  }

  function handleRedFlagsNotesChange(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    analysis = setColumnNotes(analysis, 'redFlags', target.value);
  }

  function handleLegitimacyNotesChange(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    analysis = setColumnNotes(analysis, 'legitimacy', target.value);
  }

  function handleSaveAndReturn() {
    onSaveAndReturn?.(analysis);
  }

  function handleSaveAndDecide() {
    onSaveAndDecide?.(analysis);
  }

  function handleIndicatorKeyDown(event: KeyboardEvent, indicatorId: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggleIndicator(indicatorId);
    }
  }

  function getLocationLabel(location: string): string {
    const labels: Record<string, string> = {
      sender: 'Sender',
      subject: 'Subject',
      body: 'Body',
      header: 'Header',
      attachment: 'Attachment',
      link: 'Link',
    };
    return labels[location] || location;
  }
</script>

<div class="worksheet-overlay" role="dialog" aria-modal="true" aria-labelledby="worksheet-title">
  <div class="worksheet-container">
    <header class="worksheet-header">
      <h1 id="worksheet-title" class="worksheet-title">PHISHING ANALYSIS WORKSHEET</h1>
      <div class="worksheet-meta">
        <span class="worksheet-meta-item">Request: #{email.emailId.slice(0, 8)}</span>
        <span class="worksheet-meta-divider">|</span>
        <span class="worksheet-meta-item">From: {email.sender.emailAddress}</span>
      </div>
    </header>

    <div class="worksheet-columns">
      <section
        class="worksheet-column worksheet-column--red-flags"
        aria-labelledby="red-flags-title"
      >
        <h2 id="red-flags-title" class="worksheet-column-title">RED FLAGS</h2>

        {#if analysis.redFlags.length === 0}
          <div class="worksheet-empty">No red flags detected in this email.</div>
        {:else}
          <ul class="worksheet-indicator-list" role="group" aria-label="Red flag indicators">
            {#each analysis.redFlags as indicator (indicator.indicatorId)}
              <li class="worksheet-indicator">
                <div class="worksheet-indicator-header">
                  <button
                    type="button"
                    class="worksheet-checkbox"
                    class:worksheet-checkbox--checked={indicator.isChecked}
                    onclick={() => handleToggleIndicator(indicator.indicatorId)}
                    onkeydown={(e) => handleIndicatorKeyDown(e, indicator.indicatorId)}
                    aria-pressed={indicator.isChecked}
                    aria-label="{indicator.name}: {indicator.description}"
                  >
                    {#if indicator.isChecked}
                      <span class="worksheet-checkbox-icon" aria-hidden="true">✓</span>
                    {/if}
                  </button>
                  <div class="worksheet-indicator-content">
                    <span class="worksheet-indicator-name">{indicator.name}</span>
                    <span class="worksheet-indicator-location"
                      >[{getLocationLabel(indicator.location)}]</span
                    >
                  </div>
                </div>
                {#if indicator.isChecked}
                  <div class="worksheet-indicator-details">
                    <p class="worksheet-indicator-description">{indicator.description}</p>
                    <textarea
                      class="worksheet-indicator-note"
                      placeholder="Add notes about this indicator..."
                      value={indicator.note}
                      oninput={(e) =>
                        handleIndicatorNoteChange(
                          indicator.indicatorId,
                          (e.target as HTMLTextAreaElement).value,
                        )}
                      aria-label="Notes for {indicator.name}"
                    ></textarea>
                  </div>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}

        <div class="worksheet-column-notes">
          <label for="red-flags-notes" class="worksheet-notes-label">Custom notes:</label>
          <textarea
            id="red-flags-notes"
            class="worksheet-notes-textarea"
            placeholder="Additional observations about red flags..."
            value={analysis.redFlagsNotes}
            oninput={handleRedFlagsNotesChange}
          ></textarea>
        </div>
      </section>

      <section
        class="worksheet-column worksheet-column--legitimacy"
        aria-labelledby="legitimacy-title"
      >
        <h2 id="legitimacy-title" class="worksheet-column-title">LEGITIMACY SIGNALS</h2>

        {#if analysis.legitimacySignals.length === 0}
          <div class="worksheet-empty">No legitimacy signals detected in this email.</div>
        {:else}
          <ul
            class="worksheet-indicator-list"
            role="group"
            aria-label="Legitimacy signal indicators"
          >
            {#each analysis.legitimacySignals as indicator (indicator.indicatorId)}
              <li class="worksheet-indicator">
                <div class="worksheet-indicator-header">
                  <button
                    type="button"
                    class="worksheet-checkbox worksheet-checkbox--legitimacy"
                    class:worksheet-checkbox--checked={indicator.isChecked}
                    onclick={() => handleToggleIndicator(indicator.indicatorId)}
                    onkeydown={(e) => handleIndicatorKeyDown(e, indicator.indicatorId)}
                    aria-pressed={indicator.isChecked}
                    aria-label="{indicator.name}: {indicator.description}"
                  >
                    {#if indicator.isChecked}
                      <span class="worksheet-checkbox-icon" aria-hidden="true">✓</span>
                    {/if}
                  </button>
                  <div class="worksheet-indicator-content">
                    <span class="worksheet-indicator-name">{indicator.name}</span>
                    <span class="worksheet-indicator-location"
                      >[{getLocationLabel(indicator.location)}]</span
                    >
                  </div>
                </div>
                {#if indicator.isChecked}
                  <div class="worksheet-indicator-details">
                    <p class="worksheet-indicator-description">{indicator.description}</p>
                    <textarea
                      class="worksheet-indicator-note"
                      placeholder="Add notes about this signal..."
                      value={indicator.note}
                      oninput={(e) =>
                        handleIndicatorNoteChange(
                          indicator.indicatorId,
                          (e.target as HTMLTextAreaElement).value,
                        )}
                      aria-label="Notes for {indicator.name}"
                    ></textarea>
                  </div>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}

        <div class="worksheet-column-notes">
          <label for="legitimacy-notes" class="worksheet-notes-label">Custom notes:</label>
          <textarea
            id="legitimacy-notes"
            class="worksheet-notes-textarea"
            placeholder="Additional observations about legitimacy..."
            value={analysis.legitimacyNotes}
            oninput={handleLegitimacyNotesChange}
          ></textarea>
        </div>
      </section>
    </div>

    <footer class="worksheet-risk-assessment">
      <div class="worksheet-risk-bar">
        <span class="worksheet-risk-label">RISK ASSESSMENT:</span>
        <div class="worksheet-risk-visual">
          <div
            class="worksheet-risk-fill"
            style="width: {analysis.finalScore}%; background-color: {getRiskColor(
              analysis.finalScore,
            )};"
            role="progressbar"
            aria-valuenow={analysis.finalScore}
            aria-valuemin="0"
            aria-valuemax="100"
          ></div>
        </div>
        <span class="worksheet-risk-value" style="color: {getRiskColor(analysis.finalScore)};">
          {getRiskLabel(analysis.finalScore)} ({analysis.finalScore}/100)
        </span>
      </div>

      <div class="worksheet-score-inputs">
        <span class="worksheet-score-label">Auto-score: {analysis.autoScore}/100</span>
        <label for="override-score" class="worksheet-override-label">Your override:</label>
        <input
          id="override-score"
          type="number"
          class="worksheet-override-input"
          min="0"
          max="100"
          placeholder="--"
          value={analysis.overrideScore ?? ''}
          oninput={handleOverrideChange}
          aria-label="Override risk score (0-100)"
        />
      </div>
    </footer>

    <div class="worksheet-actions">
      <Button variant="secondary" onclick={handleSaveAndReturn}>Save & Return to Email</Button>
      <Button variant="primary" onclick={handleSaveAndDecide}>Save & Decide</Button>
    </div>
  </div>
</div>

<style>
  .worksheet-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(10, 14, 20, 0.9);
    padding: var(--space-4);
    overflow-y: auto;
  }

  .worksheet-container {
    width: 100%;
    max-width: 1000px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    background-color: var(--color-bg-secondary);
    border: 1px solid var(--color-phosphor-green-dark);
    border-radius: var(--radius-md);
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text);
    overflow: hidden;
  }

  .worksheet-header {
    padding: var(--space-3) var(--space-4);
    background-color: var(--color-bg-tertiary);
    border-bottom: 1px solid var(--color-phosphor-green-dark);
  }

  .worksheet-title {
    font-size: var(--text-lg);
    font-weight: 700;
    color: var(--color-amber);
    margin: 0;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .worksheet-meta {
    display: flex;
    gap: var(--space-2);
    margin-top: var(--space-2);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .worksheet-meta-divider {
    color: var(--color-phosphor-green-dark);
  }

  .worksheet-columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1px;
    flex: 1;
    overflow-y: auto;
    background-color: var(--color-phosphor-green-dark);
  }

  @media (max-width: 768px) {
    .worksheet-columns {
      grid-template-columns: 1fr;
    }
  }

  .worksheet-column {
    display: flex;
    flex-direction: column;
    padding: var(--space-3);
    background-color: var(--color-bg-secondary);
    overflow-y: auto;
  }

  .worksheet-column--red-flags {
    border-right: 1px solid var(--color-phosphor-green-dark);
  }

  @media (max-width: 768px) {
    .worksheet-column--red-flags {
      border-right: none;
      border-bottom: 1px solid var(--color-phosphor-green-dark);
    }
  }

  .worksheet-column-title {
    font-size: var(--text-md);
    font-weight: 600;
    color: var(--color-danger);
    margin: 0 0 var(--space-3) 0;
    padding-bottom: var(--space-2);
    border-bottom: 1px solid var(--color-phosphor-green-dark);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .worksheet-column--legitimacy .worksheet-column-title {
    color: var(--color-safe);
  }

  .worksheet-empty {
    padding: var(--space-4);
    text-align: center;
    color: var(--color-text-muted);
    font-style: italic;
  }

  .worksheet-indicator-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .worksheet-indicator {
    border: 1px solid var(--color-phosphor-green-dark);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .worksheet-indicator-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    background-color: var(--color-bg-tertiary);
  }

  .worksheet-checkbox {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    background-color: var(--color-bg-primary);
    border: 1px solid var(--color-phosphor-green-dark);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition:
      background-color 150ms ease,
      border-color 150ms ease;
    flex-shrink: 0;
  }

  .worksheet-checkbox:hover {
    border-color: var(--color-danger);
  }

  .worksheet-checkbox--legitimacy:hover {
    border-color: var(--color-safe);
  }

  .worksheet-checkbox:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .worksheet-checkbox--checked {
    background-color: var(--color-danger);
    border-color: var(--color-danger);
    color: var(--color-bg-primary);
  }

  .worksheet-checkbox--legitimacy.worksheet-checkbox--checked {
    background-color: var(--color-safe);
    border-color: var(--color-safe);
  }

  .worksheet-checkbox-icon {
    font-weight: 700;
    font-size: var(--text-sm);
  }

  .worksheet-indicator-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-0);
    flex: 1;
    min-width: 0;
  }

  .worksheet-indicator-name {
    font-weight: 500;
    color: var(--color-text);
  }

  .worksheet-indicator-location {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .worksheet-indicator-details {
    padding: var(--space-2);
    background-color: var(--color-bg-primary);
    border-top: 1px solid var(--color-phosphor-green-dark);
  }

  .worksheet-indicator-description {
    margin: 0 0 var(--space-2) 0;
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    font-family: var(--font-document);
    line-height: 1.5;
  }

  .worksheet-indicator-note {
    width: 100%;
    min-height: 60px;
    padding: var(--space-2);
    background-color: var(--color-bg-secondary);
    border: 1px solid var(--color-phosphor-green-dark);
    border-radius: var(--radius-sm);
    color: var(--color-text);
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    resize: vertical;
  }

  .worksheet-indicator-note:focus {
    outline: none;
    border-color: var(--color-amber);
  }

  .worksheet-indicator-note::placeholder {
    color: var(--color-text-muted);
  }

  .worksheet-column-notes {
    margin-top: auto;
    padding-top: var(--space-3);
    border-top: 1px solid var(--color-phosphor-green-dark);
  }

  .worksheet-notes-label {
    display: block;
    margin-bottom: var(--space-2);
    font-size: var(--text-xs);
    color: var(--color-amber);
    font-weight: 500;
  }

  .worksheet-notes-textarea {
    width: 100%;
    min-height: 80px;
    padding: var(--space-2);
    background-color: var(--color-bg-primary);
    border: 1px solid var(--color-phosphor-green-dark);
    border-radius: var(--radius-sm);
    color: var(--color-text);
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    resize: vertical;
  }

  .worksheet-notes-textarea:focus {
    outline: none;
    border-color: var(--color-amber);
  }

  .worksheet-notes-textarea::placeholder {
    color: var(--color-text-muted);
  }

  .worksheet-risk-assessment {
    padding: var(--space-3) var(--space-4);
    background-color: var(--color-bg-tertiary);
    border-top: 1px solid var(--color-phosphor-green-dark);
  }

  .worksheet-risk-bar {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .worksheet-risk-label {
    font-weight: 600;
    color: var(--color-amber);
    white-space: nowrap;
  }

  .worksheet-risk-visual {
    flex: 1;
    height: 20px;
    background-color: var(--color-bg-primary);
    border: 1px solid var(--color-phosphor-green-dark);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .worksheet-risk-fill {
    height: 100%;
    transition:
      width 300ms ease,
      background-color 300ms ease;
  }

  .worksheet-risk-value {
    font-weight: 700;
    white-space: nowrap;
    min-width: 120px;
    text-align: right;
  }

  .worksheet-score-inputs {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-top: var(--space-2);
    font-size: var(--text-xs);
  }

  .worksheet-score-label {
    color: var(--color-text-muted);
  }

  .worksheet-override-label {
    color: var(--color-amber);
  }

  .worksheet-override-input {
    width: 60px;
    padding: var(--space-1) var(--space-2);
    background-color: var(--color-bg-primary);
    border: 1px solid var(--color-phosphor-green-dark);
    border-radius: var(--radius-sm);
    color: var(--color-text);
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    text-align: center;
  }

  .worksheet-override-input:focus {
    outline: none;
    border-color: var(--color-amber);
  }

  .worksheet-override-input::placeholder {
    color: var(--color-text-muted);
  }

  .worksheet-override-input::-webkit-inner-spin-button,
  .worksheet-override-input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .worksheet-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background-color: var(--color-bg-secondary);
    border-top: 1px solid var(--color-phosphor-green-dark);
  }

  @media (max-width: 480px) {
    .worksheet-actions {
      flex-direction: column;
    }
  }
</style>
