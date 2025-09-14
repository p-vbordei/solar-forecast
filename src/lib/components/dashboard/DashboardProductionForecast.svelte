<script lang="ts">
	import { onMount } from 'svelte';

	export let locationId: string | number = 1;
	export let isMockData: boolean = true; // Default to true since this component generates mock data

	// Convert locationId to number for compatibility with existing code
	$: numericLocationId = typeof locationId === 'string' ? 1 : locationId;

	// Location names for display
	const locations = {
		1: 'Solar Farm Alpha - Bucharest',
		2: 'Solar Station Beta - Cluj', 
		3: 'Green Energy Park - Timisoara',
		4: 'Coastal Solar Array - Constanta'
	};

	// Location-specific production characteristics
	const locationProductionProfiles = {
		1: { // Solar Farm Alpha - Bucharest
			capacity: 50, // MW
			efficiency: 0.85,
			peakHours: [10, 11, 12, 13, 14, 15],
			avgProduction: 1.2,
			seasonalFactor: 1.0
		},
		2: { // Solar Station Beta - Cluj
			capacity: 35, // MW
			efficiency: 0.82,
			peakHours: [10, 11, 12, 13, 14],
			avgProduction: 1.0,
			seasonalFactor: 0.95
		},
		3: { // Green Energy Park - Timisoara
			capacity: 75, // MW
			efficiency: 0.88,
			peakHours: [9, 10, 11, 12, 13, 14, 15],
			avgProduction: 1.3,
			seasonalFactor: 1.05
		},
		4: { // Coastal Solar Array - Constanta
			capacity: 60, // MW
			efficiency: 0.90,
			peakHours: [9, 10, 11, 12, 13, 14, 15, 16],
			avgProduction: 1.4,
			seasonalFactor: 1.1
		}
	};

	let activeTimeRange = 'Today';
	let chartContainer: HTMLDivElement;

	// Generate production forecast data based on time range and location
	function generateProductionData(timeRange: string = 'Today') {
		let timePoints: any[] = [];
		let labels: string[] = [];
		
		if (timeRange === 'Today' || timeRange === 'Tomorrow') {
			// Hourly data for 24 hours
			timePoints = Array.from({length: 24}, (_, i) => i);
			labels = timePoints.map(hour => `${hour.toString().padStart(2, '0')}:00`);
		} else if (timeRange === '7 Days') {
			// Daily data for 7 days
			timePoints = Array.from({length: 7}, (_, i) => i);
			const today = new Date();
			labels = timePoints.map(day => {
				const date = new Date(today);
				date.setDate(today.getDate() + day);
				return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
			});
		}
		
		const data: any = {};
		const locationProfile = locationProductionProfiles[numericLocationId] || locationProductionProfiles[1];
		
		timePoints.forEach((point, index) => {
			let productionFactor = 0;
			let forecastVariation = 1;
			
			if (timeRange === 'Today') {
				// Today: normal production pattern
				if (locationProfile.peakHours.includes(point)) {
					productionFactor = (0.7 + Math.sin((point - 6) * Math.PI / 12) * 0.3) * locationProfile.efficiency;
				} else {
					productionFactor = Math.max(0, Math.sin((point - 6) * Math.PI / 12) * 0.4) * locationProfile.efficiency;
				}
				forecastVariation = 1 + Math.sin(point * 0.2) * 0.05;
			} else if (timeRange === 'Tomorrow') {
				// Tomorrow: slightly lower production (weather forecast uncertainty)
				if (locationProfile.peakHours.includes(point)) {
					productionFactor = (0.6 + Math.sin((point - 6) * Math.PI / 12) * 0.25) * locationProfile.efficiency;
				} else {
					productionFactor = Math.max(0, Math.sin((point - 6) * Math.PI / 12) * 0.35) * locationProfile.efficiency;
				}
				forecastVariation = 1 + Math.sin(point * 0.3) * 0.08;
			} else if (timeRange === '7 Days') {
				// Weekly: varying production patterns
				productionFactor = (0.4 + 0.3 * Math.sin(point * Math.PI / 3)) * locationProfile.efficiency * locationProfile.seasonalFactor;
				forecastVariation = 1 + Math.sin(point * 0.5) * 0.1;
			}
			
			const baseProduction = productionFactor * locationProfile.capacity * locationProfile.avgProduction;
			
			data[index] = {
				// Production forecast in MW
				actual: Math.max(0, baseProduction * forecastVariation + Math.random() * 2),
				forecast: Math.max(0, baseProduction * (0.98 + Math.random() * 0.04)),
				capacity_factor: (baseProduction / locationProfile.capacity) * 100,
				efficiency: locationProfile.efficiency * 100 * (0.95 + Math.random() * 0.1)
			};
		});
		
		return { data, labels, timePoints };
	}

	function updateChart() {
		if (!chartContainer || typeof window === 'undefined') return;

		// Import ECharts dynamically
		import('echarts').then((echarts) => {
			const chart = echarts.init(chartContainer, 'dark');
			
			const mockData = generateProductionData(activeTimeRange);
			const { data, labels, timePoints } = mockData;
			
			const forecastData = timePoints.map(point => data[timePoints.indexOf(point)].forecast);
			const actualData = timePoints.map(point => data[timePoints.indexOf(point)].actual);
			const capacityFactorData = timePoints.map(point => data[timePoints.indexOf(point)].capacity_factor);
			
			const option = {
				backgroundColor: 'transparent',
				tooltip: {
					trigger: 'axis',
					backgroundColor: 'rgba(0, 49, 53, 0.95)',
					borderColor: '#0FA4AF',
					borderWidth: 1,
					textStyle: {
						color: '#AFDDE5'
					},
					formatter: function(params: any) {
						let content = `<div style="font-weight: 600; margin-bottom: 6px;">${params[0].axisValue}</div>`;
						params.forEach((param: any) => {
							if (param.seriesName === 'Production Forecast') {
								content += `<div style="margin: 2px 0;">
									<span style="color: ${param.color};">●</span> 
									${param.seriesName}: <strong>${param.value.toFixed(1)} MW</strong>
								</div>`;
							} else if (param.seriesName === 'Capacity Factor') {
								content += `<div style="margin: 2px 0;">
									<span style="color: ${param.color};">●</span> 
									${param.seriesName}: <strong>${param.value.toFixed(1)}%</strong>
								</div>`;
							}
						});
						return content;
					}
				},
				legend: {
					data: ['Production Forecast', 'Capacity Factor'],
					textStyle: {
						color: '#AFDDE5'
					},
					top: 20
				},
				grid: {
					left: '8%',
					right: '8%',
					bottom: '15%',
					top: '15%'
				},
				xAxis: {
					type: 'category',
					data: labels,
					axisLine: {
						lineStyle: { color: '#0FA4AF' }
					},
					axisLabel: {
						color: '#AFDDE5',
						fontSize: 11,
						rotate: activeTimeRange === '7 Days' ? 45 : 0
					},
					splitLine: {
						show: true,
						lineStyle: {
							color: 'rgba(15, 164, 175, 0.1)'
						}
					}
				},
				yAxis: [
					{
						type: 'value',
						name: 'MW',
						nameTextStyle: { color: '#AFDDE5' },
						axisLine: { lineStyle: { color: '#0FA4AF' } },
						axisLabel: { color: '#AFDDE5', fontSize: 11 },
						splitLine: {
							lineStyle: {
								color: 'rgba(15, 164, 175, 0.1)'
							}
						}
					},
					{
						type: 'value',
						name: '%',
						nameTextStyle: { color: '#AFDDE5' },
						axisLine: { lineStyle: { color: '#0FA4AF' } },
						axisLabel: { color: '#AFDDE5', fontSize: 11 },
						splitLine: { show: false }
					}
				],
				series: [
					{
						name: 'Production Forecast',
						type: 'line',
						data: forecastData,
						smooth: true,
						lineStyle: {
							color: '#0FA4AF',
							width: 3
						},
						itemStyle: {
							color: '#0FA4AF'
						},
						areaStyle: {
							color: {
								type: 'linear',
								x: 0, y: 0, x2: 0, y2: 1,
								colorStops: [
									{offset: 0, color: '#0FA4AF40'},
									{offset: 1, color: '#0FA4AF10'}
								]
							}
						},
						yAxisIndex: 0
					},
					{
						name: 'Capacity Factor',
						type: 'line',
						data: capacityFactorData,
						smooth: true,
						lineStyle: {
							color: '#AFDDE5',
							width: 2,
							type: 'dashed'
						},
						itemStyle: {
							color: '#AFDDE5'
						},
						yAxisIndex: 1
					}
				]
			};

			chart.setOption(option);
			
			// Handle window resize
			const handleResize = () => chart.resize();
			window.addEventListener('resize', handleResize);
			
			return () => {
				window.removeEventListener('resize', handleResize);
				chart.dispose();
			};
		});
	}

	// Handle time range change
	function handleTimeRangeChange(range: string) {
		activeTimeRange = range;
		updateChart();
	}

	onMount(() => {
		updateChart();
	});

	$: if (chartContainer) {
		updateChart();
	}
	
	// Update chart when location changes
	$: if (numericLocationId) {
		updateChart();
	}
