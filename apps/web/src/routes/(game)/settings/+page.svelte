<script lang="ts">
  import {
    settingsStore,
    type ThemeId,
    type ColorBlindMode,
    type FocusIndicatorStyle,
    type DifficultyLevel,
    type PrivacyMode,
    type PerformanceTier,
  } from '$lib/stores/settings';
  import Panel from '$lib/ui/components/Panel.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import IntensitySlider from '$lib/ui/components/IntensitySlider.svelte';

  import { browser } from '$app/environment';

  let activeTab = $state<
    'display' | 'accessibility' | 'gameplay' | 'audio' | 'performance' | 'account'
  >('display');

  let displaySettings = $state({
    theme: 'green' as ThemeId,
    enableTerminalEffects: true,
    fontSize: 16,
    terminalGlowIntensity: 60,
  });

  let accessibilitySettings = $state({
    reducedMotion: false,
    highContrast: false,
    colorBlindMode: 'none' as ColorBlindMode,
    screenReaderAnnouncements: true,
    keyboardNavigationHints: true,
    focusIndicatorStyle: 'subtle' as FocusIndicatorStyle,
  });

  let gameplaySettings = $state({
    difficulty: 'normal' as DifficultyLevel,
    notificationVolume: 80,
    notificationCategoryVolumes: {
      master: 80,
      alerts: 80,
      ui: 60,
      ambient: 50,
    },
    notificationDuration: 5,
    autoAdvanceTiming: 0,
    queueBuildupRate: 3,
  });

  let audioSettings = $state({
    masterVolume: 80,
    categoryVolumes: {
      alerts: 80,
      ui: 60,
      ambient: 50,
      narrative: 70,
      effects: 80,
    },
    muteAll: false,
    textToSpeechEnabled: false,
    textToSpeechSpeed: 100,
  });

  let accountSettings = $state({
    displayName: '',
    privacyMode: 'public' as PrivacyMode,
  });

  let performanceSettings = $state({
    tier: 'medium' as PerformanceTier,
    userOverride: false,
    autoDetect: true,
    enableVirtualization: true,
    reduceAnimations: false,
  });

  if (browser) {
    settingsStore.subscribe((settings) => {
      displaySettings = {
        theme: settings.display.theme,
        enableTerminalEffects: settings.display.enableTerminalEffects,
        fontSize: settings.display.fontSize,
        terminalGlowIntensity: settings.display.terminalGlowIntensity,
      };
      accessibilitySettings = {
        reducedMotion: settings.accessibility.reducedMotion,
        highContrast: settings.accessibility.highContrast,
        colorBlindMode: settings.accessibility.colorBlindMode,
        screenReaderAnnouncements: settings.accessibility.screenReaderAnnouncements,
        keyboardNavigationHints: settings.accessibility.keyboardNavigationHints,
        focusIndicatorStyle: settings.accessibility.focusIndicatorStyle,
      };
      gameplaySettings = {
        difficulty: settings.gameplay.difficulty,
        notificationVolume: settings.gameplay.notificationVolume,
        notificationCategoryVolumes: settings.gameplay.notificationCategoryVolumes,
        notificationDuration: settings.gameplay.notificationDuration,
        autoAdvanceTiming: settings.gameplay.autoAdvanceTiming,
        queueBuildupRate: settings.gameplay.queueBuildupRate,
      };
      audioSettings = {
        masterVolume: settings.audio.masterVolume,
        categoryVolumes: settings.audio.categoryVolumes,
        muteAll: settings.audio.muteAll,
        textToSpeechEnabled: settings.audio.textToSpeechEnabled,
        textToSpeechSpeed: settings.audio.textToSpeechSpeed,
      };
      accountSettings = {
        displayName: settings.account.displayName,
        privacyMode: settings.account.privacyMode,
      };
      performanceSettings = {
        tier: settings.performance.tier,
        userOverride: settings.performance.userOverride,
        autoDetect: settings.performance.autoDetect,
        enableVirtualization: settings.performance.enableVirtualization,
        reduceAnimations: settings.performance.reduceAnimations,
      };
    });
  }

  function handleThemeChange(theme: ThemeId) {
    settingsStore.setTheme(theme);
  }

  function handleToggleTerminalEffects() {
    settingsStore.updateDisplay({ enableTerminalEffects: !displaySettings.enableTerminalEffects });
  }

  function handleFontSizeChange(size: number) {
    settingsStore.setFontSize(size);
  }

  function handleGlowIntensityChange(value: number) {
    settingsStore.updateDisplay({ terminalGlowIntensity: value });
  }

  function handleToggleEffect(
    effect: 'scanlines' | 'curvature' | 'glow' | 'noise' | 'vignette' | 'flicker',
  ) {
    settingsStore.toggleEffect(effect);
  }

  function handleReducedMotionChange() {
    settingsStore.setReducedMotion(!accessibilitySettings.reducedMotion);
  }

  function handleHighContrastChange() {
    settingsStore.setHighContrast(!accessibilitySettings.highContrast);
  }

  function handleColorBlindModeChange(mode: ColorBlindMode) {
    settingsStore.updateAccessibility({ colorBlindMode: mode });
  }

  function handleScreenReaderChange() {
    settingsStore.updateAccessibility({
      screenReaderAnnouncements: !accessibilitySettings.screenReaderAnnouncements,
    });
  }

  function handleKeyboardHintsChange() {
    settingsStore.updateAccessibility({
      keyboardNavigationHints: !accessibilitySettings.keyboardNavigationHints,
    });
  }

  function handleFocusIndicatorChange(style: FocusIndicatorStyle) {
    settingsStore.updateAccessibility({ focusIndicatorStyle: style });
  }

  function handleDifficultyChange(difficulty: DifficultyLevel) {
    settingsStore.updateGameplay({ difficulty });
  }

  function handleNotificationVolumeChange(value: number) {
    settingsStore.updateGameplay({ notificationVolume: value });
  }

  function handleNotificationDurationChange(value: number) {
    settingsStore.updateGameplay({ notificationDuration: value });
  }

  function handleAutoAdvanceChange(value: number) {
    settingsStore.updateGameplay({ autoAdvanceTiming: value });
  }

  function handleQueueRateChange(value: number) {
    settingsStore.updateGameplay({ queueBuildupRate: value });
  }

  function handleMasterVolumeChange(value: number) {
    settingsStore.setMasterVolume(value);
  }

  function handleMuteAllChange() {
    settingsStore.setMuteAll(!audioSettings.muteAll);
  }

  function handleAudioCategoryVolumeChange(
    category: keyof typeof audioSettings.categoryVolumes,
    value: number,
  ) {
    settingsStore.setAudioCategoryVolume(category, value);
  }

  function handleNotificationCategoryVolumeChange(
    category: keyof typeof gameplaySettings.notificationCategoryVolumes,
    value: number,
  ) {
    settingsStore.setNotificationCategoryVolume(category, value);
  }

  function handleTextToSpeechChange() {
    settingsStore.updateAudio({ textToSpeechEnabled: !audioSettings.textToSpeechEnabled });
  }

  function handleTextToSpeechSpeedChange(value: number) {
    settingsStore.updateAudio({ textToSpeechSpeed: value });
  }

  function handlePrivacyModeChange(mode: PrivacyMode) {
    settingsStore.updateAccount({ privacyMode: mode });
  }

  function handleDisplayNameChange(e: Event) {
    const target = e.target as HTMLInputElement;
    settingsStore.updateAccount({ displayName: target.value });
  }

  function handleResetToDefaults() {
    settingsStore.resetToDefaults();
  }

  const themes: { id: ThemeId; label: string }[] = [
    { id: 'green', label: 'Green (Classic)' },
    { id: 'amber', label: 'Amber' },
    { id: 'high-contrast', label: 'High Contrast' },
    { id: 'enterprise', label: 'Enterprise' },
  ];

  const colorBlindModes: { id: ColorBlindMode; label: string }[] = [
    { id: 'none', label: 'None' },
    { id: 'protanopia', label: 'Protanopia (Red-blind)' },
    { id: 'deuteranopia', label: 'Deuteranopia (Green-blind)' },
    { id: 'tritanopia', label: 'Tritanopia (Blue-blind)' },
  ];

  const focusIndicatorStyles: { id: FocusIndicatorStyle; label: string }[] = [
    { id: 'subtle', label: 'Subtle' },
    { id: 'strong', label: 'Strong' },
  ];

  const difficultyLevels: { id: DifficultyLevel; label: string }[] = [
    { id: 'tutorial', label: 'Tutorial' },
    { id: 'easy', label: 'Easy' },
    { id: 'normal', label: 'Normal' },
    { id: 'hard', label: 'Hard' },
  ];

  const audioCategoryLabels: { id: keyof typeof audioSettings.categoryVolumes; label: string }[] = [
    { id: 'alerts', label: 'Alerts' },
    { id: 'ui', label: 'UI' },
    { id: 'ambient', label: 'Ambient' },
    { id: 'narrative', label: 'Narrative' },
    { id: 'effects', label: 'Effects' },
  ];

  const notificationCategoryLabels: {
    id: keyof typeof gameplaySettings.notificationCategoryVolumes;
    label: string;
  }[] = [
    { id: 'master', label: 'Master' },
    { id: 'alerts', label: 'Alerts' },
    { id: 'ui', label: 'UI' },
    { id: 'ambient', label: 'Ambient' },
  ];

  const privacyModes: { id: PrivacyMode; label: string }[] = [
    { id: 'public', label: 'Public' },
    { id: 'friends', label: 'Friends Only' },
    { id: 'private', label: 'Private' },
  ];

  const performanceTiers: { id: PerformanceTier; label: string; description: string }[] = [
    { id: 'low', label: 'Low', description: 'Optimized for older devices' },
    { id: 'medium', label: 'Medium', description: 'Balanced performance' },
    { id: 'high', label: 'High', description: 'Maximum visual quality' },
  ];

  function handlePerformanceTierChange(tier: PerformanceTier) {
    settingsStore.setPerformanceTier(tier);
  }

  function handleAutoDetectChange() {
    if (!performanceSettings.autoDetect) {
      settingsStore.enableAutoPerformanceDetect();
    }
  }

  function handleVirtualizationChange() {
    settingsStore.setVirtualization(!performanceSettings.enableVirtualization);
  }

  function handleReduceAnimationsChange() {
    settingsStore.updatePerformance({ reduceAnimations: !performanceSettings.reduceAnimations });
  }
