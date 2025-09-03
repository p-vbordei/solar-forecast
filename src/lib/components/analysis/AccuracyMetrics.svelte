<script lang="ts">
  import TrendingUpIcon from '$lib/components/icons/TrendingUpIcon.svelte';
  
  export let mape: number = 0;
  export let rmse: number = 0;
  export let mae: number = 0;
  export let accuracy: number = 0;
</script>

<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
  <!-- Accuracy Score -->
  <div class="card-glass">
    <div class="flex items-start justify-between mb-2">
      <div>
        <p class="text-xs text-soft-blue/60 uppercase tracking-wider">Accuracy</p>
        <p class="text-2xl font-bold text-cyan font-mono mt-1">{accuracy.toFixed(1)}%</p>
      </div>
      <div class="w-8 h-8 bg-cyan/20 rounded-lg flex items-center justify-center">
        <TrendingUpIcon className="w-5 h-5 text-cyan" />
      </div>
    </div>
    <div class="mt-3">
      <div class="h-2 bg-dark-petrol/50 rounded-full overflow-hidden">
        <div 
          class="h-full bg-gradient-to-r from-cyan to-soft-blue transition-all duration-500"
          style="width: {accuracy}%"
        ></div>
      </div>
    </div>
    <p class="text-xs text-soft-blue/60 mt-2">Overall forecast accuracy</p>
  </div>
  
  <!-- MAPE -->
  <div class="card-glass">
    <div class="flex items-start justify-between mb-2">
      <div>
        <p class="text-xs text-soft-blue/60 uppercase tracking-wider">MAPE</p>
        <p class="text-2xl font-bold text-soft-blue font-mono mt-1">{mape.toFixed(2)}%</p>
      </div>
      <div class="w-8 h-8 bg-soft-blue/20 rounded-lg flex items-center justify-center">
        <svg class="w-5 h-5 text-soft-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
    </div>
    <div class="flex items-center gap-1 mt-2">
      {#if mape < 5}
        <span class="w-2 h-2 bg-green-500 rounded-full"></span>
        <span class="text-xs text-green-500">Excellent</span>
      {:else if mape < 10}
        <span class="w-2 h-2 bg-cyan rounded-full"></span>
        <span class="text-xs text-cyan">Good</span>
      {:else if mape < 15}
        <span class="w-2 h-2 bg-alert-orange rounded-full"></span>
        <span class="text-xs text-alert-orange">Fair</span>
      {:else}
        <span class="w-2 h-2 bg-alert-red rounded-full"></span>
        <span class="text-xs text-alert-red">Poor</span>
      {/if}
    </div>
    <p class="text-xs text-soft-blue/60 mt-2">Mean Absolute Percentage Error</p>
  </div>
  
  <!-- RMSE -->
  <div class="card-glass">
    <div class="flex items-start justify-between mb-2">
      <div>
        <p class="text-xs text-soft-blue/60 uppercase tracking-wider">RMSE</p>
        <p class="text-2xl font-bold text-soft-blue font-mono mt-1">{rmse.toFixed(2)}</p>
        <p class="text-xs text-soft-blue/60">MW</p>
      </div>
      <div class="w-8 h-8 bg-soft-blue/20 rounded-lg flex items-center justify-center">
        <svg class="w-5 h-5 text-soft-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      </div>
    </div>
    <p class="text-xs text-soft-blue/60 mt-2">Root Mean Square Error</p>
  </div>
  
  <!-- MAE -->
  <div class="card-glass">
    <div class="flex items-start justify-between mb-2">
      <div>
        <p class="text-xs text-soft-blue/60 uppercase tracking-wider">MAE</p>
        <p class="text-2xl font-bold text-soft-blue font-mono mt-1">{mae.toFixed(2)}</p>
        <p class="text-xs text-soft-blue/60">MW</p>
      </div>
      <div class="w-8 h-8 bg-soft-blue/20 rounded-lg flex items-center justify-center">
        <svg class="w-5 h-5 text-soft-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      </div>
    </div>
    <p class="text-xs text-soft-blue/60 mt-2">Mean Absolute Error</p>
  </div>
</div>