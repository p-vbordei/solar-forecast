<script lang="ts">
	import { onMount } from 'svelte';
	
	export let locationId: number = 1;

	// Location names for display
	const locations = {
		1: 'Solar Farm Alpha - Bucharest',
		2: 'Solar Station Beta - Cluj', 
		3: 'Green Energy Park - Timisoara',
		4: 'Coastal Solar Array - Constanta'
	};

	// Available weather parameters organized by categories
	const weatherParameterCategories = {
		solar: {
			name: 'Solar Radiation',
			parameters: {
				shortwave_radiation: { name: 'Global Horizontal Irradiance (GHI)', unit: 'W/m²', color: '#f59e0b', key: 'shortwave_radiation' },
				direct_radiation: { name: 'Direct Normal Irradiance (DNI)', unit: 'W/m²', color: '#f97316', key: 'direct_radiation' },
				diffuse_radiation: { name: 'Diffuse Horizontal Irradiance (DHI)', unit: 'W/m²', color: '#06b6d4', key: 'diffuse_radiation' },
				global_tilted_irradiance: { name: 'Global Tilted Irradiance (GTI)', unit: 'W/m²', color: '#eab308', key: 'global_tilted_irradiance' },
				sunshine_duration: { name: 'Sunshine Duration', unit: 'min', color: '#facc15', key: 'sunshine_duration' },
				uv_index: { name: 'UV Index', unit: 'index', color: '#a855f7', key: 'uv_index' }
			}
		},
		atmospheric: {
			name: 'Atmospheric Conditions',
			parameters: {
				temperature_2m: { name: 'Air Temperature', unit: '°C', color: '#ef4444', key: 'temperature_2m' },
				relative_humidity_2m: { name: 'Relative Humidity', unit: '%', color: '#3b82f6', key: 'relative_humidity_2m' },
				surface_pressure: { name: 'Surface Pressure', unit: 'hPa', color: '#8b5cf6', key: 'surface_pressure' },
				dew_point_2m: { name: 'Dew Point', unit: '°C', color: '#06b6d4', key: 'dew_point_2m' },
				visibility: { name: 'Visibility', unit: 'km', color: '#64748b', key: 'visibility' }
			}
		},
		wind: {
			name: 'Wind Conditions',
			parameters: {
				wind_speed_10m: { name: 'Wind Speed (10m)', unit: 'm/s', color: '#10b981', key: 'wind_speed_10m' },
				wind_speed_100m: { name: 'Wind Speed (100m)', unit: 'm/s', color: '#059669', key: 'wind_speed_100m' },
				wind_direction_10m: { name: 'Wind Direction (10m)', unit: '°', color: '#22c55e', key: 'wind_direction_10m' },
				wind_gusts_10m: { name: 'Wind Gusts', unit: 'm/s', color: '#16a34a', key: 'wind_gusts_10m' }
			}
		},
		cloud: {
			name: 'Cloud & Precipitation',
			parameters: {
				cloud_cover: { name: 'Total Cloud Cover', unit: '%', color: '#6b7280', key: 'cloud_cover' },
				cloud_cover_low: { name: 'Low Cloud Cover', unit: '%', color: '#9ca3af', key: 'cloud_cover_low' },
				cloud_cover_mid: { name: 'Mid Cloud Cover', unit: '%', color: '#6b7280', key: 'cloud_cover_mid' },
				cloud_cover_high: { name: 'High Cloud Cover', unit: '%', color: '#4b5563', key: 'cloud_cover_high' },
				precipitation: { name: 'Precipitation', unit: 'mm', color: '#0ea5e9', key: 'precipitation' },
				rain: { name: 'Rain', unit: 'mm', color: '#0284c7', key: 'rain' }
			}
		}
	};

	// Flatten parameters for easy access
	const weatherParameters = {};
	Object.values(weatherParameterCategories).forEach(category => {
		Object.assign(weatherParameters, category.parameters);
	});

	// Selected parameters
	let selectedParameters = ['shortwave_radiation', 'temperature_2m', 'cloud_cover'];
	let activeTimeRange = 'Today';

	// Real-time forecast data from API
	let forecastData: any = null;
	let chartContainer: HTMLDivElement;
	let isLoading = false;
	let errorMessage = '';

	// Location-specific weather characteristics
	const locationWeatherProfiles = {
		1: { // Solar Farm Alpha - Bucharest
			tempBase: 15,
			cloudiness: 0.3,
			windiness: 0.8,
			humidity: 0.6,
			solarEfficiency: 1.0
		},
		2: { // Solar Station Beta - Cluj
			tempBase: 12,
			cloudiness: 0.4,
			windiness: 1.0,
			humidity: 0.7,
			solarEfficiency: 0.95
		},
		3: { // Green Energy Park - Timisoara
			tempBase: 16,
			cloudiness: 0.35,
			windiness: 0.9,
			humidity: 0.65,
			solarEfficiency: 1.05
		},
		4: { // Coastal Solar Array - Constanta
			tempBase: 14,
			cloudiness: 0.25,
			windiness: 1.3,
			humidity: 0.8,
			solarEfficiency: 1.1
		}
	};

	// Fetch real data from API
	async function fetchWeatherData(timeRange: string = 'Today') {
		isLoading = true;
		errorMessage = '';

		try {
			// Map parameter keys to API format
			const paramMapping = {
				'shortwave_radiation': 'ghi',
				'direct_radiation': 'dni',
				'diffuse_radiation': 'dhi',
				'temperature_2m': 'temperature',
				'cloud_cover': 'cloudCover',
				'wind_speed_10m': 'windSpeed',
				'relative_humidity_2m': 'humidity'
			};

			const params = selectedParameters.map(p => paramMapping[p] || p).join(',');

			// Fetch real data from our API
			const response = await fetch(`/api/weather/chart-data?location_id=${locationId}&time_range=${timeRange}&parameters=${params}`);
			const result = await response.json();

			if (result.success && result.data) {
				// Map API data back to component format
				const mappedData = {
					labels: result.data.labels,
					datasets: result.data.datasets.map(dataset => {
						// Find original parameter key
						const originalParam = selectedParameters.find(p => {
							const mapped = paramMapping[p] || p;
							return dataset.label.toLowerCase().includes(mapped.toLowerCase()) ||
								   weatherParameters[p]?.name === dataset.label;
						});

						if (originalParam && weatherParameters[originalParam]) {
							return {
								...dataset,
								label: weatherParameters[originalParam].name,
								borderColor: weatherParameters[originalParam].color,
								backgroundColor: weatherParameters[originalParam].color + '20'
							};
						}
						return dataset;
					})
				};
				return mappedData;
			} else {
				console.warn('Using mock data from API:', result.message);
				return result.data;
			}
		} catch (error) {
			console.error('Error fetching weather data:', error);
			errorMessage = 'Failed to load weather data';
			// Fall back to generating mock data locally
			return generateMockData(timeRange);
		} finally {
			isLoading = false;
		}
	}

	// Generate mock data based on time range and location (fallback)
	function generateMockData(timeRange: string = 'Today') {
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
		const locationProfile = locationWeatherProfiles[locationId] || locationWeatherProfiles[1];
		
		timePoints.forEach((point, index) => {
			let sunIntensity = 1;
			let weatherVariation = 1;
			
			if (timeRange === 'Today') {
				// Today: normal weather
				const sunAngle = Math.sin((point - 6) * Math.PI / 12);
				sunIntensity = Math.max(0, sunAngle * locationProfile.solarEfficiency);
				weatherVariation = 1 + Math.sin(point * 0.3) * 0.1;
			} else if (timeRange === 'Tomorrow') {
				// Tomorrow: slightly cloudier
				const sunAngle = Math.sin((point - 6) * Math.PI / 12);
				sunIntensity = Math.max(0, sunAngle * 0.8 * locationProfile.solarEfficiency); // 20% less sun
				weatherVariation = 1 + Math.sin(point * 0.5) * 0.2;
			} else if (timeRange === '7 Days') {
				// Weekly: varying weather patterns
				sunIntensity = (0.6 + 0.4 * Math.sin(point * Math.PI / 3)) * locationProfile.solarEfficiency;
				weatherVariation = 1 + Math.sin(point * 0.8) * 0.3;
			}
			
			const isDay = sunIntensity > 0;
			const cloudiness = (timeRange === 'Tomorrow' ? 0.6 : timeRange === '7 Days' ? 0.4 : 0.3) * locationProfile.cloudiness;
			const tempBase = locationProfile.tempBase;
			
			data[index] = {
				// Solar radiation parameters
				shortwave_radiation: Math.max(0, sunIntensity * 800 * weatherVariation + Math.random() * 100),
				direct_radiation: Math.max(0, sunIntensity * 600 * weatherVariation + Math.random() * 80),
				diffuse_radiation: Math.max(0, sunIntensity * 200 * weatherVariation + Math.random() * 50),
				global_tilted_irradiance: Math.max(0, sunIntensity * 850 * weatherVariation + Math.random() * 90),
				sunshine_duration: isDay ? Math.max(0, sunIntensity * 60 * weatherVariation + Math.random() * 10) : 0,
				uv_index: Math.max(0, sunIntensity * 10 * weatherVariation + Math.random() * 2),
				
				// Atmospheric conditions
				temperature_2m: tempBase + sunIntensity * 10 * weatherVariation + Math.random() * 3,
				relative_humidity_2m: 40 * locationProfile.humidity + cloudiness * 40 + Math.random() * 20,
				surface_pressure: 1013 + Math.random() * 20 - (cloudiness * 10),
				dew_point_2m: (tempBase - 5) + sunIntensity * 5 + Math.random() * 2,
				visibility: Math.max(5, 25 - cloudiness * 15 + Math.random() * 5),
				
				// Wind conditions
				wind_speed_10m: (5 + cloudiness * 10 + Math.random() * 10) * locationProfile.windiness,
				wind_speed_100m: (7 + cloudiness * 12 + Math.random() * 12) * locationProfile.windiness,
				wind_direction_10m: Math.random() * 360,
				wind_gusts_10m: (8 + cloudiness * 15 + Math.random() * 15) * locationProfile.windiness,
				
				// Cloud & precipitation
				cloud_cover: cloudiness * 80 + Math.random() * 20,
				cloud_cover_low: cloudiness * 40 + Math.random() * 20,
				cloud_cover_mid: cloudiness * 30 + Math.random() * 15,
				cloud_cover_high: cloudiness * 20 + Math.random() * 10,
				precipitation: timeRange === 'Tomorrow' ? Math.random() * 8 : Math.random() * 3,
				rain: timeRange === 'Tomorrow' ? Math.random() * 5 : Math.random() * 2
			};
		});
		
		return { data, labels, timePoints };
	}

	async function updateChart() {
		if (!chartContainer || typeof window === 'undefined') return;

		// Import ECharts dynamically
		import('echarts').then(async (echarts) => {
			const chart = echarts.init(chartContainer, 'dark');

			// Fetch real data from API
			const chartData = await fetchWeatherData(activeTimeRange);
			const { labels, datasets } = chartData;

			// Convert datasets to ECharts series format
			const series = datasets.map((dataset, index) => {
				return {
					name: dataset.label,
					type: 'line',
					smooth: true,
					data: dataset.data,
					lineStyle: {
						color: dataset.borderColor,
						width: 2
					},
					itemStyle: {
						color: dataset.borderColor
					},
					areaStyle: {
						color: {
							type: 'linear',
							x: 0, y: 0, x2: 0, y2: 1,
							colorStops: [
								{offset: 0, color: dataset.borderColor + '40'},
								{offset: 1, color: dataset.borderColor + '10'}
							]
						}
					},
					yAxisIndex: index % 2 // Alternate between left and right y-axis
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
							content += `<div style="margin: 2px 0;">
								<span style="color: ${param.color};">●</span>
								${param.seriesName}: <strong>${param.value.toFixed(1)}</strong>
							</div>`;
						});
						return content;
					}
				},
				legend: {
					data: datasets.map(d => d.label),
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
			if (selectedParameters.length < 6) {
				selectedParameters = [...selectedParameters, paramKey];
			}
		}
		updateChartData();
	}

	// Update chart data when parameters change
	async function updateChartData() {
		const data = await fetchWeatherData(activeTimeRange);
		forecastData = data;
		updateChart();
	}

	// Handle time range change
	function handleTimeRangeChange(range: string) {
		activeTimeRange = range;
		updateChartData();
	}

	onMount(async () => {
		// Fetch data first, then update chart
		await updateChartData();
	});

	// Update chart when container is available and we have data
	$: if (chartContainer && forecastData) {
		updateChart();
	}

	// Update chart when location changes
	$: if (locationId) {
		updateChartData();
	}
</script>

<div class="card-glass">
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
		<div>
			<h3 class="text-lg font-semibold text-soft-blue">Solar Forecast - Weather Parameters</h3>
			<p class="text-sm text-soft-blue/60 mt-1">Real-time meteorological data for <span class="text-cyan font-medium">{locations[locationId] || 'Selected Location'}</span></p>
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

	<!-- Categorized Parameter Selector -->
	<div class="mb-6">
		<label class="block text-sm font-medium text-soft-blue mb-3">
			Weather Parameters ({selectedParameters.length}/6 selected)
		</label>
		
		{#each Object.entries(weatherParameterCategories) as [categoryKey, category]}
			<div class="mb-4">
				<h4 class="text-xs font-medium text-soft-blue/60 mb-2 uppercase tracking-wide">{category.name}</h4>
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
					{#each Object.entries(category.parameters) as [key, param]}
						<button
							class="p-2 rounded-lg border transition-all duration-200 text-left {selectedParameters.includes(key)
								? 'border-cyan bg-cyan/10'
								: 'border-soft-blue/20 bg-glass-white hover:border-cyan/50'}"
							on:click={() => toggleParameter(key)}
							disabled={!selectedParameters.includes(key) && selectedParameters.length >= 6}
						>
							<div class="flex items-center space-x-2">
								<div 
									class="w-3 h-3 rounded-full flex-shrink-0" 
									style="background-color: {param.color}"
								></div>
								<div class="min-w-0 flex-1">
									<div class="font-medium text-sm {selectedParameters.includes(key) ? 'text-cyan' : 'text-soft-blue'} truncate">{param.name}</div>
									<div class="text-xs {selectedParameters.includes(key) ? 'text-cyan/70' : 'text-soft-blue/60'}">{param.unit}</div>
								</div>
							</div>
						</button>
					{/each}
				</div>
			</div>
		{/each}
	</div>

	<!-- Chart Container -->
	<div class="h-80 w-full">
		<div bind:this={chartContainer} class="h-full w-full"></div>
	</div>
	
	<!-- Current Values Summary -->
	{#if forecastData && forecastData.datasets && forecastData.labels}
	<div class="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
		{#each selectedParameters as paramKey, index}
			{@const param = weatherParameters[paramKey]}
			{@const dataset = forecastData.datasets.find(d => d.label === param.name)}
			{@const now = new Date()}
			{@const currentTimeLabel = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
			{@const currentIndex = forecastData.labels.findIndex(label => label === currentTimeLabel)}
			{@const validIndex = currentIndex >= 0 ? currentIndex : Math.min(now.getHours(), (forecastData.labels.length - 1))}
			{@const currentValue = dataset?.data?.[validIndex] ?? 0}
			<div class="bg-glass-white rounded-lg p-3">
				<div class="flex items-center space-x-2 mb-1">
					<div
						class="w-2 h-2 rounded-full"
						style="background-color: {param.color}"
					></div>
					<span class="text-xs text-soft-blue/70">{param.name}</span>
				</div>
				<div class="text-lg font-mono text-soft-blue">
					{typeof currentValue === 'number' ? currentValue.toFixed(1) : '0.0'}<span class="text-sm ml-1">{param.unit}</span>
				</div>
			</div>
		{/each}
	</div>
	{/if}
</div>