<script lang="ts">
	import { onMount } from 'svelte';

	// Available weather parameters with their display names and units
	const weatherParameters = {
		shortwave_radiation: { name: 'Solar Radiation', unit: 'W/m²', color: '#f59e0b', key: 'shortwave_radiation' },
		temperature_2m: { name: 'Temperature', unit: '°C', color: '#ef4444', key: 'temperature_2m' },
		cloud_cover: { name: 'Cloud Coverage', unit: '%', color: '#6b7280', key: 'cloud_cover' },
		direct_radiation: { name: 'Direct Radiation', unit: 'W/m²', color: '#f97316', key: 'direct_radiation' },
		diffuse_radiation: { name: 'Diffuse Radiation', unit: 'W/m²', color: '#06b6d4', key: 'diffuse_radiation' },
		wind_speed_10m: { name: 'Wind Speed', unit: 'm/s', color: '#10b981', key: 'wind_speed_10m' },
		relative_humidity_2m: { name: 'Humidity', unit: '%', color: '#3b82f6', key: 'relative_humidity_2m' },
		surface_pressure: { name: 'Pressure', unit: 'hPa', color: '#8b5cf6', key: 'surface_pressure' }
	};

	// Available locations
	const locations = [
		{ id: 'average', name: 'Average (All Locations)', coordinates: 'Multiple' },
		{ id: 'veranda_mall', name: 'Veranda Mall Bucharest', coordinates: '44.4522, 26.1306' },
		{ id: 'site_a', name: 'Solar Farm Site A', coordinates: '45.1234, 25.5678' },
		{ id: 'site_b', name: 'Solar Farm Site B', coordinates: '44.9876, 26.9012' }
	];

	// Selected parameters and location
	let selectedLocation = 'average';
	let selectedParameters = ['shortwave_radiation', 'temperature_2m', 'cloud_cover'];
	let activeTimeRange = 'Today';

	// Mock forecast data - in real app this would come from API
	let forecastData: any = null;
	let chartContainer: HTMLDivElement;

	// Generate mock hourly data for 24 hours
	function generateMockData() {
		const hours = Array.from({length: 24}, (_, i) => i);
		const data: any = {};
		
		hours.forEach(hour => {
			data[hour] = {
				shortwave_radiation: Math.max(0, Math.sin((hour - 6) * Math.PI / 12) * 800 + Math.random() * 100),
				temperature_2m: 15 + Math.sin((hour - 6) * Math.PI / 12) * 10 + Math.random() * 3,
				cloud_cover: Math.random() * 80,
				direct_radiation: Math.max(0, Math.sin((hour - 6) * Math.PI / 12) * 600 + Math.random() * 80),
				diffuse_radiation: Math.max(0, Math.sin((hour - 6) * Math.PI / 12) * 200 + Math.random() * 50),
				wind_speed_10m: 5 + Math.random() * 15,
				relative_humidity_2m: 50 + Math.random() * 30,
				surface_pressure: 1013 + Math.random() * 20
			};
		});
		
		return data;
	}

	function updateChart() {
		if (!chartContainer || typeof window === 'undefined') return;

		// Import ECharts dynamically
		import('echarts').then((echarts) => {
			const chart = echarts.init(chartContainer, 'dark');
			
			const hours = Array.from({length: 24}, (_, i) => `${i.toString().padStart(2, '0')}:00`);
			const data = generateMockData();
			
			const series = selectedParameters.map(paramKey => {
				const param = weatherParameters[paramKey];
				return {
					name: param.name,
					type: 'line',
					smooth: true,
					data: hours.map((_, hour) => data[hour][paramKey]),
					lineStyle: {
						color: param.color,
						width: 2
					},
					itemStyle: {
						color: param.color
					},
					areaStyle: {
						color: {
							type: 'linear',
							x: 0, y: 0, x2: 0, y2: 1,
							colorStops: [
								{offset: 0, color: param.color + '40'},
								{offset: 1, color: param.color + '10'}
							]
						}
					},
					yAxisIndex: selectedParameters.indexOf(paramKey) % 2 // Alternate between left and right y-axis
				};
			});

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
							const paramInfo = weatherParameters[selectedParameters[param.seriesIndex]];
							content += `<div style="margin: 2px 0;">
								<span style="color: ${param.color};">●</span> 
								${param.seriesName}: <strong>${param.value.toFixed(1)} ${paramInfo.unit}</strong>
							</div>`;
						});
						return content;
					}
				},
				legend: {
					data: selectedParameters.map(key => weatherParameters[key].name),
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
					data: hours,
					axisLine: {
						lineStyle: { color: '#0FA4AF' }
					},
					axisLabel: {
						color: '#AFDDE5',
						fontSize: 11
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
						name: selectedParameters.length > 0 ? weatherParameters[selectedParameters[0]].unit : '',
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
						name: selectedParameters.length > 1 ? weatherParameters[selectedParameters[1]].unit : '',
						nameTextStyle: { color: '#AFDDE5' },
						axisLine: { lineStyle: { color: '#0FA4AF' } },
						axisLabel: { color: '#AFDDE5', fontSize: 11 },
						splitLine: { show: false }
					}
				],
				series: series
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

	// Handle parameter selection
	function toggleParameter(paramKey: string) {
		if (selectedParameters.includes(paramKey)) {
			if (selectedParameters.length > 1) {
				selectedParameters = selectedParameters.filter(p => p !== paramKey);
			}
		} else {
			if (selectedParameters.length < 4) {
				selectedParameters = [...selectedParameters, paramKey];
			}
		}
		updateChart();
	}

	// Handle location change
	function handleLocationChange(locationId: string) {
		selectedLocation = locationId;
		updateChart();
	}

	onMount(() => {
		updateChart();
	});

	$: if (chartContainer) {
		updateChart();
	}
