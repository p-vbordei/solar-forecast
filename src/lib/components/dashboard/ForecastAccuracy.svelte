<script lang="ts">
	import { onMount } from 'svelte';
	
	// Mock accuracy data
	const accuracyData = [
		{ model: 'ML Model', accuracy: 94.2, mape: 5.8, rmse: 12.3 },
		{ model: 'Physical Model', accuracy: 89.7, mape: 10.3, rmse: 18.5 },
		{ model: 'Hybrid Model', accuracy: 96.1, mape: 3.9, rmse: 9.7 }
	];
	
	const weeklyAccuracy = [92, 93, 94, 91, 95, 94, 96];
	const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
	
	// Calculate normalized heights for the chart (0-100% range)
	const minAccuracy = Math.min(...weeklyAccuracy);
	const maxAccuracy = Math.max(...weeklyAccuracy);
	const range = maxAccuracy - minAccuracy || 1; // Avoid division by zero
	
	function getBarHeight(accuracy: number): number {
		// Use pixel heights instead of percentages for better control
		const maxHeight = 50; // Max height in pixels
		const minHeight = 15; // Min height in pixels
		const normalized = ((accuracy - minAccuracy) / range) * (maxHeight - minHeight) + minHeight;
		return Math.max(normalized, minHeight);
	}
</script>

<div class="card-glass min-h-[24rem] h-auto">
	<div class="flex items-center justify-between mb-4">
		<h3 class="text-lg font-semibold text-soft-blue">Forecast Accuracy Analysis</h3>
		<button class="text-cyan text-sm hover:text-soft-blue transition-colors">
			Details →
		</button>
	</div>
	
	<!-- Model Comparison -->
	<div class="space-y-2 mb-4">
		{#each accuracyData as model}
			<div class="p-2 bg-glass-white rounded-lg">
				<div class="flex items-center justify-between mb-1">
					<span class="text-sm font-medium text-soft-blue">{model.model}</span>
					<span class="text-cyan font-mono text-sm">{model.accuracy}%</span>
				</div>
				<div class="relative h-1.5 bg-dark-petrol/50 rounded-full overflow-hidden">
					<div 
						class="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan to-soft-blue rounded-full transition-all duration-500"
						style="width: {model.accuracy}%"
					></div>
				</div>
			</div>
		{/each}
	</div>
	
	<!-- Weekly Trend -->
	<div class="mb-4">
		<h4 class="text-sm font-medium text-soft-blue mb-3">Weekly Accuracy Trend</h4>
		<div class="flex items-end justify-between gap-2" style="height: 70px;">
			{#each weeklyAccuracy as accuracy, i}
				<div class="flex-1 flex flex-col items-center gap-1">
					<span class="text-xs text-cyan font-mono mb-1">{accuracy}%</span>
					<div 
						class="w-full bg-gradient-to-t from-cyan to-soft-blue rounded-t transition-all duration-300 hover:opacity-80 min-h-[15px]"
						style="height: {getBarHeight(accuracy)}px"
					></div>
					<span class="text-xs text-soft-blue/60 mt-1">{days[i]}</span>
				</div>
			{/each}
		</div>
	</div>
	
	<!-- Best Performing Location -->
	<div class="mt-4 p-3 bg-cyan/10 border border-cyan/30 rounded-lg">
		<div class="flex items-center justify-between">
			<div>
				<p class="text-xs text-cyan font-medium">Best Performing Location</p>
				<p class="text-sm text-soft-blue mt-1">Site D - Southern Region</p>
			</div>
			<div class="text-right">
				<p class="text-2xl font-mono text-cyan">97.3%</p>
				<p class="text-xs text-soft-blue/60">Avg. Accuracy</p>
			</div>
		</div>
	</div>
</div>