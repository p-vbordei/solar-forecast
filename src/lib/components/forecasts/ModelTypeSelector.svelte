<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  // Props
  export let selected: string = 'ML_LSTM';

  const dispatch = createEventDispatcher<{
    change: string;
  }>();

  // Model type options with descriptions and performance characteristics
  const modelOptions = [
    {
      value: 'ML_LSTM',
      label: 'LSTM Neural Network',
      description: 'Long Short-Term Memory - excellent for time series',
      icon: '🧠',
      characteristics: ['High accuracy', 'Weather sensitive', 'Medium speed'],
      recommendedFor: 'Most solar applications'
    },
    {
      value: 'ML_XGBOOST',
      label: 'XGBoost',
      description: 'Gradient boosting - fast and reliable',
      icon: '⚡',
      characteristics: ['Fast training', 'Robust', 'Good accuracy'],
      recommendedFor: 'Real-time applications'
    },
    {
      value: 'ML_RANDOMFOREST',
      label: 'Random Forest',
      description: 'Ensemble method - stable and interpretable',
      icon: '🌳',
      characteristics: ['Stable', 'Interpretable', 'Good baseline'],
      recommendedFor: 'Conservative estimates'
    },
    {
      value: 'ML_GRU',
      label: 'GRU Neural Network',
      description: 'Gated Recurrent Unit - faster than LSTM',
      icon: '🔄',
      characteristics: ['Fast', 'Good accuracy', 'Less memory'],
      recommendedFor: 'Resource-constrained environments'
    },
    {
      value: 'ML_PROPHET',
      label: 'Facebook Prophet',
      description: 'Time series forecasting with seasonality',
      icon: '📈',
      characteristics: ['Seasonal patterns', 'Holiday effects', 'Robust'],
      recommendedFor: 'Long-term forecasting'
    },
    {
      value: 'ENSEMBLE',
      label: 'Ensemble Model',
      description: 'Combination of multiple models',
      icon: '🎯',
      characteristics: ['Highest accuracy', 'Slow', 'Resource intensive'],
      recommendedFor: 'Critical applications'
    }
  ];

  let selectedModel = modelOptions.find(option => option.value === selected) || modelOptions[0];

  function handleSelection(modelValue: string) {
    selected = modelValue;
    selectedModel = modelOptions.find(option => option.value === modelValue)!;
    dispatch('change', selected);
  }

  // Initialize selectedModel if selected prop changes
  $: if (selected) {
    const found = modelOptions.find(option => option.value === selected);
    if (found) {
      selectedModel = found;
    }
  }
</script>

<div>
  <label class="label">Model Type</label>

  <!-- Model Selection Dropdown -->
  <div class="relative">
    <select
      class="select"
      bind:value={selected}
      on:change={(e) => handleSelection(e.target.value)}
    >
      {#each modelOptions as option}
        <option value={option.value}>
          {option.label}
        </option>
      {/each}
    </select>
  </div>

  <!-- Selected Model Details -->
  {#if selectedModel}
    <div class="mt-3 p-3 bg-teal-dark/30 rounded-lg border border-cyan/30">
      <div class="flex items-start gap-3">
        <div class="text-2xl">{selectedModel.icon}</div>
        <div class="flex-1">
          <div class="font-medium text-soft-blue text-sm">{selectedModel.label}</div>
          <div class="text-xs text-soft-blue/70 mt-1">{selectedModel.description}</div>

          <!-- Characteristics -->
          <div class="mt-2">
            <div class="text-xs text-soft-blue/70 mb-1">Characteristics:</div>
            <div class="flex flex-wrap gap-1">
              {#each selectedModel.characteristics as characteristic}
                <span class="px-2 py-1 bg-cyan/20 text-cyan text-xs rounded">
                  {characteristic}
                </span>
              {/each}
            </div>
          </div>

          <!-- Recommended For -->
          <div class="mt-2">
            <div class="text-xs text-soft-blue/70">Best for:</div>
            <div class="text-xs text-cyan font-medium">{selectedModel.recommendedFor}</div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Model Comparison Grid (collapsed by default) -->
  <details class="mt-3">
    <summary class="cursor-pointer text-sm text-soft-blue/80 hover:text-cyan transition-colors">
      Compare all models
    </summary>

    <div class="mt-2 space-y-2">
      {#each modelOptions as option}
        <button
          type="button"
          class="w-full p-3 rounded-lg border text-left transition-all duration-200"
          class:bg-cyan={selected === option.value}
          class:text-dark-petrol={selected === option.value}
          class:border-cyan={selected === option.value}
          class:bg-glass-white={selected !== option.value}
          class:text-soft-blue={selected !== option.value}
          class:border-glass-border={selected !== option.value}
          class:hover:border-cyan={selected !== option.value}
          on:click={() => handleSelection(option.value)}
        >
          <div class="flex items-start gap-2">
            <span class="text-lg">{option.icon}</span>
            <div class="flex-1">
              <div class="font-medium text-sm">{option.label}</div>
              <div class="text-xs opacity-70 mt-1">{option.description}</div>
              <div class="flex flex-wrap gap-1 mt-2">
                {#each option.characteristics.slice(0, 2) as characteristic}
                  <span class="px-1.5 py-0.5 bg-current/20 text-xs rounded">
                    {characteristic}
                  </span>
                {/each}
              </div>
            </div>
          </div>
        </button>
      {/each}
    </div>
  </details>

  <!-- Performance Expectations -->
  <div class="mt-3 p-2 bg-dark-petrol/50 rounded border border-soft-blue/20">
    <div class="text-xs text-soft-blue/70 mb-1">Expected Performance</div>
    <div class="flex justify-between items-center text-xs">
      <span class="text-soft-blue">Processing Time:</span>
      <span class="text-cyan">
        {#if selectedModel.value === 'ENSEMBLE'}
          3-5 minutes
        {:else if selectedModel.value.startsWith('ML_')}
          1-2 minutes
        {:else}
          30-60 seconds
        {/if}
      </span>
    </div>
    <div class="flex justify-between items-center text-xs">
      <span class="text-soft-blue">Typical Accuracy:</span>
      <span class="text-cyan">
        {#if selectedModel.value === 'ENSEMBLE'}
          95-98%
        {:else if selectedModel.value === 'ML_LSTM'}
          92-96%
        {:else if selectedModel.value === 'ML_XGBOOST'}
          90-94%
        {:else}
          88-92%
        {/if}
      </span>
    </div>
  </div>
</div>