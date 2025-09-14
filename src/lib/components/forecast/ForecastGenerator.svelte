<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let locationId: string = '';
  export let locationName: string = '';

  let isGenerating = false;
  let progress = 0;
  let progressMessage = '';
  let taskId: string | null = null;
  let error: string | null = null;
  let completed = false;

  // Generation parameters
  let horizonHours = 24;
  let modelType = 'catboost';
  let useWeather = true;

  const modelTypes = [
    { value: 'catboost', label: 'CatBoost (Recommended)', description: 'Gradient boosting with high accuracy' },
    { value: 'lstm', label: 'LSTM Neural Network', description: 'Time-series neural network' },
    { value: 'xgboost', label: 'XGBoost', description: 'Extreme gradient boosting' }
  ];

  const horizonOptions = [
    { value: 24, label: '24 Hours', description: 'Daily forecast' },
    { value: 48, label: '48 Hours', description: 'Two-day forecast' },
    { value: 72, label: '72 Hours', description: 'Three-day forecast' }
  ];

  async function generateForecast() {
    if (!locationId) {
      error = 'Please select a location first';
      return;
    }

    isGenerating = true;
    progress = 0;
    progressMessage = 'Initializing forecast generation...';
    error = null;
    completed = false;
    taskId = null;

    try {
      // Start forecast generation
      const response = await fetch('/api/forecast/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          horizonHours,
          modelType,
          useWeather
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || 'Forecast generation failed');
      }

      const result = await response.json();

      if (result.success) {
        completed = true;
        progress = 100;
        progressMessage = `Forecast generated successfully! ${result.data?.length || 0} data points created.`;

        // Dispatch success event
        dispatch('forecastGenerated', {
          data: result.data,
          metadata: result.metadata
        });
      } else {
        throw new Error(result.error || 'Forecast generation failed');
      }

    } catch (err) {
      error = err instanceof Error ? err.message : 'An unknown error occurred';
      progressMessage = 'Forecast generation failed';
      console.error('Forecast generation error:', err);
    } finally {
      isGenerating = false;
    }
  }

  async function validateParameters() {
    if (!locationId) return null;

    try {
      const response = await fetch('/api/forecast/worker/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: locationId,
          forecast_hours: horizonHours,
          model_type: modelType
        })
      });

      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Validation error:', err);
      return null;
    }
  }

  function reset() {
    isGenerating = false;
    progress = 0;
    progressMessage = '';
    error = null;
    completed = false;
    taskId = null;
  }
</script>

<div class="forecast-generator bg-gradient-to-br from-dark-petrol to-teal-dark p-6 rounded-lg border border-soft-blue/20">
  <div class="flex items-center justify-between mb-6">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-full bg-cyan/20 flex items-center justify-center">
        <svg class="w-5 h-5 text-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <div>
        <h3 class="text-lg font-semibold text-white">Generate Forecast</h3>
        <p class="text-soft-blue text-sm">
          {locationName ? `For ${locationName}` : 'Select location to generate solar power forecast'}
        </p>
      </div>
    </div>

    {#if completed}
      <div class="flex items-center gap-2 text-cyan">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <span class="text-sm font-medium">Completed</span>
      </div>
    {/if}
  </div>

  <!-- Generation Parameters -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
    <!-- Horizon Hours -->
    <div>
      <label class="block text-soft-blue text-sm font-medium mb-2">Forecast Horizon</label>
      <select bind:value={horizonHours} disabled={isGenerating}
              class="w-full bg-dark-petrol/50 border border-soft-blue/30 rounded-lg px-3 py-2 text-white focus:border-cyan focus:ring-1 focus:ring-cyan">
        {#each horizonOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
      <p class="text-soft-blue/70 text-xs mt-1">
        {horizonOptions.find(o => o.value === horizonHours)?.description || ''}
      </p>
    </div>

    <!-- Model Type -->
    <div>
      <label class="block text-soft-blue text-sm font-medium mb-2">ML Model</label>
      <select bind:value={modelType} disabled={isGenerating}
              class="w-full bg-dark-petrol/50 border border-soft-blue/30 rounded-lg px-3 py-2 text-white focus:border-cyan focus:ring-1 focus:ring-cyan">
        {#each modelTypes as model}
          <option value={model.value}>{model.label}</option>
        {/each}
      </select>
      <p class="text-soft-blue/70 text-xs mt-1">
        {modelTypes.find(m => m.value === modelType)?.description || ''}
      </p>
    </div>

    <!-- Weather Integration -->
    <div>
      <label class="block text-soft-blue text-sm font-medium mb-2">Options</label>
      <div class="flex items-center space-x-3">
        <label class="flex items-center">
          <input type="checkbox" bind:checked={useWeather} disabled={isGenerating}
                 class="rounded bg-dark-petrol border-soft-blue/30 text-cyan focus:ring-cyan focus:ring-offset-0" />
          <span class="ml-2 text-sm text-soft-blue">Use weather data</span>
        </label>
      </div>
      <p class="text-soft-blue/70 text-xs mt-1">Include meteorological data in forecast</p>
    </div>
  </div>

  <!-- Progress Bar -->
  {#if isGenerating || completed}
    <div class="mb-4">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-soft-blue">{progressMessage}</span>
        <span class="text-sm text-cyan font-medium">{progress}%</span>
      </div>
      <div class="w-full bg-dark-petrol/50 rounded-full h-2">
        <div class="bg-gradient-to-r from-cyan to-soft-blue h-2 rounded-full transition-all duration-500"
             style="width: {progress}%"></div>
      </div>
    </div>
  {/if}

  <!-- Error Message -->
  {#if error}
    <div class="mb-4 p-3 bg-alert-red/20 border border-alert-red/50 rounded-lg">
      <div class="flex items-center gap-2 text-alert-red">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="text-sm font-medium">Error</span>
      </div>
      <p class="text-alert-red/90 text-sm mt-1">{error}</p>
    </div>
  {/if}

  <!-- Generate Button -->
  <div class="flex items-center gap-3">
    <button
      on:click={generateForecast}
      disabled={!locationId || isGenerating}
      class="flex-1 bg-gradient-to-r from-cyan to-soft-blue text-dark-petrol px-6 py-3 rounded-lg font-semibold
             hover:from-soft-blue hover:to-cyan transform hover:scale-[1.02] transition-all duration-200
             disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
             flex items-center justify-center gap-2"
    >
      {#if isGenerating}
        <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Generating...
      {:else}
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Generate Forecast
      {/if}
    </button>

    {#if completed || error}
      <button
        on:click={reset}
        class="px-4 py-3 border border-soft-blue/30 text-soft-blue rounded-lg hover:bg-soft-blue/10 transition-colors"
      >
        Reset
      </button>
    {/if}
  </div>

  <!-- Additional Info -->
  <div class="mt-4 p-3 bg-dark-petrol/30 rounded-lg">
    <p class="text-soft-blue/80 text-xs">
      <strong>Note:</strong> Forecast generation may take 30-60 seconds depending on the horizon and model complexity.
      The generated forecast will be automatically saved to the database and appear in the analysis dashboard.
    </p>
  </div>
</div>

<style>
  .forecast-generator {
    backdrop-filter: blur(10px);
    box-shadow: 0 8px 32px rgba(15, 164, 175, 0.1);
  }
</style>