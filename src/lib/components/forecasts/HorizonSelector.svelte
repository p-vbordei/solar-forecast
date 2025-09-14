<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import CalendarIcon from '../icons/CalendarIcon.svelte';

  // Props
  export let selected: number = 24;

  const dispatch = createEventDispatcher<{
    change: number;
  }>();

  // Standard horizon options
  const horizonOptions = [
    { value: 12, label: '12 Hours', description: 'Short-term forecast' },
    { value: 24, label: '24 Hours', description: 'Daily forecast' },
    { value: 48, label: '48 Hours', description: '2-day forecast' },
    { value: 72, label: '72 Hours', description: '3-day forecast' },
    { value: 168, label: '7 Days', description: 'Weekly forecast' }
  ];

  let customHorizon: number | null = null;
  let showCustom: boolean = false;

  // Check if selected is a standard option
  $: isStandardOption = horizonOptions.some(option => option.value === selected);

  function handleStandardSelection(horizon: number) {
    selected = horizon;
    customHorizon = null;
    showCustom = false;
    dispatch('change', selected);
  }

  function handleCustomSelection() {
    if (customHorizon && customHorizon > 0 && customHorizon <= 168) {
      selected = customHorizon;
      dispatch('change', selected);
    }
  }

  function toggleCustom() {
    showCustom = !showCustom;
    if (!showCustom) {
      customHorizon = null;
      // Reset to nearest standard option if needed
      if (!isStandardOption) {
        selected = 24;
        dispatch('change', selected);
      }
    } else {
      customHorizon = selected;
    }
  }

  // Initialize custom if selected is not a standard option
  if (!isStandardOption && selected > 0) {
    customHorizon = selected;
    showCustom = true;
  }
</script>

<div>
  <label class="label flex items-center gap-2">
    <CalendarIcon className="w-4 h-4 text-cyan" />
    Forecast Horizon
  </label>

  <!-- Standard Options -->
  <div class="grid grid-cols-2 gap-2 mb-3">
    {#each horizonOptions as option}
      <button
        type="button"
        class="p-3 rounded-lg border text-left transition-all duration-200"
        class:bg-cyan={selected === option.value && !showCustom}
        class:text-dark-petrol={selected === option.value && !showCustom}
        class:border-cyan={selected === option.value && !showCustom}
        class:bg-glass-white={selected !== option.value || showCustom}
        class:text-soft-blue={selected !== option.value || showCustom}
        class:border-glass-border={selected !== option.value || showCustom}
        class:hover:border-cyan={selected !== option.value || showCustom}
        on:click={() => handleStandardSelection(option.value)}
      >
        <div class="font-medium text-sm">{option.label}</div>
        <div class="text-xs opacity-70">{option.description}</div>
      </button>
    {/each}
  </div>

  <!-- Custom Option Toggle -->
  <button
    type="button"
    class="w-full p-2 text-sm text-left rounded-lg border transition-all duration-200"
    class:bg-cyan={showCustom}
    class:text-dark-petrol={showCustom}
    class:border-cyan={showCustom}
    class:bg-glass-white={!showCustom}
    class:text-soft-blue={!showCustom}
    class:border-glass-border={!showCustom}
    class:hover:border-cyan={!showCustom}
    on:click={toggleCustom}
  >
    <div class="flex items-center justify-between">
      <span>Custom Horizon</span>
      <svg
        class="w-4 h-4 transform transition-transform duration-200"
        class:rotate-180={showCustom}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
      </svg>
    </div>
  </button>

  <!-- Custom Input -->
  {#if showCustom}
    <div class="mt-2 p-3 bg-teal-dark/30 rounded-lg border border-cyan/30 animate-slide-down">
      <div class="flex gap-2">
        <input
          type="number"
          class="input flex-1"
          bind:value={customHorizon}
          on:input={handleCustomSelection}
          placeholder="Enter hours (1-168)"
          min="1"
          max="168"
          step="1"
        />
        <span class="flex items-center text-sm text-soft-blue px-2">hours</span>
      </div>

      {#if customHorizon !== null}
        <div class="mt-2 text-xs text-soft-blue/70">
          {#if customHorizon <= 0}
            <span class="text-alert-red">Horizon must be greater than 0</span>
          {:else if customHorizon > 168}
            <span class="text-alert-orange">Very long horizons may have reduced accuracy</span>
          {:else if customHorizon <= 6}
            <span class="text-alert-orange">Short horizons may miss weather patterns</span>
          {:else if customHorizon > 72}
            <span class="text-soft-blue/70">Long-term forecast (accuracy decreases with time)</span>
          {:else}
            <span class="text-cyan">Good forecast horizon</span>
          {/if}
        </div>
      {/if}
    </div>
  {/if}

  <!-- Selected Horizon Display -->
  <div class="mt-3 p-2 bg-dark-petrol/50 rounded border border-soft-blue/20">
    <div class="text-xs text-soft-blue/70">Selected Horizon</div>
    <div class="text-sm font-medium text-cyan">
      {selected} hours
      {#if selected >= 24}
        ({Math.round(selected / 24 * 10) / 10} {selected >= 48 ? 'days' : 'day'})
      {/if}
    </div>
  </div>
</div>

<style>
  .animate-slide-down {
    animation: slideDown 0.2s ease-out;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>