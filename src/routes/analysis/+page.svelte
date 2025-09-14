<script lang="ts">
  import { onMount } from 'svelte';
  import ForecastChart from '$lib/components/analysis/ForecastChart.svelte';
  import EnhancedForecastChart from '$lib/components/analysis/EnhancedForecastChart.svelte';
  import AggregationSelector from '$lib/components/analysis/AggregationSelector.svelte';
  import AccuracyMetrics from '$lib/components/analysis/AccuracyMetrics.svelte';
  import TrendingUpIcon from '$lib/components/icons/TrendingUpIcon.svelte';
  import RefreshIcon from '$lib/components/icons/RefreshIcon.svelte';
  import DownloadIcon from '$lib/components/icons/DownloadIcon.svelte';
  import CalendarIcon from '$lib/components/icons/CalendarIcon.svelte';
  import MapPinIcon from '$lib/components/icons/MapPinIcon.svelte';
  import DocumentTextIcon from '$lib/components/icons/DocumentTextIcon.svelte';
  import ChartBarIcon from '$lib/components/icons/ChartBarIcon.svelte';
  import ForecastGenerator from '$lib/components/forecast/ForecastGenerator.svelte';
  
  let showExplanation = false;

  let selectedLocation = '';
  let selectedInterval: '15min' | 'hourly' | 'daily' | 'weekly' = 'hourly';
  let showConfidenceBands = true;
  let showActual = false;
  let showWeather = false;
  let showHistorical = false;
  let showMeasured = false;
  let chartType: 'production' | 'weather' | 'comparison' = 'production';
  let comparisonMode: 'forecast-actual' | 'forecast-measured' | 'historical-current' = 'forecast-actual';
  let autoRefresh = false;
  let refreshInterval: number;
  let isLoading = false;
  let forecastData: any[] = [];
  let weatherData: any[] = [];
  let historicalData: any[] = [];
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
    { id: '550e8400-e29b-41d4-a716-446655440000', name: 'Solar Farm Alpha', city: 'Bucharest', capacity: 50 },
    { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Solar Station Beta', city: 'Cluj', capacity: 35 },
    { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Green Energy Park', city: 'Timisoara', capacity: 40 },
    { id: '550e8400-e29b-41d4-a716-446655440004', name: 'Coastal Solar Array', city: 'Constanta', capacity: 45 }
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
        showMeasured = result.hasMeasured || false;
      }
    } catch (error) {
      console.error('Error loading forecast data:', error);
    } finally {
      isLoading = false;
    }
  }
  
  async function loadWeatherData() {
    if (!selectedLocation) return;
    
    try {
      const response = await fetch(`/api/analysis/weather?location=${selectedLocation}&interval=${selectedInterval}&start=${dateRange.start}&end=${dateRange.end}`);
      const result = await response.json();
      
      if (result.success) {
        weatherData = result.data;
      }
    } catch (error) {
      console.error('Error loading weather data:', error);
    }
  }
  
  async function loadHistoricalData() {
    if (!selectedLocation) return;
    
    try {
      const response = await fetch(`/api/analysis/historical?location=${selectedLocation}&interval=${selectedInterval}&start=${dateRange.start}&end=${dateRange.end}`);
      const result = await response.json();
      
      if (result.success) {
        historicalData = result.data;
      }
    } catch (error) {
      console.error('Error loading historical data:', error);
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
    if (showWeather || chartType === 'weather' || chartType === 'comparison') {
      loadWeatherData();
    }
    if (showHistorical) {
      loadHistoricalData();
    }
  }

  function toggleAutoRefresh() {
    autoRefresh = !autoRefresh;
    if (autoRefresh) {
      refreshInterval = setInterval(handleRefresh, 60000); // Refresh every minute
    } else {
      clearInterval(refreshInterval);
    }
  }

  async function handleForecastGenerated(event) {
    // When a forecast is generated, refresh the data to show the new forecast
    console.log('Forecast generated:', event.detail);

    // Refresh forecast data to display the new forecast
    await loadForecastData();

    // Also update accuracy metrics
    await loadAccuracyMetrics();

    // Show a success message
    alert(`Forecast generated successfully! ${event.detail.data?.length || 0} data points created.`);
  }

  onMount(() => {
    // Set default location
    if (locations.length > 0) {
      selectedLocation = locations[0].id;
      loadForecastData();
      loadAccuracyMetrics();
      loadWeatherData();
      loadHistoricalData();
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
    loadWeatherData();
    loadHistoricalData();
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

      <!-- Chart Type -->
      <div>
        <label class="label">Chart Type</label>
        <select class="select" bind:value={chartType}>
          <option value="production">Production Analysis</option>
          <option value="weather">Weather Data</option>
          <option value="comparison">Combined Comparison</option>
        </select>
      </div>
    </div>

    <!-- Display Options -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      <div>
        <label class="label">Production Options</label>
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
          <label class="flex items-center gap-2 text-sm text-soft-blue cursor-pointer">
            <input
              type="checkbox"
              bind:checked={showMeasured}
              disabled={!forecastData.some(d => d.measured)}
              class="w-4 h-4 rounded border-glass-border bg-glass-white text-cyan focus:ring-cyan focus:ring-2"
            />
            Show Measured Data
          </label>
        </div>
      </div>
      
      <div>
        <label class="label">Additional Data</label>
        <div class="space-y-2">
          <label class="flex items-center gap-2 text-sm text-soft-blue cursor-pointer">
            <input
              type="checkbox"
              bind:checked={showWeather}
              class="w-4 h-4 rounded border-glass-border bg-glass-white text-cyan focus:ring-cyan focus:ring-2"
            />
            Show Weather Data
          </label>
          <label class="flex items-center gap-2 text-sm text-soft-blue cursor-pointer">
            <input
              type="checkbox"
              bind:checked={showHistorical}
              class="w-4 h-4 rounded border-glass-border bg-glass-white text-cyan focus:ring-cyan focus:ring-2"
            />
            Show Historical Data
          </label>
        </div>
      </div>
      
      <div>
        <label class="label">Comparison Mode</label>
        <select class="select" bind:value={comparisonMode}>
          <option value="forecast-actual">Forecast vs Actual</option>
          <option value="forecast-measured">Forecast vs Measured</option>
          <option value="historical-current">Historical vs Current</option>
        </select>
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
    </div>
  </div>

  <!-- Forecast Generator -->
  <ForecastGenerator
    locationId={selectedLocation}
    locationName={locations.find(l => l.id === selectedLocation)?.name || ''}
    on:forecastGenerated={handleForecastGenerated}
  />

  <!-- Accuracy Metrics -->
  <AccuracyMetrics 
    accuracy={accuracyMetrics.accuracy}
    mape={accuracyMetrics.mape}
    rmse={accuracyMetrics.rmse}
    mae={accuracyMetrics.mae}
  />

  <!-- Enhanced Analysis Chart -->
  <div class="card-glass">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-semibold text-soft-blue">
        {#if chartType === 'production'}
          Production Analysis
        {:else if chartType === 'weather'}
          Weather Data Analysis
        {:else}
          Combined Data Comparison
        {/if}
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
      
      <!-- Chart type indicators -->
      <div class="flex gap-2 text-sm">
        {#if showActual}<span class="px-2 py-1 bg-soft-blue/20 text-soft-blue rounded">Actual</span>{/if}
        {#if showMeasured}<span class="px-2 py-1 bg-alert-red/20 text-alert-red rounded">Measured</span>{/if}
        {#if showWeather}<span class="px-2 py-1 bg-alert-orange/20 text-alert-orange rounded">Weather</span>{/if}
        {#if showHistorical}<span class="px-2 py-1 bg-cyan/20 text-cyan rounded">Historical</span>{/if}
      </div>
    </div>
    
    {#if isLoading}
      <div class="flex items-center justify-center h-96">
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan"></div>
          <p class="mt-4 text-soft-blue">Loading analysis data...</p>
        </div>
      </div>
    {:else if forecastData.length > 0}
      <EnhancedForecastChart 
        data={forecastData}
        weatherData={weatherData}
        historicalData={historicalData}
        interval={selectedInterval}
        showConfidenceBands={showConfidenceBands}
        showActual={showActual}
        showWeather={showWeather}
        showHistorical={showHistorical}
        showMeasured={showMeasured}
        chartType={chartType}
        height={450}
      />
    {:else}
      <div class="flex items-center justify-center h-96">
        <div class="text-center text-soft-blue/60">
          <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p>No analysis data available</p>
          <p class="text-sm mt-2">Select a location and date range to view analysis</p>
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

  <!-- Understanding Solar Forecast Analysis -->
  <div class="card-glass">
    <button 
      on:click={() => showExplanation = !showExplanation}
      class="flex items-center justify-between w-full text-left"
    >
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 bg-gradient-to-br from-cyan to-soft-blue rounded-xl flex items-center justify-center shadow-lg shadow-cyan/30">
          <DocumentTextIcon class="w-4 h-4 text-dark-petrol" />
        </div>
        <div>
          <h3 class="text-lg font-semibold text-white">Understanding Solar Forecast Analysis</h3>
          <p class="text-sm text-soft-blue/80">Learn how to interpret forecast data, accuracy metrics, and visualization features</p>
        </div>
      </div>
      <div class="transform transition-transform duration-200 {showExplanation ? 'rotate-180' : 'rotate-0'}">
        <svg class="w-5 h-5 text-soft-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </div>
    </button>
    
    {#if showExplanation}
      <div class="mt-6 pt-6 border-t border-soft-blue/20 space-y-4 animate-slide-down">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Forecast Analysis -->
          <div>
            <h4 class="font-semibold text-white mb-3 flex items-center space-x-2">
              <span class="w-6 h-6 bg-cyan/20 rounded-full flex items-center justify-center text-cyan text-sm font-bold">1</span>
              <span>Advanced Forecast Visualization</span>
            </h4>
            <p class="text-sm text-soft-blue/80 leading-relaxed mb-3">
              The Analysis module provides sophisticated forecast visualization with confidence bands, multiple time aggregations,
              and comparative analysis between predicted and actual solar production data.
            </p>
            <div class="bg-cyan/20 rounded-lg p-3 border border-cyan/30">
              <p class="text-xs text-soft-blue/70">
                <strong class="text-cyan">Prediction Models:</strong> Uses machine learning algorithms trained on 
                weather data, historical production, and irradiance patterns for accurate forecasting.
              </p>
            </div>
          </div>

          <!-- Accuracy Metrics -->
          <div>
            <h4 class="font-semibold text-white mb-3 flex items-center space-x-2">
              <span class="w-6 h-6 bg-cyan/20 rounded-full flex items-center justify-center text-cyan text-sm font-bold">2</span>
              <span>Accuracy Metrics Explained</span>
            </h4>
            <div class="space-y-2">
              <div class="flex items-start space-x-2">
                <span class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></span>
                <p class="text-sm text-soft-blue/80"><strong class="text-white">MAPE:</strong> Mean Absolute Percentage Error - lower is better</p>
              </div>
              <div class="flex items-start space-x-2">
                <span class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></span>
                <p class="text-sm text-soft-blue/80"><strong class="text-white">RMSE:</strong> Root Mean Square Error - measures prediction variance</p>
              </div>
              <div class="flex items-start space-x-2">
                <span class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></span>
                <p class="text-sm text-soft-blue/80"><strong class="text-white">MAE:</strong> Mean Absolute Error - average prediction deviation</p>
              </div>
              <div class="flex items-start space-x-2">
                <span class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></span>
                <p class="text-sm text-soft-blue/80"><strong class="text-white">Confidence Bands:</strong> Statistical uncertainty ranges</p>
              </div>
            </div>
          </div>

          <!-- Visualization Features -->
          <div>
            <h4 class="font-semibold text-white mb-3 flex items-center space-x-2">
              <span class="w-6 h-6 bg-cyan/20 rounded-full flex items-center justify-center text-cyan text-sm font-bold">3</span>
              <span>Chart & Analysis Tools</span>
            </h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-cyan"><strong>Time Aggregation:</strong></span>
                <span class="text-soft-blue/80">15min, hourly, daily, weekly views</span>
              </div>
              <div class="flex justify-between">
                <span class="text-cyan"><strong>Confidence Bands:</strong></span>
                <span class="text-soft-blue/80">Show prediction uncertainty ranges</span>
              </div>
              <div class="flex justify-between">
                <span class="text-cyan"><strong>Actual vs Forecast:</strong></span>
                <span class="text-soft-blue/80">Compare predictions to reality</span>
              </div>
              <div class="flex justify-between">
                <span class="text-cyan"><strong>Auto-refresh:</strong></span>
                <span class="text-soft-blue/80">Real-time data updates</span>
              </div>
            </div>
          </div>

          <!-- Business Applications -->
          <div>
            <h4 class="font-semibold text-white mb-3 flex items-center space-x-2">
              <span class="w-6 h-6 bg-cyan/20 rounded-full flex items-center justify-center text-cyan text-sm font-bold">4</span>
              <span>Decision Making Applications</span>
            </h4>
            <div class="space-y-2">
              <div class="flex items-start space-x-2">
                <span class="text-cyan">•</span>
                <p class="text-sm text-soft-blue/80"><strong class="text-white">Energy Trading:</strong> Optimize electricity market bids</p>
              </div>
              <div class="flex items-start space-x-2">
                <span class="text-cyan">•</span>
                <p class="text-sm text-soft-blue/80"><strong class="text-white">Grid Management:</strong> Plan energy storage and dispatch</p>
              </div>
              <div class="flex items-start space-x-2">
                <span class="text-cyan">•</span>
                <p class="text-sm text-soft-blue/80"><strong class="text-white">Maintenance Planning:</strong> Schedule based on production windows</p>
              </div>
              <div class="flex items-start space-x-2">
                <span class="text-cyan">•</span>
                <p class="text-sm text-soft-blue/80"><strong class="text-white">Performance Analysis:</strong> Identify underperforming assets</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Analysis Tools -->
        <div class="bg-teal-dark/30 rounded-xl p-4 border border-cyan/20">
          <h5 class="font-medium text-white mb-2 flex items-center space-x-2">
            <ChartBarIcon class="w-4 h-4 text-cyan" />
            <span>Analysis Tools & Controls</span>
          </h5>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div class="text-soft-blue/80">• <strong class="text-white">Location Filter:</strong> Select specific solar farms</div>
            <div class="text-soft-blue/80">• <strong class="text-white">Time Range:</strong> Custom date range selection</div>
            <div class="text-soft-blue/80">• <strong class="text-white">Export Data:</strong> Download analysis results</div>
            <div class="text-soft-blue/80">• <strong class="text-white">Toggle Views:</strong> Switch between chart types</div>
          </div>
        </div>
      </div>
    {/if}
  </div>

</div>