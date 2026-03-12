<script lang="ts">
  import Button from '$lib/ui/components/Button.svelte';
  import {
    comparisonStore,
    isComparing,
    orientation,
  } from '$lib/game/store/document-comparison-store';
  import type { DocumentType } from '@the-dmz/shared';

  import DocumentViewer from './DocumentViewer.svelte';

  import type {
    DocumentHeader,
    DocumentFooter,
    DocumentAnnotation,
    CrossReference,
  } from './document-viewer';

  interface DocumentData {
    header: DocumentHeader;
    body: Record<string, unknown>;
    footer?: DocumentFooter;
  }

  interface SplitPaneDocumentViewerProps {
    primaryDocumentType?: DocumentType;
    primaryDocumentData?: DocumentData | null;
    primaryIsLoading?: boolean;
    primaryError?: string | null;
    primaryAnnotations?: DocumentAnnotation[];
    primaryCrossReferences?: CrossReference[];
    primaryHighlightedFieldId?: string | null;
    secondaryDocumentType?: DocumentType;
    secondaryDocumentData?: DocumentData | null;
    secondaryIsLoading?: boolean;
    secondaryError?: string | null;
    secondaryAnnotations?: DocumentAnnotation[];
    secondaryCrossReferences?: CrossReference[];
    secondaryHighlightedFieldId?: string | null;
    onPrimaryAnnotationAdd?: (annotation: DocumentAnnotation) => void;
    onPrimaryAnnotationRemove?: (annotationId: string) => void;
    onPrimaryCrossReferenceClick?: (targetDocumentId: string, targetField: string) => void;
    onPrimaryClose?: () => void;
    onSecondaryAnnotationAdd?: (annotation: DocumentAnnotation) => void;
    onSecondaryAnnotationRemove?: (annotationId: string) => void;
    onSecondaryCrossReferenceClick?: (targetDocumentId: string, targetField: string) => void;
    onSecondaryClose?: () => void;
    onCloseComparison?: () => void;
  }

  const {
    primaryDocumentType = 'EMAIL',
    primaryDocumentData = null,
    primaryIsLoading = false,
    primaryError = null,
    primaryAnnotations = [],
    primaryCrossReferences = [],
    primaryHighlightedFieldId = null,
    secondaryDocumentType = 'EMAIL',
    secondaryDocumentData = null,
    secondaryIsLoading = false,
    secondaryError = null,
    secondaryAnnotations = [],
    secondaryCrossReferences = [],
    secondaryHighlightedFieldId = null,
    onPrimaryAnnotationAdd,
    onPrimaryAnnotationRemove,
    onPrimaryCrossReferenceClick,
    onPrimaryClose,
    onSecondaryAnnotationAdd,
    onSecondaryAnnotationRemove,
    onSecondaryCrossReferenceClick,
    onSecondaryClose,
    onCloseComparison,
  }: SplitPaneDocumentViewerProps = $props();

  let isDragging = $state(false);
  let containerRef: HTMLDivElement | null = $state(null);
  let syncScrollEnabled = $state(true);

  comparisonStore.subscribe((state) => {
    syncScrollEnabled = state.synchronizedScroll;
  });

  let dividerPosition = $state(50);

  function handleDividerMouseDown(e: MouseEvent) {
    e.preventDefault();
    isDragging = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging || !containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let newPosition: number;
    if (currentOrientation === 'horizontal') {
      newPosition = (x / rect.width) * 100;
    } else {
      newPosition = (y / rect.height) * 100;
    }

    dividerPosition = Math.max(20, Math.min(80, newPosition));
    comparisonStore.setDividerPosition(dividerPosition);
  }

  function handleMouseUp() {
    isDragging = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && $isComparing) {
      handleCloseComparison();
    }
  }

  function handleCloseComparison() {
    comparisonStore.closeComparison();
    handleCloseComparisonInternal();
  }

  function handleToggleOrientation() {
    comparisonStore.toggleOrientation();
  }

  function handleToggleSyncScroll() {
    comparisonStore.toggleSynchronizedScroll();
  }

  const handlePrimaryAnnotationAdd = onPrimaryAnnotationAdd ?? (() => {});
  const handlePrimaryAnnotationRemove = onPrimaryAnnotationRemove ?? (() => {});
  const handlePrimaryCrossReferenceClick = onPrimaryCrossReferenceClick ?? (() => {});
  const handleSecondaryAnnotationAdd = onSecondaryAnnotationAdd ?? (() => {});
  const handleSecondaryAnnotationRemove = onSecondaryAnnotationRemove ?? (() => {});
  const handleSecondaryCrossReferenceClick = onSecondaryCrossReferenceClick ?? (() => {});
  const handlePrimaryCloseInternal = onPrimaryClose ?? (() => {});
  const handleSecondaryCloseInternal = onSecondaryClose ?? (() => {});
  const handleCloseComparisonInternal = onCloseComparison ?? (() => {});

  const currentOrientation = $derived($orientation);
  const isCurrentlyComparing = $derived($isComparing);
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if isCurrentlyComparing}
  <div
    class="split-pane-document-viewer"
    class:split-pane-document-viewer--horizontal={currentOrientation === 'horizontal'}
    class:split-pane-document-viewer--vertical={currentOrientation === 'vertical'}
    class:split-pane-document-viewer--dragging={isDragging}
    bind:this={containerRef}
    role="region"
    aria-label="Document comparison view"
  >
    <div class="split-pane-document-viewer__toolbar">
      <div class="split-pane-document-viewer__toolbar-left">
        <span class="split-pane-document-viewer__mode-indicator" aria-live="polite">
          COMPARISON MODE
        </span>
      </div>
      <div class="split-pane-document-viewer__toolbar-center">
        <Button
          variant="ghost"
          size="sm"
          onclick={handleToggleOrientation}
          ariaLabel="Toggle split orientation"
        >
          {currentOrientation === 'horizontal' ? '⊢⊣' : '⊥⊤'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onclick={handleToggleSyncScroll}
          ariaLabel="Toggle synchronized scrolling"
        >
          Sync: {syncScrollEnabled ? 'ON' : 'OFF'}
        </Button>
      </div>
      <div class="split-pane-document-viewer__toolbar-right">
        <Button
          variant="ghost"
          size="sm"
          onclick={handleCloseComparison}
          ariaLabel="Close comparison"
        >
          ✕
        </Button>
      </div>
    </div>

    <div class="split-pane-document-viewer__panes">
      <div
        class="split-pane-document-viewer__pane split-pane-document-viewer__pane--primary"
        style={currentOrientation === 'horizontal'
          ? `width: ${dividerPosition}%`
          : `height: ${dividerPosition}%`}
      >
        <div class="split-pane-document-viewer__pane-header">
          <span class="split-pane-document-viewer__pane-title">Document A</span>
          <Button
            variant="ghost"
            size="sm"
            onclick={() => handlePrimaryCloseInternal()}
            ariaLabel="Close document A"
          >
            ✕
          </Button>
        </div>
        <div class="split-pane-document-viewer__pane-content">
          <DocumentViewer
            documentType={primaryDocumentType}
            documentData={primaryDocumentData}
            isLoading={primaryIsLoading}
            error={primaryError}
            annotations={primaryAnnotations}
            crossReferences={primaryCrossReferences}
            highlightedFieldId={primaryHighlightedFieldId}
            onAnnotationAdd={handlePrimaryAnnotationAdd}
            onAnnotationRemove={handlePrimaryAnnotationRemove}
            onCrossReferenceClick={handlePrimaryCrossReferenceClick}
          />
        </div>
      </div>

      <div
        class="split-pane-document-viewer__divider"
        class:split-pane-document-viewer__divider--horizontal={currentOrientation === 'horizontal'}
        class:split-pane-document-viewer__divider--vertical={currentOrientation === 'vertical'}
        class:split-pane-document-viewer__divider--dragging={isDragging}
        role="separator"
        aria-orientation={currentOrientation}
        aria-valuenow={dividerPosition}
        aria-valuemin={20}
        aria-valuemax={80}
        tabindex="0"
        onmousedown={handleDividerMouseDown}
      >
        <div class="split-pane-document-viewer__divider-handle">
          <span class="split-pane-document-viewer__divider-line"></span>
        </div>
      </div>

      <div
        class="split-pane-document-viewer__pane split-pane-document-viewer__pane--secondary"
        style={currentOrientation === 'horizontal'
          ? `width: ${100 - dividerPosition}%`
          : `height: ${100 - dividerPosition}%`}
      >
        <div class="split-pane-document-viewer__pane-header">
          <span class="split-pane-document-viewer__pane-title">Document B</span>
          <Button
            variant="ghost"
            size="sm"
            onclick={() => handleSecondaryCloseInternal()}
            ariaLabel="Close document B"
          >
            ✕
          </Button>
        </div>
        <div class="split-pane-document-viewer__pane-content">
          <DocumentViewer
            documentType={secondaryDocumentType}
            documentData={secondaryDocumentData}
            isLoading={secondaryIsLoading}
            error={secondaryError}
            annotations={secondaryAnnotations}
            crossReferences={secondaryCrossReferences}
            highlightedFieldId={secondaryHighlightedFieldId}
            onAnnotationAdd={handleSecondaryAnnotationAdd}
            onAnnotationRemove={handleSecondaryAnnotationRemove}
            onCrossReferenceClick={handleSecondaryCrossReferenceClick}
          />
        </div>
      </div>
    </div>
  </div>
{:else}
  <DocumentViewer
    documentType={primaryDocumentType}
    documentData={primaryDocumentData}
    isLoading={primaryIsLoading}
    error={primaryError}
    annotations={primaryAnnotations}
    crossReferences={primaryCrossReferences}
    highlightedFieldId={primaryHighlightedFieldId}
    onAnnotationAdd={handlePrimaryAnnotationAdd}
    onAnnotationRemove={handlePrimaryAnnotationRemove}
    onCrossReferenceClick={handlePrimaryCrossReferenceClick}
    onClose={handlePrimaryCloseInternal}
  />
{/if}

<style>
  .split-pane-document-viewer {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: var(--color-bg-secondary);
    border: var(--border-default);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .split-pane-document-viewer--horizontal {
    flex-direction: row;
  }

  .split-pane-document-viewer--vertical {
    flex-direction: column;
  }

  .split-pane-document-viewer--dragging {
    cursor: col-resize;
    user-select: none;
  }

  .split-pane-document-viewer--dragging * {
    pointer-events: none;
  }

  .split-pane-document-viewer__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2) var(--space-3);
    background-color: var(--color-bg-tertiary);
    border-bottom: var(--border-default);
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .split-pane-document-viewer__toolbar-left,
  .split-pane-document-viewer__toolbar-center,
  .split-pane-document-viewer__toolbar-right {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .split-pane-document-viewer__mode-indicator {
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-phosphor-green);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    animation: pulse-glow 2s ease-in-out infinite;
  }

  @keyframes pulse-glow {
    0%,
    100% {
      text-shadow: 0 0 2px rgba(51, 255, 51, 0.4);
    }
    50% {
      text-shadow: 0 0 4px rgba(51, 255, 51, 0.6);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .split-pane-document-viewer__mode-indicator {
      animation: none;
      text-shadow: none;
    }
  }

  .split-pane-document-viewer__panes {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .split-pane-document-viewer--horizontal .split-pane-document-viewer__panes {
    flex-direction: row;
  }

  .split-pane-document-viewer--vertical .split-pane-document-viewer__panes {
    flex-direction: column;
  }

  .split-pane-document-viewer__pane {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .split-pane-document-viewer__pane--primary {
    min-width: 200px;
    min-height: 200px;
  }

  .split-pane-document-viewer__pane--secondary {
    min-width: 200px;
    min-height: 200px;
  }

  .split-pane-document-viewer__pane-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2) var(--space-3);
    background-color: var(--color-bg-tertiary);
    border-bottom: var(--border-default);
    flex-shrink: 0;
  }

  .split-pane-document-viewer__pane-title {
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-amber);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .split-pane-document-viewer__pane-content {
    flex: 1;
    overflow: hidden;
  }

  .split-pane-document-viewer__divider {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--color-phosphor-green-dark);
    transition: background-color 150ms ease;
    cursor: col-resize;
  }

  .split-pane-document-viewer__divider--horizontal {
    width: 6px;
    cursor: col-resize;
  }

  .split-pane-document-viewer__divider--vertical {
    height: 6px;
    cursor: row-resize;
  }

  .split-pane-document-viewer__divider:hover,
  .split-pane-document-viewer__divider--dragging {
    background-color: var(--color-phosphor-green);
  }

  .split-pane-document-viewer__divider-handle {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .split-pane-document-viewer__divider-line {
    display: block;
    background-color: var(--color-phosphor-green);
    border-radius: 1px;
    animation: divider-pulse 1.5s ease-in-out infinite;
  }

  .split-pane-document-viewer__divider--horizontal .split-pane-document-viewer__divider-line {
    width: 2px;
    height: 24px;
  }

  .split-pane-document-viewer__divider--vertical .split-pane-document-viewer__divider-line {
    width: 24px;
    height: 2px;
  }

  @keyframes divider-pulse {
    0%,
    100% {
      opacity: 0.5;
    }
    50% {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .split-pane-document-viewer__divider-line {
      animation: none;
    }
  }
</style>
