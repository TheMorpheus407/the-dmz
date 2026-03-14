<script lang="ts">
  import type {
    EmailInstance,
    EmailState,
    FacilityState,
    VerificationPacket,
  } from '@the-dmz/shared';
  import { currentViewConfig, isTransitioning, animationState } from '$lib/game/store/ui-store';
  import { currentPhase } from '$lib/game/store/game-store';
  import InboxList from '$lib/game/components/InboxList.svelte';
  import FacilityDashboard from '$lib/game/components/FacilityDashboard.svelte';
  import DaySummaryPanel from '$lib/game/components/DaySummaryPanel.svelte';
  import GameOverPanel from '$lib/game/components/GameOverPanel.svelte';
  import EmailViewer from '$lib/game/components/EmailViewer.svelte';
  import PhishingAnalysisWorksheet from '$lib/game/components/PhishingAnalysisWorksheet.svelte';
  import VerificationPacketViewer from '$lib/game/components/VerificationPacketViewer.svelte';
  import KeyboardShortcutHandler from '$lib/game/components/KeyboardShortcutHandler.svelte';

  import type { DaySummaryData } from './day-summary';
  import type { WorksheetAnalysis } from './phishing-worksheet';

  const defaultFacility: FacilityState = {
    tier: 'outpost',
    capacities: {
      rackCapacityU: 100,
      powerCapacityKw: 50,
      coolingCapacityTons: 20,
      bandwidthCapacityMbps: 1000,
    },
    usage: {
      rackUsedU: 50,
      powerUsedKw: 25,
      coolingUsedTons: 10,
      bandwidthUsedMbps: 500,
    },
    clients: [],
    upgrades: [],
    maintenanceDebt: 0,
    facilityHealth: 100,
    operatingCostPerDay: 100,
    securityToolOpExPerDay: 50,
    attackSurfaceScore: 10,
    lastTickDay: 1,
  };

  interface Props {
    emails?: EmailInstance[];
    emailStates?: Map<string, EmailState>;
    currentDay?: number;
    selectedEmailId?: string | null;
    selectedEmail?: EmailInstance | null;
    verificationPacket?: VerificationPacket | null;
    funds?: number;
    facility?: FacilityState;
    daySummaryData?: DaySummaryData | null;
    gameOverData?: GameOverData | null;
    onSelectEmail?: (emailId: string) => void;
    onAdvanceDay?: () => void;
    onRestart?: () => void;
    onViewStats?: () => void;
    onSelectNext?: () => void;
    onSelectPrevious?: () => void;
    onOpen?: () => void;
    onVerify?: () => void;
    onApprove?: () => void;
    onDeny?: () => void;
    onFlag?: () => void;
    onContain?: () => void;
    onInvestigate?: () => void;
    onUpgrade?: () => void;
    onOpenWorksheet?: () => void;
    onSaveWorksheetAndReturn?: (analysis: WorksheetAnalysis) => void;
    onSaveWorksheetAndDecide?: (analysis: WorksheetAnalysis) => void;
    onFlagDiscrepancy?: (discrepancy: unknown) => void;
    onCloseVerification?: () => void;
  }

  interface GameOverData {
    finalScore: number;
    daysSurvived: number;
    totalEmailsProcessed: number;
    decisionsMade: {
      approved: number;
      denied: number;
      flagged: number;
    };
    reputationScore: number;
  }

  const {
    emails = [],
    emailStates = new Map(),
    currentDay = 1,
    selectedEmailId = null,
    selectedEmail = null,
    verificationPacket = null,
    funds = 1000,
    facility = defaultFacility,
    daySummaryData = null,
    gameOverData = null,
    onSelectEmail,
    onAdvanceDay,
    onRestart = () => {},
    onViewStats = () => {},
    onSelectNext = () => {},
    onSelectPrevious = () => {},
    onOpen = () => {},
    onVerify = () => {},
    onApprove = () => {},
    onDeny = () => {},
    onFlag = () => {},
    onContain = () => {},
    onInvestigate = () => {},
    onUpgrade = () => {},
    onOpenWorksheet: _onOpenWorksheet = () => {},
    onSaveWorksheetAndReturn = () => {},
    onSaveWorksheetAndDecide = () => {},
    onFlagDiscrepancy = () => {},
    onCloseVerification = () => {},
  }: Props = $props();

  const transitionClass = $derived(
    $isTransitioning ? `transitioning transitioning--${$animationState.transitionType}` : '',
  );
