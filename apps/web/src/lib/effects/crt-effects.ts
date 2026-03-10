import { browser } from '$app/environment';

const FLICKER_CLASS = 'crt-flicker--active';
const FLICKER_DURATION_MS = 400;

let flickerTimeout: ReturnType<typeof setTimeout> | null = null;

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
