<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ForecastResponse } from '$lib/features/forecasts/models/responses/ForecastResponse';

  // Props
  export let forecast: ForecastResponse;
  export let autoHide: boolean = true;
  export let hideDelay: number = 5000;

  const dispatch = createEventDispatcher<{
    close: void;
    viewDetails: string;
  }>();

  let visible = true;

  // Auto-hide functionality
  if (autoHide) {
    setTimeout(() => {
      visible = false;
      dispatch('close');
    }, hideDelay);
  }

  function handleClose() {
    visible = false;
    dispatch('close');
  }

  function handleViewDetails() {
    dispatch('viewDetails', forecast.id);
  }

  // Format accuracy and confidence for display
  $: displayAccuracy = forecast.quality.accuracy
    ? `${forecast.quality.accuracy.toFixed(1)}%`
    : 'Calculating...';

  $: displayConfidence = forecast.quality.confidence
    ? `${forecast.quality.confidence.toFixed(1)}%`
    : 'Calculating...';

  // Determine success message based on status
  $: successMessage = forecast.status === 'generating'
    ? 'Forecast Generation Started'
    : 'Forecast Generated Successfully';

  // Format model information
  $: modelInfo = `${forecast.metadata.modelType.replace('ML_', '')} ${forecast.metadata.modelVersion || 'v1.0'}`;

  // Format timing information
  $: forecastHorizon = `${forecast.metadata.horizonHours}h horizon`;
  $: resolution = forecast.metadata.resolution.toLowerCase().replace('_', ' ');
</script>

{#if visible}
  <div
    class="fixed top-4 right-4 z-50 max-w-md w-full animate-slide-in"
    role="alert"
  >
    <div class="card-glass border-2 border-cyan/50 shadow-xl shadow-cyan/20">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-gradient-to-br from-cyan to-soft-blue rounded-full flex items-center justify-center shadow-lg shadow-cyan/30">
            <svg class="w-5 h-5 text-dark-petrol" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <div>
            <h3 class="font-semibold text-white">{successMessage}</h3>
            <p class="text-sm text-soft-blue/80">Forecast ID: {forecast.id.substring(0, 8)}...</p>
          </div>
        </div>

        <button
          on:click={handleClose}
          class="text-soft-blue/60 hover:text-soft-blue transition-colors p-1"
          aria-label="Close notification"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <!-- Forecast Details -->
      <div class="space-y-4">
        <!-- Location Info -->
        <div class="p-3 bg-teal-dark/30 rounded-lg border border-cyan/30">
          <div class="text-sm font-medium text-cyan mb-1">{forecast.location.name}</div>
          <div class="text-xs text-soft-blue/70">
            {#if forecast.location.city}
              {forecast.location.city} •
            {/if}
            {forecast.location.capacityMW} MW capacity
          </div>
        </div>

        <!-- Key Metrics -->
        <div class="grid grid-cols-2 gap-3">
          <div class="text-center p-3 bg-cyan/20 rounded-lg">
            <div class="text-sm text-soft-blue/70">Accuracy</div>
            <div class="text-lg font-bold text-cyan">{displayAccuracy}</div>
          </div>
          <div class="text-center p-3 bg-cyan/20 rounded-lg">
            <div class="text-sm text-soft-blue/70">Confidence</div>
            <div class="text-lg font-bold text-cyan">{displayConfidence}</div>
          </div>
        </div>

        <!-- Technical Details -->
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-soft-blue/70">Model:</span>
            <span class="text-cyan font-mono">{modelInfo}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-soft-blue/70">Horizon:</span>
            <span class="text-cyan font-mono">{forecastHorizon}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-soft-blue/70">Resolution:</span>
            <span class="text-cyan font-mono">{resolution}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-soft-blue/70">Status:</span>
            <span
              class="font-mono"
              class:text-alert-orange={forecast.status === 'generating'}
              class:text-cyan={forecast.status === 'completed'}
              class:text-alert-red={forecast.status === 'failed'}
            >
              {forecast.status.charAt(0).toUpperCase() + forecast.status.slice(1)}
            </span>
          </div>
        </div>

        <!-- Progress Indicator for Generating -->
        {#if forecast.status === 'generating'}
          <div class="mt-4">
            <div class="flex items-center gap-2 text-sm text-soft-blue/70 mb-2">
              <div class="w-3 h-3 border-2 border-cyan border-t-transparent rounded-full animate-spin"></div>
              Processing forecast...
            </div>
            <div class="w-full bg-dark-petrol rounded-full h-2">
              <div class="bg-gradient-to-r from-cyan to-soft-blue h-2 rounded-full animate-pulse" style="width: 60%"></div>
            </div>
          </div>
        {/if}

        <!-- Action Buttons -->
        <div class="flex gap-2 pt-2">
          <button
            on:click={handleViewDetails}
            class="btn btn-primary flex-1 text-sm"
          >
            View Details
          </button>
          <button
            on:click={handleClose}
            class="btn btn-secondary px-4 text-sm"
          >
            Close
          </button>
        </div>

        <!-- Auto-hide Indicator -->
        {#if autoHide && forecast.status !== 'generating'}
          <div class="flex items-center justify-center gap-2 text-xs text-soft-blue/60">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Auto-closing in {Math.ceil(hideDelay / 1000)}s
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .animate-slide-in {
    animation: slideIn 0.4s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(100%) translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0) translateY(0);
    }
  }
</style>