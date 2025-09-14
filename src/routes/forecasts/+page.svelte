<script lang="ts">
  import { onMount } from 'svelte';
  import type { GenerateForecastRequest } from '$lib/features/forecasts/models/requests/GenerateForecastRequest';
  import type { ForecastResponse } from '$lib/features/forecasts/models/responses/ForecastResponse';
  import ForecastConfiguration from '$lib/components/forecasts/ForecastConfiguration.svelte';
  import ForecastSuccess from '$lib/components/forecasts/ForecastSuccess.svelte';
  import TrendingUpIcon from '$lib/components/icons/TrendingUpIcon.svelte';
  import RefreshIcon from '$lib/components/icons/RefreshIcon.svelte';
  import ChartBarIcon from '$lib/components/icons/ChartBarIcon.svelte';
  import DownloadIcon from '$lib/components/icons/DownloadIcon.svelte';
  import DocumentTextIcon from '$lib/components/icons/DocumentTextIcon.svelte';

  // State
  let locations: Array<{ id: string; name: string; city?: string; capacity: number }> = [];
  let isGenerating = false;
  let generatedForecast: ForecastResponse | null = null;
  let showSuccess = false;
  let recentForecasts: ForecastResponse[] = [];
  let dashboardStats = {
    totalForecasts: 0,
    activeForecasts: 0,
    averageAccuracy: 0,
    bestModel: null as string | null,
    forecastsToday: 0
  };

  let showExplanation = false;
  let currentTime = new Date().toLocaleTimeString();

  // Update current time every second
  let timeInterval: NodeJS.Timeout;

  onMount(async () => {
    await loadLocations();
    await loadDashboardData();
    await loadRecentForecasts();

    // Update time display
    timeInterval = setInterval(() => {
      currentTime = new Date().toLocaleTimeString();
    }, 1000);

    return () => {
      if (timeInterval) {
        clearInterval(timeInterval);
      }
    };
  });

  async function loadLocations() {
    try {
      const response = await fetch('/api/locations?limit=100');
      const result = await response.json();

      if (result.success && result.data?.locations) {
        locations = result.data.locations.map((loc: any) => ({
          id: loc.id,
          name: loc.name,
          city: loc.city,
          capacity: loc.capacityMW
        }));
      }
    } catch (error) {
      console.error('Error loading locations:', error);
      // Use mock locations for demonstration
      locations = [
        { id: '1', name: 'Solar Farm Alpha', city: 'Bucharest', capacity: 50 },
        { id: '2', name: 'Solar Station Beta', city: 'Cluj', capacity: 35 },
        { id: '3', name: 'Green Energy Park', city: 'Timisoara', capacity: 40 },
        { id: '4', name: 'Coastal Solar Array', city: 'Constanta', capacity: 45 }
      ];
    }
  }

  async function loadDashboardData() {
    try {
      const response = await fetch('/api/forecasts/statistics');
      const result = await response.json();

      if (result.success) {
        dashboardStats = result.data;
      }
    } catch (error) {
      console.error('Error loading dashboard statistics:', error);
    }
  }

  async function loadRecentForecasts() {
    try {
      const response = await fetch('/api/forecasts?limit=5&sortBy=createdAt&sortOrder=desc');
      const result = await response.json();

      if (result.success && result.data?.forecasts) {
        recentForecasts = result.data.forecasts;
      }
    } catch (error) {
      console.error('Error loading recent forecasts:', error);
    }
  }

  async function handleGenerateForecast(event: CustomEvent<GenerateForecastRequest>) {
    isGenerating = true;
    generatedForecast = null;

    try {
      const response = await fetch('/api/forecasts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event.detail)
      });

      const result = await response.json();

      if (result.success) {
        generatedForecast = result.data;
        showSuccess = true;

        // Refresh dashboard data
        await loadDashboardData();
        await loadRecentForecasts();
      } else {
        alert(`Forecast generation failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error generating forecast:', error);
      alert('Forecast generation failed. Please try again.');
    } finally {
      isGenerating = false;
    }
  }

  function handleViewDetails(event: CustomEvent<string>) {
    const forecastId = event.detail;
    // Navigate to forecast details (could be a modal or separate page)
    window.location.href = `/forecasts/${forecastId}`;
  }

  function handleCloseSuccess() {
    showSuccess = false;
    generatedForecast = null;
  }

  function handleRefreshData() {
    loadDashboardData();
    loadRecentForecasts();
  }

  function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleString();
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'completed': return 'text-cyan';
      case 'generating': return 'text-alert-orange';
      case 'failed': return 'text-alert-red';
      default: return 'text-soft-blue';
    }
  }

  function formatModelType(modelType: string) {
    return modelType.replace('ML_', '').replace('_', ' ');
  }
</script>

<svelte:head>
  <title>Solar Forecasts - Generate & Manage Predictions</title>
  <meta name="description" content="Generate and manage solar production forecasts using advanced ML models" />
</svelte:head>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold text-soft-blue flex items-center gap-2">
        <TrendingUpIcon className="w-8 h-8 text-cyan" />
        Solar Forecasts
      </h1>
      <p class="text-soft-blue/60 mt-2">Generate production forecasts using advanced machine learning models</p>
    </div>
    <div class="flex items-center gap-4">
      <div class="text-right">
        <div class="text-sm text-soft-blue/60">Current Time</div>
        <div class="font-mono text-cyan">{currentTime}</div>
      </div>
      <button
        on:click={handleRefreshData}
        class="btn btn-secondary"
        title="Refresh data"
      >
        <RefreshIcon className="w-5 h-5" />
      </button>
    </div>
  </div>

  <!-- Dashboard Stats -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
    <div class="card-glass">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-soft-blue/60">Total Forecasts</p>
          <p class="text-2xl font-bold text-cyan">{dashboardStats.totalForecasts}</p>
        </div>
        <ChartBarIcon className="w-8 h-8 text-cyan/50" />
      </div>
    </div>

    <div class="card-glass">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-soft-blue/60">Active Forecasts</p>
          <p class="text-2xl font-bold text-cyan">{dashboardStats.activeForecasts}</p>
        </div>
        <div class="w-3 h-3 bg-cyan rounded-full animate-pulse"></div>
      </div>
    </div>

    <div class="card-glass">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-soft-blue/60">Avg Accuracy</p>
          <p class="text-2xl font-bold text-cyan">{dashboardStats.averageAccuracy.toFixed(1)}%</p>
        </div>
        <div class="w-8 h-8 bg-cyan/20 rounded-lg flex items-center justify-center">
          <span class="text-cyan font-bold text-sm">%</span>
        </div>
      </div>
    </div>

    <div class="card-glass">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-soft-blue/60">Today's Forecasts</p>
          <p class="text-2xl font-bold text-cyan">{dashboardStats.forecastsToday}</p>
        </div>
        <div class="w-8 h-8 bg-gradient-to-br from-cyan to-soft-blue rounded-lg flex items-center justify-center">
          <span class="text-dark-petrol font-bold text-sm">📅</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Main Content Grid -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Forecast Configuration -->
    <div class="lg:col-span-2">
      <ForecastConfiguration
        {locations}
        isLoading={isGenerating}
        on:generate={handleGenerateForecast}
      />
    </div>

    <!-- Recent Forecasts -->
    <div class="space-y-6">
      <!-- Recent Forecasts List -->
      <div class="card-glass">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-soft-blue">Recent Forecasts</h3>
          <a href="/analysis" class="btn btn-secondary text-sm">
            <ChartBarIcon className="w-4 h-4" />
            View Analysis
          </a>
        </div>

        {#if recentForecasts.length > 0}
          <div class="space-y-3">
            {#each recentForecasts as forecast}
              <div class="p-3 bg-teal-dark/30 rounded-lg border border-cyan/20 hover:border-cyan/40 transition-colors">
                <div class="flex items-start justify-between mb-2">
                  <div class="flex-1">
                    <div class="font-medium text-soft-blue text-sm">{forecast.location.name}</div>
                    <div class="text-xs text-soft-blue/60">
                      {formatModelType(forecast.metadata.modelType)} • {forecast.metadata.horizonHours}h
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-xs {getStatusColor(forecast.status)}">{forecast.status}</div>
                    {#if forecast.quality.accuracy}
                      <div class="text-xs text-cyan">{forecast.quality.accuracy.toFixed(1)}%</div>
                    {/if}
                  </div>
                </div>
                <div class="text-xs text-soft-blue/50">
                  {formatDateTime(forecast.timing.createdAt)}
                </div>
              </div>
            {/each}
          </div>

          <div class="mt-4 text-center">
            <a href="/forecasts/list" class="btn btn-ghost text-sm">
              View All Forecasts →
            </a>
          </div>
        {:else}
          <div class="text-center py-8">
            <div class="w-16 h-16 mx-auto mb-4 bg-cyan/20 rounded-full flex items-center justify-center">
              <ChartBarIcon className="w-8 h-8 text-cyan" />
            </div>
            <p class="text-soft-blue/60">No forecasts generated yet</p>
            <p class="text-sm text-soft-blue/40">Generate your first forecast using the form</p>
          </div>
        {/if}
      </div>

      <!-- Quick Actions -->
      <div class="card-glass">
        <h3 class="text-lg font-semibold text-soft-blue mb-4">Quick Actions</h3>
        <div class="space-y-2">
          <a href="/analysis" class="btn btn-secondary w-full justify-start">
            <ChartBarIcon className="w-4 h-4" />
            Analyze Forecasts
          </a>
          <a href="/reports" class="btn btn-secondary w-full justify-start">
            <DocumentTextIcon className="w-4 h-4" />
            Generate Reports
          </a>
          <button class="btn btn-secondary w-full justify-start">
            <DownloadIcon className="w-4 h-4" />
            Export Data
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Understanding Solar Forecasting -->
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
          <h3 class="text-lg font-semibold text-white">Understanding Solar Forecasting</h3>
          <p class="text-sm text-soft-blue/80">Learn about forecast models, accuracy metrics, and best practices</p>
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
          <!-- Machine Learning Models -->
          <div>
            <h4 class="font-semibold text-white mb-3 flex items-center space-x-2">
              <span class="w-6 h-6 bg-cyan/20 rounded-full flex items-center justify-center text-cyan text-sm font-bold">1</span>
              <span>Forecast Models Explained</span>
            </h4>
            <div class="space-y-2">
              <div class="flex items-start space-x-2">
                <span class="text-cyan">🧠</span>
                <p class="text-sm text-soft-blue/80"><strong class="text-white">LSTM:</strong> Best for complex weather patterns and long-term dependencies</p>
              </div>
              <div class="flex items-start space-x-2">
                <span class="text-cyan">⚡</span>
                <p class="text-sm text-soft-blue/80"><strong class="text-white">XGBoost:</strong> Fast and reliable for real-time applications</p>
              </div>
              <div class="flex items-start space-x-2">
                <span class="text-cyan">🌳</span>
                <p class="text-sm text-soft-blue/80"><strong class="text-white">Random Forest:</strong> Stable predictions with good interpretability</p>
              </div>
              <div class="flex items-start space-x-2">
                <span class="text-cyan">🎯</span>
                <p class="text-sm text-soft-blue/80"><strong class="text-white">Ensemble:</strong> Combines multiple models for highest accuracy</p>
              </div>
            </div>
          </div>

          <!-- Forecast Horizons -->
          <div>
            <h4 class="font-semibold text-white mb-3 flex items-center space-x-2">
              <span class="w-6 h-6 bg-cyan/20 rounded-full flex items-center justify-center text-cyan text-sm font-bold">2</span>
              <span>Forecast Horizons</span>
            </h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-cyan"><strong>0-6 hours:</strong></span>
                <span class="text-soft-blue/80">95-98% accuracy, weather radar</span>
              </div>
              <div class="flex justify-between">
                <span class="text-cyan"><strong>6-24 hours:</strong></span>
                <span class="text-soft-blue/80">90-95% accuracy, weather models</span>
              </div>
              <div class="flex justify-between">
                <span class="text-cyan"><strong>1-3 days:</strong></span>
                <span class="text-soft-blue/80">85-92% accuracy, pattern analysis</span>
              </div>
              <div class="flex justify-between">
                <span class="text-cyan"><strong>3-7 days:</strong></span>
                <span class="text-soft-blue/80">80-88% accuracy, seasonal trends</span>
              </div>
            </div>
          </div>

          <!-- Best Practices -->
          <div>
            <h4 class="font-semibold text-white mb-3 flex items-center space-x-2">
              <span class="w-6 h-6 bg-cyan/20 rounded-full flex items-center justify-center text-cyan text-sm font-bold">3</span>
              <span>Best Practices</span>
            </h4>
            <div class="space-y-2">
              <div class="flex items-start space-x-2">
                <span class="text-cyan">•</span>
                <p class="text-sm text-soft-blue/80"><strong class="text-white">Regular Updates:</strong> Generate forecasts every 1-6 hours for optimal accuracy</p>
              </div>
              <div class="flex items-start space-x-2">
                <span class="text-cyan">•</span>
                <p class="text-sm text-soft-blue/80"><strong class="text-white">Weather Integration:</strong> Enable weather data for improved predictions</p>
              </div>
              <div class="flex items-start space-x-2">
                <span class="text-cyan">•</span>
                <p class="text-sm text-soft-blue/80"><strong class="text-white">Model Selection:</strong> Use LSTM for accuracy, XGBoost for speed</p>
              </div>
              <div class="flex items-start space-x-2">
                <span class="text-cyan">•</span>
                <p class="text-sm text-soft-blue/80"><strong class="text-white">Validation:</strong> Monitor accuracy metrics and retrain models monthly</p>
              </div>
            </div>
          </div>

          <!-- Business Impact -->
          <div>
            <h4 class="font-semibold text-white mb-3 flex items-center space-x-2">
              <span class="w-6 h-6 bg-cyan/20 rounded-full flex items-center justify-center text-cyan text-sm font-bold">4</span>
              <span>Business Applications</span>
            </h4>
            <div class="space-y-2">
              <div class="flex items-start space-x-2">
                <span class="text-cyan">💼</span>
                <p class="text-sm text-soft-blue/80"><strong class="text-white">Energy Trading:</strong> Optimize market bids and reduce imbalance costs</p>
              </div>
              <div class="flex items-start space-x-2">
                <span class="text-cyan">⚡</span>
                <p class="text-sm text-soft-blue/80"><strong class="text-white">Grid Operations:</strong> Plan energy storage and grid stability</p>
              </div>
              <div class="flex items-start space-x-2">
                <span class="text-cyan">🔧</span>
                <p class="text-sm text-soft-blue/80"><strong class="text-white">Maintenance:</strong> Schedule work during low production periods</p>
              </div>
              <div class="flex items-start space-x-2">
                <span class="text-cyan">📊</span>
                <p class="text-sm text-soft-blue/80"><strong class="text-white">Performance:</strong> Identify underperforming assets early</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- Success Notification -->
{#if showSuccess && generatedForecast}
  <ForecastSuccess
    forecast={generatedForecast}
    on:close={handleCloseSuccess}
    on:viewDetails={handleViewDetails}
  />
{/if}

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