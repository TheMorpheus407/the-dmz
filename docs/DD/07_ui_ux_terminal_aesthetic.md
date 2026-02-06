# DD-07: UI/UX and Terminal Aesthetic Design Specification

**Project:** The DMZ: Archive Gate
**Document Type:** Design Document
**Version:** 1.0
**Date:** 2026-02-05
**Status:** Draft
**Authors:** Matrices GmbH Design & Engineering Team

---

## Table of Contents

1. [Design System Foundation](#1-design-system-foundation)
2. [Screen Layout Architecture](#2-screen-layout-architecture)
3. [Component Library Specification](#3-component-library-specification)
4. [Interaction Design Patterns](#4-interaction-design-patterns)
5. [Responsive Design Strategy](#5-responsive-design-strategy)
6. [Accessibility Implementation](#6-accessibility-implementation)
7. [Theming System](#7-theming-system)
8. [Diegetic UI Philosophy](#8-diegetic-ui-philosophy)
9. [References](#9-references)

---

## 1. Design System Foundation

The visual identity of The DMZ: Archive Gate is rooted in a **retro terminal aesthetic** -- the phosphor glow of CRT monitors, the mechanical rhythm of dot-matrix printers, and the austere geometry of early network infrastructure. This is not decoration. In a post-apocalyptic world where the internet has shattered and computing resources are scarce, visual fidelity is a luxury no one can afford. The terminal aesthetic is the world.

The design system serves two distinct interfaces from one foundational token set:

- **Game Interface:** Terminal aesthetic with CRT effects, monospaced type, phosphor glow
- **Enterprise Admin Interface:** Clean, professional SaaS dashboard with no game elements

**Rendering approach (per BRD Section 8.2):** The game uses a hybrid DOM + Canvas architecture. **DOM (90% of gameplay)** handles emails, worksheets, contracts, dashboards, and dialog trees -- providing accessibility, text selection, screen reader support, and native form handling. **Canvas/WebGL (10%)** handles facility status map, network topology visualization, and attack animation overlays, using PixiJS for 2D visualization and D3.js for data charts. All design tokens and component specifications in this document apply to the DOM layer. Canvas-rendered elements (PixiJS, D3.js) consume the same design token values programmatically for visual consistency.

### 1.1 Color Palette

#### 1.1.1 Game Palette -- Core Colors

| Token                         | Hex       | RGB             | Usage                             | Contrast vs. #0a0e14 |
| ----------------------------- | --------- | --------------- | --------------------------------- | -------------------- |
| `--color-bg-primary`          | `#0a0e14` | `10, 14, 20`    | Main background (near-black blue) | --                   |
| `--color-bg-secondary`        | `#141a22` | `20, 26, 34`    | Panel backgrounds, surfaces       | --                   |
| `--color-bg-tertiary`         | `#1e2832` | `30, 40, 50`    | Elevated surfaces, active states  | --                   |
| `--color-bg-hover`            | `#253040` | `37, 48, 64`    | Hover/focus backgrounds           | --                   |
| `--color-phosphor-green`      | `#33ff33` | `51, 255, 51`   | Primary terminal text             | 13.2:1               |
| `--color-phosphor-green-dim`  | `#88aa88` | `136, 170, 136` | Secondary/muted text              | 6.8:1                |
| `--color-phosphor-green-dark` | `#334433` | `51, 68, 51`    | Borders, dividers                 | --                   |
| `--color-amber`               | `#ffb000` | `255, 176, 0`   | Headings, emphasis, warnings      | 9.6:1                |
| `--color-amber-dim`           | `#aa7700` | `170, 119, 0`   | Secondary amber text              | 5.1:1                |
| `--color-document-white`      | `#e0e0e0` | `224, 224, 224` | Document body text                | 14.7:1               |
| `--color-document-muted`      | `#b0b0b0` | `176, 176, 176` | Document secondary text           | 9.4:1                |

#### 1.1.2 Game Palette -- Semantic Colors

| Token              | Default Hex | CB-Safe Hex | Usage                         | Text Label          | Icon                 |
| ------------------ | ----------- | ----------- | ----------------------------- | ------------------- | -------------------- |
| `--color-safe`     | `#33cc66`   | `#009E73`   | Approved, low risk, success   | SAFE / APPROVED     | Checkmark / Shield   |
| `--color-warning`  | `#ffcc00`   | `#F0E442`   | Pending, medium risk, caution | WARNING / PENDING   | Triangle-exclamation |
| `--color-danger`   | `#ff5555`   | `#D55E00`   | Denied, high risk, error      | DANGER / DENIED     | X-circle             |
| `--color-info`     | `#3399ff`   | `#0072B2`   | Informational, neutral        | INFO / NEUTRAL      | Info-circle          |
| `--color-critical` | `#ff3333`   | `#CC79A7`   | Breach, severe, critical      | CRITICAL / BREACH   | Skull-crossbones     |
| `--color-flagged`  | `#ff9900`   | `#E69F00`   | Flagged, review needed        | FLAGGED / REVIEW    | Flag                 |
| `--color-archived` | `#8a8a8a`   | `#999999`   | Archived, inactive, disabled  | ARCHIVED / INACTIVE | Archive-box          |

**Contrast note:** Semantic label text uses these tokens tuned to meet ≥4.5:1 on the primary background (`#0a0e14`). If a label appears on lighter panels, keep text in a high-contrast color (e.g., `--color-document-white`) and reserve semantic colors for icons, borders, or badges.

#### 1.1.3 Threat Level Colors

| Level | Label    | Default Color      | CB-Safe Color | Shield Icon State |
| ----- | -------- | ------------------ | ------------- | ----------------- |
| 1     | LOW      | `#3366ff` (Blue)   | `#0072B2`     | Intact            |
| 2     | GUARDED  | `#33cc66` (Green)  | `#009E73`     | Minor crack       |
| 3     | ELEVATED | `#ffcc00` (Yellow) | `#F0E442`     | Cracked           |
| 4     | HIGH     | `#ff6600` (Orange) | `#E69F00`     | Broken            |
| 5     | SEVERE   | `#cc0000` (Red)    | `#D55E00`     | Shattered         |

Every threat level is encoded through four redundant channels: color, text label, shield icon damage state, and a segmented progress bar. This ensures accessibility regardless of color vision.

#### 1.1.4 Faction Colors

| Faction                | Primary Color | Accent    | Usage                            |
| ---------------------- | ------------- | --------- | -------------------------------- |
| The Sovereign Compact  | `#4488cc`     | `#6699dd` | Government-affiliated applicants |
| Nexion Industries      | `#cc8844`     | `#ddaa66` | Corporate applicants             |
| The Librarians         | `#44aa88`     | `#66ccaa` | Academic/preservation applicants |
| Hacktivist Collectives | `#aa44cc`     | `#cc66dd` | Activist applicants              |
| Criminal Networks      | `#cc4444`     | `#dd6666` | Hostile/suspicious applicants    |

#### 1.1.5 Enterprise Admin Palette

| Token                    | Light     | Dark      |
| ------------------------ | --------- | --------- |
| `--admin-bg-primary`     | `#ffffff` | `#1a1a2e` |
| `--admin-bg-secondary`   | `#f8f9fa` | `#16213e` |
| `--admin-bg-tertiary`    | `#e9ecef` | `#1f2b47` |
| `--admin-text-primary`   | `#212529` | `#e0e0e0` |
| `--admin-text-secondary` | `#6c757d` | `#a0a0b0` |
| `--admin-accent`         | `#0d6efd` | `#4d9eff` |
| `--admin-success`        | `#198754` | `#2ea96e` |
| `--admin-warning`        | `#ffc107` | `#ffd44d` |
| `--admin-danger`         | `#dc3545` | `#e85d6a` |
| `--admin-border`         | `#dee2e6` | `#2a2a4a` |

### 1.2 Typography

#### 1.2.1 Font Stack

**Game Interface -- Primary (Terminal/UI):**

```css
--font-terminal:
  'JetBrains Mono', 'Fira Code', 'IBM Plex Mono', 'Cascadia Code', 'Source Code Pro', 'Consolas',
  'Liberation Mono', monospace;
```

JetBrains Mono is the first choice for its excellent readability at small sizes, clear distinction between similar characters (0/O, 1/l/I), and ligature support. Fira Code provides a close alternative with a slightly different character. IBM Plex Mono is the fallback with broader system availability.

**Game Interface -- Secondary (Document Bodies):**

```css
--font-document: 'IBM Plex Sans', 'Inter', 'Segoe UI', system-ui, sans-serif;
```

Long-form document content (email bodies, contracts, intelligence briefs) uses a proportional sans-serif for improved readability in dense text. This is narratively justified: documents are rendered by the terminal's document processing subsystem, which applies proportional rendering for readability.

**Enterprise Interface:**

```css
--font-admin: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
```

Clean, professional, highly legible at all sizes.

**Accessibility Override:**

```css
--font-dyslexia: 'OpenDyslexic', 'Comic Sans MS', cursive;
```

Available in Settings > Accessibility > Font for users who benefit from dyslexia-friendly typefaces.

#### 1.2.2 Type Scale -- Game Interface

All sizes in `rem` relative to `--base-font-size` (default 16px, adjustable 12px-32px).

| Token         | Size (rem) | Size (px@16) | Weight | Line Height | Usage                            |
| ------------- | ---------- | ------------ | ------ | ----------- | -------------------------------- |
| `--text-xs`   | 0.75       | 12           | 400    | 1.4         | Timestamps, metadata labels      |
| `--text-sm`   | 0.875      | 14           | 400    | 1.5         | Secondary info, captions         |
| `--text-base` | 1.0        | 16           | 400    | 1.6         | Body text, email content         |
| `--text-md`   | 1.125      | 18           | 500    | 1.5         | Panel headers, emphasis          |
| `--text-lg`   | 1.25       | 20           | 600    | 1.4         | Section headings                 |
| `--text-xl`   | 1.5        | 24           | 700    | 1.3         | Page titles, threat alerts       |
| `--text-2xl`  | 2.0        | 32           | 700    | 1.2         | Ransom note header, breach alert |
| `--text-3xl`  | 2.5        | 40           | 800    | 1.1         | Full-screen takeover text        |

**Heading treatments (Game):**

- H1: `--text-xl`, `--color-amber`, `--font-terminal`, uppercase, letter-spacing 0.1em
- H2: `--text-lg`, `--color-phosphor-green`, `--font-terminal`, uppercase
- H3: `--text-md`, `--color-phosphor-green-dim`, `--font-terminal`
- Body: `--text-base`, `--color-document-white`, `--font-document`
- Terminal output: `--text-base`, `--color-phosphor-green`, `--font-terminal`

#### 1.2.3 Type Scale -- Enterprise Interface

| Element         | Font  | Size            | Weight | Line Height |
| --------------- | ----- | --------------- | ------ | ----------- |
| H1 (Page Title) | Inter | 1.75rem (28px)  | 700    | 1.3         |
| H2 (Section)    | Inter | 1.375rem (22px) | 600    | 1.35        |
| H3 (Card Title) | Inter | 1.125rem (18px) | 600    | 1.4         |
| Body            | Inter | 1rem (16px)     | 400    | 1.6         |
| Small/Label     | Inter | 0.875rem (14px) | 400    | 1.5         |
| Data Table      | Inter | 0.875rem (14px) | 400    | 1.5         |
| Metric Value    | Inter | 2rem (32px)     | 700    | 1.2         |

### 1.3 CRT Effects Specification

All CRT effects are implemented as CSS overlays on a clean, accessible base. They exist on a separate rendering layer and do not affect the DOM, accessibility tree, or functional layout. Every effect is independently disableable and respects `prefers-reduced-motion`.

**Architectural principle:** The base UI must be fully functional and attractive with ALL effects disabled. CRT effects are additive visual sugar, never structural.

```
Layer Stack (bottom to top):
  1. Base UI Layer     -- Clean dark theme, semantic HTML, full accessibility
  2. Content Layer     -- Text, components, interactive elements
  3. Scanline Layer    -- CSS pseudo-element overlay (pointer-events: none)
  4. Curvature Layer   -- CSS transform on outermost container
  5. Glow Layer        -- text-shadow on selected elements
  6. Noise Layer       -- CSS background-image with animated noise
  7. Vignette Layer    -- Radial gradient overlay at edges
  8. Flicker Layer     -- CSS animation, event-triggered only
```

#### 1.3.1 Scanlines

```css
/* Scanline overlay applied to the root game container */
.crt-scanlines::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: var(--z-scanlines, 1000);
  background: repeating-linear-gradient(
    to bottom,
    transparent 0px,
    transparent 1px,
    rgba(0, 0, 0, var(--scanline-opacity, 0.05)) 1px,
    rgba(0, 0, 0, var(--scanline-opacity, 0.05)) 2px
  );
  /* Subtle animation: slow vertical drift */
  animation: scanline-drift 8s linear infinite;
}

@keyframes scanline-drift {
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 0 4px;
  }
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .crt-scanlines::after {
    animation: none;
  }
}

/* User toggle: disabled */
[data-scanlines='off'] .crt-scanlines::after {
  display: none;
}
```

**Adjustable parameters:**

- `--scanline-opacity`: 0 (off) to 0.15 (heavy). Default: 0.05
- `--scanline-size`: 1px to 4px. Default: 2px (1px transparent + 1px dark)
- Animation: on/off toggle. Default: on (subtle drift)

#### 1.3.2 Screen Curvature

```css
/* Barrel distortion on outermost game container */
.crt-curvature {
  overflow: hidden;
  border-radius: 12px;
}

.crt-curvature > .game-viewport {
  transform: perspective(800px) rotateX(0.5deg);
  /* Subtle barrel effect using border-radius and shadow */
  border-radius: 20px / 18px;
  box-shadow:
    inset 0 0 60px rgba(0, 0, 0, 0.4),
    inset 0 0 120px rgba(0, 0, 0, 0.2);
}

/* Disabled on mobile (too small to notice, wastes GPU) */
@media (max-width: 1023px) {
  .crt-curvature > .game-viewport {
    transform: none;
    border-radius: 0;
    box-shadow: none;
  }
}

/* User toggle */
[data-curvature='off'] .crt-curvature > .game-viewport {
  transform: none;
  border-radius: 0;
  box-shadow: none;
}
```

#### 1.3.3 Phosphor Glow

```css
/* Glow on primary terminal text */
.crt-glow {
  text-shadow:
    0 0 2px rgba(51, 255, 51, 0.4),
    0 0 4px rgba(51, 255, 51, 0.2),
    0 0 8px rgba(51, 255, 51, 0.1);
}

/* Amber variant */
.crt-glow--amber {
  text-shadow:
    0 0 2px rgba(255, 176, 0, 0.4),
    0 0 4px rgba(255, 176, 0, 0.2),
    0 0 8px rgba(255, 176, 0, 0.1);
}

/* Glow intensity controlled by custom property */
.crt-glow {
  text-shadow:
    0 0 calc(2px * var(--glow-intensity, 1)) rgba(51, 255, 51, calc(0.4 * var(--glow-intensity, 1))),
    0 0 calc(4px * var(--glow-intensity, 1)) rgba(51, 255, 51, calc(0.2 * var(--glow-intensity, 1))),
    0 0 calc(8px * var(--glow-intensity, 1)) rgba(51, 255, 51, calc(0.1 * var(--glow-intensity, 1)));
}

/* Disabled in high-contrast and reduced-motion */
[data-glow='off'] .crt-glow,
[data-high-contrast='on'] .crt-glow {
  text-shadow: none;
}
```

**Adjustable parameter:** `--glow-intensity`: 0 (off) to 2.0 (intense). Default: 1.0

#### 1.3.4 Noise Texture

```css
/* Animated noise overlay */
.crt-noise::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: var(--z-noise, 1001);
  opacity: var(--noise-opacity, 0.03);
  background-image: url('data:image/svg+xml,...'); /* Inline SVG noise pattern */
  background-size: 128px 128px;
  animation: noise-shift 0.5s steps(4) infinite;
}

@keyframes noise-shift {
  0% {
    background-position: 0 0;
  }
  25% {
    background-position: -32px -16px;
  }
  50% {
    background-position: 16px -32px;
  }
  75% {
    background-position: -16px 32px;
  }
  100% {
    background-position: 0 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .crt-noise::before {
    animation: none;
  }
}

[data-noise='off'] .crt-noise::before {
  display: none;
}
```

**Adjustable parameter:** `--noise-opacity`: 0 (off) to 0.1. Default: 0.03

#### 1.3.5 Vignette

```css
/* Dark edges to simulate CRT curvature falloff */
.crt-vignette::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: var(--z-vignette, 999);
  background: radial-gradient(
    ellipse at center,
    transparent 60%,
    rgba(0, 0, 0, var(--vignette-opacity, 0.3)) 100%
  );
}

[data-vignette='off'] .crt-vignette::after {
  display: none;
}
```

#### 1.3.6 Screen Flicker (Event-Triggered)

```css
/* Flicker triggered by game events (breach, threat escalation) */
@keyframes screen-flicker {
  0% {
    opacity: 1;
  }
  5% {
    opacity: 0.85;
  }
  10% {
    opacity: 1;
  }
  15% {
    opacity: 0.9;
  }
  20% {
    opacity: 1;
  }
  100% {
    opacity: 1;
  }
}

.crt-flicker--active {
  animation: screen-flicker 0.4s ease-out 1;
}

/* Reduced motion: single dim instead of flicker */
@media (prefers-reduced-motion: reduce) {
  .crt-flicker--active {
    animation: none;
    opacity: 0.9;
    transition: opacity 0.3s ease;
  }
}

/* Never flashes more than 3 times per second (WCAG 2.3.1) */
/* The above keyframes complete in 0.4s with 2 opacity changes = safe */
```

#### 1.3.7 CRT Effects Control Panel (User Settings)

```
+----------------------------------------------------------+
|  DISPLAY EFFECTS                                         |
+----------------------------------------------------------+
|                                                          |
|  Scanlines      [===|====] 50%    [ON/OFF]               |
|  Screen Curve   [========] 100%   [ON/OFF]               |
|  Phosphor Glow  [===|====] 50%    [ON/OFF]               |
|  Noise          [=|======] 25%    [ON/OFF]               |
|  Vignette       [====|===] 60%    [ON/OFF]               |
|  Screen Flicker               [ON/OFF]                   |
|                                                          |
|  [DISABLE ALL EFFECTS]   [RESET TO DEFAULTS]             |
|                                                          |
|  Note: Effects are purely cosmetic. Disabling them       |
|  has no impact on gameplay or accessibility.              |
+----------------------------------------------------------+
```

### 1.4 Grid System

#### 1.4.1 Character Grid (Terminal Layout)

The game interface uses a character grid overlay to maintain the terminal aesthetic's monospaced alignment:

```css
:root {
  --char-width: 0.6em; /* Approximate width of one monospace character */
  --char-height: 1.6em; /* Line height of terminal text */
  --grid-columns: 80; /* Standard terminal width */
  --grid-rows: 40; /* Approximate visible rows */
}

/* Terminal panels align to character boundaries */
.terminal-grid {
  display: grid;
  grid-template-columns: repeat(var(--grid-columns), var(--char-width));
  grid-template-rows: repeat(var(--grid-rows), var(--char-height));
  font-family: var(--font-terminal);
  font-size: var(--text-base);
}
```

In practice, the character grid is a conceptual guide. Actual layout uses CSS Grid with named areas for responsiveness:

```css
.game-layout {
  display: grid;
  grid-template-areas:
    'header header  header'
    'inbox  viewer  status'
    'action action  action'
    'terminal terminal terminal';
  grid-template-columns: 250px 1fr 220px;
  grid-template-rows: auto 1fr auto auto;
  height: 100vh;
  gap: 1px; /* 1px border-like gaps between panels */
  background: var(--color-phosphor-green-dark); /* Gap color = border */
}
```

#### 1.4.2 Spacing Scale

| Token       | Value          | Usage                    |
| ----------- | -------------- | ------------------------ |
| `--space-0` | 0              | No spacing               |
| `--space-1` | 0.25rem (4px)  | Tight inline spacing     |
| `--space-2` | 0.5rem (8px)   | Compact element spacing  |
| `--space-3` | 0.75rem (12px) | Default element gap      |
| `--space-4` | 1rem (16px)    | Standard section spacing |
| `--space-5` | 1.5rem (24px)  | Panel padding            |
| `--space-6` | 2rem (32px)    | Major section dividers   |
| `--space-8` | 3rem (48px)    | Page-level spacing       |

### 1.5 Border Styles

The terminal aesthetic uses two border approaches:

**CSS Borders (default, performant):**

```css
/* Panel borders using CSS */
.terminal-panel {
  border: 1px solid var(--color-phosphor-green-dark);
  background: var(--color-bg-secondary);
}

/* Double-border for emphasis (active panel) */
.terminal-panel--active {
  border: 1px solid var(--color-phosphor-green);
  box-shadow: inset 0 0 0 1px var(--color-phosphor-green-dark);
}
```

**ASCII Box Drawing (decorative, used for static headers):**

```
+--[ MATRICES GmbH SECURE TERMINAL v4.7 ]--+
|                                            |
|  Content area                              |
|                                            |
+--------------------------------------------+

Rendered using Unicode box-drawing characters:
  ┌──[ TITLE ]──────────────────────┐
  │  Content                        │
  └─────────────────────────────────┘
```

Box-drawing characters are rendered as actual text characters in header bars and decorative elements. For structural borders (panel edges, dividers), CSS borders are used for performance and responsiveness.

### 1.6 Icon System

**Game icons** use a hybrid approach:

1. **SVG Icons (primary):** Monochrome line-art SVGs with a slightly pixelated rendering at small sizes. Heroicons or Lucide as the base set, rendered in `--color-phosphor-green`. All icons include `aria-hidden="true"` when paired with text labels, or descriptive `aria-label` when standalone.

2. **ASCII Art (decorative/headers):** Used for facility map elements, splash screens, and narrative moments:

```
   _____ _            ____  __  __ ______
  |_   _| |__   ___  |  _ \|  \/  |___  /
    | | | '_ \ / _ \ | | | | |\/| |  / /
    | | | | | |  __/ | |_| | |  | | / /_
    |_| |_| |_|\___| |____/|_|  |_|/____|
```

3. **Status Icons (functional):** Shield states for threat levels, checkmarks/X-marks for approve/deny, resource gauge icons. Always SVG, always paired with text.

**Enterprise icons:** Standard Lucide icon set. Clean, consistent, 24px default size.

### 1.7 Sound Design Direction

Sound is additive and fully optional. All sounds can be disabled globally or per-category.

| Sound Category  | Description                                             | Example                                  | Default State |
| --------------- | ------------------------------------------------------- | ---------------------------------------- | ------------- |
| **Ambient**     | Data center background hum, varies with threat level    | Low hum at LOW, tense drone at SEVERE    | Off (opt-in)  |
| **UI Feedback** | Keyboard clicks on type, panel switches, button presses | Mechanical key click on terminal input   | On            |
| **Alerts**      | New email chime, threat escalation tone, breach alarm   | Rising three-note chime for new email    | On            |
| **Stamps**      | Satisfying THUNK on approve/deny stamp                  | Heavy stamp impact sound                 | On            |
| **Narrative**   | Musical stings for story moments, Morpheus messages     | Low synth pad for intelligence briefs    | On            |
| **Effects**     | CRT power-on, static burst on high-threat events        | Brief static crackle on breach detection | On            |

All sounds have visual equivalents (caption system, visual indicators) for deaf and hard-of-hearing players. Per BRD Section 7.5, captions are provided for all audio content and transcripts are available for any narrative audio or video sequences.

### 1.8 Animation Principles

| Principle              | Description                                      | Implementation                                                                                |
| ---------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| **Typewriter text**    | Narrative text appears character-by-character    | CSS `@keyframes` with `steps()` timing, 30-50ms per character. Skippable with click/spacebar. |
| **Screen flicker**     | Brief brightness dip on significant events       | CSS opacity animation, max 2 flashes, 0.4s total duration                                     |
| **Smooth transitions** | Panel switches, menu openings                    | CSS `transition: 200ms ease-out` on transforms and opacity                                    |
| **Stamp impact**       | Approve/Deny stamp slams onto document           | CSS transform scale(1.2) to scale(1) with slight bounce easing                                |
| **Meter changes**      | Resource bars animate on value change            | CSS `transition: width 500ms ease-out`                                                        |
| **Toast slide-in**     | Notifications enter from screen edge             | CSS `translateY` from offscreen, 300ms ease-out                                               |
| **Cursor blink**       | Terminal cursor idle animation                   | CSS `@keyframes` opacity toggle, 530ms interval (matching real terminal)                      |
| **Glow pulse**         | Subtle brightness oscillation on active elements | CSS `@keyframes` text-shadow intensity, 2s ease-in-out infinite                               |

**All animations respect `prefers-reduced-motion`:** When active, typewriter text appears instantly, transitions are instant, flicker becomes a single brief dim, and all looping animations stop.

---

## 2. Screen Layout Architecture

### 2.1 Main Terminal / Dashboard

The primary game screen. When no email is selected, the center panel shows the facility dashboard.

```
+========================================================================+
|  [M] MATRICES GmbH SECURE TERMINAL v4.7          Day 14 | 08:00 CEST  |
|  THREAT: ████████░░ ELEVATED [!]              FUNDS: 12,450 CR [+500] |
+========================================================================+
|          |                                          |                   |
|  INBOX   |  FACILITY DASHBOARD                      |  FACILITY         |
|  ======  |  ==================                      |  STATUS           |
|          |                                          |  =======          |
|  NEW (3) |  DAILY OPERATIONS BRIEF                  |                   |
|  > [!]Em |  Day 14 | 08:00 CEST                    |  RACKS            |
|    [!]Em |                                          |  [████████░░] 8/12|
|    [!]Em |  PENDING REQUESTS ........... 7          |                   |
|  -----   |  APPROVED TODAY ............. 3          |  POWER            |
|  PENDING |  DENIED TODAY ............... 2          |  [████████░░] 78% |
|  (4)     |  FLAGGED FOR REVIEW ......... 1          |                   |
|  > Email |                                          |  COOLING          |
|    Email |  REVENUE (TODAY) ..... 2,100 CR            |  [██████████] OK  |
|    Email |  REVENUE (TOTAL) .... 12,450 CR            |                   |
|    Email |  OPERATING COSTS .... 800 CR/day           |  BANDWIDTH        |
|  -----   |                                          |  [██████░░░░] 52% |
|  ARCHIVE |  THREAT LEVEL ......... ELEVATED          |  =======          |
|  (12)    |  ACTIVE INCIDENTS .......... 2           |  ACTIVE           |
|  -----   |  LAST BREACH ........... Day 9           |  THREATS: 2       |
|  FLAGGED |                                          |                   |
|  (1)     |  [VIEW UPGRADE SHOP]  [VIEW INTEL BRIEF] |  [VIEW LOGS]      |
|          |                                          |  [THREAT MAP]     |
+==========+==========================================+===================+
|  [APPROVE]  [DENY]  [FLAG FOR REVIEW]  [REQUEST ADD'L VERIFICATION]  [TOOLS]  |
+=========================================================================+
|  > Terminal ready. Type 'help' for commands.                    [_][o][x]|
+=========================================================================+
```

**Responsive breakpoints for Main Terminal:**

| Breakpoint       | Layout                                              | Notes                                       |
| ---------------- | --------------------------------------------------- | ------------------------------------------- |
| >= 1440px (XL)   | Full 3-panel as shown                               | Optimal experience                          |
| 1024-1439px (LG) | 3-panel, right panel narrower (180px)               | Status panel condensed                      |
| 768-1023px (MD)  | 2-panel: Inbox + Viewer. Status in slide-out drawer | Toggle via status icon in header            |
| 600-767px (SM)   | Single panel with tab bar                           | Tabs: Inbox / Document / Status / More      |
| 320-599px (XS)   | Single panel with bottom tabs, condensed header     | Minimal header: threat icon + day + credits |

### 2.2 Email Triage View

When an email is selected from the inbox, the center panel renders the email detail.

```
+==========+==========================================+===================+
|  INBOX   |  SECURE MAIL TERMINAL                    |  FACILITY         |
|  ======  |  =====================                   |  STATUS           |
|          |                                          |  =======          |
|  NEW (3) |  From:    d.varga@budapest-tech.edu.hu   |                   |
|  >[!]Dr. |  To:      intake@matrices-gmbh.net       |  RACKS            |
|    [ ]Re |  Date:    Day 14, 06:47 CEST             |  [████████░░] 8/12|
|    [ ]Em |  Subject: Emergency Data Recovery -       |                   |
|  -----   |           Faculty Database                |  POWER            |
|  PENDING |  ---------------------------------------- |  [████████░░] 78% |
|  (4)     |                                          |                   |
|          |  Dear Matrices GmbH Intake Team,          |  COOLING          |
|          |                                          |  [██████████] OK  |
|          |  I am writing on behalf of the Budapest   |                   |
|          |  Technical University Faculty of Computer  |  BANDWIDTH        |
|          |  Science. Following the network collapse,  |  [██████░░░░] 52% |
|          |  we have lost access to 14 years of        |  =======          |
|          |  research data stored on our primary       |                   |
|          |  file servers.                            |  QUICK ANALYSIS   |
|          |                                          |  --------         |
|          |  [... continued email body ...]            |  Domain:          |
|          |                                          |  budapest-tech    |
|          |  ---------------------------------------- |  .edu.hu [VERIFY] |
|          |  ATTACHMENTS:                             |                   |
|          |  [1] institutional_id.pdf     (142 KB)    |  Sender:          |
|          |  [2] data_manifest.csv        (38 KB)     |  First contact    |
|          |  [3] chain_of_custody.pdf     (97 KB)     |  [NOTE]           |
|          |                                          |                   |
|          |  QUICK ANALYSIS:                          |  Request size:    |
|          |  Domain: budapest-tech.edu.hu  [VERIFY]   |  2.3 TB           |
|          |  Sender: First contact         [NOTE]     |  [CAPACITY CHK]   |
|          |  Request: 2.3 TB               [CHK CAP]  |                   |
+==========+==========================================+===================+
|  [APPROVE]  [DENY]  [FLAG FOR REVIEW]  [REQUEST ADD'L VERIFICATION]  [TOOLS]  |
+=========================================================================+
```

**Interaction flow:**

1. Player selects email from inbox (click/tap or Arrow keys)
2. Email renders in center panel with full header, body, attachments
3. Player reads email, clicks attachments to open in sub-panels
4. Player uses Quick Analysis links to verify sender domain, check capacity
5. Player makes decision: Approve / Deny / Flag for Review / Request Additional Verification
6. Stamp animation plays, email moves to appropriate queue
7. Next email auto-selects (or inbox returns to list view)

### 2.3 Document Viewer

The document viewer is a generic renderer that adapts its layout per document type. All 13 document types render within this panel.

```
+==========================================+
|  DOCUMENT VIEWER                         |
|  ========================================|
|  [Tab: Email] [Tab: Verification] [Tab: Threat Assessment]
|  ========================================|
|                                          |
|  VERIFICATION PACKET                     |
|  File: institutional_id.pdf              |
|  ========================================|
|                                          |
|  IDENTITY SECTION                        |
|  ----------------------------------------|
|  Name: Dr. Katarina Varga               |
|  Title: Dean, Faculty of Computer Sci.   |
|  Institution: Budapest Technical Univ.   |
|  ID Number: BTU-FAC-2019-0847           |
|  Photo: [THUMBNAIL]                      |
|  ----------------------------------------|
|                                          |
|  OWNERSHIP SECTION                       |
|  ----------------------------------------|
|  Data Description: Faculty research DB   |
|  Total Size: 2.3 TB                      |
|  Backup Date: 2024-11-15                 |
|  Chain of Custody: [SEE TAB 3]           |
|  ----------------------------------------|
|                                          |
|  [HIGHLIGHT SUSPICIOUS]  [ADD NOTE]      |
|  [COMPARE WITH EMAIL]    [ZOOM +/-]      |
+==========================================+
```

**Document type adaptations:**

| Document                    | Layout                                          | Interactive Elements                            |
| --------------------------- | ----------------------------------------------- | ----------------------------------------------- |
| Email Access Request        | Header + body + attachments                     | Click attachments, highlight text, verify links |
| Phishing Analysis Worksheet | Two-column: red flags / legitimacy              | Toggle checkboxes, add notes per item           |
| Verification Packet         | Tabbed view: Identity / Ownership / Chain       | Compare tabs side-by-side, flag discrepancies   |
| Threat Assessment Sheet     | Header with risk score + categorized indicators | Adjust weighting, override auto-score           |
| Incident Log                | Chronological timeline with expandable entries  | Filter by type, search, export                  |
| Data Salvage Contract       | Numbered clauses, signature block               | Highlight suspicious clauses, stamp to sign     |
| Storage Lease Agreement     | Terms grid, pricing table                       | Adjust terms, calculate costs                   |
| Upgrade Proposal            | Specs table, cost/benefit, timeline             | Approve/defer/reject                            |
| Blacklist Notice            | Entity details, rationale, evidence             | Review evidence, confirm or rescind             |
| Whitelist Exception         | Justification, approver chain, conditions       | Add justification, sign                         |
| Facility Status Report      | Visual meters, trend graphs, alert list         | Drill into specific systems                     |
| Intelligence Brief          | Executive summary + detailed analysis           | Redacted sections unlock with upgrades          |
| Ransom Note                 | Distorted text, countdown, payment              | Pay or attempt countermeasures                  |

### 2.4 Phishing Analysis Worksheet

An interactive overlay that guides structured analysis of suspicious emails.

```
+============================================================+
|  PHISHING ANALYSIS WORKSHEET                               |
|  Request: #47 | From: d.varga@budapest-tech.edu.hu         |
+============================================================+
|                                    |                        |
|  RED FLAGS                         |  LEGITIMACY SIGNALS    |
|  =========                         |  ==================    |
|                                    |                        |
|  [ ] Domain registered recently    |  [x] .edu.hu TLD      |
|  [ ] Urgency language present      |  [x] Named individual  |
|  [ ] Generic greeting used         |  [x] Specific data     |
|  [ ] Mismatched reply-to           |      described         |
|  [ ] Suspicious attachment type    |  [ ] Verification docs |
|  [ ] Request exceeds capacity      |      provided          |
|  [ ] Known threat pattern match    |  [ ] Consistent with   |
|  [ ] Inconsistent details          |      intel briefing    |
|  [ ] Unusually large request       |  [ ] Domain verified   |
|  [ ] Missing chain of custody      |  [ ] Return applicant  |
|                                    |                        |
|  Custom notes:                     |  Custom notes:         |
|  [________________________]        |  [____________________]|
|  [________________________]        |  [____________________]|
|                                    |                        |
+============================================================+
|  RISK ASSESSMENT: ████████░░ MEDIUM (6/10)                 |
|  Auto-score: 5/10  |  Your override: [  6  ]              |
+============================================================+
|  [SAVE & RETURN TO EMAIL]  [SAVE & DECIDE]                 |
+============================================================+
```

### 2.5 Facility Dashboard

Displayed when no email is selected. Shows operational overview.

```
+============================================================+
|  MATRICES GmbH -- FACILITY DASHBOARD                       |
|  Day 14 | 08:00 CEST | Facility Tier: STATION             |
+============================================================+
|                                                            |
|  RESOURCE OVERVIEW                                         |
|  ---------------------------------------------------------+
|                                                            |
|  RACK SPACE    [████████░░░░░░░░] 8/16 U     50%          |
|                ^^^^^^^^ used     ^^^^^^^^ free             |
|                                                            |
|  POWER         [████████████░░░░] 4.2/5.0 kW  84%        |
|                WARNING: Approaching capacity               |
|                                                            |
|  COOLING       [██████████████░░] 3.5/4.0 ton  88%       |
|                WARNING: Approaching capacity               |
|                                                            |
|  BANDWIDTH     [████████░░░░░░░░] 520/1000 Mbps 52%      |
|                OK                                          |
|                                                            |
|  FINANCIAL SUMMARY                                         |
|  ---------------------------------------------------------+
|  Daily Revenue:     2,100 CR                               |
|  Daily OpEx:        800 CR                                 |
|  Daily Net:         1,300 CR                               |
|  Total Funds:       12,450 CR                              |
|  Ransom Reserve:    1,245 CR (= earnings/10)               |
|                                                            |
|  ACTIVE CLIENTS: 6                                         |
|  ---------------------------------------------------------+
|  Budapest Tech Univ. ... 2.3 TB ... Day 14-44 ... [VIEW]  |
|  Lagos General Hosp. ... 800 GB ... Day 10-40 ... [VIEW]  |
|  Nordic Archives     ... 4.1 TB ... Day 8-38  ... [VIEW]  |
|  [+ 3 more clients]                                        |
|                                                            |
|  [UPGRADE SHOP]  [INTEL BRIEF]  [INCIDENT LOG]            |
+============================================================+
```

### 2.6 Upgrade Shop

Tech tree browser with purchase flow.

```
+============================================================+
|  UPGRADE SHOP -- MATRICES GmbH                             |
|  Available Funds: 12,450 CR                                |
+============================================================+
|          |                                                  |
|  CATEGORY|  UPGRADE DETAIL                                 |
|  ========|  ==============                                  |
|          |                                                  |
|  > INFRA |  EMAIL HEADER ANALYZER                          |
|    Racks |  ========================                        |
|    Power |                                                  |
|    Cool  |  Cost: 1,500 CR                                 |
|    BW    |  Install Time: 2 days                           |
|          |  OpEx: 50 CR/day                                 |
|  > SECUR |                                                  |
|  > [Act] |  DESCRIPTION:                                   |
|    Email |  Automatically checks for spoofed headers,      |
|    IDS   |  mismatched reply-to addresses, and              |
|    SIEM  |  suspicious routing patterns.                    |
|    WAF   |                                                  |
|    EDR   |  BENEFITS:                                       |
|    Honey |  - Auto-flags header anomalies in emails        |
|    AI    |  - Reduces false negative rate by ~30%          |
|    ZT GW |  - Unlocks "Header View" in email panel         |
|          |                                                  |
|  > STAFF |  REQUIRES:                                       |
|    Hire  |  - Facility Tier: Station (met)                  |
|    Train |  - Power: +0.2 kW                                |
|          |                                                  |
|          |  [PURCHASE 1,500 CR]  [ADD TO QUEUE]             |
+==========+==================================================+
```

### 2.7 Threat Monitor

```
+============================================================+
|  THREAT MONITOR                                            |
+============================================================+
|                                                            |
|  CURRENT THREAT LEVEL                                      |
|  [=====|=====] ELEVATED (3/5)                              |
|  Shield: [CRACKED ICON]                                    |
|  Since: Day 12, 14:00 CEST                                |
|                                                            |
|  ACTIVE THREATS                                            |
|  ---------------------------------------------------------+
|  [!] PHISHING CAMPAIGN -- .edu domain spoofing            |
|      Detected: Day 13 | Status: ACTIVE                    |
|      Emails intercepted: 3 | Emails missed: 0             |
|      [VIEW DETAILS]                                        |
|                                                            |
|  [!] RECON ACTIVITY -- Port scanning from unknown IPs     |
|      Detected: Day 14 | Status: MONITORING                |
|      Probes blocked: 47 | Anomalies: 2                    |
|      [VIEW DETAILS]                                        |
|                                                            |
|  SECURITY TOOL STATUS                                      |
|  ---------------------------------------------------------+
|  Firewall        [ACTIVE]  ........ Blocking: 142 today   |
|  IDS             [ACTIVE]  ........ Alerts: 7 today       |
|  Email Filter    [ACTIVE]  ........ Flagged: 4 today      |
|  SIEM            [NOT INSTALLED]   [BUY: 3,000 CR]        |
|  WAF             [NOT INSTALLED]   [BUY: 2,500 CR]        |
|                                                            |
|  THREAT HISTORY (last 7 days)                              |
|  Day: 8  9  10 11 12 13 14                                 |
|       L  L  G  G  E  E  E   (L=Low, G=Guarded, E=Elev.)  |
|       .  X  .  .  .  .  .   (X = breach on Day 9)         |
+============================================================+
```

### 2.8 Incident Response View

```
+============================================================+
|  INCIDENT RESPONSE -- ACTIVE INCIDENT                      |
|  Incident #IR-014-001 | Priority: HIGH                     |
+============================================================+
|                                                            |
|  ALERT: Unauthorized data access detected                  |
|  Time: Day 14, 07:42 CEST                                 |
|  Source: Request #42 (approved Day 12)                     |
|  Affected Systems: Rack 7, Storage Array B                 |
|                                                            |
|  TIMELINE                                                  |
|  ---------------------------------------------------------+
|  07:42 -- Anomalous read pattern detected on Rack 7       |
|  07:43 -- IDS Alert: Data exfiltration signature match    |
|  07:44 -- Auto-response: Rack 7 isolated                  |
|  07:45 -- Awaiting operator decision                      |
|                                                            |
|  RESPONSE OPTIONS                                          |
|  ---------------------------------------------------------+
|  [1] CONTAIN -- Isolate affected systems (2 clients       |
|      disrupted, prevents spread)                           |
|  [2] INVESTIGATE -- Deploy forensic tools (takes 4 hours, |
|      risk of continued exfiltration)                       |
|  [3] FULL LOCKDOWN -- Halt all operations (maximum        |
|      protection, maximum disruption)                       |
|  [4] IGNORE -- Continue monitoring (risky, but preserves  |
|      operations)                                           |
|                                                            |
|  RECOMMENDED: Option 1 (based on current tooling)          |
|                                                            |
|  [SELECT RESPONSE: ___]  [EXECUTE]                         |
+============================================================+
```

### 2.9 Ransom Lockout Screen

Full-screen takeover. This is the most dramatic UI moment in the game.

```
+====================================================================+
|                                                                    |
|                                                                    |
|                                                                    |
|        ██████╗ ██████╗ ███████╗ █████╗  ██████╗██╗  ██╗           |
|        ██╔══██╗██╔══██╗██╔════╝██╔══██╗██╔════╝██║  ██║           |
|        ██████╔╝██████╔╝█████╗  ███████║██║     ███████║           |
|        ██╔══██╗██╔══██╗██╔══╝  ██╔══██║██║     ██╔══██║           |
|        ██████╔╝██║  ██║███████╗██║  ██║╚██████╗██║  ██║           |
|        ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝           |
|                                                                    |
|        ████████████████████████████████████████████████             |
|        █                                              █             |
|        █   YOUR SYSTEMS HAVE BEEN COMPROMISED.        █             |
|        █                                              █             |
|        █   All operations are suspended.              █             |
|        █   All data access is locked.                 █             |
|        █                                              █             |
|        █   RANSOM DEMAND: 1,245 CR                    █             |
|        █                                              █             |
|        █   Deadline: 24:00:00                         █             |
|        █            ^^^^^^^^                          █             |
|        █            (counting down)                   █             |
|        █                                              █             |
|        █   [PAY RANSOM]    [ATTEMPT RECOVERY]         █             |
|        █                                              █             |
|        █   You have 12,450 CR available.              █             |
|        █                                              █             |
|        ████████████████████████████████████████████████             |
|                                                                    |
|        Entry point: Request #42 from unknown@fake-edu.net          |
|        Attack vector: Credential harvesting via spoofed domain     |
|        Red flags missed: Domain age (2 days), no verification      |
|                                                                    |
+====================================================================+
```

**Visual effects during lockout:**

- Background: Deep red (#1a0000) replacing normal dark background
- Text: Harsh white (#ffffff) and red (#ff3333), no green phosphor
- CRT effects: Static noise increased to 0.08 opacity, flicker rate increased
- Screen shake: Very subtle CSS transform oscillation (2px, 0.1s)
- Sound: Low-frequency alarm drone (optional)
- `prefers-reduced-motion`: No shake, no flicker, static noise static instead of animated

**Accessibility:** The ransom note content is fully readable by screen readers. The countdown timer is announced periodically via `aria-live`. Both action buttons have descriptive `aria-label` text. Focus is trapped within the lockout overlay.

### 2.10 Admin Dashboard (Enterprise)

The enterprise admin interface deliberately breaks the game's diegetic framing. It is a clean, professional SaaS dashboard.

```
+====================================================================+
|  [MATRICES LOGO]  THE DMZ: ARCHIVE GATE      [Sarah K.] [Settings] |
+====================================================================+
|           |                                                         |
|  NAV      |  DASHBOARD                                             |
|  ======== |  =========                                              |
|           |  Welcome back, Sarah. Campaign summary for Q1 2026.    |
|  Dashboard|                                                         |
|  Campaigns|  +------------------+  +------------------+             |
|  Users    |  | ACTIVE CAMPAIGNS |  | TOTAL USERS      |             |
|  Reports  |  |       3    [+1]  |  |     247    [+12] |             |
|  Phishing |  +------------------+  +------------------+             |
|  Sim      |  +------------------+  +------------------+             |
|  Compliance  | AVG PHISH DETECT |  | COMPLETION RATE  |             |
|  Settings |  |      72%   [+5%] |  |      78%   [-2%] |             |
|  ------   |  +------------------+  +------------------+             |
|  Help     |                                                         |
|  Docs     |  RISK HEATMAP BY DEPARTMENT                            |
|           |  +-------------------------------------------------+   |
|           |  | Engineering  [====|===] 74% detect rate          |   |
|           |  | Marketing    [===|====] 61% detect rate  [!]    |   |
|           |  | Sales        [=====|==] 79% detect rate          |   |
|           |  | Operations   [====|===] 68% detect rate          |   |
|           |  | Executive    [==|=====] 52% detect rate  [!!]   |   |
|           |  +-------------------------------------------------+   |
|           |                                                         |
|           |  RECENT ACTIVITY                                        |
|           |  -----------------------------------------------        |
|           |  [User] John D. completed Day 14 (Score: 89%)           |
|           |  [Campaign] "Q1 Awareness" -- 12 new users enrolled    |
|           |  [Alert] 3 users failed phishing detection on Day 7     |
+===========+=========================================================+
```

**Key differences from game UI:**

- White/light background (with dark mode option)
- Inter font family, no monospaced terminal text
- Standard rounded corners (8px border-radius)
- Drop shadows on cards
- No CRT effects, no phosphor glow, no scanlines
- Standard data visualization (charts, tables, heatmaps)
- Sidebar navigation with collapsible sections
- Breadcrumb navigation

---

## 3. Component Library Specification

All components are Svelte 5 components using the runes API (`$props()`, `$state()`, `$derived()`, `$effect()`). TypeScript interfaces define all props.

### 3.1 TerminalWindow

Draggable, resizable, minimizable window with terminal chrome.

```typescript
// TerminalWindow.svelte props interface
interface TerminalWindowProps {
  /** Window title displayed in the title bar */
  title: string;
  /** Unique identifier for state persistence */
  id: string;
  /** Whether the window can be dragged */
  draggable?: boolean; // default: false
  /** Whether the window can be resized */
  resizable?: boolean; // default: false
  /** Whether the window is currently minimized */
  minimized?: boolean; // default: false
  /** Whether the window can be closed */
  closable?: boolean; // default: true
  /** Initial width in pixels or CSS value */
  width?: string; // default: '400px'
  /** Initial height in pixels or CSS value */
  height?: string; // default: '300px'
  /** Z-index layer */
  layer?: number; // default: 10
  /** CSS class for custom styling */
  class?: string;
  /** Callback when window is closed */
  onclose?: () => void;
  /** Callback when window is minimized/restored */
  onminimize?: (minimized: boolean) => void;
  /** Child content via default slot */
  children: import('svelte').Snippet;
}
```

**States:** Default, Focused (bright border), Minimized (collapsed to title bar), Dragging (subtle opacity change), Resizing.

**Accessibility:**

- `role="dialog"` with `aria-labelledby` pointing to title
- Title bar buttons have `aria-label`: "Minimize window", "Close window"
- Draggable windows also movable via keyboard (Alt+Arrow keys)
- Focus trapped within window when modal, free when non-modal
- Escape key closes the window

**Responsive:** On mobile (< 768px), windows are always full-width and not draggable/resizable. They stack vertically or use tab-based navigation.

### 3.2 TerminalText

Text with typewriter effect, syntax highlighting, and terminal formatting.

```typescript
interface TerminalTextProps {
  /** Text content to display */
  text: string;
  /** Enable typewriter animation */
  typewriter?: boolean; // default: false
  /** Characters per second for typewriter */
  speed?: number; // default: 30
  /** Enable phosphor glow effect */
  glow?: boolean; // default: true
  /** Text color variant */
  variant?: 'green' | 'amber' | 'white' | 'red' | 'muted'; // default: 'green'
  /** Apply syntax highlighting (for code/headers) */
  highlight?: boolean; // default: false
  /** Make text selectable */
  selectable?: boolean; // default: true
  /** Callback when typewriter animation completes */
  oncomplete?: () => void;
  /** Allow skipping typewriter with click */
  skippable?: boolean; // default: true
}
```

**States:** Typing (characters appearing), Complete (all text visible), Skipped (user interrupted typewriter).

**Accessibility:**

- Full text content is in the DOM immediately (visible to screen readers) even during typewriter animation; the animation is purely visual via CSS `clip-path` or `max-width` reveal
- `aria-live="polite"` for dynamic text additions
- `prefers-reduced-motion`: Text appears instantly, no animation

### 3.3 DocumentPanel

Scrollable, zoomable, annotatable document container.

```typescript
interface DocumentPanelProps {
  /** Document data object */
  document: GameDocument;
  /** Document type determines layout */
  type: DocumentType;
  /** Enable text annotation */
  annotatable?: boolean; // default: true
  /** Enable zoom controls */
  zoomable?: boolean; // default: true
  /** Current zoom level (1.0 = 100%) */
  zoom?: number; // default: 1.0
  /** Enable text highlighting */
  highlightable?: boolean; // default: true
  /** Existing annotations */
  annotations?: Annotation[];
  /** Callback when annotation is added */
  onannotate?: (annotation: Annotation) => void;
  /** Callback when text is highlighted */
  onhighlight?: (selection: TextSelection) => void;
}

type DocumentType =
  | 'email'
  | 'phishing-worksheet'
  | 'verification-packet'
  | 'threat-assessment'
  | 'incident-log'
  | 'salvage-contract'
  | 'lease-agreement'
  | 'upgrade-proposal'
  | 'blacklist-notice'
  | 'whitelist-exception'
  | 'facility-report'
  | 'intel-brief'
  | 'ransom-note';

interface Annotation {
  id: string;
  documentId: string;
  startOffset: number;
  endOffset: number;
  note: string;
  type: 'suspicious' | 'important' | 'note';
  createdAt: Date;
}
```

**Accessibility:**

- Document content uses semantic HTML (headings, lists, tables)
- `role="document"` on the container
- Zoom controls have `aria-label` and announce current zoom level
- Annotations are read as footnotes by screen readers
- Keyboard zoom: Ctrl+Plus/Minus within the panel

### 3.4 ActionStamp

Papers, Please-inspired stamp mechanic for the four decision options defined in BRD FR-GAME-005: Approve, Deny, Flag for Review, Request Additional Verification.

```typescript
interface ActionStampProps {
  /** Stamp action type (maps to BRD FR-GAME-005 decision options) */
  action: 'approve' | 'deny' | 'flag-for-review' | 'request-additional-verification';
  /** Whether the stamp is currently active/available */
  disabled?: boolean; // default: false
  /** Current request context for aria-label */
  requestContext?: string; // e.g., "Dr. Varga's request"
  /** Show confirmation dialog before stamping */
  requireConfirmation?: boolean; // default: true
  /** Callback when stamp is applied */
  onstamp?: (action: StampAction) => void;
}

type StampAction = {
  action: 'approve' | 'deny' | 'flag-for-review' | 'request-additional-verification';
  requestId: string;
  timestamp: Date;
};
```

**Visual behavior:**

1. Idle: Button shows stamp icon + text label, terminal styling
2. Hover/Focus: Stamp icon enlarges slightly, glow intensifies
3. Click: Stamp slams down animation (CSS `transform: scale(1.15)` then `scale(1.0)` with bounce easing, 200ms)
4. Confirmation dialog appears (if enabled): "Approve request from Dr. Varga? [Confirm] [Cancel]"
5. Applied: Red/green ink stamp mark appears on the document, satisfying THUNK sound plays

**Accessibility:**

- `role="button"` with `aria-label="Approve request from Dr. Katarina Varga"`
- Keyboard activation: Enter or Space
- Keyboard shortcut: A (approve), D (deny), F (flag for review), V (request additional verification)
- Confirmation dialog traps focus, Cancel is default focused button
- `prefers-reduced-motion`: Stamp appears instantly without animation

### 3.5 ResourceMeter

Horizontal bar chart with thresholds, animations, and detailed breakdowns.

```typescript
interface ResourceMeterProps {
  /** Resource label */
  label: string;
  /** Current value */
  value: number;
  /** Maximum value */
  max: number;
  /** Unit label (e.g., 'U', 'kW', '%', 'Mbps') */
  unit?: string;
  /** Warning threshold (fraction 0-1) */
  warningThreshold?: number; // default: 0.8
  /** Critical threshold (fraction 0-1) */
  criticalThreshold?: number; // default: 0.9
  /** Show numeric value beside bar */
  showValue?: boolean; // default: true
  /** Compact mode (no label, just bar + value) */
  compact?: boolean; // default: false
  /** Tooltip with detailed breakdown */
  breakdown?: ResourceBreakdown[];
  /** Callback on click to drill down */
  onclick?: () => void;
}

interface ResourceBreakdown {
  label: string;
  value: number;
  color?: string;
}
```

**Visual states:**

- Normal (< warning): Green fill (`--color-phosphor-green`)
- Warning (>= warning, < critical): Amber fill (`--color-amber`) + pulsing border
- Critical (>= critical): Red fill (`--color-danger`) + steady glow + text "CRITICAL"

**Accessibility:**

- `role="meter"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- `aria-valuetext="Rack space: 8 of 12 available. 67 percent."`
- Value changes announced via `aria-live="polite"` region
- Color states always paired with text label and icon

### 3.6 ThreatIndicator

Five-level visual system for current threat status.

```typescript
interface ThreatIndicatorProps {
  /** Current threat level (1-5) */
  level: 1 | 2 | 3 | 4 | 5;
  /** Show text label */
  showLabel?: boolean; // default: true
  /** Show shield icon */
  showIcon?: boolean; // default: true
  /** Show segmented bar */
  showBar?: boolean; // default: true
  /** Compact mode for mobile */
  compact?: boolean; // default: false
  /** Callback on click to view threat details */
  onclick?: () => void;
}
```

**Encoding channels (all active by default):**

1. Color: Background shifts across the threat palette
2. Text: "LOW", "GUARDED", "ELEVATED", "HIGH", "SEVERE"
3. Icon: Shield with progressive damage
4. Bar: Five segments, filled to current level
5. Sound: Ambient tone shift (optional)
6. Haptic: Vibration at HIGH/SEVERE (mobile, optional)

**Accessibility:**

- `role="status"` with `aria-live="assertive"`
- Changes announced: "Threat level changed to ELEVATED, level 3 of 5"
- All five encoding channels ensure information is conveyed regardless of disability

### 3.7 NotificationToast

Terminal-style popup notification system.

```typescript
interface NotificationToastProps {
  /** Toast message text */
  message: string;
  /** Notification type */
  type: 'info' | 'success' | 'warning' | 'danger' | 'critical';
  /** Display duration in ms (0 = persistent) */
  duration?: number; // default: 5000
  /** Whether user can dismiss */
  dismissible?: boolean; // default: true
  /** Priority (higher = more prominent) */
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  /** Source context */
  source?: string; // e.g., "SYSOP-7", "SYSTEM", "MORPHEUS"
  /** Callback on dismiss */
  ondismiss?: () => void;
  /** Callback on click (if actionable) */
  onclick?: () => void;
}
```

**Visual treatment:**

```
+--[ SYSOP-7 ]----------------------------------+
|  Heads up. Three requests today used the same  |
|  IP block. Might be coordinated.          [X]  |
+-------------------------------------------------+
```

**Accessibility:**

- Uses `role="alert"` for urgent, `role="status"` for others
- Announced via `aria-live` regions (assertive for urgent, polite for info)
- Does not steal focus from current task
- Dismiss button has `aria-label="Dismiss notification"`
- Persistent toasts remain until manually dismissed

### 3.8 DialogBox

Character dialogue with portrait and branching choices.

```typescript
interface DialogBoxProps {
  /** Speaking character */
  speaker: {
    name: string;
    role?: string;
    portrait?: string; // URL to character portrait image
  };
  /** Dialog text content */
  text: string;
  /** Enable typewriter effect for dialog text */
  typewriter?: boolean; // default: true
  /** Response choices (if branching) */
  choices?: DialogChoice[];
  /** Callback when dialog is dismissed or choice made */
  onresponse?: (choiceId?: string) => void;
}

interface DialogChoice {
  id: string;
  text: string;
  consequence?: string; // Hint text shown on hover
  disabled?: boolean;
  disabledReason?: string;
}
```

**Visual layout:**

```
+--[ MORPHEUS ]--------------------------------------+
|  [PORTRAIT]  Good work today, Operator.            |
|              Your detection rate is improving.      |
|              But stay sharp -- I have intel that    |
|              suggests a coordinated campaign is     |
|              targeting .edu domains this week.      |
|                                                    |
|  > [1] "I will keep an eye out."                    |
|  > [2] "Can you share the intel brief?"            |
|  > [3] "Should I blacklist all .edu requests?"      |
+----------------------------------------------------+
```

**Accessibility:**

- `role="dialog"` with `aria-labelledby` pointing to speaker name
- Choices are a `role="listbox"` with `role="option"` items
- Arrow keys navigate choices, Enter selects
- Focus trapped within dialog until dismissed/chosen

### 3.9 NavigationBar

Terminal-style tab bar or command-line navigation.

```typescript
interface NavigationBarProps {
  /** Navigation items */
  items: NavItem[];
  /** Currently active item */
  activeItem: string;
  /** Navigation style */
  variant: 'tabs' | 'terminal' | 'breadcrumb';
  /** Callback on navigation */
  onnavigate?: (itemId: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon?: string; // Icon identifier
  badge?: number; // Notification count
  disabled?: boolean;
  shortcut?: string; // e.g., "1", "2" for quick-nav
}
```

**Tab variant (game):**

```
[NEW (3)] [PENDING (4)] [ARCHIVE (12)] [FLAGGED (1)]
 ^^^^^^^
 active
```

**Terminal variant (mobile bottom bar):**

```
[INBOX] [DOCS] [STATUS] [MORE]
```

**Accessibility:**

- `role="tablist"` with `role="tab"` items
- `aria-selected="true"` on active tab
- Arrow keys navigate between tabs
- Badge counts announced: "New, 3 items"

### 3.10 DataTable

Sortable, filterable, paginated table for both game (incident logs) and admin (user lists).

```typescript
interface DataTableProps<T> {
  /** Column definitions */
  columns: Column<T>[];
  /** Row data */
  data: T[];
  /** Enable sorting */
  sortable?: boolean; // default: true
  /** Enable filtering */
  filterable?: boolean; // default: true
  /** Rows per page (0 = no pagination) */
  pageSize?: number; // default: 25
  /** Current sort state */
  sortBy?: { column: string; direction: 'asc' | 'desc' };
  /** Enable row selection */
  selectable?: boolean; // default: false
  /** Variant styling */
  variant?: 'game' | 'admin'; // default: 'game'
  /** Callback on row click */
  onrowclick?: (row: T) => void;
  /** Callback on sort change */
  onsort?: (sortBy: { column: string; direction: 'asc' | 'desc' }) => void;
}

interface Column<T> {
  key: keyof T & string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: T[keyof T], row: T) => import('svelte').Snippet;
}
```

**Accessibility:**

- Semantic `<table>` with `<thead>`, `<tbody>`, proper `<th>` scope
- Sort buttons in column headers with `aria-sort` attribute
- `aria-label` on table describing content and current sort/filter state
- Pagination controls with `aria-label` on page buttons
- Row selection announced via `aria-selected`

### 3.11 Form Elements (Terminal Style)

```typescript
// Terminal-style text input
interface TerminalInputProps {
  /** Input label (always visible) */
  label: string;
  /** Current value */
  value?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Input type */
  type?: 'text' | 'password' | 'number' | 'email';
  /** Required field */
  required?: boolean;
  /** Error message */
  error?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Prompt character (e.g., ">", "$") */
  prompt?: string; // default: '>'
  /** Callback on value change */
  oninput?: (value: string) => void;
}

// Terminal-style checkbox
interface TerminalCheckboxProps {
  /** Checkbox label */
  label: string;
  /** Checked state */
  checked?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Callback on change */
  onchange?: (checked: boolean) => void;
}

// Terminal-style select/dropdown
interface TerminalSelectProps {
  /** Select label */
  label: string;
  /** Options list */
  options: { value: string; label: string; disabled?: boolean }[];
  /** Selected value */
  value?: string;
  /** Placeholder */
  placeholder?: string;
  /** Callback on change */
  onchange?: (value: string) => void;
}
```

**Visual treatment:**

```
Text Input:
  > SEARCH: [___________________________]

Checkbox:
  [x] Domain registered recently
  [ ] Urgency language present

Radio:
  (*) Approve
  ( ) Deny
  ( ) Flag for Review

Select/Dropdown:
  SORT BY: [Date (newest)    v]
```

**All form elements:**

- Visible `<label>` associated with input
- Error messages in text, adjacent to field (not just color)
- Required fields marked with text "(Required)", not just asterisk
- Focus indicator: 2px solid outline in `--color-phosphor-green`
- Minimum target size: 44x44px

### 3.12 Modal/Overlay System

```typescript
interface ModalProps {
  /** Whether modal is open */
  open: boolean;
  /** Modal title */
  title: string;
  /** Modal size */
  size?: 'sm' | 'md' | 'lg' | 'full';
  /** Whether clicking backdrop closes modal */
  dismissible?: boolean; // default: true
  /** Variant styling */
  variant?: 'game' | 'admin';
  /** Callback on close */
  onclose?: () => void;
  /** Child content */
  children: import('svelte').Snippet;
  /** Optional footer actions */
  footer?: import('svelte').Snippet;
}
```

**Accessibility:**

- `role="dialog"` with `aria-modal="true"`
- `aria-labelledby` pointing to title element
- Focus trapped within modal (Tab cycles through focusable elements)
- Escape closes the modal
- Focus returns to triggering element on close
- Background content has `aria-hidden="true"` and `inert` attribute

### 3.13 Loading States

```typescript
interface LoadingProps {
  /** Loading state active */
  loading: boolean;
  /** Loading message */
  message?: string; // default: 'Processing...'
  /** Visual variant */
  variant?: 'cursor' | 'progress' | 'spinner';
  /** Progress value (for progress variant) */
  progress?: number; // 0-100
}
```

**Visual variants:**

```
Cursor blink (default):
  Processing... _
  (underscore blinks at 530ms interval)

Progress bar:
  Loading email database... [████████░░░░] 67%

Terminal dots:
  Verifying sender domain...
  (dots append: . .. ... . .. ...)
```

**Accessibility:**

- `role="progressbar"` with `aria-valuenow` for progress variant
- `aria-busy="true"` on the content area being loaded
- `aria-live="polite"` announces loading state changes
- `prefers-reduced-motion`: Cursor does not blink, dots do not animate

---

## 4. Interaction Design Patterns

### 4.1 Papers, Please Desk Metaphor

The core interaction model draws directly from Papers, Please. The player's screen is their desk. Documents arrive, stack, and must be individually processed.

**Key adaptations from Papers, Please:**

1. **Document stacking:** Multiple documents can be open simultaneously in the center panel. They are accessed via tabs (not physical drag-and-drop stacking, for accessibility). The tab metaphor replaces the desk stacking metaphor while preserving the "multiple documents to cross-reference" experience.

2. **Stamp mechanics:** Approve/Deny/Flag for Review/Request Additional Verification buttons are styled as stamps. The click interaction produces a satisfying visual and audio stamp effect. The stamp appears as an ink mark on the document, providing persistent visual feedback.

3. **Cross-referencing:** Players can open a Comparison View (side-by-side panels) to compare an email against a verification packet. On desktop, this splits the center panel horizontally. On tablet, documents stack vertically.

4. **Limited workspace:** The three-panel layout constrains visible information, forcing the player to prioritize what to examine -- mirroring the cramped desk of Papers, Please.

### 4.2 Drag-and-Drop for Document Comparison

```typescript
// Drag-and-drop interaction for opening comparison view
// Player drags an attachment from the email onto the Comparison Zone

interface DragDropConfig {
  /** Elements that can be dragged */
  draggable: '.attachment-link, .document-tab';
  /** Drop target for comparison */
  dropTarget: '.comparison-zone';
  /** Visual feedback during drag */
  dragFeedback: 'ghost' | 'outline';
  /** Keyboard alternative */
  keyboardAlternative: 'Select document, press C to compare';
}
```

**Keyboard alternative for all drag-and-drop:**

1. Focus on the document/attachment
2. Press `C` to enter comparison mode
3. Use Arrow keys to select second document
4. Press Enter to open side-by-side
5. Press Escape to exit comparison

### 4.3 Keyboard Shortcuts

**Full shortcut map:**

| Category   | Shortcut            | Action                              | Context         |
| ---------- | ------------------- | ----------------------------------- | --------------- |
| Navigation | `Tab` / `Shift+Tab` | Move focus forward/backward         | Global          |
| Navigation | `I`                 | Focus inbox panel                   | Global          |
| Navigation | `R`                 | Focus resource panel                | Global          |
| Navigation | `S`                 | Open search                         | Global          |
| Navigation | `T`                 | Toggle terminal overlay             | Global          |
| Navigation | `?`                 | Open shortcut reference             | Global          |
| Navigation | `1-5`               | Jump to inbox category              | Inbox focused   |
| Document   | `Arrow Up/Down`     | Navigate inbox items                | Inbox panel     |
| Document   | `Arrow Left/Right`  | Navigate document tabs              | Document viewer |
| Document   | `Enter` / `Space`   | Activate focused element            | Global          |
| Document   | `C`                 | Compare: open side-by-side          | Document viewer |
| Document   | `H`                 | Toggle highlight mode               | Document viewer |
| Document   | `N`                 | Add note to selection               | Document viewer |
| Action     | `A`                 | Approve current request             | Request open    |
| Action     | `D`                 | Deny current request                | Request open    |
| Action     | `F`                 | Flag current request                | Request open    |
| Action     | `V`                 | Request additional verification     | Request open    |
| System     | `Esc`               | Close modal/panel/tooltip           | Global          |
| System     | `Ctrl+Z`            | Undo last action (where applicable) | Global          |

**Vim-like keybindings (optional, enabled in Settings):**

| Shortcut  | Action                         |
| --------- | ------------------------------ |
| `j` / `k` | Navigate inbox items (down/up) |
| `h` / `l` | Navigate tabs (left/right)     |
| `gg`      | Go to first inbox item         |
| `G`       | Go to last inbox item          |
| `/`       | Open search                    |
| `:q`      | Close current panel            |
| `:help`   | Open help                      |

All single-key shortcuts are disabled when focus is in a text input field.

### 4.4 Right-Click Context Menus

Terminal-styled context menus appear on right-click (mouse) or long-press (touch).

```
+-------------------------+
|  > Copy text            |
|  > Highlight selection  |
|  > Flag as suspicious   |
|  > Add note             |
|  -----------------------|
|  > Verify domain        |
|  > Check sender history |
|  -----------------------|
|  > Compare with...      |
+-------------------------+
```

**Accessibility:** Context menus are also accessible via `Shift+F10` (standard keyboard context menu key) or a dedicated "Actions" button visible on focus.

### 4.5 Tooltip and Help System

**In-world terminal manual:** Help is delivered through the game's terminal interface, maintaining diegetic framing.

```
> help
MATRICES GmbH OPERATOR MANUAL v4.7

  help            Show this message
  help inbox      Inbox operations guide
  help verify     Verification procedures
  help threats    Threat level reference
  help upgrades   Upgrade catalog
  help shortcuts  Keyboard shortcut list
  help glossary   Terminology reference

> help verify
VERIFICATION PROCEDURES
========================
1. Check sender domain against known registries
2. Cross-reference identity documents with request
3. Verify chain of custody for data transfers
4. Note any discrepancies in the Analysis Worksheet
5. When in doubt, FLAG FOR REVIEW
```

**Tooltips:** Appear on hover (mouse) or focus (keyboard). Always dismissible with Escape. Content is hoverable (mouse can move into tooltip). Positioned to avoid viewport edges.

```css
/* Tooltip positioning and styling */
.tooltip {
  position: absolute;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-phosphor-green-dark);
  padding: var(--space-2) var(--space-3);
  font-family: var(--font-terminal);
  font-size: var(--text-sm);
  color: var(--color-phosphor-green);
  max-width: 300px;
  z-index: var(--z-tooltip, 500);
  /* Accessible: hoverable, dismissible, persistent */
  pointer-events: auto;
}
```

### 4.6 Notification System

Four priority levels with distinct visual treatments:

| Priority | Persistence                 | Visual                        | Sound       | Interrupt             |
| -------- | --------------------------- | ----------------------------- | ----------- | --------------------- |
| Low      | 3 seconds, auto-dismiss     | Muted border, bottom stack    | None        | No                    |
| Normal   | 5 seconds, auto-dismiss     | Standard border, bottom stack | Soft chime  | No                    |
| High     | Persistent until dismissed  | Amber border, top stack       | Alert tone  | Mild (banner appears) |
| Urgent   | Persistent, requires action | Red border, center overlay    | Alarm sound | Yes (blocks view)     |

**Notification stack:** Toasts stack from the bottom-right (desktop) or top (mobile). Maximum 3 visible at once; older notifications collapse into a counter.

### 4.7 "No Batch Actions" Principle

This is a deliberate design constraint that mirrors real security workflows:

- Each access request must be individually opened, read, analyzed, and decided
- No "select all and approve" functionality
- No "auto-process" for similar requests
- Inbox sorting and filtering aid triage but do not automate decisions
- This friction is the pedagogy: security review demands individual attention

### 4.8 Friction as Pedagogy

Deliberate friction points that teach real security habits:

| Friction Point                             | What It Teaches                              |
| ------------------------------------------ | -------------------------------------------- |
| Must open email to see full content        | Do not judge by subject line alone           |
| Verification packet is a separate document | Identity verification requires active effort |
| Domain verification is a manual click      | URL checking requires conscious action       |
| No "undo approve" without consequence      | Decisions in security are consequential      |
| Capacity check before approval             | Resource implications of access decisions    |
| Risk score requires worksheet interaction  | Threat assessment is a structured process    |

---

## 5. Responsive Design Strategy

### 5.1 Breakpoint Definitions

```css
:root {
  --bp-xs: 320px; /* Phones */
  --bp-sm: 600px; /* Small tablets, large phones */
  --bp-md: 768px; /* Tablets (landscape) */
  --bp-lg: 1024px; /* Laptops, standard monitors */
  --bp-xl: 1440px; /* Large monitors */
  --bp-2xl: 1920px; /* Full HD and above */
}

/* Usage with container queries where possible, media queries as fallback */
@media (min-width: 1024px) {
  /* Desktop: full 3-panel */
}
@media (min-width: 768px) and (max-width: 1023px) {
  /* Tablet: 2-panel */
}
@media (max-width: 767px) {
  /* Mobile: 1-panel + tabs */
}
```

### 5.2 Desktop Layout (Primary: 1920x1080, Minimum: 1024x768)

The full three-panel layout is the canonical game experience.

```css
.game-layout--desktop {
  display: grid;
  grid-template-areas:
    'header header  header'
    'inbox  viewer  status'
    'action action  action'
    'term   term    term';
  grid-template-columns: 250px 1fr 220px;
  grid-template-rows: auto 1fr auto auto;
  height: 100vh;
}

/* At XL (1440px+), widen panels */
@media (min-width: 1440px) {
  .game-layout--desktop {
    grid-template-columns: 280px 1fr 260px;
  }
}

/* At 2XL (1920px+), max content width with centered viewport */
@media (min-width: 1920px) {
  .game-layout--desktop {
    max-width: 1920px;
    margin: 0 auto;
  }
}
```

**Desktop features:**

- All three panels visible simultaneously
- Comparison mode splits center panel horizontally
- Terminal overlay can coexist with workspace (split bottom)
- Full keyboard shortcut set
- All CRT effects active (user-configurable)
- Drag-and-drop enabled for document comparison

### 5.3 Tablet Layout (Target: iPad Landscape 1024x768)

Two-panel layout with slide-out drawer for facility status.

```css
.game-layout--tablet {
  display: grid;
  grid-template-areas:
    'header header'
    'inbox  viewer'
    'action action';
  grid-template-columns: 200px 1fr;
  grid-template-rows: auto 1fr auto;
  height: 100vh;
}

/* Facility status becomes a drawer */
.status-drawer {
  position: fixed;
  right: 0;
  top: var(--header-height);
  bottom: var(--action-bar-height);
  width: 280px;
  transform: translateX(100%);
  transition: transform 200ms ease-out;
  z-index: var(--z-drawer, 100);
}

.status-drawer--open {
  transform: translateX(0);
}
```

**Tablet adaptations:**

- Right panel (facility status) is a slide-out drawer, toggled via icon in header
- Left panel (inbox) narrowed: shows sender name + risk indicator only
- Comparison mode stacks documents vertically
- Terminal is full-screen overlay
- Touch gestures enabled: swipe left/right on inbox items
- CRT effects reduced (scanlines at lower opacity, no curvature)
- Tap targets enlarged to 48px minimum

### 5.4 Mobile Layout (Critical for Free-to-Play Audience)

Single-panel with bottom tab navigation. This layout is critical because the consumer free-to-play audience is predominantly mobile.

```css
.game-layout--mobile {
  display: grid;
  grid-template-areas:
    'header'
    'content'
    'tabs';
  grid-template-rows: auto 1fr auto;
  height: 100vh;
  height: 100dvh; /* Dynamic viewport height for mobile browsers */
}

/* Bottom tab bar */
.tab-bar {
  display: flex;
  justify-content: space-around;
  padding: var(--space-2);
  background: var(--color-bg-secondary);
  border-top: 1px solid var(--color-phosphor-green-dark);
}

.tab-bar__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  min-width: 48px;
  min-height: 48px;
  font-size: var(--text-xs);
}
```

**Mobile-specific wireframe:**

```
+--------------------------------+
| [!] ELEVATED  Day 14  12,450 CR |
+--------------------------------+
|                                |
|  [FULL-SCREEN CONTENT AREA]   |
|                                |
|  (Shows ONE of: Inbox list,   |
|   Email detail, Facility      |
|   dashboard, or Threat        |
|   monitor at a time)          |
|                                |
|  When viewing an email:       |
|  Floating action buttons      |
|  appear at bottom:            |
|                                |
|  [APPROVE] [DENY] [FLAG] [V] |
|                                |
+--------------------------------+
| [Inbox] [Doc] [Status] [More] |
+--------------------------------+
```

**Mobile adaptations:**

- Single panel visible at a time, switched via bottom tabs
- Condensed header: threat level icon (tap for label), day number, abbreviated credits
- Inbox items: sender + subject only, tap to open
- Documents scroll vertically, attachments are collapsible accordions
- Action buttons float as a sticky bottom bar when viewing a request; all four BRD-required actions (Approve, Deny, Flag for Review, Request Additional Verification) are available, with "Request Additional Verification" abbreviated to [V] icon on narrow screens
- Comparison mode not available; documents bookmarked for quick tab switching
- Resource meters in "Status" tab as a simple list
- Terminal is a dedicated full-screen tab
- NO CRT effects (scanlines, curvature, vignette all disabled)
- Phosphor glow reduced to minimal text-shadow
- All touch targets minimum 48x48px with 8px spacing

### 5.5 Touch Interaction Adaptations

| Desktop Action                       | Touch Adaptation                                    |
| ------------------------------------ | --------------------------------------------------- |
| Right-click context menu             | Long-press context menu                             |
| Hover tooltip                        | Tap-and-hold tooltip OR dedicated info button       |
| Drag-and-drop comparison             | Select document A, tap "Compare", select document B |
| Mouse scroll in panel                | Touch scroll with momentum                          |
| Double-click to zoom                 | Pinch-to-zoom on documents                          |
| Keyboard shortcuts                   | Gesture shortcuts + bottom tab navigation           |
| Stamp click (with mouse press THUNK) | Tap stamp button + haptic feedback vibration        |

**Swipe gestures (mobile/tablet):**

| Gesture                     | Action                                                     | Context           |
| --------------------------- | ---------------------------------------------------------- | ----------------- |
| Swipe left on inbox item    | Reveal "Open / Flag / Snooze" quick actions (no decisions) | Inbox list        |
| Swipe right on inbox item   | Open request detail (review view)                          | Inbox list        |
| Swipe down from top         | Pull to refresh / load new emails                          | Inbox list        |
| Pinch zoom                  | Zoom document content                                      | Document viewer   |
| Two-finger swipe left/right | Switch between tabs                                        | Any view (tablet) |

All swipe gestures have button-based alternatives. Approve/Deny stamps are only available inside the request review view after opening the item; the inbox list never offers decision actions.

### 5.6 Layout Shift Summary

| Feature            | Desktop (1024+)  | Tablet (768-1023)   | Mobile (< 768)           |
| ------------------ | ---------------- | ------------------- | ------------------------ |
| Panel layout       | 3-panel grid     | 2-panel + drawer    | 1-panel + tabs           |
| Inbox detail       | Full metadata    | Sender + risk       | Sender + subject         |
| Comparison mode    | Side-by-side     | Stacked vertical    | Not available            |
| Terminal           | Inline + overlay | Full-screen overlay | Full-screen tab          |
| Resource meters    | Always visible   | Slide-out drawer    | Status tab               |
| Action buttons     | Fixed bottom bar | Fixed bottom bar    | Floating bottom          |
| Keyboard shortcuts | Full set         | Reduced set         | Minimal                  |
| Touch gestures     | N/A              | Swipe, pinch        | Swipe, pinch, long-press |
| CRT effects        | Full             | Reduced             | Disabled                 |

### 5.7 Internationalization and RTL Layout Considerations

Per BRD Section 7.6, the platform requires full support for 24 official EU languages, RTL language support (Arabic, Hebrew, Farsi), and locale-specific date, number, and currency formatting.

**Layout mirroring for RTL languages:**

- All CSS layouts use logical properties (`margin-inline-start` instead of `margin-left`, `padding-inline-end` instead of `padding-right`, `inset-inline` instead of `left`/`right`)
- Grid template areas are mirrored: the inbox panel moves to the right, facility status to the left
- Text alignment uses `start`/`end` instead of `left`/`right`
- Directional icons (arrows, chevrons) are mirrored in RTL mode
- Swipe gesture directions are reversed for RTL users
- The `dir="rtl"` attribute is set on the `<html>` element and respected by all components

**Font considerations for internationalization:**

- CJK characters fall back to system CJK fonts within the monospace stack
- Arabic/Hebrew script uses appropriate system fonts with `font-family` fallbacks
- Font size tokens (rem-based) accommodate scripts with larger or taller glyphs
- Line heights may need adjustment for scripts with diacritics or stacking marks

**Locale-specific formatting:**

- All dates, numbers, and currency values are formatted using the `Intl` API with the user's locale
- In-game currency (Credits/CR) display formatting respects locale number formatting conventions
- UI strings are externalized into locale files for translation management

---

## 6. Accessibility Implementation

WCAG 2.1 Level AA is the **baseline**, not a stretch goal. The game must be accessible to players with visual, auditory, motor, and cognitive disabilities. The terminal aesthetic is achievable without compromising accessibility because CRT effects are layered on top of a clean, semantic base.

**Compliance standards (per BRD Section 7.5 and 9.5):**

- **WCAG 2.1 Level AA** -- Baseline legal obligation across all markets
- **Section 508** -- Required for US government market access (Priority 1, must-have at launch)
- **EN 301 549** -- Required for EU market compliance (enforcement from June 28, 2025; Priority 3, within 12 months)
- **VPAT** -- Voluntary Product Accessibility Template maintained and updated with each release

### 6.1 Keyboard Navigation Map

```
Tab Order (Main Terminal Screen):
  1. [Skip to main content] (hidden until focused)
  2. Top Bar
     2a. Threat level indicator (read-only, focusable)
     2b. Day counter (read-only)
     2c. Funds display (read-only)
  3. Left Panel (Inbox)
     3a. Category tabs (New, Pending, Archive, Flagged)
     3b. Search input
     3c. Inbox item list (arrow-key navigable)
  4. Center Panel (Document Viewer)
     4a. Document tab bar
     4b. Document content (scrollable region)
     4c. Interactive elements within document (links, checkboxes)
     4d. Annotation tools
  5. Right Panel (Facility Status)
     5a. Resource meters (read-only, focusable)
     5b. Active threats count
     5c. Quick-action buttons (View Logs, Threat Map)
  6. Bottom Bar (Action Bar)
     6a. Approve button
     6b. Deny button
     6c. Flag for Review button
     6d. Request Additional Verification button
     6e. Tools dropdown
  7. Terminal Input (single-line, expands on focus)
```

**Focus management rules:**

- Modal dialogs trap focus and return it to trigger on close
- Panel switches move focus to first interactive element in new panel
- Dynamic content (new emails, threat changes) never steals focus
- Confirmation dialogs focus Cancel button by default (prevent accidental confirms)
- Escape always closes the topmost overlay/modal

### 6.2 Screen Reader Strategy

**ARIA Landmarks:**

```html
<header role="banner">
  <!-- Top bar: status, threat, funds -->
  <nav role="navigation">
    <!-- Left panel: inbox categories -->
    <main role="main">
      <!-- Center panel: document viewer -->
      <aside role="complementary">
        <!-- Right panel: facility status -->
        <footer role="contentinfo"><!-- Bottom bar: actions, terminal --></footer>
      </aside>
    </main>
  </nav>
</header>
```

**Live Regions:**

| Region                  | `aria-live` | `aria-atomic` | Content                                          |
| ----------------------- | ----------- | ------------- | ------------------------------------------------ |
| Threat level            | `assertive` | `true`        | "Threat level changed to ELEVATED, level 3 of 5" |
| Resource meters         | `polite`    | `false`       | Only changed values                              |
| Action confirmations    | `polite`    | `true`        | "Request from Dr. Varga approved"                |
| Breach alerts           | `assertive` | `true`        | "Security breach detected. Operations locked."   |
| New email notifications | `polite`    | `true`        | "New request from Dr. Varga, Budapest Tech"      |
| Terminal output         | `polite`    | `false`       | Latest command output                            |
| Funds changes           | `polite`    | `true`        | "Funds increased by 500 credits. Total: 12,950"  |

**Screen reader announcement examples:**

```
Opening the game:
  "The DMZ: Archive Gate. Day 14. Threat level: Elevated, level 3 of 5.
   Funds: 12,450 credits. You have 7 pending requests."

Selecting an inbox item:
  "Email from Dr. Katarina Varga, Budapest Technical University.
   Subject: Emergency Data Recovery. Risk level: Medium.
   Unread. 3 attachments."

Approving a request:
  "Request from Dr. Varga approved. Funds increased by 500 credits.
   Total funds: 12,950 credits."

Breach event:
  "Alert: Security breach detected. Operations locked. A ransom of
   1,295 credits is demanded. Press Enter to view ransom note."
```

### 6.3 Color Contrast Compliance

| Element                         | Foreground | Background | Contrast Ratio | WCAG Level |
| ------------------------------- | ---------- | ---------- | -------------- | ---------- |
| Terminal text (green on dark)   | `#33ff33`  | `#0a0e14`  | 13.2:1         | AAA        |
| Amber headings on dark          | `#ffb000`  | `#0a0e14`  | 9.6:1          | AAA        |
| Document white on dark          | `#e0e0e0`  | `#0a0e14`  | 14.7:1         | AAA        |
| Muted text on dark              | `#88aa88`  | `#0a0e14`  | 6.8:1          | AA         |
| Admin text on white             | `#212529`  | `#ffffff`  | 16.0:1         | AAA        |
| Admin link on white             | `#0d6efd`  | `#ffffff`  | 4.6:1          | AA         |
| Focus indicator (green on dark) | `#33ff33`  | `#0a0e14`  | 13.2:1         | AAA        |
| High-contrast: white on black   | `#ffffff`  | `#000000`  | 21.0:1         | AAA        |

All contrast ratios exceed WCAG 2.1 AA minimums (4.5:1 for normal text, 3:1 for large text).

### 6.4 Color-Blind Safe Palette

Based on the Wong (2011) palette, validated for protanopia, deuteranopia, and tritanopia:

| Semantic | Default   | Protanopia | Deuteranopia | Tritanopia | Secondary Encoding                            |
| -------- | --------- | ---------- | ------------ | ---------- | --------------------------------------------- |
| Safe     | `#009E73` | `#009E73`  | `#009E73`    | `#009E73`  | Checkmark icon, solid border, "SAFE" label    |
| Warning  | `#F0E442` | `#F0E442`  | `#E69F00`    | `#E69F00`  | Triangle icon, dashed border, "WARNING" label |
| Danger   | `#D55E00` | `#0072B2`  | `#0072B2`    | `#D55E00`  | X-circle icon, double border, "DANGER" label  |
| Info     | `#0072B2` | `#56B4E9`  | `#56B4E9`    | `#0072B2`  | Info-circle icon, dotted border, "INFO" label |
| Critical | `#CC79A7` | `#CC79A7`  | `#CC79A7`    | `#CC79A7`  | Skull icon, wavy border, "CRITICAL" label     |

Every color-coded element uses at least TWO non-color signals (text label + icon, or text label + border pattern).

### 6.5 prefers-reduced-motion Implementation

```css
@media (prefers-reduced-motion: reduce) {
  /* Disable ALL decorative animations */
  .crt-scanlines::after {
    animation: none;
  }
  .crt-noise::before {
    animation: none;
  }

  /* Typewriter text appears instantly */
  .typewriter {
    animation: none;
    clip-path: none;
  }

  /* Transitions become instant */
  *,
  *::before,
  *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }

  /* Screen flicker becomes a brief dim */
  .crt-flicker--active {
    opacity: 0.95;
  }

  /* Loading indicators become static */
  .loading-cursor {
    animation: none;
    opacity: 1;
  }

  /* Charts render fully, no draw-in */
  .chart-animate {
    animation: none;
  }
}
```

Additionally, the application provides a three-level motion setting:

- **Full**: All animations active
- **Reduced**: Essential transitions only (panel switching, focus movement)
- **None**: Zero animations, all state changes instant

### 6.6 CRT Effects as CSS Overlays

The architectural guarantee: all CRT effects are implemented as CSS pseudo-elements or overlays with `pointer-events: none`. They exist outside the DOM's interactive layer and accessibility tree.

```css
/* All CRT layers use pointer-events: none */
.crt-scanlines::after,
.crt-noise::before,
.crt-vignette::after {
  pointer-events: none;
  /* Not in accessibility tree */
  /* These are pseudo-elements, so inherently not accessible */
}

/* If ALL effects disabled, UI is a clean dark theme */
[data-effects='none'] .crt-scanlines::after,
[data-effects='none'] .crt-noise::before,
[data-effects='none'] .crt-vignette::after,
[data-effects='none'] .crt-curvature > .game-viewport {
  display: none !important;
  transform: none !important;
  box-shadow: none !important;
}

[data-effects='none'] .crt-glow {
  text-shadow: none !important;
}
```

### 6.7 Focus Indicators

```css
/* Game interface focus indicator */
:focus-visible {
  outline: 2px solid var(--color-phosphor-green);
  outline-offset: 2px;
  border-radius: 2px;
}

/* High-contrast focus indicator */
[data-high-contrast='on'] :focus-visible {
  outline: 3px solid #ffffff;
  outline-offset: 2px;
  box-shadow: 0 0 0 5px #000000;
}

/* Enterprise interface focus indicator */
.admin :focus-visible {
  outline: 2px solid var(--admin-accent);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Never remove focus indicators */
:focus:not(:focus-visible) {
  /* Mouse users: subtle indicator */
  outline: 1px solid var(--color-phosphor-green-dark);
  outline-offset: 2px;
}
```

### 6.8 Skip Links and Landmark Navigation

```html
<!-- Skip links at top of page, hidden until focused -->
<div class="skip-links">
  <a href="#main-content" class="skip-link">Skip to main content</a>
  <a href="#inbox" class="skip-link">Skip to inbox</a>
  <a href="#actions" class="skip-link">Skip to action bar</a>
</div>

<style>
  .skip-link {
    position: absolute;
    left: -9999px;
    top: 0;
    z-index: 9999;
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg-primary);
    color: var(--color-phosphor-green);
    border: 2px solid var(--color-phosphor-green);
    font-family: var(--font-terminal);
  }
  .skip-link:focus {
    left: var(--space-4);
    top: var(--space-4);
  }
</style>
```

### 6.9 Time Pressure Without Time Limits

The game creates urgency through queue pressure, not per-item timers:

- **No countdown per email decision.** Players can take as long as needed to analyze any single request. This is critical for accessibility (screen reader users, motor-impaired users) and for pedagogy (rushing security decisions teaches the wrong lesson).
- **Queue pressure:** New emails arrive periodically. Unanswered emails remain in the queue; backlog pressure is expressed at the queue/day level (e.g., end-of-day performance or backlog metrics), not via per-item expiry or failure.
- **Adjustable queue rate:** Settings > Accessibility > Game Speed offers Slow, Normal, and Fast queue rates.
- **Event timers (ransom deadlines):** Can be paused or extended in accessibility settings.
- **Timed assessments allow time extension:** Per BRD Section 9.5, any timed assessment element (e.g., ransom countdown, event-driven deadlines) must offer time extension options in accessibility settings, ensuring users with disabilities are not penalized by time constraints.
- **Day cycle:** Advancing to the next day is player-initiated, not automatic.

### 6.10 Non-Game Alternatives for Game-Based Elements

Per BRD Section 9.5, game-based elements must have non-game alternatives for accessibility:

| Game-Based Element                          | Non-Game Alternative                                                                          |
| ------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Stamp animation (Approve/Deny)              | Standard button click with text confirmation                                                  |
| ASCII art headers and decorations           | Plain text equivalents in screen reader output                                                |
| CRT visual effects (scanlines, glow, noise) | Clean dark theme with all effects disabled                                                    |
| Typewriter text animation                   | Instant text display (prefers-reduced-motion or settings toggle)                              |
| Sound-based alerts                          | Visual notification toasts, screen flash (accessibility-safe), ARIA live region announcements |
| Drag-and-drop document comparison           | Keyboard-based comparison mode (select + press C)                                             |
| Resource gauge visualizations               | Numeric text readouts with `role="meter"` and `aria-valuetext`                                |
| Facility map (Canvas/PixiJS)                | Accessible data table alternative listing facility status in text form                        |

All game-based training content is also available via non-game presentation when accessed through enterprise LMS integrations (SCORM/xAPI/LTI), ensuring compliance with Section 508 and EN 301 549 requirements.

### 6.11 Alternative Game Modes for Accessibility

| Mode                        | Description                                               | Changes                                                                                                            |
| --------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Relaxed**                 | Reduced pressure for new or accessibility-focused players | Slower queue rate, higher starting funds, reduced breach penalty, extended event timers                            |
| **Practice**                | Sandbox mode with no consequences                         | No breaches, infinite funds, all tools available. For learning the interface.                                      |
| **Screen Reader Optimized** | Streamlined for non-visual play                           | Simplified panel layout, enhanced announcements, auto-read document summaries, keyboard-only navigation emphasized |
| **One-Switch**              | Single-button scanning mode                               | Sequential focus through all interactive elements, single button to activate                                       |

---

## 7. Theming System

### 7.1 Theme Architecture

Themes are implemented entirely through CSS Custom Properties (design tokens). A theme switch changes the root-level custom properties, and the entire UI updates without page reload.

```css
/* Theme application via data attribute on root element */
:root[data-theme='green'] {
  --color-phosphor: #33ff33;
  --color-phosphor-dim: #88aa88;
  --color-phosphor-dark: #334433;
  --color-glow-r: 51;
  --color-glow-g: 255;
  --color-glow-b: 51;
}

:root[data-theme='amber'] {
  --color-phosphor: #ffb000;
  --color-phosphor-dim: #aa8844;
  --color-phosphor-dark: #443322;
  --color-glow-r: 255;
  --color-glow-g: 176;
  --color-glow-b: 0;
}

/* All components reference tokens, not hard-coded colors */
.terminal-text {
  color: var(--color-phosphor);
  text-shadow: 0 0 4px rgba(var(--color-glow-r), var(--color-glow-g), var(--color-glow-b), 0.3);
}
```

### 7.2 Available Themes

#### Theme 1: Green Phosphor (Default)

The classic green-screen terminal. Evokes early IBM 5151 displays and the cultural imagery of "hacker screens."

| Element        | Color                    |
| -------------- | ------------------------ |
| Background     | `#0a0e14`                |
| Primary text   | `#33ff33`                |
| Secondary text | `#88aa88`                |
| Headings       | `#ffb000` (amber accent) |
| Borders        | `#334433`                |
| Glow           | Green phosphor           |

#### Theme 2: Amber Terminal

Warm amber CRT aesthetic. Evokes early Hercules displays and amber monochrome monitors.

| Element        | Color                    |
| -------------- | ------------------------ |
| Background     | `#0e0a04`                |
| Primary text   | `#ffb000`                |
| Secondary text | `#aa8844`                |
| Headings       | `#ffcc44` (bright amber) |
| Borders        | `#443322`                |
| Glow           | Amber/warm               |

#### Theme 3: High Contrast

Maximum readability for users with visual impairments. All CRT effects disabled.

| Element        | Color                                  |
| -------------- | -------------------------------------- |
| Background     | `#000000` (pure black)                 |
| Primary text   | `#ffffff` (pure white)                 |
| Secondary text | `#ffffff`                              |
| Headings       | `#ffffff` (bold weight differentiates) |
| Borders        | `#ffffff`                              |
| Glow           | None                                   |
| CRT effects    | All disabled                           |
| Contrast ratio | 21:1 throughout                        |

#### Theme 4: Enterprise Clean

For corporate deployments where the terminal aesthetic may be unwelcome. Clean, professional, no game aesthetics. This theme is used for the admin dashboard regardless of game theme and is otherwise an explicit opt-in for players.

| Element        | Color (Light)        | Color (Dark)   |
| -------------- | -------------------- | -------------- |
| Background     | `#ffffff`            | `#1a1a2e`      |
| Primary text   | `#212529`            | `#e0e0e0`      |
| Secondary text | `#6c757d`            | `#a0a0b0`      |
| Headings       | `#212529` bold       | `#e0e0e0` bold |
| Borders        | `#dee2e6`            | `#2a2a4a`      |
| Font           | Inter (proportional) | Inter          |
| CRT effects    | All disabled         | All disabled   |
| Border radius  | 8px (rounded)        | 8px            |

#### Theme 5: Custom

User-configurable theme with full control:

```
+----------------------------------------------------------+
|  CUSTOM THEME EDITOR                                     |
+----------------------------------------------------------+
|                                                          |
|  Background:     [#0a0e14] [COLOR PICKER]                |
|  Primary Text:   [#33ff33] [COLOR PICKER]                |
|  Secondary Text: [#88aa88] [COLOR PICKER]                |
|  Headings:       [#ffb000] [COLOR PICKER]                |
|  Borders:        [#334433] [COLOR PICKER]                |
|                                                          |
|  Glow Color:     [#33ff33] [COLOR PICKER]                |
|  Glow Intensity: [====|===] 50%                          |
|                                                          |
|  Font:           [JetBrains Mono   v]                    |
|                                                          |
|  CONTRAST CHECK:                                         |
|  Primary/BG:   13.2:1  [PASS AAA]                        |
|  Secondary/BG:  6.8:1  [PASS AA]                         |
|  Heading/BG:    9.6:1  [PASS AAA]                        |
|                                                          |
|  [SAVE THEME]  [RESET]  [SHARE CODE]                     |
+----------------------------------------------------------+
```

The custom theme editor includes a real-time contrast checker that validates the user's color choices against WCAG 2.1 AA requirements. It warns if a combination fails to meet minimum contrast ratios and suggests adjustments.

### 7.3 Theme Switching Architecture

```typescript
// Theme store (Svelte 5 runes)
interface ThemeState {
  current: 'green' | 'amber' | 'high-contrast' | 'enterprise' | 'custom';
  custom: CustomThemeConfig;
  effects: {
    scanlines: boolean;
    scanlineOpacity: number;
    curvature: boolean;
    glow: boolean;
    glowIntensity: number;
    noise: boolean;
    noiseOpacity: number;
    vignette: boolean;
    flicker: boolean;
  };
  motion: 'full' | 'reduced' | 'none';
  fontSize: number; // 12-32
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
}

// Theme is applied by setting data attributes on <html> element
// All changes are instant (no page reload) via CSS custom property updates
function applyTheme(theme: ThemeState): void {
  const root = document.documentElement;
  root.dataset.theme = theme.current;
  root.dataset.scanlines = theme.effects.scanlines ? 'on' : 'off';
  root.dataset.curvature = theme.effects.curvature ? 'on' : 'off';
  root.dataset.glow = theme.effects.glow ? 'on' : 'off';
  root.dataset.noise = theme.effects.noise ? 'on' : 'off';
  root.dataset.vignette = theme.effects.vignette ? 'on' : 'off';
  root.dataset.highContrast = theme.current === 'high-contrast' ? 'on' : 'off';
  root.dataset.effects =
    theme.effects.scanlines ||
    theme.effects.curvature ||
    theme.effects.glow ||
    theme.effects.noise ||
    theme.effects.vignette
      ? 'on'
      : 'none';
  root.style.setProperty('--base-font-size', `${theme.fontSize}px`);
  root.style.setProperty('--scanline-opacity', String(theme.effects.scanlineOpacity));
  root.style.setProperty('--glow-intensity', String(theme.effects.glowIntensity));
  root.style.setProperty('--noise-opacity', String(theme.effects.noiseOpacity));
}
```

Theme preference is persisted to `localStorage` and synced to the user's server-side profile. The system respects OS-level preferences for accessibility, but does not override the terminal-first default theme:

- `prefers-color-scheme: dark` -> Default (green phosphor)
- `prefers-color-scheme: light` -> Default (green phosphor); may suggest Enterprise as an optional opt-in
- `prefers-contrast: more` -> High-contrast theme
- `prefers-reduced-motion: reduce` -> Motion set to "reduced", flicker disabled

---

## 8. Diegetic UI Philosophy

### 8.1 Everything Exists in the Game World

Diegetic UI means that every interface element has a narrative justification. The player is not looking at a "game UI" -- they are looking at the screen of a terminal in the Matrices GmbH data center. This design philosophy, inspired by Dead Space (health meter on Isaac's suit) and Metro 2033 (Artyom's wristwatch and clipboard), creates immersion by eliminating the boundary between game world and interface.

| UI Element                                                                    | Diegetic Justification                                                     |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Top status bar                                                                | Terminal system status display, standard on all Matrices GmbH workstations |
| Inbox panel                                                                   | Matrices GmbH Secure Mail Terminal -- the organization's email system      |
| Document viewer                                                               | Terminal document renderer -- processes incoming file transfers            |
| Resource meters                                                               | Facility monitoring dashboard -- connected to physical sensors             |
| Threat indicator                                                              | Threat Intelligence Feed -- aggregated from network monitoring             |
| Action buttons (Approve/Deny/Flag for Review/Request Additional Verification) | Standard Matrices GmbH access control interface                            |
| Terminal input                                                                | Operator command line -- direct system access                              |
| Upgrade shop                                                                  | Procurement system -- Matrices GmbH's equipment ordering interface         |
| Notification toasts                                                           | System alerts -- pushed by monitoring daemons                              |
| Ransom lockout                                                                | Actual screen takeover by malware (the attacker's message)                 |
| CRT effects                                                                   | Physical properties of the old CRT monitor the character uses              |
| Keyboard sounds                                                               | Physical properties of the mechanical keyboard                             |

### 8.2 Breaking the Fourth Wall Selectively

Some elements necessarily break diegesis. These are carefully limited and clearly marked:

| Element                   | Why It Breaks Diegesis               | How We Handle It                                                                |
| ------------------------- | ------------------------------------ | ------------------------------------------------------------------------------- |
| Settings menu             | No in-world "settings" on a terminal | Framed as "Terminal Configuration" -- the operator adjusting their workstation  |
| Accessibility options     | Real-world needs, not game-world     | Placed in "Terminal Configuration > Display" -- justified as adjusting the CRT  |
| Tutorial messages         | Meta-guidance for the player         | Delivered by SYSOP-7 as workplace orientation -- diegetic wrapping              |
| Achievement notifications | Game-meta concept                    | Framed as "Operator Performance Commendation" from HR                           |
| Loading screens           | Technical limitation                 | Framed as "Establishing secure connection..." or "Loading data from archive..." |
| Error messages            | Technical failures                   | Framed as "Terminal Error: Connection timeout. Retrying..."                     |

### 8.3 Immersion vs. Usability Trade-offs

The priority order is: **Usability > Accessibility > Immersion**

When diegetic design conflicts with usability, usability wins:

| Conflict                                              | Resolution                                                               |
| ----------------------------------------------------- | ------------------------------------------------------------------------ |
| CRT scanlines reduce text readability                 | Scanlines are extremely subtle (5% opacity) and fully disableable        |
| Terminal monospace font reduces long-text readability | Document bodies use proportional font (justified as "document renderer") |
| Diegetic tooltips would require in-world text         | Tooltips use standard behavior with terminal styling                     |
| In-world email would not have "risk score"            | Risk score justified as AI tool built into the terminal system           |
| Real CRT would not have smooth scrolling              | Smooth scrolling is used because jerky scrolling is unpleasant           |
| Real terminal would not have drag-and-drop            | Drag-and-drop is available because it improves document comparison       |

### 8.4 Enterprise Mode UI Differences

The enterprise admin dashboard **intentionally breaks diegesis**. Administrators are not playing a character -- they are managing a training deployment. The admin UI is clean, professional, and follows standard SaaS conventions.

**The boundary:**

- Game interface (player-facing): Full terminal aesthetic, diegetic UI, CRT effects
- Admin interface (admin-facing): Clean enterprise UI, Inter font, rounded corners, no effects
- The two interfaces share no visual styling except the Matrices GmbH logo and accent color scheme

**White-label considerations:** Enterprise customers can customize the admin interface with their own logo, colors, and fonts. The game interface can also be white-labeled with custom terminal boot messages and organization branding on the status bar. Per BRD FR-ENT-005, white-label branding changes (logo, colors, fonts, custom domains, email templates) must propagate within 60 seconds.

---

## 9. References

### Papers, Please UI/UX

- [Papers, Please -- UX Review (Medium)](https://medium.com/@sam.cuevasp/papers-please-ux-review-672a151969e)
- [Cramming Papers, Please Onto Phones -- Lucas Pope Development Log](https://dukope.com/devlogs/papers-please/mobile/)
- [Designing the Bleak Genius of Papers, Please -- Game Developer](https://www.gamedeveloper.com/design/designing-the-bleak-genius-of-i-papers-please-i-)
- [The Design of Oppression in Papers, Please (Medium)](https://medium.com/@ishikasoni50/the-design-of-oppression-in-papers-please-1b83b16a3079)

### CRT/Terminal CSS Effects

- [Retro CRT Terminal Screen in CSS + JS -- DEV Community](https://dev.to/ekeijl/retro-crt-terminal-screen-in-css-js-4afh)
- [Using CSS to Create a CRT -- Alec Lownes](https://aleclownes.com/2017/02/01/crt-display.html)
- [CRTFilter WebGL Library -- CSS Script](https://www.cssscript.com/retro-crt-filter-webgl/)
- [Vault66 CRT Effect Component for React -- GitHub](https://github.com/mdombrov-33/vault66-crt-effect)
- [HairyDuck Terminal CRT Template -- GitHub](https://github.com/HairyDuck/terminal)

### Diegetic UI in Games

- [Beyond the HUD: The Power of Diegetic Interfaces -- Wayline](https://www.wayline.io/blog/diegetic-interfaces-game-design)
- [Designing Effective Diegetic UI: Dead Space vs. Callisto Protocol (Medium)](https://medium.com/@jaiwanthshan/designing-effective-diegetic-ui-lessons-learned-from-dead-spaces-success-and-the-callisto-dbf803639dd6)
- [A Deep Dive Into Dead Space's UI -- Giant Bomb](https://www.giantbomb.com/profile/gamer_152/blog/markers-i-a-deep-dive-into-dead-spaces-ui/249377/)
- [Types of UI in Gaming: Diegetic, Non-Diegetic, Spatial and Meta (Medium)](https://medium.com/@lorenzoardeni/types-of-ui-in-gaming-diegetic-non-diegetic-spatial-and-meta-5024ce6362d0)

### Cyberpunk/Terminal Web Design

- [Cybercore CSS: Cyberpunk Design Framework -- DEV Community](https://dev.to/sebyx07/introducing-cybercore-css-a-cyberpunk-design-framework-for-futuristic-uis-2e6c)
- [Terminal Aesthetics in Web Design -- DEV Community](https://dev.to/micronink/i-love-terminal-aesthetics-not-everyone-does-heres-how-i-solved-that-56ef)
- [Cyberpunk UI Website Design Inspiration -- Wendy Zhou](https://www.wendyzhou.se/blog/cyberpunk-ui-website-design-inspiration/)

### WCAG 2.1 AA & Game Accessibility

- [WCAG 2.1 Level AA Overview -- W3C WAI](https://www.w3.org/WAI/WCAG2AA-Conformance)
- [WCAG 2.2 Complete Compliance Guide -- AllAccessible](https://www.allaccessible.org/blog/wcag-22-complete-guide-2025)
- [WCAG Checklist 2.1 AA -- Accessible.org](https://accessible.org/wcag/)

### Svelte 5 Component Patterns

- [$props Rune Documentation -- Svelte Docs](https://svelte.dev/docs/svelte/$props)
- [Svelte 5 Migration Guide -- Svelte Docs](https://svelte.dev/docs/svelte/v5-migration-guide)
- [Svelte 5 Refresher with Runes -- Luminary Blog](https://luminary.blog/techs/05-svelte5-refresher/)

### Mobile Game UI

- [How to Create Seamless UI/UX in Mobile Games -- AppSamurai](https://appsamurai.com/blog/how-to-create-a-seamless-ui-ux-in-mobile-games/)
- [Understanding UI/UX Design for Mobile Game Development -- Sumo Digital](https://www.sumo-digital.com/news-insights/understanding-ui-ux-design-for-mobile-game-development/)
- [Game UI Database](https://www.gameuidatabase.com/)
- [Game UI: Design Principles and Best Practices -- Justinmind](https://www.justinmind.com/ui-design/game)

---

_This document defines the complete visual design system, interaction patterns, component library, and accessibility implementation for The DMZ: Archive Gate. It serves as the authoritative reference for frontend engineering and should be read alongside DD-06 (Technical Architecture), DD-08 (Narrative Design), and the BRD._

_All specifications are subject to iteration based on user testing, accessibility audits, and technical feasibility assessment._

---

**End of Document**