</script>

<KeyboardShortcutHandler
  handlers={{
    onSelectNext,
    onSelectPrevious,
    onOpen,
    onVerify,
    onApprove,
    onDeny,
    onFlag,
    onContain,
    onInvestigate,
    onUpgrade,
    onAdvanceDay: onAdvanceDay ?? (() => {}),
    onRestart,
    onViewStats,
  }}
/>

<div class="phase-renderer {transitionClass}" data-phase={$currentPhase}>
  {#if $currentPhase}
    {#if $currentViewConfig.showInbox}
      <div class="panel panel--inbox">
        <InboxList
          {emails}
          {emailStates}
          {currentDay}
          {selectedEmailId}
          onSelectEmail={onSelectEmail ?? (() => {})}
          onApproveEmail={onApprove ?? (() => {})}
          onDenyEmail={onDeny ?? (() => {})}
          onFlagEmail={onFlag ?? (() => {})}
        />
      </div>
    {/if}

    {#if $currentViewConfig.showEmail && selectedEmail}
      <div class="panel panel--email">
        <EmailViewer email={selectedEmail} />
      </div>
    {/if}

    {#if $currentViewConfig.showWorksheet && selectedEmail}
      <div class="panel panel--worksheet">
        <PhishingAnalysisWorksheet
          email={selectedEmail}
          onSaveAndReturn={onSaveWorksheetAndReturn ?? (() => {})}
          onSaveAndDecide={onSaveWorksheetAndDecide ?? (() => {})}
        />
      </div>
    {/if}

    {#if $currentViewConfig.showVerification && verificationPacket && selectedEmailId}
      <div class="panel panel--verification">
        <VerificationPacketViewer
          packet={verificationPacket}
          emailId={selectedEmailId}
          onFlagDiscrepancy={onFlagDiscrepancy ?? (() => {})}
          onClose={onCloseVerification ?? (() => {})}
        />
      </div>
    {/if}

    {#if $currentViewConfig.showFacility && !$currentViewConfig.showDaySummary}
      <div class="panel panel--facility">
        <FacilityDashboard {funds} {facility} />
      </div>
    {/if}

    {#if $currentViewConfig.showDaySummary && daySummaryData}
      <div class="panel panel--day-summary">
        <DaySummaryPanel data={daySummaryData} onadvanceDay={onAdvanceDay ?? (() => {})} />
      </div>
    {/if}

    {#if $currentViewConfig.showGameOver}
      <div class="panel panel--game-over">
        <GameOverPanel
          data={gameOverData}
          onRestart={onRestart ?? (() => {})}
          onViewStats={onViewStats ?? (() => {})}
        />
      </div>
    {/if}
  {:else}
    <div class="panel panel--landing">
      <div class="landing-content">
        <h2>Operations Console</h2>
        <p>Initializing session...</p>
      </div>
    </div>
  {/if}
</div>

<style>
  .phase-renderer {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    position: relative;
  }

  .panel {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .transitioning {
    animation: fadeIn 0.3s ease-out;
  }

  .transitioning--slide {
    animation: slideIn 0.3s ease-out;
  }

  .transitioning--fade {
    animation: fadeIn 0.3s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideIn {
    from {
      transform: translateX(20px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .landing-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    font-family: var(--font-terminal);
  }

  .landing-content h2 {
    color: var(--color-amber);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .landing-content p {
    color: var(--color-document-white);
    font-family: var(--font-document);
  }
</style>