</script>

<div class="settings-page">
  <Panel variant="elevated" ariaLabel="Settings">
    <h1 class="settings-page__title">Settings</h1>

    <nav class="settings-page__tabs" aria-label="Settings categories">
      <button
        type="button"
        class="settings-page__tab"
        class:settings-page__tab--active={activeTab === 'display'}
        onclick={() => (activeTab = 'display')}
      >
        Display
      </button>
      <button
        type="button"
        class="settings-page__tab"
        class:settings-page__tab--active={activeTab === 'accessibility'}
        onclick={() => (activeTab = 'accessibility')}
      >
        Accessibility
      </button>
      <button
        type="button"
        class="settings-page__tab"
        class:settings-page__tab--active={activeTab === 'gameplay'}
        onclick={() => (activeTab = 'gameplay')}
      >
        Gameplay
      </button>
      <button
        type="button"
        class="settings-page__tab"
        class:settings-page__tab--active={activeTab === 'audio'}
        onclick={() => (activeTab = 'audio')}
      >
        Audio
      </button>
      <button
        type="button"
        class="settings-page__tab"
        class:settings-page__tab--active={activeTab === 'performance'}
        onclick={() => (activeTab = 'performance')}
      >
        Performance
      </button>
      <button
        type="button"
        class="settings-page__tab"
        class:settings-page__tab--active={activeTab === 'account'}
        onclick={() => (activeTab = 'account')}
      >
        Account
      </button>
    </nav>

    <div class="settings-page__content">
      {#if activeTab === 'display'}
        <section class="settings-section">
          <h2 class="settings-section__title">Theme</h2>
          <div class="settings-section__options">
            {#each themes as theme (theme.id)}
              <label class="settings-option">
                <input
                  type="radio"
                  name="theme"
                  value={theme.id}
                  checked={displaySettings.theme === theme.id}
                  onchange={() => handleThemeChange(theme.id)}
                />
                <span class="settings-option__label">{theme.label}</span>
              </label>
            {/each}
          </div>
          <div class="settings-section__actions">
            <Button variant="secondary" size="sm">
              <a href="/settings/display">Custom Theme Editor</a>
            </Button>
          </div>
        </section>

        <section class="settings-section">
          <h2 class="settings-section__title">CRT Effects</h2>
          <label class="settings-toggle">
            <input
              type="checkbox"
              checked={displaySettings.enableTerminalEffects}
              onchange={handleToggleTerminalEffects}
            />
            <span>Enable CRT Effects</span>
          </label>

          <div class="settings-section__effects">
            <label class="settings-toggle">
              <input
                type="checkbox"
                checked={$settingsStore.display.effects.scanlines}
                onchange={() => handleToggleEffect('scanlines')}
                disabled={!displaySettings.enableTerminalEffects}
              />
              <span>Scanlines</span>
            </label>
            <label class="settings-toggle">
              <input
                type="checkbox"
                checked={$settingsStore.display.effects.curvature}
                onchange={() => handleToggleEffect('curvature')}
                disabled={!displaySettings.enableTerminalEffects}
              />
              <span>Screen Curvature</span>
            </label>
            <label class="settings-toggle">
              <input
                type="checkbox"
                checked={$settingsStore.display.effects.glow}
                onchange={() => handleToggleEffect('glow')}
                disabled={!displaySettings.enableTerminalEffects}
              />
              <span>Phosphor Glow</span>
            </label>
            <label class="settings-toggle">
              <input
                type="checkbox"
                checked={$settingsStore.display.effects.noise}
                onchange={() => handleToggleEffect('noise')}
                disabled={!displaySettings.enableTerminalEffects}
              />
              <span>Noise Texture</span>
            </label>
            <label class="settings-toggle">
              <input
                type="checkbox"
                checked={$settingsStore.display.effects.vignette}
                onchange={() => handleToggleEffect('vignette')}
                disabled={!displaySettings.enableTerminalEffects}
              />
              <span>Vignette</span>
            </label>
            <label class="settings-toggle">
              <input
                type="checkbox"
                checked={$settingsStore.display.effects.flicker}
                onchange={() => handleToggleEffect('flicker')}
                disabled={!displaySettings.enableTerminalEffects}
              />
              <span>Screen Flicker</span>
            </label>
          </div>
        </section>

        <section class="settings-section">
          <h2 class="settings-section__title">Font Size</h2>
          <IntensitySlider
            label="Font Size"
            value={displaySettings.fontSize}
            min={12}
            max={32}
            onchange={handleFontSizeChange}
          />
        </section>

        <section class="settings-section">
          <h2 class="settings-section__title">Terminal Glow</h2>
          <IntensitySlider
            label="Glow Intensity"
            value={displaySettings.terminalGlowIntensity}
            onchange={handleGlowIntensityChange}
          />
        </section>
      {/if}

      {#if activeTab === 'accessibility'}
        <section class="settings-section">
          <h2 class="settings-section__title">Motion & Contrast</h2>
          <label class="settings-toggle">
            <input
              type="checkbox"
              checked={accessibilitySettings.reducedMotion}
              onchange={handleReducedMotionChange}
            />
            <span>Reduced Motion</span>
          </label>
          <label class="settings-toggle">
            <input
              type="checkbox"
              checked={accessibilitySettings.highContrast}
              onchange={handleHighContrastChange}
            />
            <span>High Contrast Mode</span>
          </label>
        </section>

        <section class="settings-section">
          <h2 class="settings-section__title">Color Vision</h2>
          <div class="settings-section__options">
            {#each colorBlindModes as mode (mode.id)}
              <label class="settings-option">
                <input
                  type="radio"
                  name="colorBlindMode"
                  value={mode.id}
                  checked={accessibilitySettings.colorBlindMode === mode.id}
                  onchange={() => handleColorBlindModeChange(mode.id)}
                />
                <span class="settings-option__label">{mode.label}</span>
              </label>
            {/each}
          </div>
        </section>

        <section class="settings-section">
          <h2 class="settings-section__title">Navigation</h2>
          <label class="settings-toggle">
            <input
              type="checkbox"
              checked={accessibilitySettings.screenReaderAnnouncements}
              onchange={handleScreenReaderChange}
            />
            <span>Screen Reader Announcements</span>
          </label>
          <label class="settings-toggle">
            <input
              type="checkbox"
              checked={accessibilitySettings.keyboardNavigationHints}
              onchange={handleKeyboardHintsChange}
            />
            <span>Keyboard Navigation Hints</span>
          </label>
        </section>

        <section class="settings-section">
          <h2 class="settings-section__title">Focus Indicator</h2>
          <div class="settings-section__options">
            {#each focusIndicatorStyles as style (style.id)}
              <label class="settings-option">
                <input
                  type="radio"
                  name="focusIndicator"
                  value={style.id}
                  checked={accessibilitySettings.focusIndicatorStyle === style.id}
                  onchange={() => handleFocusIndicatorChange(style.id)}
                />
                <span class="settings-option__label">{style.label}</span>
              </label>
            {/each}
          </div>
        </section>
      {/if}

      {#if activeTab === 'gameplay'}
        <section class="settings-section">
          <h2 class="settings-section__title">Difficulty</h2>
          <div class="settings-section__options">
            {#each difficultyLevels as level (level.id)}
              <label class="settings-option">
                <input
                  type="radio"
                  name="difficulty"
                  value={level.id}
                  checked={gameplaySettings.difficulty === level.id}
                  onchange={() => handleDifficultyChange(level.id)}
                />
                <span class="settings-option__label">{level.label}</span>
              </label>
            {/each}
          </div>
        </section>

        <section class="settings-section">
          <h2 class="settings-section__title">Notifications</h2>
          <IntensitySlider
            label="Notification Volume"
            value={gameplaySettings.notificationVolume}
            onchange={handleNotificationVolumeChange}
          />
          <h3 class="settings-subsection__title">Notification Category Volumes</h3>
          {#each notificationCategoryLabels as category (category.id)}
            <IntensitySlider
              label={category.label}
              value={gameplaySettings.notificationCategoryVolumes[category.id]}
              onchange={(value: number) =>
                handleNotificationCategoryVolumeChange(category.id, value)}
            />
          {/each}
          <IntensitySlider
            label="Notification Duration (seconds)"
            value={gameplaySettings.notificationDuration}
            min={1}
            max={30}
            onchange={handleNotificationDurationChange}
          />
        </section>

        <section class="settings-section">
          <h2 class="settings-section__title">Game Flow</h2>
          <IntensitySlider
            label="Auto-Advance Delay (seconds)"
            value={gameplaySettings.autoAdvanceTiming}
            min={0}
            max={30}
            onchange={handleAutoAdvanceChange}
          />
          <IntensitySlider
            label="Queue Buildup Rate"
            value={gameplaySettings.queueBuildupRate}
            min={1}
            max={10}
            onchange={handleQueueRateChange}
          />
        </section>
      {/if}

      {#if activeTab === 'audio'}
        <section class="settings-section">
          <h2 class="settings-section__title">Volume</h2>
          <IntensitySlider
            label="Master Volume"
            value={audioSettings.masterVolume}
            onchange={handleMasterVolumeChange}
          />
          <label class="settings-toggle">
            <input type="checkbox" checked={audioSettings.muteAll} onchange={handleMuteAllChange} />
            <span>Mute All Audio</span>
          </label>
        </section>

        <section class="settings-section">
          <h2 class="settings-section__title">Category Volumes</h2>
          {#each audioCategoryLabels as category (category.id)}
            <IntensitySlider
              label={category.label}
              value={audioSettings.categoryVolumes[category.id]}
              onchange={(value: number) => handleAudioCategoryVolumeChange(category.id, value)}
            />
          {/each}
        </section>

        <section class="settings-section">
          <h2 class="settings-section__title">Text-to-Speech</h2>
          <label class="settings-toggle">
            <input
              type="checkbox"
              checked={audioSettings.textToSpeechEnabled}
              onchange={handleTextToSpeechChange}
            />
            <span>Enable Text-to-Speech for Emails</span>
          </label>
          {#if audioSettings.textToSpeechEnabled}
            <IntensitySlider
              label="Speech Speed"
              value={audioSettings.textToSpeechSpeed}
              min={50}
              max={200}
              onchange={handleTextToSpeechSpeedChange}
            />
          {/if}
        </section>
      {/if}

      {#if activeTab === 'performance'}
        <section class="settings-section">
          <h2 class="settings-section__title">Performance Tier</h2>
          <p class="settings-section__description">
            Adjust how The DMZ uses your device's resources. Lower tiers reduce visual quality but
            improve performance.
          </p>
          <div class="settings-section__options">
            {#each performanceTiers as tier (tier.id)}
              <label class="settings-option">
                <input
                  type="radio"
                  name="performanceTier"
                  value={tier.id}
                  checked={performanceSettings.tier === tier.id}
                  onchange={() => handlePerformanceTierChange(tier.id)}
                />
                <span class="settings-option__label">{tier.label}</span>
                <span class="settings-option__description">{tier.description}</span>
              </label>
            {/each}
          </div>
          <label class="settings-toggle">
            <input
              type="checkbox"
              checked={performanceSettings.autoDetect}
              onchange={handleAutoDetectChange}
            />
            <span>Auto-detect device performance</span>
          </label>
        </section>

        <section class="settings-section">
          <h2 class="settings-section__title">Optimization</h2>
          <label class="settings-toggle">
            <input
              type="checkbox"
              checked={performanceSettings.enableVirtualization}
              onchange={handleVirtualizationChange}
            />
            <span>Enable virtualized lists</span>
            <span class="settings-toggle__hint">Improves performance with long lists</span>
          </label>
          <label class="settings-toggle">
            <input
              type="checkbox"
              checked={performanceSettings.reduceAnimations}
              onchange={handleReduceAnimationsChange}
            />
            <span>Reduce animations</span>
            <span class="settings-toggle__hint">Disables motion effects</span>
          </label>
        </section>

        <section class="settings-section">
          <h2 class="settings-section__title">Current Device</h2>
          <div class="settings-section__info">
            <p>Detected performance tier: <strong>{performanceSettings.tier}</strong></p>
            <p class="settings-section__info-hint">
              {#if performanceSettings.tier === 'low'}
                Running in low performance mode for optimal experience.
              {:else if performanceSettings.tier === 'medium'}
                Running in balanced mode.
              {:else}
                Running in high quality mode.
              {/if}
            </p>
          </div>
        </section>
      {/if}

      {#if activeTab === 'account'}
        <section class="settings-section">
          <h2 class="settings-section__title">Profile</h2>
          <div class="settings-field">
            <label for="displayName">Display Name</label>
            <input
              type="text"
              id="displayName"
              value={accountSettings.displayName}
              oninput={handleDisplayNameChange}
              placeholder="Enter your display name"
              maxlength={50}
            />
          </div>
        </section>

        <section class="settings-section">
          <h2 class="settings-section__title">Privacy</h2>
          <div class="settings-section__options">
            {#each privacyModes as mode (mode.id)}
              <label class="settings-option">
                <input
                  type="radio"
                  name="privacyMode"
                  value={mode.id}
                  checked={accountSettings.privacyMode === mode.id}
                  onchange={() => handlePrivacyModeChange(mode.id)}
                />
                <span class="settings-option__label">{mode.label}</span>
              </label>
            {/each}
          </div>
        </section>

        <section class="settings-section">
          <h2 class="settings-section__title">Data Management</h2>
          <div class="settings-section__actions">
            <Button variant="secondary" size="sm">Export My Data</Button>
            <Button variant="secondary" size="sm">Request Account Deletion</Button>
          </div>
        </section>
      {/if}
    </div>

    <div class="settings-page__footer">
      <Button variant="secondary" onclick={handleResetToDefaults}>Reset to Defaults</Button>
    </div>
  </Panel>
</div>

<style>
  .settings-page {
    padding: var(--space-4);
    max-width: 800px;
    margin: 0 auto;
  }

  .settings-page__title {
    font-family: var(--font-terminal);
    color: var(--color-amber);
    font-size: var(--text-xl);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin: 0 0 var(--space-4) 0;
  }

  .settings-page__tabs {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    margin-bottom: var(--space-4);
    border-bottom: 1px solid var(--color-border);
    padding-bottom: var(--space-2);
  }

  .settings-page__tab {
    padding: var(--space-2) var(--space-3);
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: color 150ms ease;
  }

  .settings-page__tab:hover {
    color: var(--color-text);
  }

  .settings-page__tab--active {
    color: var(--color-accent);
    border-bottom: 2px solid var(--color-accent);
  }

  .settings-page__content {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .settings-page__footer {
    margin-top: var(--space-6);
    padding-top: var(--space-4);
    border-top: 1px solid var(--color-border);
  }

  .settings-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .settings-section__title {
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0;
  }

  .settings-subsection__title {
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    margin: var(--space-2) 0 0 0;
  }

  .settings-section__options {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  .settings-section__effects {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  .settings-section__actions {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .settings-option {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    cursor: pointer;
  }

  .settings-option input {
    accent-color: var(--color-accent);
  }

  .settings-option__label {
    font-size: var(--text-sm);
    color: var(--color-text);
  }

  .settings-option__description {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    margin-left: var(--space-2);
  }

  .settings-section__description {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    margin: 0 0 var(--space-2) 0;
  }

  .settings-section__info {
    font-size: var(--text-sm);
    color: var(--color-text);
  }

  .settings-section__info-hint {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    margin-top: var(--space-1);
  }

  .settings-toggle {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
    color: var(--color-text);
    cursor: pointer;
  }

  .settings-toggle input {
    accent-color: var(--color-accent);
    width: 16px;
    height: 16px;
  }

  .settings-toggle input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .settings-toggle__hint {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    margin-left: var(--space-2);
  }

  .settings-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .settings-field label {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  .settings-field input {
    padding: var(--space-2);
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text);
    background-color: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
  }

  .settings-field input:focus {
    outline: none;
    border-color: var(--color-accent);
  }
</style>