</script>

<div class="card-glass">
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
		<div>
			<div class="flex items-center gap-3">
				<h3 class="text-lg font-semibold text-soft-blue">Production Forecast</h3>
				{#if isMockData}
					<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-alert-orange/20 text-alert-orange border border-alert-orange/30">
						Mock Data
					</span>
				{/if}
			</div>
			<p class="text-sm text-soft-blue/60 mt-1">Energy production forecasts for <span class="text-cyan font-medium">{locations[numericLocationId] || 'Selected Location'}</span></p>
		</div>
		
		<!-- Time Range Buttons -->
		<div class="flex bg-glass-white rounded-lg p-1">
			{#each ['Today', 'Tomorrow', '7 Days'] as range}
				<button 
					class="px-3 py-1 text-sm rounded transition-all duration-200 {activeTimeRange === range 
						? 'bg-cyan text-dark-petrol font-medium' 
						: 'text-soft-blue hover:text-cyan'}"
					on:click={() => handleTimeRangeChange(range)}
				>
					{range}
				</button>
			{/each}
		</div>
	</div>

	<!-- Chart Container -->
	<div class="h-80 w-full">
		<div bind:this={chartContainer} class="h-full w-full"></div>
	</div>
	
	<!-- Production Summary -->
	{#snippet productionSummary()}
		{@const mockData = generateProductionData(activeTimeRange)}
		{@const currentData = activeTimeRange === '7 Days' ? 
			mockData.data[0] : 
			mockData.data[new Date().getHours()] ? mockData.data[new Date().getHours()] : mockData.data[0]}
		{@const locationProfile = locationProductionProfiles[numericLocationId] || locationProductionProfiles[1]}
		
		<div class="bg-glass-white rounded-lg p-3">
			<div class="text-xs text-soft-blue/70 mb-1">Forecast</div>
			<div class="text-lg font-mono text-soft-blue">
				{currentData.forecast.toFixed(1)}<span class="text-sm ml-1">MW</span>
			</div>
		</div>
		
		<div class="bg-glass-white rounded-lg p-3">
			<div class="text-xs text-soft-blue/70 mb-1">Capacity</div>
			<div class="text-lg font-mono text-soft-blue">
				{locationProfile.capacity}<span class="text-sm ml-1">MW</span>
			</div>
		</div>
		
		<div class="bg-glass-white rounded-lg p-3">
			<div class="text-xs text-soft-blue/70 mb-1">Capacity Factor</div>
			<div class="text-lg font-mono text-soft-blue">
				{currentData.capacity_factor.toFixed(1)}<span class="text-sm ml-1">%</span>
			</div>
		</div>
		
		<div class="bg-glass-white rounded-lg p-3">
			<div class="text-xs text-soft-blue/70 mb-1">Efficiency</div>
			<div class="text-lg font-mono text-soft-blue">
				{currentData.efficiency.toFixed(1)}<span class="text-sm ml-1">%</span>
			</div>
		</div>
	{/snippet}
	
	<div class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
		{@render productionSummary()}
	</div>
</div>