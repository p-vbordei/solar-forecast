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
</script>

<div class="card-glass h-96">
	<div class="flex items-center justify-between mb-4">
		<h3 class="text-lg font-semibold text-soft-blue">Forecast Accuracy Analysis</h3>
		<button class="text-cyan text-sm hover:text-soft-blue transition-colors">
			Details →
		</button>
	</div>
	
	<!-- Model Comparison -->
	<div class="space-y-3 mb-6">
		{#each accuracyData as model}
			<div class="p-3 bg-glass-white rounded-lg">
				<div class="flex items-center justify-between mb-2">
					<span class="text-sm font-medium text-soft-blue">{model.model}</span>
					<span class="text-cyan font-mono text-sm">{model.accuracy}%</span>
				</div>
				<div class="relative h-2 bg-dark-petrol/50 rounded-full overflow-hidden">
					<div 
						class="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan to-soft-blue rounded-full transition-all duration-500"
						style="width: {model.accuracy}%"
					></div>
				</div>
				<div class="flex items-center gap-4 mt-2 text-xs text-soft-blue/60">
					<span>MAPE: {model.mape}%</span>
					<span>RMSE: {model.rmse}</span>
				</div>
			</div>
		{/each}
	</div>
	
	<!-- Weekly Trend -->
	<div>
		<h4 class="text-sm font-medium text-soft-blue mb-3">Weekly Accuracy Trend</h4>
		<div class="flex items-end justify-between h-24 gap-2">
			{#each weeklyAccuracy as accuracy, i}
				<div class="flex-1 flex flex-col items-center gap-1">
					<span class="text-xs text-cyan font-mono">{accuracy}%</span>
					<div 
						class="w-full bg-gradient-to-t from-cyan to-soft-blue rounded-t transition-all duration-300 hover:opacity-80"
						style="height: {accuracy - 85}%"
					></div>
					<span class="text-xs text-soft-blue/60">{days[i]}</span>
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