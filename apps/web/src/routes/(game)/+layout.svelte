<script lang="ts">
  import { onMount } from 'svelte';

  import { themeStore, getRouteDefaultTheme, STORAGE_KEY } from '$lib/stores/theme';
  import Drawer from '$lib/ui/components/Drawer.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import LoadingState from '$lib/ui/components/LoadingState.svelte';
  import Modal from '$lib/ui/components/Modal.svelte';
  import CrtControlsPanel from '$lib/ui/components/CrtControlsPanel.svelte';
  import SoundControlsPanel from '$lib/ui/components/SoundControlsPanel.svelte';
  import SoundCaption from '$lib/ui/components/SoundCaption.svelte';
  import KeyboardShortcutHandler from '$lib/game/components/KeyboardShortcutHandler.svelte';
  import HelpOverlay from '$lib/game/components/HelpOverlay.svelte';
  import ThunkFeedback from '$lib/game/components/ThunkFeedback.svelte';
  import ThreatIndicator from '$lib/game/components/ThreatIndicator.svelte';
  import ToastContainer from '$lib/ui/components/ToastContainer.svelte';
  import UpgradeShop from '$lib/game/components/UpgradeShop.svelte';
  import RansomLockoutScreen from '$lib/game/components/RansomLockoutScreen.svelte';
  import { uiStore, modalState } from '$lib/game/store/ui-store';
  import { soundStore } from '$lib/stores/sound';
  import { soundManager, SoundCategory } from '$lib/audio';
  import {
    createTouchPanHandler,
    createSwipeHandler,
    type SwipeDirection,
  } from '$lib/utils/gestures';

  import type { Snippet } from 'svelte';

  import { navigating } from '$app/stores';

  interface Props {
    children?: Snippet;
  }

  const { children }: Props = $props();

  type PanelId = 'inbox' | 'document' | 'status';
  let activePanel: PanelId = $state('document');
  let isStatusDrawerOpen = $state(false);
  let isTabletDrawerOpen = $state(false);
  let helpVisible = $state(false);
  let crtControlsOpen = $state(false);
  let soundControlsOpen = $state(false);
  let selectedEmailIndex = $state(0);

  const currentDay = 14;
  const currentTime = '08:00 CEST';
  const threatLevel = 3;
  const threatLabel = 'ELEVATED';
  const funds = 12450;
  const fundsChange = 500;

  const rackUsage = 8;
  const rackTotal = 12;
  const powerUsage = 78;
  const coolingStatus = 'OK';
  const coolingUsage = 52;
  const bandwidthUsage = 52;
  const activeThreats = 2;

  function setActivePanel(panel: PanelId) {
    activePanel = panel;
  }

  function toggleStatusDrawer() {
    isStatusDrawerOpen = !isStatusDrawerOpen;
  }

  let thunkVisible = $state(false);
  let thunkType: 'approve' | 'deny' | 'flag' | 'verify' | 'default' = $state('default');

  function handleApprove() {
    thunkType = 'approve';
    thunkVisible = true;
    setTimeout(() => (thunkVisible = false), 400);
    soundManager.play(SoundCategory.Stamps, 'approveStamp');
    uiStore.addNotification('Request approved', 'success');
  }

  function handleDeny() {
    thunkType = 'deny';
    thunkVisible = true;
    setTimeout(() => (thunkVisible = false), 400);
    soundManager.play(SoundCategory.Stamps, 'denyStamp');
    uiStore.addNotification('Request denied', 'warning');
  }

  function handleFlag() {
    thunkType = 'flag';
    thunkVisible = true;
    setTimeout(() => (thunkVisible = false), 400);
    soundManager.play(SoundCategory.UiFeedback, 'panelSwitch');
    uiStore.addNotification('Request flagged for review', 'info');
  }

  function handleVerify() {
    thunkType = 'verify';
    thunkVisible = true;
    setTimeout(() => (thunkVisible = false), 400);
    soundManager.play(SoundCategory.UiFeedback, 'buttonPress');
    uiStore.addNotification('Verification requested', 'info');
  }

  function handleShowHelp() {
    helpVisible = true;
  }

  function handleHideHelp() {
    helpVisible = false;
  }

  function handleToggleFacility() {
    if (activePanel === 'status') {
      activePanel = 'document';
    } else {
      activePanel = 'status';
    }
  }

  function handleToggleUpgrades() {
    uiStore.openModal('upgrade');
  }

  function handleSelectNext() {
    selectedEmailIndex = Math.min(selectedEmailIndex + 1, 2);
  }

  function handleSelectPrevious() {
    selectedEmailIndex = Math.max(selectedEmailIndex - 1, 0);
  }

  function handleSelectNextEmail() {
    selectedEmailIndex = Math.min(selectedEmailIndex + 1, 2);
  }

  function handleRefresh() {
    uiStore.addNotification('Refreshing...', 'info');
  }

  function handleAdvanceDay() {
    uiStore.addNotification('Advancing to next day...', 'info');
  }

  function handleCancel() {
    if (helpVisible) {
      helpVisible = false;
    } else {
      uiStore.closeModal();
    }
  }

  const tabletPanelGesture = createTouchPanHandler((direction) => {
    if (direction === 'next' && activePanel === 'inbox') {
      activePanel = 'document';
    } else if (direction === 'prev' && activePanel === 'document') {
      activePanel = 'inbox';
    }
  }, 40);

  const mobileSwipeGesture = createSwipeHandler(
    (direction: SwipeDirection) => {
      if (direction === 'left') {
        handleSelectNextEmail();
      } else if (direction === 'right') {
        selectedEmailIndex = Math.max(selectedEmailIndex - 1, 0);
      }
    },
    { minSwipeDistance: 50, maxSwipeTime: 400 },
  );

  function handleTouchStart(event: TouchEvent) {
    tabletPanelGesture.onTouchStart(event);
    mobileSwipeGesture.onTouchStart(event);
  }

  function handleTouchMove(event: TouchEvent) {
    tabletPanelGesture.onTouchMove(event);
  }

  function handleTouchEnd(event: TouchEvent) {
    tabletPanelGesture.onTouchEnd();
    mobileSwipeGesture.onTouchEnd(event);
  }

  const shortcutHandlers = $derived({
    onApprove: handleApprove,
    onDeny: handleDeny,
    onFlag: handleFlag,
    onVerify: handleVerify,
    onShowHelp: handleShowHelp,
    onHideHelp: handleHideHelp,
    onToggleFacility: handleToggleFacility,
    onToggleUpgrades: handleToggleUpgrades,
    onSelectNext: handleSelectNext,
    onSelectPrevious: handleSelectPrevious,
    onSelectNextEmail: handleSelectNextEmail,
    onRefresh: handleRefresh,
    onAdvanceDay: handleAdvanceDay,
    onCancel: handleCancel,
  });

  onMount(() => {
    themeStore.init();
    soundStore.init();

    const systemPrefs = themeStore.getSystemPreferences();

    if (systemPrefs.prefersReducedMotion) {
      themeStore.setEffects({
        scanlines: false,
        curvature: false,
        glow: false,
        noise: false,
        vignette: false,
      });
    } else if (!localStorage.getItem(STORAGE_KEY)) {
      themeStore.setTheme(getRouteDefaultTheme('game'));
    }
  });
