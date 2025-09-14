<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	
	export let locationId: number = 1;

	// Location names for display
	const locations = {
		1: 'Solar Farm Alpha - Bucharest',
		2: 'Solar Station Beta - Cluj', 
		3: 'Green Energy Park - Timisoara',
		4: 'Coastal Solar Array - Constanta'
	};

	// Available timezones for display
	const availableTimezones = [
		{ value: 'UTC', label: 'UTC', offset: 0 },
		{ value: 'Europe/London', label: 'London (GMT)', offset: 0 },
		{ value: 'Europe/Paris', label: 'Paris (CET)', offset: 1 },
		{ value: 'Europe/Bucharest', label: 'Bucharest (EET)', offset: 2 },
		{ value: 'America/New_York', label: 'New York (EST)', offset: -5 },
		{ value: 'America/Chicago', label: 'Chicago (CST)', offset: -6 },
		{ value: 'America/Denver', label: 'Denver (MST)', offset: -7 },
		{ value: 'America/Los_Angeles', label: 'Los Angeles (PST)', offset: -8 },
		{ value: 'Asia/Tokyo', label: 'Tokyo (JST)', offset: 9 },
		{ value: 'Asia/Shanghai', label: 'Shanghai (CST)', offset: 8 },
		{ value: 'Australia/Sydney', label: 'Sydney (AEDT)', offset: 11 }
	];

	// Selected timezone for display
	let selectedTimezone = 'Europe/Bucharest';

	// Save timezone preference when changed
	function handleTimezoneChange() {
		if (typeof window !== 'undefined') {
			localStorage.setItem(`timezone_location_${locationId}`, selectedTimezone);
		}
		updateChart();
	}

	// Format labels based on selected timezone
	function formatLabelsForTimezone(labels: string[], fromOffset: number = 2): string[] {
		const selectedTz = availableTimezones.find(tz => tz.value === selectedTimezone);
		if (!selectedTz) return labels;

		const offsetDiff = selectedTz.offset - fromOffset;

		return labels.map(label => {
			// Handle different label formats
			if (label.includes(':')) {
				// Time format (e.g., "14:00" or "02:00 PM")
				let hour24: number;
				let minutes = 0;

				if (label.includes(' ')) {
					// 12-hour format with AM/PM
					const [time, period] = label.split(' ');
					const [hours, mins] = time.split(':').map(Number);
					minutes = mins || 0;
					hour24 = hours;
					if (period === 'PM' && hours !== 12) hour24 += 12;
					if (period === 'AM' && hours === 12) hour24 = 0;
				} else {
					// 24-hour format
					const [hours, mins] = label.split(':').map(Number);
					hour24 = hours;
					minutes = mins || 0;
				}

				// Apply timezone offset
				let newHour = hour24 + offsetDiff;

				// Handle day boundaries
				if (newHour < 0) newHour += 24;
				if (newHour >= 24) newHour -= 24;

				// Format back to 12-hour format
				const isPM = newHour >= 12;
				let hour12 = newHour % 12;
				if (hour12 === 0) hour12 = 12;

				return `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
			} else {
				// Date format, return as-is
				return label;
			}
		});
	}

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

	// Most important weather parameters for solar forecasting (simplified for dashboard)
	const weatherParameters = {
		shortwave_radiation: { name: 'Solar Radiation', unit: 'W/m²', color: '#f59e0b', key: 'shortwave_radiation' },
		temperature_2m: { name: 'Temperature', unit: '°C', color: '#ef4444', key: 'temperature_2m' },
		cloud_cover: { name: 'Cloud Coverage', unit: '%', color: '#6b7280', key: 'cloud_cover' },
		wind_speed_10m: { name: 'Wind Speed', unit: 'm/s', color: '#10b981', key: 'wind_speed_10m' },
		relative_humidity_2m: { name: 'Humidity', unit: '%', color: '#3b82f6', key: 'relative_humidity_2m' }
	};

	// Selected parameters
	let selectedParameters = ['shortwave_radiation', 'temperature_2m', 'cloud_cover'];
	let activeTimeRange = 'Today';

	// Real-time forecast data from API
	let forecastData: any = null;
	let originalLabels: string[] = []; // Store original labels before timezone conversion
	let chartContainer: HTMLDivElement;
	let isLoading = false;
	let errorMessage = '';

	// Fetch real data from API
	async function fetchWeatherData(timeRange: string = 'Today') {
		console.log('Fetching weather data:', { locationId, timeRange, params: selectedParameters });
		isLoading = true;
		errorMessage = '';

		try {
			// Build parameters list based on selected parameters
			const params = selectedParameters.join(',');

			// Fetch real data from our API
			const response = await fetch(`/api/weather/chart-data?location_id=${locationId}&time_range=${timeRange}&parameters=${params}`);
			const result = await response.json();
			console.log('API response:', result);

			if (result.success && result.data) {
				return result.data;
			} else {
				// If no real data, the API will return mock data
				console.warn('Using mock data from API:', result.message);
				return result.data;
			}
		} catch (error) {
			console.error('Error fetching weather data:', error);
			errorMessage = 'Failed to load weather data';
			// Fall back to generating mock data locally
			const mockData = generateMockData(timeRange);
			console.log('Generated mock data:', mockData);
			return mockData;
		} finally {
			isLoading = false;
		}
	}

	// Generate mock data as fallback
	function generateMockData(timeRange: string = 'Today') {
		let labels: string[] = [];
		let datasets: any[] = [];

		if (timeRange === 'Today' || timeRange === 'Tomorrow') {
			// Hourly data for 24 hours
			for (let i = 0; i < 24; i++) {
				labels.push(`${i.toString().padStart(2, '0')}:00`);
			}
		} else if (timeRange === '7 Days') {
			// Daily data for 7 days
			const today = new Date();
			for (let i = 0; i < 7; i++) {
				const date = new Date(today);
				date.setDate(today.getDate() + i);
				labels.push(date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
			}
		}

		const locationProfile = locationWeatherProfiles[locationId] || locationWeatherProfiles[1];

		// Generate datasets for selected parameters
		selectedParameters.forEach(param => {
			const paramConfig = weatherParameters[param];
			if (paramConfig) {
				const data = labels.map((_, index) => {
					const point = timeRange === '7 Days' ? index * 24 : index;
					const sunAngle = Math.sin((point - 6) * Math.PI / 12);

					switch (param) {
						case 'shortwave_radiation':
							return Math.max(0, sunAngle * 800 * locationProfile.solarEfficiency + Math.random() * 100);
						case 'temperature_2m':
							return locationProfile.tempBase + sunAngle * 10 + Math.random() * 2;
						case 'cloud_cover':
							return Math.max(0, Math.min(100, locationProfile.cloudiness * 100 + Math.random() * 20));
						case 'wind_speed_10m':
							return locationProfile.windiness * 10 + Math.random() * 5;
						case 'relative_humidity_2m':
							return locationProfile.humidity * 100 + Math.random() * 10;
						default:
							return Math.random() * 50;
					}
				});

				datasets.push({
					label: paramConfig.name,
					data,
					borderColor: paramConfig.color,
					backgroundColor: paramConfig.color + '20',
					tension: 0.4,
					fill: false
				});
			}
		});

		return { labels, datasets };
	}

	// Update chart data when parameters change
	async function updateChartData() {
		const data = await fetchWeatherData(activeTimeRange);
		forecastData = data;
		if (data && data.labels) {
			originalLabels = [...data.labels]; // Store original labels
		}
		// Wait a tick to ensure DOM is ready
		await new Promise(resolve => setTimeout(resolve, 0));
		updateChart();
	}

	let chartInstance: any = null;

	async function updateChart() {
		if (!chartContainer || typeof window === 'undefined' || !forecastData) {
			console.log('Chart update skipped:', {
				hasContainer: !!chartContainer,
				isBrowser: typeof window !== 'undefined',
				hasData: !!forecastData
			});
			return;
		}

		// Import ECharts dynamically
		import('echarts').then(async (echarts) => {
			console.log('Initializing chart with data:', forecastData);

			// Dispose existing chart if it exists
			if (chartInstance) {
				chartInstance.dispose();
			}

			// Initialize new chart
			chartInstance = echarts.init(chartContainer, 'dark');

			// Use the already fetched data
			const { labels, datasets } = forecastData;

			// Apply timezone conversion to labels
			const adjustedLabels = formatLabelsForTimezone(labels, 2); // Romania is UTC+2

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
					data: adjustedLabels,
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

			console.log('Setting chart options:', { option, series: series.length, labels: adjustedLabels.length });
			chartInstance.setOption(option);

			// Handle window resize
			const handleResize = () => {
				if (chartInstance) {
					chartInstance.resize();
				}
			};
			window.addEventListener('resize', handleResize);

			// Store resize handler for cleanup
			if (typeof window !== 'undefined') {
				if ((window as any).resizeHandler) {
					window.removeEventListener('resize', (window as any).resizeHandler);
				}
				(window as any).resizeHandler = handleResize;
			}
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
		updateChartData();
	}

	// Handle time range change
	function handleTimeRangeChange(range: string) {
		activeTimeRange = range;
		updateChartData();
	}

	let mounted = false;

	onMount(async () => {
		mounted = true;
		// Load saved timezone preference
		if (typeof window !== 'undefined') {
			const savedTimezone = localStorage.getItem(`timezone_location_${locationId}`);
			if (savedTimezone && availableTimezones.find(tz => tz.value === savedTimezone)) {
				selectedTimezone = savedTimezone;
			}
		}
		// Fetch data first, then update chart
		await updateChartData();
	});

	// Update chart when container is available and we have data
	$: if (chartContainer && forecastData && typeof window !== 'undefined' && mounted) {
		updateChart();
	}

	// Update chart when location changes (only in browser after mount)
	$: if (mounted && locationId) {
		updateChartData();
	}

	// Cleanup on destroy
	onDestroy(() => {
		if (chartInstance) {
			chartInstance.dispose();
			chartInstance = null;
		}
		if (typeof window !== 'undefined' && (window as any).resizeHandler) {
			window.removeEventListener('resize', (window as any).resizeHandler);
		}
	});
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

	<!-- Timezone Selector -->
	<div class="mb-4 flex items-center gap-4">
		<label for="dashboard-timezone-select" class="text-sm font-medium text-soft-blue">
			Display Timezone:
		</label>
		<select
			id="dashboard-timezone-select"
			bind:value={selectedTimezone}
			on:change={handleTimezoneChange}
			class="bg-glass-white border border-soft-blue/20 rounded-lg px-3 py-1.5 text-sm text-soft-blue focus:outline-none focus:border-cyan"
		>
			{#each availableTimezones as tz}
				<option value={tz.value} class="bg-dark-petrol text-soft-blue">
					{tz.label}
				</option>
			{/each}
		</select>
		<span class="text-xs text-soft-blue/60">
			Local time: {locations[locationId] || 'Selected Location'} (EET/UTC+2)
		</span>
	</div>

	<!-- Parameter Selector -->
	<div class="mb-6">
		<div class="block text-sm font-medium text-soft-blue mb-2">
			Weather Parameters ({selectedParameters.length}/4 selected)
		</div>
		<div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
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
	{#if forecastData && forecastData.datasets && originalLabels.length > 0}
	<div class="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
		{#each selectedParameters as paramKey, index}
			{@const param = weatherParameters[paramKey]}
			{@const dataset = forecastData.datasets.find(d => d.label === param.name)}
			{@const now = new Date()}
			{@const currentTimeLabel = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
			{@const currentIndex = originalLabels.findIndex(label => label === currentTimeLabel)}
			{@const validIndex = currentIndex >= 0 ? currentIndex : Math.min(now.getHours(), (originalLabels.length - 1))}
			{@const currentValue = (() => {
				if (!dataset?.data) return 0;

				// Special handling for Solar Radiation parameters
				if (paramKey === 'shortwave_radiation') {
					// Get all non-null values
					const nonNullValues = dataset.data.filter(val => val !== null && val !== undefined && val > 0);
					if (nonNullValues.length === 0) return 0;

					// Sort values in descending order and get top 10
					const sortedValues = nonNullValues.sort((a, b) => b - a);
					const top10Values = sortedValues.slice(0, 10);

					// Return average of top 10 values
					return top10Values.reduce((sum, val) => sum + val, 0) / top10Values.length;
				}

				// For other parameters, use current time value
				return dataset.data[validIndex] ?? 0;
			})()}
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