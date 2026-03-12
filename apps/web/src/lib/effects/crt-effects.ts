import { browser } from '$app/environment';

const FLICKER_CLASS = 'crt-flicker--active';
const GLITCH_CLASS = 'crt-glitch--active';
const FLICKER_DURATION_MS = 400;
const GLITCH_DURATION_MS = 600;

let flickerTimeout: ReturnType<typeof setTimeout> | null = null;
let glitchTimeout: ReturnType<typeof setTimeout> | null = null;

export function triggerFlicker(): void {
  if (!browser) return;

  const root = document.documentElement;

  if (flickerTimeout) {
    clearTimeout(flickerTimeout);
  }

  root.classList.add(FLICKER_CLASS);

  flickerTimeout = setTimeout(() => {
    root.classList.remove(FLICKER_CLASS);
    flickerTimeout = null;
  }, FLICKER_DURATION_MS);
}

export function triggerBreachFlicker(): void {
  triggerFlicker();
}

export function triggerThreatEscalationFlicker(): void {
  triggerFlicker();
}

export function clearFlicker(): void {
  if (!browser) return;

  if (flickerTimeout) {
    clearTimeout(flickerTimeout);
    flickerTimeout = null;
  }

  document.documentElement.classList.remove(FLICKER_CLASS);
}

export function triggerGlitch(): void {
  if (!browser) return;

  const root = document.documentElement;

  if (glitchTimeout) {
    clearTimeout(glitchTimeout);
  }

  root.classList.add(GLITCH_CLASS);

  glitchTimeout = setTimeout(() => {
    root.classList.remove(GLITCH_CLASS);
    glitchTimeout = null;
  }, GLITCH_DURATION_MS);
}

export function triggerMorpheusGlitch(): void {
  triggerGlitch();
}

export function clearGlitch(): void {
  if (!browser) return;

  if (glitchTimeout) {
    clearTimeout(glitchTimeout);
    glitchTimeout = null;
  }

  document.documentElement.classList.remove(GLITCH_CLASS);
}