</script>

<section
  class="surface surface-game crt-scanlines crt-noise crt-vignette crt-curvature"
  data-surface="game"
  ontouchstart={handleTouchStart}
  ontouchmove={handleTouchMove}
  ontouchend={handleTouchEnd}
>
  <div class="shell-game game-viewport">
    {#if $navigating}
      <div class="loading-overlay">
        <LoadingState
          variant="dots"
          size="lg"
          message="Establishing secure connection..."
          label="Game loading"
        />
      </div>
    {:else}
      <header class="shell-game__header">
        <div class="shell-game__header-left">
          <span class="shell-game__header-title crt-glow"
            >[M] MATRICES GmbH SECURE TERMINAL v4.7</span
          >
        </div>
        <div class="shell-game__header-center">
          <span class="shell-game__header-time">Day {currentDay} | {currentTime}</span>
        </div>
        <div class="shell-game__header-right">
          <ThreatIndicator level={threatLevel} variant="compact" showLabel={false} />
          <span class="shell-game__header-threat">
            THREAT: <span class="shell-game__threat-level shell-game__threat-level--{threatLevel}"
              >{threatLabel}</span
            >
            {#if threatLevel >= 3}[!]{/if}
          </span>
          <span class="shell-game__header-funds">
            FUNDS: {funds.toLocaleString()} CR [+{fundsChange}]
          </span>
          <Button variant="ghost" size="sm" onclick={() => (crtControlsOpen = true)}>
            Effects
          </Button>
          <Button variant="ghost" size="sm" onclick={() => (soundControlsOpen = true)}>
            Sound
          </Button>
        </div>
      </header>

      <div class="shell-game__panel--inbox shell-game__panel--active">
        <div class="shell-game__inbox">
          <div class="shell-game__inbox-header">
            <span class="shell-game__inbox-title">INBOX</span>
          </div>

          <div class="shell-game__inbox-section">
            <div class="shell-game__inbox-section-header">
              <span class="shell-game__inbox-section-label">NEW</span>
              <span class="shell-game__inbox-section-count">(3)</span>
            </div>
            <div class="shell-game__inbox-item shell-game__inbox-item--unread">
              <span class="shell-game__inbox-item-priority">[!]</span>
              <span class="shell-game__inbox-item-subject">Emergency Data Recovery</span>
            </div>
            <div class="shell-game__inbox-item shell-game__inbox-item--unread">
              <span class="shell-game__inbox-item-priority">[!]</span>
              <span class="shell-game__inbox-item-subject">Storage Lease Renewal</span>
            </div>
            <div class="shell-game__inbox-item shell-game__inbox-item--unread">
              <span class="shell-game__inbox-item-priority">[!]</span>
              <span class="shell-game__inbox-item-subject">Verification Request</span>
            </div>
          </div>

          <div class="shell-game__inbox-divider">-----</div>

          <div class="shell-game__inbox-section">
            <div class="shell-game__inbox-section-header">
              <span class="shell-game__inbox-section-label">PENDING</span>
              <span class="shell-game__inbox-section-count">(4)</span>
            </div>
            <div class="shell-game__inbox-item">
              <span class="shell-game__inbox-item-subject">Faculty Database Request</span>
            </div>
            <div class="shell-game__inbox-item">
              <span class="shell-game__inbox-item-subject">Research Archive Access</span>
            </div>
          </div>

          <div class="shell-game__inbox-divider">-----</div>

          <div class="shell-game__inbox-section">
            <div class="shell-game__inbox-section-header">
              <span class="shell-game__inbox-section-label">ARCHIVED</span>
              <span class="shell-game__inbox-section-count">(12)</span>
            </div>
          </div>

          <div class="shell-game__inbox-divider">-----</div>

          <div class="shell-game__inbox-section">
            <div class="shell-game__inbox-section-header">
              <span class="shell-game__inbox-section-label">FLAGGED</span>
              <span class="shell-game__inbox-section-count">(1)</span>
            </div>
          </div>
        </div>
      </div>

      <div class="shell-game__panel--document shell-game__panel--active">
        {#if children}
          {@render children()}
        {:else}
          <div class="shell-game__placeholder">
            <span class="shell-game__placeholder-label">Document</span>
          </div>
        {/if}
      </div>

      <div class="shell-game__panel--status">
        <div class="shell-game__status">
          <div class="shell-game__status-header">
            <span class="shell-game__status-title">FACILITY STATUS</span>
          </div>

          <div class="shell-game__status-section">
            <span class="shell-game__status-label">RACKS</span>
            <div class="shell-game__status-meter">
              <div
                class="shell-game__status-meter-fill"
                style="width: {(rackUsage / rackTotal) * 100}%"
              ></div>
            </div>
            <span class="shell-game__status-value">{rackUsage}/{rackTotal}</span>
          </div>

          <div class="shell-game__status-section">
            <span class="shell-game__status-label">POWER</span>
            <div class="shell-game__status-meter">
              <div class="shell-game__status-meter-fill" style="width: {powerUsage}%"></div>
            </div>
            <span class="shell-game__status-value">{powerUsage}%</span>
          </div>

          <div class="shell-game__status-section">
            <span class="shell-game__status-label">COOLING</span>
            <div class="shell-game__status-meter">
              <div class="shell-game__status-meter-fill" style="width: {coolingUsage}%"></div>
            </div>
            <span class="shell-game__status-value">{coolingStatus}</span>
          </div>

          <div class="shell-game__status-section">
            <span class="shell-game__status-label">BANDWIDTH</span>
            <div class="shell-game__status-meter">
              <div class="shell-game__status-meter-fill" style="width: {bandwidthUsage}%"></div>
            </div>
            <span class="shell-game__status-value">{bandwidthUsage}%</span>
          </div>

          <div class="shell-game__status-divider">-------</div>

          <div class="shell-game__status-section">
            <span class="shell-game__status-label">ACTIVE THREATS: {activeThreats}</span>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          class="shell-game__drawer-toggle"
          onclick={toggleStatusDrawer}
          ariaLabel="Toggle status panel"
        >
          {isStatusDrawerOpen ? 'Close' : 'Status'}
        </Button>
      </div>

      <div class="shell-game__tablet-drawer-toggle">
        <Button
          variant="ghost"
          size="sm"
          onclick={() => (isTabletDrawerOpen = true)}
          ariaLabel="Open facility panel"
        >
          Facility
        </Button>
      </div>

      <div class="shell-game__action-bar">
        <Button variant="primary" size="md" onclick={handleApprove}>APPROVE</Button>
        <Button variant="danger" size="md" onclick={handleDeny}>DENY</Button>
        <Button variant="secondary" size="md" onclick={handleFlag}>FLAG FOR REVIEW</Button>
        <Button variant="secondary" size="md" onclick={handleVerify}>VERIFY</Button>
      </div>

      <footer class="shell-game__footer crt-glow">
        <span class="shell-game__footer-prompt">&gt; Terminal ready. Type 'help' for commands.</span
        >
        <span class="shell-game__footer-controls">[_][o][x]</span>
      </footer>
    {/if}
  </div>

  <Drawer bind:open={isStatusDrawerOpen} ariaLabel="Status Panel">
    <div class="shell-game__placeholder">
      <span class="shell-game__placeholder-label">Status</span>
    </div>
  </Drawer>

  <Drawer bind:open={isTabletDrawerOpen} position="right" ariaLabel="Facility Panel">
    <div class="shell-game__drawer-facility">
      <div class="shell-game__drawer-facility-header">
        <span class="shell-game__drawer-facility-title">FACILITY STATUS</span>
        <Button variant="ghost" size="sm" onclick={() => (isTabletDrawerOpen = false)}>
          Close
        </Button>
      </div>
      <div class="shell-game__drawer-facility-content">
        <div class="shell-game__status-section">
          <span class="shell-game__status-label">RACKS</span>
          <div class="shell-game__status-meter">
            <div
              class="shell-game__status-meter-fill"
              style="width: {(rackUsage / rackTotal) * 100}%"
            ></div>
          </div>
          <span class="shell-game__status-value">{rackUsage}/{rackTotal}</span>
        </div>

        <div class="shell-game__status-section">
          <span class="shell-game__status-label">POWER</span>
          <div class="shell-game__status-meter">
            <div class="shell-game__status-meter-fill" style="width: {powerUsage}%"></div>
          </div>
          <span class="shell-game__status-value">{powerUsage}%</span>
        </div>

        <div class="shell-game__status-section">
          <span class="shell-game__status-label">COOLING</span>
          <div class="shell-game__status-meter">
            <div class="shell-game__status-meter-fill" style="width: {coolingUsage}%"></div>
          </div>
          <span class="shell-game__status-value">{coolingStatus}</span>
        </div>

        <div class="shell-game__status-section">
          <span class="shell-game__status-label">BANDWIDTH</span>
          <div class="shell-game__status-meter">
            <div class="shell-game__status-meter-fill" style="width: {bandwidthUsage}%"></div>
          </div>
          <span class="shell-game__status-value">{bandwidthUsage}%</span>
        </div>

        <div class="shell-game__status-divider">-------</div>

        <div class="shell-game__status-section">
          <span class="shell-game__status-label">ACTIVE THREATS: {activeThreats}</span>
        </div>
      </div>
    </div>
  </Drawer>

  <KeyboardShortcutHandler handlers={shortcutHandlers} />
  <HelpOverlay visible={helpVisible} onClose={handleHideHelp} />
  <ThunkFeedback type={thunkType} visible={thunkVisible} />
  <ToastContainer />
  <SoundCaption />

  <Modal bind:open={crtControlsOpen} title="Display Effects" size="md">
    <CrtControlsPanel />
  </Modal>

  <Modal bind:open={soundControlsOpen} title="Sound Settings" size="md">
    <SoundControlsPanel />
  </Modal>

  <Modal
    open={$modalState.isOpen && $modalState.type === 'upgrade'}
    title="Upgrade Shop"
    size="lg"
    onclose={() => uiStore.closeModal()}
  >
    <UpgradeShop
      availableFunds={funds}
      {currentDay}
      onclose={() => uiStore.closeModal()}
      onpurchase={(upgradeId: string) => {
        uiStore.addNotification(`Upgrade ${upgradeId} purchased!`, 'success');
        uiStore.closeModal();
      }}
    />
  </Modal>

  <RansomLockoutScreen />

  <nav class="shell-game__mobile-nav" aria-label="Panel navigation">
    <button
      type="button"
      class="shell-game__mobile-tab"
      class:shell-game__mobile-tab--active={activePanel === 'inbox'}
      aria-selected={activePanel === 'inbox'}
      role="tab"
      onclick={() => setActivePanel('inbox')}
    >
      Inbox
    </button>
    <button
      type="button"
      class="shell-game__mobile-tab"
      class:shell-game__mobile-tab--active={activePanel === 'document'}
      aria-selected={activePanel === 'document'}
      role="tab"
      onclick={() => setActivePanel('document')}
    >
      Email
    </button>
    <button
      type="button"
      class="shell-game__mobile-tab"
      class:shell-game__mobile-tab--active={activePanel === 'status'}
      aria-selected={activePanel === 'status'}
      role="tab"
      onclick={() => setActivePanel('status')}
    >
      Facility
    </button>
    <button
      type="button"
      class="shell-game__mobile-tab"
      aria-selected={false}
      role="tab"
      aria-label="Settings"
    >
      Settings
    </button>
  </nav>
</section>

<style>
  .surface-game {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    padding: 0;
  }

  .shell-game {
    display: grid;
    grid-template-columns: minmax(280px, 1fr) minmax(0, 2fr) minmax(280px, 1fr);
    grid-template-rows: auto 1fr auto auto;
    grid-template-areas:
      'header header header'
      'inbox document status'
      'action action action'
      'footer footer footer';
    gap: var(--space-4);
    height: 100vh;
    width: 100%;
    padding: var(--space-4);
    box-sizing: border-box;
    transition: all 300ms ease;
  }

  .loading-overlay {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--color-bg-primary);
    border: 1px solid var(--color-phosphor-green-dark);
    border-radius: var(--radius-md);
    font-family: var(--font-terminal);
    color: var(--color-phosphor-green);
  }

  .shell-game__header {
    grid-area: header;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2) var(--space-3);
    background-color: var(--color-bg-secondary);
    border: var(--border-default);
    border-radius: var(--radius-md);
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text);
  }

  .shell-game__header-left {
    flex: 1;
  }

  .shell-game__header-title {
    color: var(--color-amber);
    font-weight: 600;
  }

  .shell-game__header-center {
    flex: 1;
    text-align: center;
  }

  .shell-game__header-right {
    flex: 1;
    display: flex;
    justify-content: flex-end;
    gap: var(--space-4);
  }

  .shell-game__header-time {
    color: var(--color-text);
  }

  .shell-game__header-threat {
    color: var(--color-warning);
  }

  .shell-game__threat-level--1 {
    color: var(--color-threat-1);
  }

  .shell-game__threat-level--2 {
    color: var(--color-threat-2);
  }

  .shell-game__threat-level--3 {
    color: var(--color-threat-3);
  }

  .shell-game__threat-level--4 {
    color: var(--color-threat-4);
  }

  .shell-game__threat-level--5 {
    color: var(--color-threat-5);
  }

  .shell-game__header-funds {
    color: var(--color-safe);
  }

  .shell-game__panel--inbox {
    grid-area: inbox;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transition:
      opacity 300ms ease,
      transform 300ms ease;
  }

  .shell-game__inbox {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: var(--color-bg-secondary);
    border: var(--border-default);
    border-radius: var(--radius-md);
    overflow-y: auto;
  }

  .shell-game__inbox-header {
    padding: var(--space-2) var(--space-3);
    border-bottom: var(--border-default);
  }

  .shell-game__inbox-title {
    font-family: var(--font-terminal);
    font-size: var(--text-md);
    font-weight: 600;
    color: var(--color-text);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .shell-game__inbox-section {
    padding: var(--space-2) var(--space-3);
  }

  .shell-game__inbox-section-header {
    display: flex;
    gap: var(--space-1);
    margin-bottom: var(--space-2);
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
  }

  .shell-game__inbox-section-label {
    color: var(--color-text-muted);
    font-weight: 600;
  }

  .shell-game__inbox-section-count {
    color: var(--color-text-muted);
  }

  .shell-game__inbox-divider {
    padding: var(--space-1) var(--space-3);
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .shell-game__inbox-item {
    padding: var(--space-1) var(--space-3);
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-text);
    cursor: pointer;
    transition: background-color 150ms ease;
  }

  .shell-game__inbox-item:hover {
    background-color: var(--color-bg-hover);
  }

  .shell-game__inbox-item--unread {
    font-weight: 600;
  }

  .shell-game__inbox-item-priority {
    margin-right: var(--space-1);
    color: var(--color-warning);
  }

  .shell-game__inbox-item-subject {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .shell-game__panel--document {
    grid-area: document;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transition:
      opacity 300ms ease,
      transform 300ms ease;
  }

  .shell-game__panel--status {
    grid-area: status;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    position: relative;
    transition:
      opacity 300ms ease,
      transform 300ms ease;
  }

  .shell-game__status {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: var(--color-bg-secondary);
    border: var(--border-default);
    border-radius: var(--radius-md);
    padding: var(--space-3);
    overflow-y: auto;
  }

  .shell-game__status-header {
    margin-bottom: var(--space-3);
  }

  .shell-game__status-title {
    font-family: var(--font-terminal);
    font-size: var(--text-md);
    font-weight: 600;
    color: var(--color-text);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .shell-game__status-section {
    margin-bottom: var(--space-3);
  }

  .shell-game__status-label {
    display: block;
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    margin-bottom: var(--space-1);
  }

  .shell-game__status-meter {
    height: 8px;
    background-color: var(--color-bg-primary);
    border: 1px solid var(--color-phosphor-green-dark);
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: var(--space-1);
  }

  .shell-game__status-meter-fill {
    height: 100%;
    background-color: var(--color-phosphor-green);
    transition: width 300ms ease-out;
  }

  .shell-game__status-value {
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-text);
  }

  .shell-game__status-divider {
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    text-align: center;
    margin: var(--space-2) 0;
  }

  .shell-game__action-bar {
    grid-area: action;
    display: flex;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background-color: var(--color-bg-secondary);
    border: var(--border-default);
    border-radius: var(--radius-md);
  }

  .shell-game__footer {
    grid-area: footer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-1) var(--space-3);
    background-color: var(--color-bg-secondary);
    border: var(--border-default);
    border-radius: var(--radius-md);
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .shell-game__footer-prompt {
    color: var(--color-text);
  }

  .shell-game__footer-controls {
    color: var(--color-text-muted);
  }

  .shell-game__drawer-toggle {
    position: absolute;
    bottom: var(--space-2);
    right: var(--space-2);
  }

  .shell-game__tablet-drawer-toggle {
    display: none;
  }

  .shell-game__placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    background-color: var(--color-bg-secondary);
    border: var(--border-default);
    border-radius: var(--radius-md);
  }

  .shell-game__placeholder-label {
    font-family: var(--font-ui);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }

  .shell-game__mobile-nav {
    display: none;
  }

  .shell-game__mobile-tab {
    flex: 1;
    padding: var(--space-3);
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    background: var(--color-bg-secondary);
    border: none;
    border-top: 2px solid transparent;
    cursor: pointer;
    transition:
      color 200ms ease-out,
      border-color 200ms ease-out;
  }

  .shell-game__mobile-tab:hover {
    color: var(--color-text);
  }

  .shell-game__mobile-tab:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: -2px;
  }

  .shell-game__mobile-tab--active {
    color: var(--color-text);
    border-top-color: var(--color-accent);
  }

  @media (min-width: var(--bp-desktop-lg)) {
    .shell-game {
      grid-template-columns: minmax(280px, 1fr) minmax(0, 2fr) minmax(280px, 1fr);
      transition: all 300ms ease;
    }
  }

  @media (min-width: var(--bp-desktop)) and (max-width: 1439px) {
    .shell-game {
      grid-template-columns: minmax(280px, 1fr) minmax(0, 1.5fr) minmax(280px, 1fr);
      transition: all 300ms ease;
    }
  }

  @media (min-width: var(--bp-tablet)) and (max-width: 1023px) {
    .shell-game {
      grid-template-columns: 240px 1fr;
      grid-template-rows: auto 1fr auto auto;
      grid-template-areas:
        'header header'
        'inbox document'
        'action action'
        'footer footer';
      transition: all 300ms ease;
    }

    .shell-game__panel--inbox {
      grid-column: 1;
    }

    .shell-game__panel--document {
      grid-column: 2;
    }

    .shell-game__panel--status {
      display: none;
    }

    .shell-game__drawer-toggle {
      display: flex;
    }
  }

  @media (max-width: 767px) {
    .shell-game {
      display: flex;
      flex-direction: column;
      grid-template-columns: 1fr;
      padding: var(--space-2);
      height: auto;
      min-height: calc(100vh - 60px);
      transition: all 300ms ease;
    }

    .shell-game__header {
      flex-wrap: wrap;
      gap: var(--space-2);
      font-size: var(--text-xs);
    }

    .shell-game__header-left,
    .shell-game__header-center,
    .shell-game__header-right {
      flex: none;
      width: 100%;
      text-align: left;
      justify-content: flex-start;
    }

    .shell-game__panel--inbox,
    .shell-game__panel--document,
    .shell-game__panel--status {
      display: none;
      flex: 1;
      overflow: auto;
    }

    .shell-game__panel--inbox.shell-game__panel--active,
    .shell-game__panel--document.shell-game__panel--active,
    .shell-game__panel--status.shell-game__panel--active {
      display: flex;
    }

    .shell-game__action-bar {
      flex-wrap: wrap;
    }

    .shell-game__drawer-toggle {
      display: none;
    }

    .shell-game__mobile-nav {
      display: flex;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background-color: var(--color-surface);
      border-top: var(--border-default);
      z-index: 50;
    }
  }

  @media (min-width: var(--bp-tablet)) and (max-width: 1023px) {
    .shell-game__tablet-drawer-toggle {
      display: flex;
      position: absolute;
      right: var(--space-4);
      top: 50%;
      transform: translateY(-50%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .shell-game__mobile-tab,
    .shell-game__panel--inbox,
    .shell-game__panel--document,
    .shell-game__panel--status,
    .shell-game__status-meter-fill {
      transition: none;
    }
  }

  .shell-game__drawer-facility {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .shell-game__drawer-facility-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: var(--space-3);
    border-bottom: var(--border-default);
    margin-bottom: var(--space-3);
  }

  .shell-game__drawer-facility-title {
    font-family: var(--font-terminal);
    font-size: var(--text-md);
    font-weight: 600;
    color: var(--color-text);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .shell-game__drawer-facility-content {
    flex: 1;
    overflow-y: auto;
  }
</style>
