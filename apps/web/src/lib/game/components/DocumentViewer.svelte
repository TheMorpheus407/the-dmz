<script lang="ts">
  /* eslint-disable @typescript-eslint/no-explicit-any */
  import LoadingState from '$lib/ui/components/LoadingState.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import { createPinchZoomHandler, triggerHaptic } from '$lib/utils';

  import EmailViewer from './EmailViewer.svelte';
  import PhishingAnalysisWorksheet from './PhishingAnalysisWorksheet.svelte';
  import VerificationPacketViewer from './VerificationPacketViewer.svelte';
  import ThreatAssessmentSheet from './ThreatAssessmentSheet.svelte';
  import IncidentLog from './IncidentLog.svelte';
  import DataSalvageContract from './DataSalvageContract.svelte';
  import StorageLeaseAgreement from './StorageLeaseAgreement.svelte';
  import UpgradeProposal from './UpgradeProposal.svelte';
  import BlacklistNotice from './BlacklistNotice.svelte';
  import WhitelistException from './WhitelistException.svelte';
  import FacilityStatusReport from './FacilityStatusReport.svelte';
  import IntelligenceBrief from './IntelligenceBrief.svelte';
  import RansomNote from './RansomNote.svelte';
  import {
    getDocumentTypeLabel,
    type DocumentHeader,
    type DocumentFooter,
    type DocumentAnnotation,
    type CrossReference,
    type ClassificationLevel,
    type DocumentType,
  } from './document-viewer';

  interface DocumentData {
    header: DocumentHeader;
    body: Record<string, unknown>;
    footer?: DocumentFooter;
  }

  interface Props {
    documentType: DocumentType;
    documentData: DocumentData | null;
    isLoading?: boolean;
    error?: string | null;
    annotations?: DocumentAnnotation[];
    crossReferences?: CrossReference[];
    highlightedFieldId?: string | null;
    onAnnotationAdd?: (annotation: DocumentAnnotation) => void;
    onAnnotationRemove?: (annotationId: string) => void;
    onCrossReferenceClick?: (targetDocumentId: string, targetField: string) => void;
    onClose?: () => void;
  }

  const {
    documentType,
    documentData,
    isLoading = false,
    error = null,
    annotations: _annotations = [],
    crossReferences: _crossReferences = [],
    highlightedFieldId: _highlightedFieldId = null,
    onAnnotationAdd: _onAnnotationAdd,
    onAnnotationRemove: _onAnnotationRemove,
    onCrossReferenceClick: _onCrossReferenceClick,
    onClose,
  }: Props = $props();

  function getClassificationColor(classification: ClassificationLevel): string {
    const colors: Record<ClassificationLevel, string> = {
      PUBLIC: 'var(--color-safe)',
      INTERNAL: 'var(--color-info)',
      CONFIDENTIAL: 'var(--color-warning)',
      RESTRICTED: 'var(--color-danger)',
    };
    return colors[classification];
  }

  let currentZoom = $state(1);

  const pinchZoomHandler = createPinchZoomHandler({
    minScale: 0.75,
    maxScale: 2.0,
    onZoomChange: (scale) => {
      currentZoom = scale;
    },
  });

  function handleResetZoom() {
    triggerHaptic('light');
    currentZoom = 1;
    pinchZoomHandler.reset();
  }

  function handleZoomIn() {
    triggerHaptic('light');
    currentZoom = Math.min(currentZoom + 0.25, 2.0);
  }

  function handleZoomOut() {
    triggerHaptic('light');
    currentZoom = Math.max(currentZoom - 0.25, 0.75);
  }
</script>

