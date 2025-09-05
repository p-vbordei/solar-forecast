<script lang="ts">
	import { onMount } from 'svelte';
	import ForecastChart from '$lib/components/analysis/ForecastChart.svelte';
	import SolarForecast from '$lib/components/dashboard/SolarForecast.svelte';
	import DocumentTextIcon from '$lib/components/icons/DocumentTextIcon.svelte';
	import ChartBarIcon from '$lib/components/icons/ChartBarIcon.svelte';
	import DownloadIcon from '$lib/components/icons/DownloadIcon.svelte';
	import CalendarIcon from '$lib/components/icons/CalendarIcon.svelte';
	
	let showExplanation = false;
	
	let selectedLocation = 1;
	let forecastHorizon = '48h';
	let modelType = 'ML';
	let isGenerating = false;
	let forecastData: any = null;
	
	// Advanced forecast visualization variables
	let chartData: any[] = [];
	let showConfidenceBands = true;
	let showWeatherOverlay = false;
	let selectedTimeView: '15min' | 'hourly' | 'daily' | 'weekly' = 'hourly';
	let forecastAccuracy = 94.5;
	let isLoadingChart = false;
	
	const locations = [
		{ id: 1, name: 'Solar Farm Alpha' },
		{ id: 2, name: 'Solar Station Beta' },
		{ id: 3, name: 'Green Energy Park' },
		{ id: 4, name: 'Coastal Solar Array' }
	];
	
	async function generateForecast() {
		isGenerating = true;
		isLoadingChart = true;
		
		try {
			// In production, this would call the Python worker API
			await new Promise(resolve => setTimeout(resolve, 2000));
			
			// Mock forecast data
			forecastData = {
				generated: true,
				accuracy: 94.5,
				confidence: 92.3
			};
			
			// Generate mock chart data based on selected horizon
			const hours = forecastHorizon === '24h' ? 24 : forecastHorizon === '48h' ? 48 : forecastHorizon === '72h' ? 72 : 168;
			chartData = generateMockForecastData(hours, selectedTimeView);
			
			console.log('Generated forecast data:', { 
				forecastData, 
				chartDataLength: chartData.length,
				firstDataPoint: chartData[0]
			});
			
		} finally {
			isGenerating = false;
			isLoadingChart = false;
		}
	}
	
	function generateMockForecastData(totalHours: number, interval: '15min' | 'hourly' | 'daily' | 'weekly') {
		const data = [];
		const now = new Date();
		
		let dataPoints: number;
		let timeIncrement: number; // in milliseconds
		
		// Calculate data points and time increment based on interval
		switch (interval) {
			case '15min':
				dataPoints = totalHours * 4; // 4 points per hour
				timeIncrement = 15 * 60 * 1000; // 15 minutes
				break;
			case 'hourly':
				dataPoints = totalHours;
				timeIncrement = 60 * 60 * 1000; // 1 hour
				break;
			case 'daily':
				dataPoints = Math.ceil(totalHours / 24); // Convert hours to days
				timeIncrement = 24 * 60 * 60 * 1000; // 1 day
				break;
			case 'weekly':
				dataPoints = Math.ceil(totalHours / 168); // Convert hours to weeks
				timeIncrement = 7 * 24 * 60 * 60 * 1000; // 1 week
				break;
			default:
				dataPoints = totalHours;
				timeIncrement = 60 * 60 * 1000;
		}
		
		for (let i = 0; i < dataPoints; i++) {
			const timestamp = new Date(now.getTime() + i * timeIncrement);
			
			let forecast = 0;
			
			if (interval === 'daily') {
				// For daily: show average daily production (peak around noon)
				const dayOfWeek = timestamp.getDay();
				const baseDaily = 180 + (Math.random() - 0.5) * 40; // 160-220 MWh per day
				// Slightly lower on weekends for maintenance
				forecast = dayOfWeek === 0 || dayOfWeek === 6 ? baseDaily * 0.9 : baseDaily;
			} else if (interval === 'weekly') {
				// For weekly: show total weekly production
				forecast = 1200 + (Math.random() - 0.5) * 200; // 1100-1300 MWh per week
			} else {
				// For 15min and hourly: show realistic solar production curve
				const hour = timestamp.getHours();
				const minute = timestamp.getMinutes();
				
				let baseValue = 0;
				if (hour >= 6 && hour <= 18) {
					// More detailed curve for 15-minute intervals
					const timeOfDay = hour + minute / 60;
					const sunHours = Math.abs(12 - timeOfDay);
					
					// Peak at solar noon (12:00), bell curve shape
					baseValue = Math.max(0, (30 - sunHours * 2.5) * (0.8 + Math.random() * 0.4));
					
					// Add some realistic variation
					if (interval === '15min') {
						// More frequent small variations for 15-minute data
						baseValue += (Math.random() - 0.5) * 3;
					}
				}
				
				forecast = Math.max(0, baseValue);
			}
			
			// Calculate confidence intervals (tighter for shorter intervals)
			const confidenceRange = interval === '15min' ? 2 + Math.random() * 2 : 
								   interval === 'hourly' ? 3 + Math.random() * 3 : 
								   interval === 'daily' ? 15 + Math.random() * 15 :
								   50 + Math.random() * 50; // weekly
			
			data.push({
				timestamp: timestamp.toISOString(),
				forecast: Number(forecast.toFixed(2)),
				confidence_upper: Number((forecast + confidenceRange).toFixed(2)),
				confidence_lower: Number(Math.max(0, forecast - confidenceRange).toFixed(2)),
				actual: null
			});
		}
		
		return data;
	}
	
	function exportForecast(format: 'csv' | 'excel' | 'pdf') {
		if (!forecastData || !chartData.length) {
			alert('Please generate a forecast first');
			return;
		}
		
		// Mock export functionality
		console.log(`Exporting forecast as ${format}...`);
		alert(`Forecast exported as ${format.toUpperCase()}`);
	}
	
	// Initialize with sample data on mount
	onMount(() => {
		// Generate initial forecast data to show something immediately
		// Skip delay for initial load
		forecastData = {
			generated: true,
			accuracy: 94.5,
			confidence: 92.3
		};
		
		const hours = forecastHorizon === '24h' ? 24 : forecastHorizon === '48h' ? 48 : forecastHorizon === '72h' ? 72 : 168;
		chartData = generateMockForecastData(hours, selectedTimeView);
		
		console.log('Initial data loaded:', { 
			chartDataLength: chartData.length,
			firstDataPoint: chartData[0]
		});
	});
	
	// Regenerate chart data when time view changes
	$: if (forecastData && selectedTimeView) {
		const hours = forecastHorizon === '24h' ? 24 : forecastHorizon === '48h' ? 48 : forecastHorizon === '72h' ? 72 : 168;
		chartData = generateMockForecastData(hours, selectedTimeView);
	}