</script>

<div class="card-glass">
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
		<div>
			<h3 class="text-lg font-semibold text-soft-blue">Solar Forecast - Weather Parameters</h3>
			<p class="text-sm text-soft-blue/60 mt-1">Real-time meteorological data driving solar production forecasts</p>
		</div>
		
		<!-- Time Range Buttons -->
		<div class="flex bg-glass-white rounded-lg p-1">
			{#each ['Today', 'Tomorrow', '7 Days'] as range}
				<button 
					class="px-3 py-1 text-sm rounded transition-all duration-200 {activeTimeRange === range 
						? 'bg-cyan text-dark-petrol font-medium' 
						: 'text-soft-blue hover:text-cyan'}"
					on:click={() => activeTimeRange = range}
				>
					{range}
				</button>
			{/each}
		</div>
	</div>

	<!-- Location Selector -->
	<div class="mb-4">
		<label class="block text-sm font-medium text-soft-blue mb-2">Location</label>
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
			{#each locations as location}
				<button
					class="p-2 rounded-lg border transition-all duration-200 text-left {selectedLocation === location.id
						? 'border-cyan bg-cyan/10 text-cyan'
						: 'border-soft-blue/20 bg-glass-white text-soft-blue hover:border-cyan/50 hover:text-cyan'}"
					on:click={() => handleLocationChange(location.id)}
				>
					<div class="font-medium text-sm">{location.name}</div>
					<div class="text-xs opacity-75">{location.coordinates}</div>
				</button>
			{/each}
		</div>
	</div>

	<!-- Parameter Selector -->
	<div class="mb-6">
		<label class="block text-sm font-medium text-soft-blue mb-2">
			Weather Parameters ({selectedParameters.length}/4 selected)
		</label>
		<div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
			{#each Object.entries(weatherParameters) as [key, param]}
				<button
					class="p-2 rounded-lg border transition-all duration-200 text-left {selectedParameters.includes(key)
						? 'border-cyan bg-cyan/10'
						: 'border-soft-blue/20 bg-glass-white hover:border-cyan/50'}"
					on:click={() => toggleParameter(key)}
					disabled={!selectedParameters.includes(key) && selectedParameters.length >= 4}
				>
					<div class="flex items-center space-x-2">
						<div 
							class="w-3 h-3 rounded-full" 
							style="background-color: {param.color}"
						></div>
						<div>
							<div class="font-medium text-sm {selectedParameters.includes(key) ? 'text-cyan' : 'text-soft-blue'}">{param.name}</div>
							<div class="text-xs {selectedParameters.includes(key) ? 'text-cyan/70' : 'text-soft-blue/60'}">{param.unit}</div>
						</div>
					</div>
				</button>
			{/each}
		</div>
	</div>

	<!-- Chart Container -->
	<div class="h-80 w-full">
		<div bind:this={chartContainer} class="h-full w-full"></div>
	</div>
	
	<!-- Current Values Summary -->
	<div class="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
		{#each selectedParameters as paramKey}
			{@const param = weatherParameters[paramKey]}
			<div class="bg-glass-white rounded-lg p-3">
				<div class="flex items-center space-x-2 mb-1">
					<div 
						class="w-2 h-2 rounded-full" 
						style="background-color: {param.color}"
					></div>
					<span class="text-xs text-soft-blue/70">{param.name}</span>
				</div>
				<div class="text-lg font-mono text-soft-blue">
					{(Math.random() * 100).toFixed(1)}<span class="text-sm ml-1">{param.unit}</span>
				</div>
			</div>
		{/each}
	</div>
</div>