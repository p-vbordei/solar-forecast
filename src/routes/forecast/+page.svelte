<script lang="ts">
	import { onMount } from 'svelte';
	import ProductionChart from '$lib/components/dashboard/ProductionChart.svelte';
	import DocumentTextIcon from '$lib/components/icons/DocumentTextIcon.svelte';
	import ChartBarIcon from '$lib/components/icons/ChartBarIcon.svelte';
	
	let showExplanation = false;
	
	let selectedLocation = 1;
	let forecastHorizon = '48h';
	let modelType = 'ML';
	let isGenerating = false;
	let forecastData: any = null;
	
	const locations = [
		{ id: 1, name: 'Solar Farm Alpha' },
		{ id: 2, name: 'Solar Station Beta' },
		{ id: 3, name: 'Green Energy Park' },
		{ id: 4, name: 'Coastal Solar Array' }
	];
	
	async function generateForecast() {
		isGenerating = true;
		
		try {
			// In production, this would call the Python worker API
			await new Promise(resolve => setTimeout(resolve, 2000));
			
			// Mock forecast data
			forecastData = {
				generated: true,
				accuracy: 94.5,
				confidence: 92.3
			};
		} finally {
			isGenerating = false;
		}
	}
</script>

<div class="space-y-6">
	<!-- Page Header -->
	<div>
		<h1 class="text-3xl font-bold text-soft-blue">Forecast Generation</h1>
		<p class="text-soft-blue/60 mt-2">Generate and analyze solar production forecasts</p>
	</div>
	
	<!-- Configuration Panel -->
	<div class="card-glass">
		<h2 class="text-lg font-semibold text-soft-blue mb-4">Forecast Configuration</h2>
		
		<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
			<!-- Location Selection -->
			<div>
				<label class="label">Location</label>
				<select class="select" bind:value={selectedLocation}>
					{#each locations as location}
						<option value={location.id}>{location.name}</option>
					{/each}
				</select>
			</div>
			
			<!-- Forecast Horizon -->
			<div>
				<label class="label">Horizon</label>
				<select class="select" bind:value={forecastHorizon}>
					<option value="24h">24 Hours</option>
					<option value="48h">48 Hours</option>
					<option value="72h">72 Hours</option>
					<option value="7d">7 Days</option>
				</select>
			</div>
			
			<!-- Model Type -->
			<div>
				<label class="label">Model Type</label>
				<select class="select" bind:value={modelType}>
					<option value="ML">Machine Learning</option>
					<option value="PHYSICAL">Physical Model</option>
					<option value="HYBRID">Hybrid</option>
					<option value="ENSEMBLE">Ensemble</option>
				</select>
			</div>
			
			<!-- Generate Button -->
			<div class="flex items-end">
				<button 
					class="btn btn-primary w-full"
					on:click={generateForecast}
					disabled={isGenerating}
				>
					{#if isGenerating}
						<div class="spinner"></div>
						Generating...
					{:else}
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
						</svg>
						Generate Forecast
					{/if}
				</button>
			</div>
		</div>
		
		{#if forecastData}
			<div class="mt-4 p-4 bg-cyan/10 border border-cyan/30 rounded-lg">
				<div class="flex items-center gap-6">
					<div class="flex items-center gap-2">
						<svg class="w-5 h-5 text-cyan" fill="currentColor" viewBox="0 0 24 24">
							<path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
						</svg>
						<span class="text-cyan font-medium">Forecast Generated Successfully</span>
					</div>
					<div class="text-sm text-soft-blue">
						Accuracy: <span class="text-cyan font-mono">{forecastData.accuracy}%</span>
					</div>
					<div class="text-sm text-soft-blue">
						Confidence: <span class="text-cyan font-mono">{forecastData.confidence}%</span>
					</div>
				</div>
			</div>
		{/if}
	</div>
	
	<!-- Forecast Visualization -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Main Chart -->
		<div class="lg:col-span-2">
			<ProductionChart />
		</div>
		
		<!-- Statistics Panel -->
		<div class="space-y-4">
			<!-- Peak Production -->
			<div class="card-glass">
				<h3 class="text-sm font-medium text-soft-blue/60 mb-3">Peak Production</h3>
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<span class="text-sm text-soft-blue">Time</span>
						<span class="text-cyan font-mono">12:00 PM</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm text-soft-blue">Output</span>
						<span class="text-cyan font-mono">21.7 MW</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm text-soft-blue">Capacity</span>
						<span class="text-cyan font-mono">85%</span>
					</div>
				</div>
			</div>
			
			<!-- Daily Summary -->
			<div class="card-glass">
				<h3 class="text-sm font-medium text-soft-blue/60 mb-3">Daily Summary</h3>
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<span class="text-sm text-soft-blue">Total Energy</span>
						<span class="text-cyan font-mono">186.4 MWh</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm text-soft-blue">Avg Output</span>
						<span class="text-cyan font-mono">7.8 MW</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm text-soft-blue">Sunshine Hours</span>
						<span class="text-cyan font-mono">12.5 h</span>
					</div>
				</div>
			</div>
			
			<!-- Weather Impact -->
			<div class="card-glass">
				<h3 class="text-sm font-medium text-soft-blue/60 mb-3">Weather Impact</h3>
				<div class="space-y-3">
					<div>
						<div class="flex items-center justify-between mb-1">
							<span class="text-sm text-soft-blue">Cloud Cover</span>
							<span class="text-xs text-cyan font-mono">25%</span>
						</div>
						<div class="h-2 bg-dark-petrol/50 rounded-full overflow-hidden">
							<div class="h-full bg-gradient-to-r from-cyan to-soft-blue" style="width: 25%"></div>
						</div>
					</div>
					<div>
						<div class="flex items-center justify-between mb-1">
							<span class="text-sm text-soft-blue">Temperature</span>
							<span class="text-xs text-cyan font-mono">22°C</span>
						</div>
						<div class="h-2 bg-dark-petrol/50 rounded-full overflow-hidden">
							<div class="h-full bg-gradient-to-r from-cyan to-soft-blue" style="width: 60%"></div>
						</div>
					</div>
					<div>
						<div class="flex items-center justify-between mb-1">
							<span class="text-sm text-soft-blue">Wind Speed</span>
							<span class="text-xs text-cyan font-mono">5.2 m/s</span>
						</div>
						<div class="h-2 bg-dark-petrol/50 rounded-full overflow-hidden">
							<div class="h-full bg-gradient-to-r from-cyan to-soft-blue" style="width: 35%"></div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
	
	<!-- Model Comparison -->
	<div class="card-glass">
		<h3 class="text-lg font-semibold text-soft-blue mb-4">Model Performance Comparison</h3>
		
		<div class="overflow-x-auto">
			<table class="table">
				<thead>
					<tr>
						<th>Model</th>
						<th>Accuracy</th>
						<th>MAPE</th>
						<th>RMSE</th>
						<th>Training Date</th>
						<th>Status</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td class="font-medium text-soft-blue">LSTM v1.0</td>
						<td class="text-cyan font-mono">94.5%</td>
						<td class="font-mono">5.5%</td>
						<td class="font-mono">2.3</td>
						<td class="text-sm">2024-10-01</td>
						<td><span class="badge badge-cyan">Active</span></td>
					</tr>
					<tr>
						<td class="font-medium text-soft-blue">Physical Model</td>
						<td class="text-cyan font-mono">89.7%</td>
						<td class="font-mono">10.3%</td>
						<td class="font-mono">4.1</td>
						<td class="text-sm">2024-09-15</td>
						<td><span class="badge badge-cyan">Active</span></td>
					</tr>
					<tr>
						<td class="font-medium text-soft-blue">Hybrid v2.0</td>
						<td class="text-cyan font-mono">96.1%</td>
						<td class="font-mono">3.9%</td>
						<td class="font-mono">1.8</td>
						<td class="text-sm">2024-11-01</td>
						<td><span class="badge badge-warning">Training</span></td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>

	<!-- Understanding Solar Forecasting -->
	<div class="card-glass mt-6">
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
					<p class="text-sm text-soft-blue/80">Learn how to generate and interpret solar production forecasts</p>
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
					<div>
						<h4 class="font-semibold text-white mb-3 flex items-center space-x-2">
							<span class="w-6 h-6 bg-cyan/20 rounded-full flex items-center justify-center text-cyan text-sm font-bold">1</span>
							<span>Forecast Generation</span>
						</h4>
						<p class="text-sm text-soft-blue/80 leading-relaxed mb-3">
							Generate accurate solar production forecasts using machine learning models trained on 
							weather data, historical production patterns, and seasonal variations.
						</p>
					</div>
					<div>
						<h4 class="font-semibold text-white mb-3 flex items-center space-x-2">
							<span class="w-6 h-6 bg-cyan/20 rounded-full flex items-center justify-center text-cyan text-sm font-bold">2</span>
							<span>Model Performance</span>
						</h4>
						<p class="text-sm text-soft-blue/80 leading-relaxed mb-3">
							Monitor forecast accuracy, model versions, and performance metrics to ensure 
							reliable predictions for energy trading and grid management decisions.
						</p>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>