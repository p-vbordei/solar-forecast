<script lang="ts">
	import { onMount } from 'svelte';

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

	// Mock forecast data - in real app this would come from API
	let forecastData: any = null;
	let chartContainer: HTMLDivElement;

	// Generate mock data based on time range
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
		
		timePoints.forEach((point, index) => {
			let sunIntensity = 1;
			let weatherVariation = 1;
			
			if (timeRange === 'Today') {
				// Today: normal weather
				const sunAngle = Math.sin((point - 6) * Math.PI / 12);
				sunIntensity = Math.max(0, sunAngle);
				weatherVariation = 1 + Math.sin(point * 0.3) * 0.1;
			} else if (timeRange === 'Tomorrow') {
				// Tomorrow: slightly cloudier
				const sunAngle = Math.sin((point - 6) * Math.PI / 12);
				sunIntensity = Math.max(0, sunAngle * 0.8); // 20% less sun
				weatherVariation = 1 + Math.sin(point * 0.5) * 0.2;
			} else if (timeRange === '7 Days') {
				// Weekly: varying weather patterns
				sunIntensity = 0.6 + 0.4 * Math.sin(point * Math.PI / 3);
				weatherVariation = 1 + Math.sin(point * 0.8) * 0.3;
			}
			
			const isDay = sunIntensity > 0;
			const cloudiness = timeRange === 'Tomorrow' ? 0.6 : timeRange === '7 Days' ? 0.4 : 0.3;
			const tempBase = timeRange === 'Tomorrow' ? 12 : timeRange === '7 Days' ? 18 : 15;
			
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
				relative_humidity_2m: 40 + cloudiness * 40 + Math.random() * 20,
				surface_pressure: 1013 + Math.random() * 20 - (cloudiness * 10),
				dew_point_2m: (tempBase - 5) + sunIntensity * 5 + Math.random() * 2,
				visibility: Math.max(5, 25 - cloudiness * 15 + Math.random() * 5),
				
				// Wind conditions
				wind_speed_10m: 5 + cloudiness * 10 + Math.random() * 10,
				wind_speed_100m: 7 + cloudiness * 12 + Math.random() * 12,
				wind_direction_10m: Math.random() * 360,
				wind_gusts_10m: 8 + cloudiness * 15 + Math.random() * 15,
				
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

	function updateChart() {
		if (!chartContainer || typeof window === 'undefined') return;

		// Import ECharts dynamically
		import('echarts').then((echarts) => {
			const chart = echarts.init(chartContainer, 'dark');
			
			const mockData = generateMockData(activeTimeRange);
			const { data, labels, timePoints } = mockData;
			
			const series = selectedParameters.map(paramKey => {
				const param = weatherParameters[paramKey];
				return {
					name: param.name,
					type: 'line',
					smooth: true,
					data: timePoints.map(point => data[timePoints.indexOf(point)][paramKey]),
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
		updateChart();
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
	<div class="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
		{#each selectedParameters as paramKey}
			{@const param = weatherParameters[paramKey]}
			{@const mockData = generateMockData(activeTimeRange)}
			{@const currentValue = activeTimeRange === '7 Days' ? 
				mockData.data[0][paramKey] : 
				mockData.data[new Date().getHours()] ? mockData.data[new Date().getHours()][paramKey] : mockData.data[0][paramKey]}
			<div class="bg-glass-white rounded-lg p-3">
				<div class="flex items-center space-x-2 mb-1">
					<div 
						class="w-2 h-2 rounded-full" 
						style="background-color: {param.color}"
					></div>
					<span class="text-xs text-soft-blue/70">{param.name}</span>
				</div>
				<div class="text-lg font-mono text-soft-blue">
					{currentValue.toFixed(1)}<span class="text-sm ml-1">{param.unit}</span>
				</div>
			</div>
		{/each}
	</div>
</div>