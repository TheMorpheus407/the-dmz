export function createTouchPanHandler(
  onPan: (direction: 'next' | 'prev') => void,
  threshold: number = 30,
) {
  let startX: number | null = null;
  let currentX: number | null = null;

  return {
    onTouchStart(event: TouchEvent) {
      const touch = event.touches[0];
      if (!touch) return;
      startX = touch.clientX;
      currentX = touch.clientX;
    },

    onTouchMove(event: TouchEvent) {
      if (startX === null) return;
      const touch = event.touches[0];
      if (!touch) return;
      currentX = touch.clientX;
    },

    onTouchEnd() {
      if (startX === null || currentX === null) return;

      const delta = currentX - startX;
      if (Math.abs(delta) >= threshold) {
        onPan(delta > 0 ? 'prev' : 'next');
      }

      startX = null;
      currentX = null;
    },

    reset() {
      startX = null;
      currentX = null;
    },
  };
}
