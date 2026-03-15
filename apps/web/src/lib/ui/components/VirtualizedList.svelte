<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Item<T> {
    id: string | number;
    data: T;
  }

  interface Props<T> {
    items: Item<T>[];
    itemHeight: number;
    containerHeight: number;
    overscan?: number;
    renderItem: Snippet<[{ item: Item<T>; index: number }]>;
    onEndReached?: () => void;
    endReachedThreshold?: number;
  }

  const {
    items,
    itemHeight,
    containerHeight,
    overscan = 3,
    renderItem,
    onEndReached,
    endReachedThreshold = 200,
  }: Props<unknown> = $props();

  let scrollTop = $state(0);
  let containerRef: HTMLDivElement | null = $state(null);

  const totalHeight = $derived(items.length * itemHeight);

  const visibleRange = $derived.by(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan,
    );
    return { startIndex, endIndex };
  });

  const visibleItems = $derived(
    items.slice(visibleRange.startIndex, visibleRange.endIndex).map((item, i) => ({
      item,
      index: visibleRange.startIndex + i,
    })),
  );

  const offsetY = $derived(visibleRange.startIndex * itemHeight);

  function handleScroll(event: Event) {
    const target = event.target as HTMLDivElement;
    scrollTop = target.scrollTop;

    if (onEndReached) {
      const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
      if (scrollBottom < endReachedThreshold && visibleRange.endIndex >= items.length) {
        onEndReached();
      }
    }
  }

  export function scrollToIndex(index: number): void {
    if (containerRef) {
      containerRef.scrollTop = index * itemHeight;
    }
  }

  export function scrollToTop(): void {
    if (containerRef) {
      containerRef.scrollTop = 0;
    }
  }

  export function scrollToBottom(): void {
    if (containerRef) {
      containerRef.scrollTop = totalHeight - containerHeight;
    }
  }
</script>

<div
  class="virtualized-list"
  bind:this={containerRef}
  style="height: {containerHeight}px"
  onscroll={handleScroll}
>
  <div class="virtualized-list__inner" style="height: {totalHeight}px">
    <div class="virtualized-list__content" style="transform: translateY({offsetY}px)">
      {#each visibleItems as { item, index } (item.id)}
        {@render renderItem({ item, index })}
      {/each}
    </div>
  </div>
</div>

<style>
  .virtualized-list {
    overflow-y: auto;
    overflow-x: hidden;
    will-change: scroll-position;
  }

  .virtualized-list__inner {
    position: relative;
  }

  .virtualized-list__content {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
  }
</style>