<div class="document-viewer" role="region" aria-label={getDocumentTypeLabel(documentType)}>
  {#if isLoading}
    <div class="document-viewer__loading">
      <LoadingState
        variant="dots"
        size="md"
        message="Loading document..."
        label="Loading document content"
      />
    </div>
  {:else if error}
    <div class="document-viewer__error" role="alert">
      <div class="document-viewer__error-icon">⚠</div>
      <div class="document-viewer__error-message">{error}</div>
      <div class="document-viewer__error-hint">
        Unable to load document. Please try again later.
      </div>
    </div>
  {:else if !documentData}
    <div class="document-viewer__empty">
      <div class="document-viewer__empty-icon">📄</div>
      <div class="document-viewer__empty-message">No document selected</div>
      <div class="document-viewer__empty-hint">Select a document to view its contents</div>
    </div>
  {:else}
    <div class="document-viewer__content">
      <header class="document-viewer__header">
        <div class="document-viewer__header-main">
          <div class="document-viewer__title-row">
            <h1 class="document-viewer__title">{documentData.header.title}</h1>
            <span
              class="document-viewer__classification"
              style="color: {getClassificationColor(documentData.header.classification)}"
            >
              [{documentData.header.classification}]
            </span>
          </div>
          <div class="document-viewer__meta-row">
            <span class="document-viewer__meta-item">
              <span class="document-viewer__label">Issuer:</span>
              {documentData.header.issuer}
            </span>
            <span class="document-viewer__meta-divider">|</span>
            <span class="document-viewer__meta-item">
              <span class="document-viewer__label">Date:</span>
              {documentData.header.issuedDate}
            </span>
            <span class="document-viewer__meta-divider">|</span>
            <span class="document-viewer__meta-item">
              <span class="document-viewer__label">ID:</span>
              {documentData.header.documentId.slice(0, 12)}...
            </span>
          </div>
        </div>
        {#if onClose}
          <Button variant="ghost" size="sm" onclick={onClose} ariaLabel="Close document">✕</Button>
        {/if}
        <div class="document-viewer__zoom-controls">
          <button
            type="button"
            class="zoom-btn"
            onclick={handleZoomOut}
            aria-label="Zoom out"
            disabled={currentZoom <= 0.75}
          >
            −
          </button>
          <span class="zoom-level">{Math.round(currentZoom * 100)}%</span>
          <button
            type="button"
            class="zoom-btn"
            onclick={handleZoomIn}
            aria-label="Zoom in"
            disabled={currentZoom >= 2.0}
          >
            +
          </button>
          <button
            type="button"
            class="zoom-btn zoom-btn--reset"
            onclick={handleResetZoom}
            aria-label="Reset zoom"
          >
            ↺
          </button>
        </div>
      </header>

      <div
        class="document-viewer__body"
        style="transform: scale({currentZoom}); transform-origin: top center;"
        ontouchstart={(e) => pinchZoomHandler.onTouchStart(e)}
        ontouchmove={(e) => pinchZoomHandler.onTouchMove(e)}
        ontouchend={() => pinchZoomHandler.onTouchEnd()}
      >
        {#if documentType === 'EMAIL'}
          <EmailViewer email={documentData.body['email'] as any} />
        {:else if documentType === 'PAW'}
          <PhishingAnalysisWorksheet email={documentData.body['email'] as any} />
        {:else if documentType === 'VERIFICATION_PACKET'}
          <VerificationPacketViewer
            packet={documentData.body['packet'] as any}
            emailId={documentData.body['emailId'] as any}
          />
        {:else if documentType === 'THREAT_ASSESSMENT'}
          <ThreatAssessmentSheet
            data={documentData.body as any}
            highlightedFieldId={_highlightedFieldId}
            {..._onCrossReferenceClick ? { onFieldClick: _onCrossReferenceClick } : {}}
          />
        {:else if documentType === 'INCIDENT_LOG'}
          <IncidentLog
            data={documentData.body as any}
            highlightedFieldId={_highlightedFieldId}
            {..._onCrossReferenceClick ? { onFieldClick: _onCrossReferenceClick } : {}}
          />
        {:else if documentType === 'DATA_SALVAGE_CONTRACT'}
          <DataSalvageContract
            data={documentData.body as any}
            highlightedFieldId={_highlightedFieldId}
            {..._onCrossReferenceClick ? { onFieldClick: _onCrossReferenceClick } : {}}
          />
        {:else if documentType === 'STORAGE_LEASE'}
          <StorageLeaseAgreement
            data={documentData.body as any}
            highlightedFieldId={_highlightedFieldId}
            {..._onCrossReferenceClick ? { onFieldClick: _onCrossReferenceClick } : {}}
          />
        {:else if documentType === 'UPGRADE_PROPOSAL'}
          <UpgradeProposal
            data={documentData.body as any}
            highlightedFieldId={_highlightedFieldId}
            {..._onCrossReferenceClick ? { onFieldClick: _onCrossReferenceClick } : {}}
          />
        {:else if documentType === 'BLACKLIST_NOTICE'}
          <BlacklistNotice
            data={documentData.body as any}
            highlightedFieldId={_highlightedFieldId}
            {..._onCrossReferenceClick ? { onFieldClick: _onCrossReferenceClick } : {}}
          />
        {:else if documentType === 'WHITELIST_EXCEPTION'}
          <WhitelistException
            data={documentData.body as any}
            highlightedFieldId={_highlightedFieldId}
            {..._onCrossReferenceClick ? { onFieldClick: _onCrossReferenceClick } : {}}
          />
        {:else if documentType === 'FACILITY_REPORT'}
          <FacilityStatusReport
            data={documentData.body as any}
            highlightedFieldId={_highlightedFieldId}
            {..._onCrossReferenceClick ? { onFieldClick: _onCrossReferenceClick } : {}}
          />
        {:else if documentType === 'INTELLIGENCE_BRIEF'}
          <IntelligenceBrief
            data={documentData.body as any}
            highlightedFieldId={_highlightedFieldId}
            {..._onCrossReferenceClick ? { onFieldClick: _onCrossReferenceClick } : {}}
          />
        {:else if documentType === 'RANSOM_NOTE'}
          <RansomNote
            data={documentData.body as any}
            highlightedFieldId={_highlightedFieldId}
            {..._onCrossReferenceClick ? { onFieldClick: _onCrossReferenceClick } : {}}
          />
        {/if}
      </div>

      {#if documentData.footer}
        <footer class="document-viewer__footer">
          {#if documentData.footer.signatureBlock}
            <div class="document-viewer__signature">
              {documentData.footer.signatureBlock}
            </div>
          {/if}
          {#if documentData.footer.hashReference}
            <div class="document-viewer__hash">
              Hash: {documentData.footer.hashReference}
            </div>
          {/if}
          {#if documentData.footer.chainOfCustody}
            <div class="document-viewer__custody">
              Chain of Custody: {documentData.footer.chainOfCustody}
            </div>
          {/if}
        </footer>
      {/if}
    </div>
  {/if}
</div>

<style>
  .document-viewer {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: var(--color-bg-secondary);
    border: var(--border-default);
    border-radius: var(--radius-md);
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text);
    overflow: hidden;
  }

  .document-viewer__loading,
  .document-viewer__error,
  .document-viewer__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: var(--space-4);
    text-align: center;
  }

  .document-viewer__error {
    color: var(--color-danger);
  }

  .document-viewer__error-icon,
  .document-viewer__empty-icon {
    font-size: var(--text-2xl);
    margin-bottom: var(--space-2);
  }

  .document-viewer__error-message {
    font-weight: 600;
    margin-bottom: var(--space-1);
  }

  .document-viewer__error-hint,
  .document-viewer__empty-hint {
    color: var(--color-text-muted);
    font-size: var(--text-xs);
  }

  .document-viewer__empty {
    color: var(--color-text-muted);
  }

  .document-viewer__empty-message {
    font-size: var(--text-md);
    margin-bottom: var(--space-1);
  }

  .document-viewer__content {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow-y: auto;
  }

  .document-viewer__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: var(--space-3);
    border-bottom: var(--border-default);
    background-color: var(--color-bg-tertiary);
  }

  .document-viewer__header-main {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    flex: 1;
  }

  .document-viewer__title-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .document-viewer__title {
    font-family: var(--font-terminal);
    font-size: var(--text-lg);
    font-weight: 700;
    color: var(--color-amber);
    margin: 0;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .document-viewer__classification {
    font-size: var(--text-xs);
    font-weight: 600;
  }

  .document-viewer__meta-row {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    flex-wrap: wrap;
  }

  .document-viewer__meta-item {
    display: flex;
    gap: var(--space-1);
  }

  .document-viewer__label {
    color: var(--color-phosphor-green-dim);
  }

  .document-viewer__meta-divider {
    color: var(--color-phosphor-green-dark);
  }

  .document-viewer__body {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-3);
  }

  .document-viewer__footer {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3);
    border-top: var(--border-default);
    background-color: var(--color-bg-tertiary);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .document-viewer__signature {
    font-family: var(--font-document);
    color: var(--color-text-document);
  }

  .document-viewer__hash {
    font-family: var(--font-terminal);
  }

  .document-viewer__custody {
    font-family: var(--font-terminal);
  }

  .document-viewer__zoom-controls {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    margin-left: var(--space-2);
  }

  .zoom-btn {
    width: 32px;
    height: 32px;
    border: 1px solid var(--color-phosphor-green-dark);
    border-radius: var(--radius-sm);
    background-color: var(--color-bg-secondary);
    color: var(--color-phosphor-green);
    font-size: var(--text-lg);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 100ms ease;
    -webkit-tap-highlight-color: transparent;
  }

  .zoom-btn:hover:not(:disabled) {
    background-color: var(--color-bg-hover);
  }

  .zoom-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .zoom-btn--reset {
    font-size: var(--text-md);
  }

  .zoom-level {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    min-width: 40px;
    text-align: center;
    font-family: var(--font-terminal);
  }

  @media (pointer: coarse) {
    .zoom-btn {
      width: 44px;
      height: 44px;
    }
  }
</style>