</script>

<div class="space-y-6">
	<!-- Page Header -->
	<div>
		<h1 class="text-3xl font-bold text-soft-blue">Forecast Generation</h1>
		<p class="text-soft-blue/60 mt-2">Generate and analyze solar production forecasts</p>
	</div>
	
	<!-- Weather Parameters Section -->
	<div>
		<SolarForecast />
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
	
	<!-- Advanced Forecast Visualization -->
	<div class="space-y-6">
		
		<!-- Forecast Chart Controls -->
		<div class="card-glass">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-xl font-semibold text-soft-blue">
					Production Forecast
				</h2>
				
				<div class="flex items-center gap-3">
					<!-- Display Options -->
					<div class="flex items-center gap-4">
						<label class="flex items-center gap-2 text-sm text-soft-blue cursor-pointer">
							<input
								type="checkbox"
								bind:checked={showConfidenceBands}
								class="w-4 h-4 rounded border-glass-border bg-glass-white text-cyan focus:ring-cyan focus:ring-2"
							/>
							Confidence Bands
						</label>
						<label class="flex items-center gap-2 text-sm text-soft-blue cursor-pointer">
							<input
								type="checkbox"
								bind:checked={showWeatherOverlay}
								class="w-4 h-4 rounded border-glass-border bg-glass-white text-cyan focus:ring-cyan focus:ring-2"
							/>
							Weather Overlay
						</label>
					</div>
					
					<!-- Export Buttons -->
					<div class="flex gap-2">
						<button
							on:click={() => exportForecast('csv')}
							class="btn btn-secondary text-sm"
							disabled={!forecastData}
						>
							<DownloadIcon className="w-4 h-4" />
							CSV
						</button>
						<button
							on:click={() => exportForecast('excel')}
							class="btn btn-secondary text-sm"
							disabled={!forecastData}
						>
							<DownloadIcon className="w-4 h-4" />
							Excel
						</button>
						<button
							on:click={() => exportForecast('pdf')}
							class="btn btn-secondary text-sm"
							disabled={!forecastData}
						>
							<DownloadIcon className="w-4 h-4" />
							PDF
						</button>
					</div>
				</div>
			</div>
			
			<!-- Time View Selector -->
			<div class="mb-6">
				<label class="label mb-3">Time Resolution</label>
				<div class="flex gap-2">
					{#each [
						{ value: '15min', label: '15 Minutes' },
						{ value: 'hourly', label: 'Hourly' },
						{ value: 'daily', label: 'Daily' },
						{ value: 'weekly', label: 'Weekly' }
					] as option}
						<button
							class="px-4 py-2 rounded-lg border transition-all duration-200 {
								selectedTimeView === option.value
									? 'bg-cyan text-dark-petrol border-cyan'
									: 'bg-transparent text-soft-blue border-soft-blue/30 hover:border-cyan hover:text-cyan'
							}"
							on:click={() => selectedTimeView = option.value}
						>
							{option.label}
						</button>
					{/each}
				</div>
			</div>
			
			<!-- Main Forecast Chart -->
			{#if isLoadingChart}
				<div class="flex items-center justify-center h-96">
					<div class="text-center">
						<div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan"></div>
						<p class="mt-4 text-soft-blue">Loading forecast data...</p>
					</div>
				</div>
			{:else if chartData.length > 0}
				<ForecastChart 
					data={chartData}
					interval={selectedTimeView}
					showConfidenceBands={showConfidenceBands}
					showActual={false}
					height={450}
				/>
			{:else}
				<div class="flex items-center justify-center h-96">
					<div class="text-center text-soft-blue/60">
						<svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
						</svg>
						<p class="text-lg font-medium">No Forecast Generated</p>
						<p class="text-sm mt-2">Configure settings above and click "Generate Forecast"</p>
					</div>
				</div>
			{/if}
		</div>
		
		<!-- Forecast Insights Grid -->
		{#if forecastData && chartData.length > 0}
			<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
				
				<!-- Peak Production -->
				<div class="card-glass">
					<h3 class="text-sm font-medium text-soft-blue/60 mb-3 flex items-center gap-2">
						<svg class="w-4 h-4 text-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
						</svg>
						Peak Production
					</h3>
					<div class="space-y-2">
						{#if chartData.length > 0}
							{@const peakData = chartData.reduce((max, current) => current.forecast > max.forecast ? current : max, chartData[0])}
							{@const peakTime = new Date(peakData.timestamp)}
							<div class="flex items-center justify-between">
								<span class="text-sm text-soft-blue">Time</span>
								<span class="text-cyan font-mono">{peakTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-sm text-soft-blue">Output</span>
								<span class="text-cyan font-mono">{peakData.forecast} MW</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-sm text-soft-blue">Confidence</span>
								<span class="text-cyan font-mono">±{(peakData.confidence_upper - peakData.forecast).toFixed(1)} MW</span>
							</div>
						{/if}
					</div>
				</div>
				
				<!-- Forecast Summary -->
				<div class="card-glass">
					<h3 class="text-sm font-medium text-soft-blue/60 mb-3 flex items-center gap-2">
						<svg class="w-4 h-4 text-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
						</svg>
						Summary
					</h3>
					<div class="space-y-2">
						{#if chartData.length > 0}
							{@const avgForecast = (chartData.reduce((sum, d) => sum + d.forecast, 0) / chartData.length)}
							{@const totalEnergy = chartData.reduce((sum, d) => sum + d.forecast, 0)}
							<div class="flex items-center justify-between">
								<span class="text-sm text-soft-blue">Avg Output</span>
								<span class="text-cyan font-mono">{avgForecast.toFixed(1)} MW</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-sm text-soft-blue">Total Energy</span>
								<span class="text-cyan font-mono">{totalEnergy.toFixed(1)} MWh</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-sm text-soft-blue">Data Points</span>
								<span class="text-cyan font-mono">{chartData.length}</span>
							</div>
						{/if}
					</div>
				</div>
				
				<!-- Model Performance -->
				<div class="card-glass">
					<h3 class="text-sm font-medium text-soft-blue/60 mb-3 flex items-center gap-2">
						<svg class="w-4 h-4 text-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						Model Info
					</h3>
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<span class="text-sm text-soft-blue">Type</span>
							<span class="text-cyan font-mono">{modelType} v2.1</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-sm text-soft-blue">Accuracy</span>
							<span class="text-cyan font-mono">{forecastData.accuracy}%</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-sm text-soft-blue">Confidence</span>
							<span class="text-cyan font-mono">{forecastData.confidence}%</span>
						</div>
					</div>
				</div>
				
				<!-- Weather Impact -->
				<div class="card-glass">
					<h3 class="text-sm font-medium text-soft-blue/60 mb-3 flex items-center gap-2">
						<svg class="w-4 h-4 text-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
						</svg>
						Weather Impact
					</h3>
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
								<span class="text-sm text-soft-blue">Irradiance</span>
								<span class="text-xs text-cyan font-mono">850 W/m²</span>
							</div>
							<div class="h-2 bg-dark-petrol/50 rounded-full overflow-hidden">
								<div class="h-full bg-gradient-to-r from-cyan to-soft-blue" style="width: 85%"></div>
							</div>
						</div>
					</div>
				</div>
				
			</div>
		{/if}
		
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