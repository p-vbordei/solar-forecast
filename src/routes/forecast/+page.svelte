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
	
	// Weather parameters location selection
	let selectedWeatherLocation = 1;
	
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
	
	function exportForecast(format: 'csv' | 'excel') {
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
	
	<!-- Weather Location Selector -->
	<div class="card-glass">
		<h2 class="text-lg font-semibold text-soft-blue mb-4">Weather Parameters Location</h2>
		<div class="flex items-center gap-4">
			<div class="flex-1">
				<label class="label">Select Location for Weather Data</label>
				<select class="select" bind:value={selectedWeatherLocation}>
					{#each locations as location}
						<option value={location.id}>{location.name}</option>
					{/each}
				</select>
			</div>
			<div class="text-sm text-soft-blue/60 max-w-xs">
				<p>Choose which location's weather data to display in the forecast parameters below.</p>
			</div>
		</div>
	</div>
	
	<!-- Weather Parameters Section -->
	<div>
		<SolarForecast locationId={selectedWeatherLocation} />
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
					<p class="text-sm text-soft-blue/80">Comprehensive guide to solar production prediction systems and methodologies</p>
				</div>
			</div>
			<div class="transform transition-transform duration-200 {showExplanation ? 'rotate-180' : 'rotate-0'}">
				<svg class="w-5 h-5 text-soft-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
				</svg>
			</div>
		</button>
		
		{#if showExplanation}
			<div class="mt-6 pt-6 border-t border-soft-blue/20 space-y-6 animate-slide-down">
				
				<!-- Introduction Section -->
				<div class="bg-gradient-to-br from-teal-dark/40 to-dark-petrol/60 rounded-xl p-6 border border-cyan/20">
					<h4 class="font-semibold text-white mb-3 flex items-center space-x-2">
						<div class="w-6 h-6 bg-cyan/20 rounded-full flex items-center justify-center">
							<svg class="w-4 h-4 text-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
							</svg>
						</div>
						<span>Professional Solar Forecasting Platform</span>
					</h4>
					<p class="text-sm text-soft-blue/80 leading-relaxed mb-4">
						The Solar Forecasting module represents an advanced predictive analytics platform engineered for professional solar energy operations.
						Our system integrates meteorological data, machine learning models, and real-time production patterns to generate accurate 
						forecasts essential for energy trading, grid integration, and operational planning across multi-site solar portfolios.
					</p>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div class="bg-cyan/10 rounded-lg p-3 border border-cyan/30">
							<p class="text-xs text-soft-blue/70">
								<strong class="text-cyan">Predictive Intelligence:</strong> Advanced machine learning algorithms process meteorological forecasts, 
								historical production data, and real-time system performance to generate accurate 1-7 day production predictions.
							</p>
						</div>
						<div class="bg-cyan/10 rounded-lg p-3 border border-cyan/30">
							<p class="text-xs text-soft-blue/70">
								<strong class="text-cyan">Multi-Resolution Analysis:</strong> Forecast generation from 15-minute high-frequency trading intervals 
								to weekly strategic planning horizons with ensemble model confidence bands and uncertainty quantification.
							</p>
						</div>
					</div>
				</div>

				<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<!-- Forecasting Models & Methods -->
					<div class="lg:col-span-2">
						<h4 class="font-semibold text-white mb-4 flex items-center space-x-2">
							<div class="w-6 h-6 bg-cyan/20 rounded-full flex items-center justify-center">
								<svg class="w-4 h-4 text-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
								</svg>
							</div>
							<span>Forecasting Models & Methodologies</span>
						</h4>
						
						<div class="space-y-4">
							<!-- Machine Learning Models -->
							<div class="bg-teal-dark/30 rounded-lg p-4 border border-cyan/20">
								<h5 class="font-medium text-cyan mb-2 flex items-center space-x-2">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
									</svg>
									<span>Advanced Machine Learning Models</span>
								</h5>
								<ul class="text-xs text-soft-blue/80 space-y-1">
									<li>• <strong>LSTM Neural Networks:</strong> Long Short-Term Memory models for temporal sequence prediction with weather pattern recognition</li>
									<li>• <strong>Ensemble Methods:</strong> Random Forest and Gradient Boosting algorithms combining multiple predictors for enhanced accuracy</li>
									<li>• <strong>Deep Learning:</strong> Convolutional Neural Networks for satellite imagery analysis and cloud movement prediction</li>
									<li>• <strong>Hybrid Models:</strong> Combination of physical and statistical models optimized for specific site characteristics</li>
								</ul>
							</div>

							<!-- Physical Models -->
							<div class="bg-teal-dark/30 rounded-lg p-4 border border-cyan/20">
								<h5 class="font-medium text-cyan mb-2 flex items-center space-x-2">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
									</svg>
									<span>Physical & Meteorological Models</span>
								</h5>
								<ul class="text-xs text-soft-blue/80 space-y-1">
									<li>• <strong>Irradiance Modeling:</strong> GHI, DNI, and DHI calculations from numerical weather prediction (NWP) models</li>
									<li>• <strong>Clear Sky Analysis:</strong> Theoretical maximum production calculations with atmospheric corrections</li>
									<li>• <strong>Cloud Motion Tracking:</strong> Satellite-based cloud movement analysis for sub-hourly forecasting</li>
									<li>• <strong>Atmospheric Physics:</strong> Aerosol optical depth, precipitable water, and air mass coefficient modeling</li>
								</ul>
							</div>

							<!-- Data Integration -->
							<div class="bg-teal-dark/30 rounded-lg p-4 border border-cyan/20">
								<h5 class="font-medium text-cyan mb-2 flex items-center space-x-2">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
									</svg>
									<span>Multi-Source Data Integration</span>
								</h5>
								<ul class="text-xs text-soft-blue/80 space-y-1">
									<li>• <strong>Weather Data Sources:</strong> ECMWF, GFS, NAM, and high-resolution mesoscale models integration</li>
									<li>• <strong>Satellite Imagery:</strong> GOES, Meteosat, and Himawari geostationary satellite data processing</li>
									<li>• <strong>Ground Measurements:</strong> Local weather station, pyranometer, and production data assimilation</li>
									<li>• <strong>Historical Archives:</strong> Multi-year datasets for seasonal pattern recognition and model training</li>
								</ul>
							</div>
						</div>
					</div>

					<!-- Forecasting Applications -->
					<div>
						<h4 class="font-semibold text-white mb-4 flex items-center space-x-2">
							<div class="w-6 h-6 bg-cyan/20 rounded-full flex items-center justify-center">
								<svg class="w-4 h-4 text-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
								</svg>
							</div>
							<span>Business Applications</span>
						</h4>
						
						<div class="space-y-3">
							<div class="bg-dark-petrol/60 rounded-lg p-3 border border-soft-blue/20">
								<h6 class="font-medium text-soft-blue mb-2">Energy Trading & Markets</h6>
								<ul class="text-xs text-soft-blue/70 space-y-1">
									<li>• <strong>Day-Ahead Bidding:</strong> Accurate 24-hour forecasts for electricity market participation</li>
									<li>• <strong>Intraday Optimization:</strong> Real-time forecast updates for trading position adjustments</li>
									<li>• <strong>Ancillary Services:</strong> Frequency regulation and voltage support capacity planning</li>
									<li>• <strong>Financial Hedging:</strong> Weather derivative strategies based on production forecasts</li>
								</ul>
							</div>
							
							<div class="bg-dark-petrol/60 rounded-lg p-3 border border-soft-blue/20">
								<h6 class="font-medium text-soft-blue mb-2">Grid Integration & Operations</h6>
								<ul class="text-xs text-soft-blue/70 space-y-1">
									<li>• <strong>Load Balancing:</strong> Grid stability support through accurate generation predictions</li>
									<li>• <strong>Transmission Planning:</strong> Network congestion management and power flow optimization</li>
									<li>• <strong>Storage Optimization:</strong> Battery storage dispatch scheduling for peak shaving and arbitrage</li>
									<li>• <strong>Curtailment Minimization:</strong> Proactive grid management to reduce renewable energy waste</li>
								</ul>
							</div>
							
							<div class="bg-dark-petrol/60 rounded-lg p-3 border border-soft-blue/20">
								<h6 class="font-medium text-soft-blue mb-2">Operations & Maintenance</h6>
								<ul class="text-xs text-soft-blue/70 space-y-1">
									<li>• <strong>Maintenance Scheduling:</strong> Optimal timing for equipment servicing during low production periods</li>
									<li>• <strong>Cleaning Optimization:</strong> Panel cleaning schedules based on soiling and weather forecasts</li>
									<li>• <strong>Asset Performance:</strong> Expected vs. actual production analysis for fault detection</li>
									<li>• <strong>Resource Allocation:</strong> Field crew deployment based on forecasted conditions and maintenance needs</li>
								</ul>
							</div>
							
							<div class="bg-dark-petrol/60 rounded-lg p-3 border border-soft-blue/20">
								<h6 class="font-medium text-soft-blue mb-2">Financial Planning</h6>
								<ul class="text-xs text-soft-blue/70 space-y-1">
									<li>• <strong>Revenue Forecasting:</strong> Monthly and quarterly energy production projections for financial planning</li>
									<li>• <strong>Performance Guarantees:</strong> Contract compliance monitoring and penalty risk assessment</li>
									<li>• <strong>Insurance Claims:</strong> Weather-related production loss quantification and documentation</li>
									<li>• <strong>Investment Analysis:</strong> Site assessment and yield prediction for new installations</li>
								</ul>
							</div>
						</div>
					</div>
				</div>

				<!-- Advanced Features -->
				<div class="bg-gradient-to-r from-cyan/10 via-teal-dark/20 to-cyan/10 rounded-xl p-6 border border-cyan/30">
					<h4 class="font-semibold text-white mb-4">
						<span>Advanced Forecasting Capabilities</span>
					</h4>
					
					<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div>
							<h5 class="font-medium text-cyan mb-3">Uncertainty Quantification</h5>
							<ul class="text-sm text-soft-blue/80 space-y-2">
								<li class="flex items-start space-x-2">
									<div class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></div>
									<span><strong>Confidence Intervals:</strong> Statistical uncertainty ranges with probabilistic forecasts</span>
								</li>
								<li class="flex items-start space-x-2">
									<div class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></div>
									<span><strong>Scenario Analysis:</strong> Multiple weather scenarios with probability distributions</span>
								</li>
								<li class="flex items-start space-x-2">
									<div class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></div>
									<span><strong>Risk Assessment:</strong> Production shortfall probability calculations</span>
								</li>
							</ul>
						</div>
						
						<div>
							<h5 class="font-medium text-cyan mb-3">Real-Time Optimization</h5>
							<ul class="text-sm text-soft-blue/80 space-y-2">
								<li class="flex items-start space-x-2">
									<div class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></div>
									<span><strong>Model Updates:</strong> Continuous learning and recalibration based on new data</span>
								</li>
								<li class="flex items-start space-x-2">
									<div class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></div>
									<span><strong>Adaptive Algorithms:</strong> Site-specific model optimization and parameter tuning</span>
								</li>
								<li class="flex items-start space-x-2">
									<div class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></div>
									<span><strong>Quality Control:</strong> Automated outlier detection and forecast validation</span>
								</li>
							</ul>
						</div>
						
						<div>
							<h5 class="font-medium text-cyan mb-3">Integration & Export</h5>
							<ul class="text-sm text-soft-blue/80 space-y-2">
								<li class="flex items-start space-x-2">
									<div class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></div>
									<span><strong>API Integration:</strong> RESTful APIs for external system connectivity and data exchange</span>
								</li>
								<li class="flex items-start space-x-2">
									<div class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></div>
									<span><strong>Data Export:</strong> Multiple formats (CSV, Excel, JSON) with customizable templates</span>
								</li>
								<li class="flex items-start space-x-2">
									<div class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></div>
									<span><strong>Visualization:</strong> Interactive charts with confidence bands and multiple time resolutions</span>
								</li>
							</ul>
						</div>
					</div>
				</div>

				<!-- Performance Metrics -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div class="bg-teal-dark/30 rounded-lg p-4 border border-cyan/20">
						<h5 class="font-medium text-cyan mb-3 flex items-center space-x-2">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
							</svg>
							<span>Forecast Accuracy Metrics</span>
						</h5>
						<ul class="text-xs text-soft-blue/80 space-y-1">
							<li>• <strong>MAPE (Mean Absolute Percentage Error):</strong> Industry-standard accuracy measurement</li>
							<li>• <strong>RMSE (Root Mean Square Error):</strong> Prediction variance quantification</li>
							<li>• <strong>MAE (Mean Absolute Error):</strong> Average prediction deviation measurement</li>
							<li>• <strong>Skill Score:</strong> Performance comparison against persistence and climatological forecasts</li>
						</ul>
					</div>
					
					<div class="bg-teal-dark/30 rounded-lg p-4 border border-cyan/20">
						<h5 class="font-medium text-cyan mb-3 flex items-center space-x-2">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<span>Time Resolution Capabilities</span>
						</h5>
						<ul class="text-xs text-soft-blue/80 space-y-1">
							<li>• <strong>15-Minute Resolution:</strong> High-frequency forecasting for intraday trading and grid services</li>
							<li>• <strong>Hourly Forecasts:</strong> Standard resolution for day-ahead market participation</li>
							<li>• <strong>Daily Aggregation:</strong> Energy production totals for financial planning</li>
							<li>• <strong>Weekly/Monthly:</strong> Long-term strategic planning and seasonal analysis</li>
						</ul>
					</div>
				</div>

				<!-- Platform Features -->
				<div class="bg-gradient-to-br from-dark-petrol/60 to-teal-dark/40 rounded-xl p-6 border border-cyan/20">
					<h4 class="font-medium text-white mb-4 flex items-center space-x-2">
						<ChartBarIcon className="w-5 h-5 text-cyan" />
						<span>Platform Features & User Experience</span>
					</h4>
					
					<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
						<div class="bg-dark-petrol/50 rounded-lg p-3 border border-cyan/30">
							<div class="text-cyan font-medium mb-1">Interactive Charts</div>
							<div class="text-soft-blue/80 text-xs">Advanced ECharts visualization with zoom, pan, and export capabilities</div>
						</div>
						
						<div class="bg-dark-petrol/50 rounded-lg p-3 border border-cyan/30">
							<div class="text-cyan font-medium mb-1">Model Comparison</div>
							<div class="text-soft-blue/80 text-xs">Side-by-side performance analysis of different forecasting models</div>
						</div>
						
						<div class="bg-dark-petrol/50 rounded-lg p-3 border border-cyan/30">
							<div class="text-cyan font-medium mb-1">Custom Horizons</div>
							<div class="text-soft-blue/80 text-xs">Flexible forecast periods from hours to weeks with configurable parameters</div>
						</div>
						
						<div class="bg-dark-petrol/50 rounded-lg p-3 border border-cyan/30">
							<div class="text-cyan font-medium mb-1">Weather Integration</div>
							<div class="text-soft-blue/80 text-xs">Real-time meteorological data overlay and correlation analysis</div>
						</div>
						
						<div class="bg-dark-petrol/50 rounded-lg p-3 border border-cyan/30">
							<div class="text-cyan font-medium mb-1">Batch Processing</div>
							<div class="text-soft-blue/80 text-xs">Multi-location forecast generation with automated scheduling</div>
						</div>
						
						<div class="bg-dark-petrol/50 rounded-lg p-3 border border-cyan/30">
							<div class="text-cyan font-medium mb-1">API Access</div>
							<div class="text-soft-blue/80 text-xs">RESTful API endpoints for external integration and automated workflows</div>
						</div>
					</div>
				</div>
				
			</div>
		{/if}
	</div>
</div>