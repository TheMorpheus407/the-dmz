<script lang="ts">
  /* eslint-disable prefer-const */
  interface Props {
    label: string;
    value: number;
    min?: number;
    max?: number;
    disabled?: boolean;
    onchange?: (value: number) => void;
  }

  let {
    label,
    value = $bindable(50),
    min = 0,
    max = 100,
    disabled = false,
    onchange,
  }: Props = $props();

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    value = parseInt(target.value, 10);
    onchange?.(value);
  }
</script>

<div class="intensity-slider" class:intensity-slider--disabled={disabled}>
  <label class="intensity-slider__label" for={label.toLowerCase().replace(/\s+/g, '-')}>
    {label}
  </label>
  <div class="intensity-slider__track">
    <input
      type="range"
      id={label.toLowerCase().replace(/\s+/g, '-')}
      class="intensity-slider__input"
      {min}
      {max}
      {value}
      {disabled}
      oninput={handleInput}
      aria-label="{label} intensity"
    />
    <span class="intensity-slider__value">{value}%</span>
  </div>
</div>

<style>
  .intensity-slider {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .intensity-slider--disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  .intensity-slider__label {
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .intensity-slider__track {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .intensity-slider__input {
    flex: 1;
    height: 4px;
    appearance: none;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: 2px;
    cursor: pointer;
  }

  .intensity-slider__input::-webkit-slider-thumb {
    appearance: none;
    width: 12px;
    height: 12px;
    background: var(--color-accent);
    border: 1px solid var(--color-border);
    border-radius: 50%;
    cursor: pointer;
    transition: transform 150ms ease;
  }

  .intensity-slider__input::-webkit-slider-thumb:hover {
    transform: scale(1.2);
  }

  .intensity-slider__input::-moz-range-thumb {
    width: 12px;
    height: 12px;
    background: var(--color-accent);
    border: 1px solid var(--color-border);
    border-radius: 50%;
    cursor: pointer;
  }

  .intensity-slider__input:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .intensity-slider__value {
    min-width: 40px;
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-text);
    text-align: right;
  }

  @media (prefers-reduced-motion: reduce) {
    .intensity-slider__input::-webkit-slider-thumb {
      transition: none;
    }
  }
</style>
