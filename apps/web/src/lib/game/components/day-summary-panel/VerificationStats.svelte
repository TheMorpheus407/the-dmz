<script lang="ts">
  import type { DaySummaryData } from '../day-summary';

  interface Props {
    verificationStats: DaySummaryData['verificationStats'];
  }

  const { verificationStats }: Props = $props();
</script>

<div class="verification-stats">
  <div class="verification-stats__verification-grid">
    <div class="verification-stats__verification-stat">
      <span class="verification-stats__verification-label">Requests Made</span>
      <span class="verification-stats__verification-value">{verificationStats.requestsMade}</span>
    </div>
    <div class="verification-stats__verification-stat">
      <span class="verification-stats__verification-label">Discrepancies Found</span>
      <span class="verification-stats__verification-value"
        >{verificationStats.discrepanciesFound}</span
      >
    </div>
    <div class="verification-stats__verification-stat">
      <span class="verification-stats__verification-label">Verification Accuracy</span>
      <span class="verification-stats__verification-value"
        >{verificationStats.accuracy.toFixed(1)}%</span
      >
    </div>
  </div>
</div>

<style>
  .verification-stats__verification-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-3);
  }

  .verification-stats__verification-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-2);
    background: var(--color-bg-secondary);
  }

  .verification-stats__verification-label {
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-phosphor-green-dim);
    text-transform: uppercase;
    text-align: center;
  }

  .verification-stats__verification-value {
    font-family: var(--font-terminal);
    font-size: var(--text-lg);
    color: var(--color-document-white);
  }
</style>
