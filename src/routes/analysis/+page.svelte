<script lang="ts">
  import { onMount } from 'svelte';
  import ForecastChart from '$lib/components/analysis/ForecastChart.svelte';
  import AggregationSelector from '$lib/components/analysis/AggregationSelector.svelte';
  import AccuracyMetrics from '$lib/components/analysis/AccuracyMetrics.svelte';
  import TrendingUpIcon from '$lib/components/icons/TrendingUpIcon.svelte';
  import RefreshIcon from '$lib/components/icons/RefreshIcon.svelte';
  import DownloadIcon from '$lib/components/icons/DownloadIcon.svelte';
  import CalendarIcon from '$lib/components/icons/CalendarIcon.svelte';
  import MapPinIcon from '$lib/components/icons/MapPinIcon.svelte';

  let selectedLocation = '';
  let selectedInterval: '15min' | 'hourly' | 'daily' | 'weekly' = 'hourly';
  let showConfidenceBands = true;
  let showActual = false;
  let autoRefresh = false;
  let refreshInterval: number;
  let isLoading = false;
  let forecastData: any[] = [];
  let accuracyMetrics = {
    accuracy: 92.5,
    mape: 7.8,
    rmse: 2.45,
    mae: 1.89
  };

  let dateRange = {
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  };

  let locations = [
    { id: '1', name: 'Solar Farm Alpha', city: 'Bucharest', capacity: 50 },
    { id: '2', name: 'Solar Station Beta', city: 'Cluj', capacity: 35 },
    { id: '3', name: 'Green Energy Park', city: 'Timisoara', capacity: 40 },
    { id: '4', name: 'Coastal Solar Array', city: 'Constanta', capacity: 45 }
  ];

  async function loadForecastData() {
    if (!selectedLocation) return;
    
    isLoading = true;
    try {
      const response = await fetch(`/api/analysis/forecast?location=${selectedLocation}&interval=${selectedInterval}&start=${dateRange.start}&end=${dateRange.end}`);
      const result = await response.json();
      
      if (result.success) {
        forecastData = result.data;
        showActual = result.hasActual || false;
      }
    } catch (error) {
      console.error('Error loading forecast data:', error);
    } finally {
      isLoading = false;
    }
  }

  async function loadAccuracyMetrics() {
    if (!selectedLocation) return;
    
    try {
      const response = await fetch(`/api/analysis/accuracy?location=${selectedLocation}&start=${dateRange.start}&end=${dateRange.end}`);
      const result = await response.json();
      
      if (result.success) {
        accuracyMetrics = result.data;
      }
    } catch (error) {
      console.error('Error loading accuracy metrics:', error);
    }
  }

  async function exportForecast(format: 'csv' | 'excel' | 'pdf') {
    if (!selectedLocation) {
      alert('Please select a location first');
      return;
    }

    try {
      const response = await fetch('/api/analysis/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          location: selectedLocation,
          interval: selectedInterval,
          start: dateRange.start,
          end: dateRange.end,
          format
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `forecast_${selectedLocation}_${selectedInterval}_${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting forecast:', error);
      alert('Failed to export forecast');
    }
  }

  function handleIntervalChange(interval: '15min' | 'hourly' | 'daily' | 'weekly') {
    selectedInterval = interval;
    loadForecastData();
  }

  function handleRefresh() {
    loadForecastData();
    loadAccuracyMetrics();
  }

  function toggleAutoRefresh() {
    autoRefresh = !autoRefresh;
    if (autoRefresh) {
      refreshInterval = setInterval(handleRefresh, 60000); // Refresh every minute
    } else {
      clearInterval(refreshInterval);
    }
  }

  onMount(() => {
    // Set default location
    if (locations.length > 0) {
      selectedLocation = locations[0].id;
      loadForecastData();
      loadAccuracyMetrics();
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  });

  $: if (selectedLocation && dateRange.start && dateRange.end) {
    loadForecastData();
    loadAccuracyMetrics();
  }
</script>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold text-soft-blue flex items-center gap-2">
        <TrendingUpIcon className="w-8 h-8 text-cyan" />
        Forecast Analysis
      </h1>
      <p class="text-soft-blue/60 mt-2">Advanced forecast visualization with confidence bands and accuracy metrics</p>
    </div>
    <div class="flex items-center gap-2">
      <button
        on:click={toggleAutoRefresh}
        class="btn btn-secondary"
        class:bg-cyan={autoRefresh}
        class:text-dark-petrol={autoRefresh}
      >
        <RefreshIcon className="w-5 h-5" />
        {autoRefresh ? 'Auto' : 'Manual'}
      </button>
      <button
        on:click={handleRefresh}
        class="btn btn-secondary"
        disabled={isLoading}
      >
        <RefreshIcon className="w-5 h-5 {isLoading ? 'animate-spin' : ''}" />
        Refresh
      </button>
    </div>
  </div>

  <!-- Controls Panel -->
  <div class="card-glass">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <!-- Location Selector -->
      <div>
        <label class="label flex items-center gap-2">
          <MapPinIcon className="w-4 h-4 text-cyan" />
          Location
        </label>
        <select class="select" bind:value={selectedLocation}>
          {#each locations as location}
            <option value={location.id}>
              {location.name} - {location.city} ({location.capacity} MW)
            </option>
          {/each}
        </select>
      </div>

      <!-- Start Date -->
      <div>
        <label class="label flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-cyan" />
          Start Date
        </label>
        <input
          type="date"
          class="input"
          bind:value={dateRange.start}
        />
      </div>

      <!-- End Date -->
      <div>
        <label class="label flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-cyan" />
          End Date
        </label>
        <input
          type="date"
          class="input"
          bind:value={dateRange.end}
        />
      </div>

      <!-- Options -->
      <div>
        <label class="label">Display Options</label>
        <div class="space-y-2">
          <label class="flex items-center gap-2 text-sm text-soft-blue cursor-pointer">
            <input
              type="checkbox"
              bind:checked={showConfidenceBands}
              class="w-4 h-4 rounded border-glass-border bg-glass-white text-cyan focus:ring-cyan focus:ring-2"
            />
            Show Confidence Bands
          </label>
          <label class="flex items-center gap-2 text-sm text-soft-blue cursor-pointer">
            <input
              type="checkbox"
              bind:checked={showActual}
              disabled={!forecastData.some(d => d.actual)}
              class="w-4 h-4 rounded border-glass-border bg-glass-white text-cyan focus:ring-cyan focus:ring-2"
            />
            Show Actual Values
          </label>
        </div>
      </div>
    </div>

    <!-- Aggregation Selector -->
    <div class="mb-4">
      <label class="label mb-3">Time Aggregation</label>
      <AggregationSelector 
        selected={selectedInterval}
        onSelect={handleIntervalChange}
      />
    </div>

    <!-- Export Buttons -->
    <div class="flex gap-2">
      <button
        on:click={() => exportForecast('csv')}
        class="btn btn-secondary"
      >
        <DownloadIcon className="w-4 h-4" />
        Export CSV
      </button>
      <button
        on:click={() => exportForecast('excel')}
        class="btn btn-secondary"
      >
        <DownloadIcon className="w-4 h-4" />
        Export Excel
      </button>
      <button
        on:click={() => exportForecast('pdf')}
        class="btn btn-secondary"
      >
        <DownloadIcon className="w-4 h-4" />
        Export PDF
      </button>
    </div>
  </div>

  <!-- Accuracy Metrics -->
  <AccuracyMetrics 
    accuracy={accuracyMetrics.accuracy}
    mape={accuracyMetrics.mape}
    rmse={accuracyMetrics.rmse}
    mae={accuracyMetrics.mae}
  />

  <!-- Forecast Chart -->
  <div class="card-glass">
    <h2 class="text-xl font-semibold text-soft-blue mb-4">
      Production Forecast
      {#if selectedInterval === '15min'}
        - 15-Minute Resolution
      {:else if selectedInterval === 'hourly'}
        - Hourly Average
      {:else if selectedInterval === 'daily'}
        - Daily Total
      {:else}
        - Weekly Summary
      {/if}
    </h2>
    
    {#if isLoading}
      <div class="flex items-center justify-center h-96">
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan"></div>
          <p class="mt-4 text-soft-blue">Loading forecast data...</p>
        </div>
      </div>
    {:else if forecastData.length > 0}
      <ForecastChart 
        data={forecastData}
        interval={selectedInterval}
        showConfidenceBands={showConfidenceBands}
        showActual={showActual}
        height={450}
      />
    {:else}
      <div class="flex items-center justify-center h-96">
        <div class="text-center text-soft-blue/60">
          <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p>No forecast data available</p>
          <p class="text-sm mt-2">Select a location and date range to view forecasts</p>
        </div>
      </div>
    {/if}
  </div>

  <!-- Additional Information -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <!-- Forecast Info -->
    <div class="card-glass">
      <h3 class="text-sm font-medium text-soft-blue/60 mb-3">Forecast Information</h3>
      <div class="space-y-2">
        <div class="flex justify-between items-center">
          <span class="text-sm text-soft-blue">Model Type</span>
          <span class="text-sm font-mono text-cyan">LSTM v2.1</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-sm text-soft-blue">Last Updated</span>
          <span class="text-sm font-mono text-cyan">2 min ago</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-sm text-soft-blue">Data Points</span>
          <span class="text-sm font-mono text-cyan">{forecastData.length}</span>
        </div>
      </div>
    </div>

    <!-- Performance Stats -->
    <div class="card-glass">
      <h3 class="text-sm font-medium text-soft-blue/60 mb-3">Performance Stats</h3>
      <div class="space-y-2">
        <div class="flex justify-between items-center">
          <span class="text-sm text-soft-blue">Avg Production</span>
          <span class="text-sm font-mono text-cyan">
            {forecastData.length > 0 
              ? (forecastData.reduce((sum, d) => sum + d.forecast, 0) / forecastData.length).toFixed(2)
              : '0.00'
            } MW
          </span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-sm text-soft-blue">Peak Forecast</span>
          <span class="text-sm font-mono text-cyan">
            {forecastData.length > 0 
              ? Math.max(...forecastData.map(d => d.forecast)).toFixed(2)
              : '0.00'
            } MW
          </span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-sm text-soft-blue">Min Forecast</span>
          <span class="text-sm font-mono text-cyan">
            {forecastData.length > 0 
              ? Math.min(...forecastData.map(d => d.forecast)).toFixed(2)
              : '0.00'
            } MW
          </span>
        </div>
      </div>
    </div>

    <!-- Confidence Analysis -->
    <div class="card-glass">
      <h3 class="text-sm font-medium text-soft-blue/60 mb-3">Confidence Analysis</h3>
      <div class="space-y-2">
        <div class="flex justify-between items-center">
          <span class="text-sm text-soft-blue">Avg Confidence</span>
          <span class="text-sm font-mono text-cyan">±8.5%</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-sm text-soft-blue">Max Uncertainty</span>
          <span class="text-sm font-mono text-cyan">±12.3%</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-sm text-soft-blue">Reliability</span>
          <span class="text-sm font-mono text-cyan">High</span>
        </div>
      </div>
    </div>
  </div>
</div>