<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { GenerateForecastRequest } from '$lib/features/forecasts/models/requests/GenerateForecastRequest';
  import HorizonSelector from './HorizonSelector.svelte';
  import ModelTypeSelector from './ModelTypeSelector.svelte';
  import MapPinIcon from '../icons/MapPinIcon.svelte';
  import DocumentTextIcon from '../icons/DocumentTextIcon.svelte';

  // Props
  export let locations: Array<{ id: string; name: string; city?: string; capacity: number }> = [];
  export let isLoading: boolean = false;

  // Form data
  let selectedLocation: string = '';
  let selectedHorizon: number = 24;
  let selectedModelType: string = 'ML_LSTM';
  let selectedResolution: string = 'FIFTEEN_MINUTES';
  let description: string = '';
  let forceRegenerate: boolean = false;

  // Advanced options
  let showAdvanced: boolean = false;
  let startTime: string = '';
  let learningRate: number = 0.01;
  let includeWeather: boolean = true;
  let selectedFeatures: string[] = ['temperature', 'humidity', 'irradiance'];

  const dispatch = createEventDispatcher<{
    generate: GenerateForecastRequest;
  }>();

  // Available features for model parameters
  const availableFeatures = [
    'temperature',
    'humidity',
    'irradiance',
    'wind_speed',
    'cloud_cover',
    'pressure',
    'precipitation'
  ];

  function handleGenerate() {
    if (!selectedLocation) {
      alert('Please select a location');
      return;
    }

    const request: GenerateForecastRequest = {
      locationId: selectedLocation,
      horizonHours: selectedHorizon,
      modelType: selectedModelType as any,
      resolution: selectedResolution as any,
      description: description || undefined,
      forceRegenerate,
      startTime: startTime || undefined,
      modelParameters: showAdvanced ? {
        learningRate,
        features: selectedFeatures,
        includeWeather
      } : undefined
    };

    dispatch('generate', request);
  }

  function toggleFeature(feature: string) {
    if (selectedFeatures.includes(feature)) {
      selectedFeatures = selectedFeatures.filter(f => f !== feature);
    } else {
      selectedFeatures = [...selectedFeatures, feature];
    }
  }

  // Set default start time to current time
  function setCurrentTime() {
    const now = new Date();
    startTime = now.toISOString().slice(0, 16); // Format for datetime-local input
  }

  // Initialize with current time
  if (!startTime) {
    setCurrentTime();
  }
</script>

<div class="card-glass">
  <div class="flex items-center justify-between mb-6">
    <h2 class="text-xl font-semibold text-soft-blue flex items-center gap-2">
      <div class="w-8 h-8 bg-gradient-to-br from-cyan to-soft-blue rounded-xl flex items-center justify-center shadow-lg shadow-cyan/30">
        <DocumentTextIcon className="w-4 h-4 text-dark-petrol" />
      </div>
      Forecast Configuration
    </h2>
    <button
      on:click={() => showAdvanced = !showAdvanced}
      class="btn btn-secondary text-sm"
      class:bg-cyan={showAdvanced}
      class:text-dark-petrol={showAdvanced}
    >
      {showAdvanced ? 'Simple' : 'Advanced'}
    </button>
  </div>

  <form on:submit|preventDefault={handleGenerate} class="space-y-6">
    <!-- Main Configuration -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Location Selection -->
      <div>
        <label class="label flex items-center gap-2">
          <MapPinIcon className="w-4 h-4 text-cyan" />
          Location
        </label>
        <select
          class="select"
          bind:value={selectedLocation}
          required
        >
          <option value="">Select a location...</option>
          {#each locations as location}
            <option value={location.id}>
              {location.name}
              {#if location.city} - {location.city}{/if}
              ({location.capacity} MW)
            </option>
          {/each}
        </select>
      </div>

      <!-- Model Type -->
      <div>
        <ModelTypeSelector
          bind:selected={selectedModelType}
        />
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Horizon Selection -->
      <div>
        <HorizonSelector
          bind:selected={selectedHorizon}
        />
      </div>

      <!-- Resolution -->
      <div>
        <label class="label">Time Resolution</label>
        <select
          class="select"
          bind:value={selectedResolution}
        >
          <option value="FIFTEEN_MINUTES">15 Minutes</option>
          <option value="THIRTY_MINUTES">30 Minutes</option>
          <option value="HOURLY">Hourly</option>
          <option value="DAILY">Daily</option>
        </select>
      </div>
    </div>

    <!-- Description -->
    <div>
      <label class="label">Description (Optional)</label>
      <textarea
        class="textarea"
        bind:value={description}
        placeholder="Describe this forecast generation..."
        maxlength="500"
        rows="2"
      ></textarea>
      <div class="text-right text-xs text-soft-blue/60 mt-1">
        {description.length}/500 characters
      </div>
    </div>

    <!-- Advanced Options -->
    {#if showAdvanced}
      <div class="border-t border-soft-blue/20 pt-6 space-y-6 animate-slide-down">
        <h3 class="text-lg font-medium text-soft-blue">Advanced Configuration</h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Start Time -->
          <div>
            <label class="label">Start Time</label>
            <div class="flex gap-2">
              <input
                type="datetime-local"
                class="input flex-1"
                bind:value={startTime}
              />
              <button
                type="button"
                on:click={setCurrentTime}
                class="btn btn-secondary whitespace-nowrap"
              >
                Now
              </button>
            </div>
          </div>

          <!-- Learning Rate -->
          <div>
            <label class="label">Learning Rate</label>
            <input
              type="number"
              class="input"
              bind:value={learningRate}
              min="0.001"
              max="1.0"
              step="0.001"
            />
          </div>
        </div>

        <!-- Model Features -->
        <div>
          <label class="label mb-3">Model Features</label>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            {#each availableFeatures as feature}
              <label class="flex items-center gap-2 text-sm text-soft-blue cursor-pointer">
                <input
                  type="checkbox"
                  class="w-4 h-4 rounded border-glass-border bg-glass-white text-cyan focus:ring-cyan focus:ring-2"
                  checked={selectedFeatures.includes(feature)}
                  on:change={() => toggleFeature(feature)}
                />
                {feature.replace('_', ' ')}
              </label>
            {/each}
          </div>
        </div>

        <!-- Weather Integration -->
        <div class="flex items-center gap-2">
          <input
            type="checkbox"
            id="includeWeather"
            class="w-4 h-4 rounded border-glass-border bg-glass-white text-cyan focus:ring-cyan focus:ring-2"
            bind:checked={includeWeather}
          />
          <label for="includeWeather" class="text-sm text-soft-blue cursor-pointer">
            Include real-time weather data integration
          </label>
        </div>
      </div>
    {/if}

    <!-- Force Regenerate -->
    <div class="border-t border-soft-blue/20 pt-4">
      <label class="flex items-center gap-2 text-sm text-soft-blue cursor-pointer">
        <input
          type="checkbox"
          class="w-4 h-4 rounded border-glass-border bg-glass-white text-cyan focus:ring-cyan focus:ring-2"
          bind:checked={forceRegenerate}
        />
        Force regeneration (ignore existing recent forecasts)
      </label>
    </div>

    <!-- Generate Button -->
    <div class="flex justify-end pt-4">
      <button
        type="submit"
        class="btn btn-primary"
        class:opacity-50={isLoading}
        disabled={isLoading || !selectedLocation}
      >
        {#if isLoading}
          <div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-dark-petrol mr-2"></div>
          Generating...
        {:else}
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Generate Forecast
        {/if}
      </button>
    </div>
  </form>
</div>

<style>
  .animate-slide-down {
    animation: slideDown 0.3s ease-out;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>