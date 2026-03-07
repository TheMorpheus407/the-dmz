<script lang="ts">
  import { currentPhase, currentShortcutConfig } from '$lib/game/store/ui-store';

  interface Props {
    visible?: boolean;
    onClose?: () => void;
  }

  const { visible = false, onClose }: Props = $props();

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && onClose) {
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if visible}
  <div class="help-overlay" role="dialog" aria-modal="true" aria-labelledby="help-title">
    <div class="help-overlay__backdrop" onclick={onClose}></div>
    <div class="help-overlay__content">
      <header class="help-overlay__header">
        <h2 id="help-title" class="help-overlay__title">KEYBOARD SHORTCUTS</h2>
        <button type="button" class="help-overlay__close" onclick={onClose} aria-label="Close help">
          ×
        </button>
      </header>

      <div class="help-overlay__body">
        <section class="help-overlay__section">
          <h3 class="help-overlay__section-title">Core Decision Keys</h3>
          <table class="help-overlay__table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Action</th>
                <th>Phase</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><kbd>A</kbd></td>
                <td>Approve request</td>
                <td>DECISION_PENDING</td>
              </tr>
              <tr>
                <td><kbd>D</kbd></td>
                <td>Deny request</td>
                <td>DECISION_PENDING</td>
              </tr>
              <tr>
                <td><kbd>F</kbd></td>
                <td>Flag for review</td>
                <td>DECISION_PENDING</td>
              </tr>
              <tr>
                <td><kbd>V</kbd></td>
                <td>Request verification</td>
                <td>EMAIL_TRIAGE</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="help-overlay__section">
          <h3 class="help-overlay__section-title">Navigation Keys</h3>
          <table class="help-overlay__table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><kbd>↑</kbd> / <kbd>↓</kbd></td>
                <td>Navigate email list</td>
              </tr>
              <tr>
                <td><kbd>Enter</kbd></td>
                <td>Select email / Confirm action</td>
              </tr>
              <tr>
                <td><kbd>Tab</kbd></td>
                <td>Cycle focus between panels</td>
              </tr>
              <tr>
                <td><kbd>Esc</kbd></td>
                <td>Close modal / Cancel action</td>
              </tr>
              <tr>
                <td><kbd>?</kbd></td>
                <td>Show this help overlay</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="help-overlay__section">
          <h3 class="help-overlay__section-title">Additional Shortcuts</h3>
          <table class="help-overlay__table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Action</th>
                <th>Phase</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><kbd>W</kbd></td>
                <td>Open Phishing Analysis Worksheet</td>
                <td>EMAIL_TRIAGE</td>
              </tr>
              <tr>
                <td><kbd>E</kbd></td>
                <td>Cycle to next email</td>
                <td>EMAIL_TRIAGE</td>
              </tr>
              <tr>
                <td><kbd>R</kbd></td>
                <td>Refresh / Reload</td>
                <td>Any</td>
              </tr>
              <tr>
                <td><kbd>H</kbd></td>
                <td>Toggle facility dashboard</td>
                <td>Any</td>
              </tr>
              <tr>
                <td><kbd>N</kbd></td>
                <td>Next day</td>
                <td>DAY_END</td>
              </tr>
              <tr>
                <td><kbd>M</kbd></td>
                <td>Open upgrade shop</td>
                <td>RESOURCE_MANAGEMENT</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="help-overlay__section">
          <h3 class="help-overlay__section-title">Current Phase Shortcuts</h3>
          <p class="help-overlay__current-phase">
            Phase: <strong>{$currentPhase ?? 'Unknown'}</strong>
          </p>
          <div class="help-overlay__current-shortcuts">
            {#each $currentShortcutConfig.shortcuts as shortcut (shortcut)}
              <kbd class="help-overlay__shortcut-badge">{shortcut}</kbd>
            {/each}
          </div>
        </section>
      </div>

      <footer class="help-overlay__footer">
        <p class="help-overlay__tip">Press <kbd>?</kbd> to toggle this help overlay</p>
      </footer>
    </div>
  </div>
{/if}

<style>
  .help-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .help-overlay__backdrop {
    position: absolute;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(4px);
  }

  .help-overlay__content {
    position: relative;
    width: 90%;
    max-width: 800px;
    max-height: 85vh;
    background-color: var(--color-bg-secondary, #141a22);
    border: 2px solid var(--color-phosphor-green-dark, #334433);
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    font-family: var(--font-terminal, monospace);
    color: var(--color-document-white, #e0e0e0);
  }

  .help-overlay__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4);
    border-bottom: 1px solid var(--color-phosphor-green-dark, #334433);
    background-color: var(--color-bg-tertiary, #1e2832);
  }

  .help-overlay__title {
    margin: 0;
    font-size: var(--text-lg, 1.25rem);
    color: var(--color-amber, #ffb000);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .help-overlay__close {
    background: none;
    border: none;
    font-size: 2rem;
    color: var(--color-phosphor-green-dim, #88aa88);
    cursor: pointer;
    padding: 0;
    line-height: 1;
    transition: color 150ms ease;
  }

  .help-overlay__close:hover {
    color: var(--color-phosphor-green, #33ff33);
  }

  .help-overlay__body {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-4);
  }

  .help-overlay__section {
    margin-bottom: var(--space-6);
  }

  .help-overlay__section:last-child {
    margin-bottom: 0;
  }

  .help-overlay__section-title {
    margin: 0 0 var(--space-3);
    font-size: var(--text-md, 1.125rem);
    color: var(--color-phosphor-green, #33ff33);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .help-overlay__table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-sm, 0.875rem);
  }

  .help-overlay__table th,
  .help-overlay__table td {
    padding: var(--space-2) var(--space-3);
    text-align: left;
    border-bottom: 1px solid var(--color-phosphor-green-dark, #334433);
  }

  .help-overlay__table th {
    color: var(--color-phosphor-green-dim, #88aa88);
    font-weight: 600;
    text-transform: uppercase;
    font-size: var(--text-xs, 0.75rem);
  }

  .help-overlay__table td {
    color: var(--color-document-white, #e0e0e0);
  }

  .help-overlay__current-phase {
    margin: 0 0 var(--space-2);
    color: var(--color-warning, #ffcc00);
  }

  .help-overlay__current-shortcuts {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .help-overlay__shortcut-badge {
    display: inline-block;
    padding: var(--space-1) var(--space-2);
    background-color: var(--color-bg-tertiary, #1e2832);
    border: 1px solid var(--color-phosphor-green, #33ff33);
    border-radius: 4px;
    font-family: var(--font-terminal, monospace);
    font-size: var(--text-sm, 0.875rem);
    color: var(--color-phosphor-green, #33ff33);
  }

  .help-overlay__footer {
    padding: var(--space-3) var(--space-4);
    border-top: 1px solid var(--color-phosphor-green-dark, #334433);
    background-color: var(--color-bg-tertiary, #1e2832);
  }

  .help-overlay__tip {
    margin: 0;
    font-size: var(--text-xs, 0.75rem);
    color: var(--color-phosphor-green-dim, #88aa88);
    text-align: center;
  }

  kbd {
    display: inline-block;
    padding: 2px 6px;
    background-color: var(--color-bg-primary, #0a0e14);
    border: 1px solid var(--color-phosphor-green-dark, #334433);
    border-radius: 3px;
    font-family: var(--font-terminal, monospace);
    font-size: var(--text-xs, 0.75rem);
    color: var(--color-phosphor-green, #33ff33);
  }

  @media (prefers-reduced-motion: reduce) {
    .help-overlay__close {
      transition: none;
    }
  }
</style>
