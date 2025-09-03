<script lang="ts">
  import ClockIcon from '$lib/components/icons/ClockIcon.svelte';
  
  export let selected: '15min' | 'hourly' | 'daily' | 'weekly' = 'hourly';
  export let onSelect: (interval: '15min' | 'hourly' | 'daily' | 'weekly') => void = () => {};
  
  const intervals = [
    { value: '15min', label: '15 Minutes', description: 'High resolution' },
    { value: 'hourly', label: 'Hourly', description: 'Standard view' },
    { value: 'daily', label: 'Daily', description: 'Day aggregation' },
    { value: 'weekly', label: 'Weekly', description: 'Week overview' }
  ];
  
  function handleSelect(value: string) {
    selected = value as typeof selected;
    onSelect(selected);
  }
</script>

<div class="flex flex-wrap gap-2">
  {#each intervals as interval}
    <button
      on:click={() => handleSelect(interval.value)}
      class="flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 {
        selected === interval.value
          ? 'bg-cyan text-dark-petrol border-cyan shadow-lg shadow-cyan/20'
          : 'bg-glass-white border-glass-border text-soft-blue hover:border-cyan/50 hover:bg-teal-dark/30'
      }"
    >
      <ClockIcon className="w-4 h-4" />
      <div class="text-left">
        <div class="text-sm font-medium">{interval.label}</div>
        {#if selected === interval.value}
          <div class="text-xs opacity-80">{interval.description}</div>
        {/if}
      </div>
    </button>
  {/each}
</div>