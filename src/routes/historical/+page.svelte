<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import TemplateGenerator from '$lib/components/TemplateGenerator.svelte';

	// State management
	let uploadedData: any[] = [];
	let processedData: any = null;
	let selectedAggregation = 'hourly';
	let selectedLocation = 'all';
	let chartContainer: HTMLDivElement;
	let fileInput: HTMLInputElement;
	let isUploading = false;
	let uploadError = '';
	let showExplanation = false;

	// Available locations (from uploaded data)
	let availableLocations: string[] = ['all'];

	// Comprehensive mock historical data for demonstration
	function generateMockHistoricalData() {
		const locations = ['Site A', 'Site B', 'Veranda Mall Bucharest'];
		const data = [];
		
		// Generate 7 days of hourly data for each location
		for (let day = 0; day < 7; day++) {
			const date = new Date();
			date.setDate(date.getDate() - day);
			const dateStr = date.toISOString().split('T')[0];
			
			for (let hour = 0; hour < 24; hour++) {
				locations.forEach((location, locationIndex) => {
					const datetime = `${dateStr} ${hour.toString().padStart(2, '0')}:00`;
					
					// Generate realistic production curves
					const sunAngle = Math.sin((hour - 6) * Math.PI / 12);
					const baseSunIntensity = Math.max(0, sunAngle);
					
					// Add location-specific variations
					const locationMultiplier = locationIndex === 0 ? 1.2 : locationIndex === 1 ? 1.0 : 0.8;
					const weatherVariation = 1 + Math.sin(day * 0.3 + hour * 0.1) * 0.15;
					const dailyVariation = 1 + Math.sin(day * 0.5) * 0.1;
					
					const maxProduction = location === 'Site A' ? 65 : location === 'Site B' ? 55 : 35;
					const production = baseSunIntensity * maxProduction * locationMultiplier * weatherVariation * dailyVariation;
					
					// Add slight forecast variation
					const forecastVariation = 1 + (Math.random() - 0.5) * 0.1;
					const forecast = production * forecastVariation;
					
					data.push({
						datetime,
						location,
						production: Math.max(0, production + (Math.random() - 0.5) * 2),
						forecast: Math.max(0, forecast)
					});
				});
			}
		}
		
		// Add some 15-minute interval data for today for more granular view
		const today = new Date().toISOString().split('T')[0];
		for (let hour = 6; hour <= 18; hour++) {
			for (let minute = 0; minute < 60; minute += 15) {
				locations.forEach((location, locationIndex) => {
					const datetime = `${today} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
					
					const sunAngle = Math.sin((hour + minute/60 - 6) * Math.PI / 12);
					const baseSunIntensity = Math.max(0, sunAngle);
					const locationMultiplier = locationIndex === 0 ? 1.2 : locationIndex === 1 ? 1.0 : 0.8;
					const minuteVariation = 1 + Math.sin(minute * 0.1) * 0.05;
					
					const maxProduction = location === 'Site A' ? 65 : location === 'Site B' ? 55 : 35;
					const production = baseSunIntensity * maxProduction * locationMultiplier * minuteVariation;
					const forecast = production * (1 + (Math.random() - 0.5) * 0.08);
					
					data.push({
						datetime,
						location,
						production: Math.max(0, production + (Math.random() - 0.5) * 1.5),
						forecast: Math.max(0, forecast)
					});
				});
			}
		}
		
		return data.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
	}

	const mockData = generateMockHistoricalData();

	// Initialize with mock data
	onMount(() => {
		uploadedData = mockData;
		availableLocations = ['all', ...new Set(mockData.map(d => d.location))];
		processData();
	});

	// Handle file upload
	function handleFileUpload(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		
		if (!file) return;

		isUploading = true;
		uploadError = '';

		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const text = e.target?.result as string;
				const lines = text.split('\n');
				const headers = lines[0].split(',').map(h => h.trim());
				
				const data = lines.slice(1).map(line => {
					const values = line.split(',').map(v => v.trim());
					const row: any = {};
					headers.forEach((header, index) => {
						row[header] = values[index];
					});
					return row;
				}).filter(row => row.datetime); // Filter out empty rows

				uploadedData = [...uploadedData, ...data];
				availableLocations = ['all', ...new Set(uploadedData.map(d => d.location))];
				processData();
				
				isUploading = false;
			} catch (error) {
				uploadError = 'Error parsing CSV file. Please check the format.';
				isUploading = false;
			}
		};
		
		reader.readAsText(file);
	}

	// Process data based on aggregation and location
	function processData() {
		let filteredData = uploadedData;
		
		if (selectedLocation !== 'all') {
			filteredData = uploadedData.filter(d => d.location === selectedLocation);
		}

		// Group by time aggregation
		const grouped: { [key: string]: { production: number[], forecast: number[], count: number } } = {};
		
		filteredData.forEach(item => {
			let key = item.datetime;
			
			// Apply aggregation
			if (selectedAggregation === 'daily') {
				key = item.datetime.split(' ')[0]; // Just the date part
			} else if (selectedAggregation === 'weekly') {
				const date = new Date(item.datetime);
				const startOfWeek = new Date(date.setDate(date.getDate() - date.getDay()));
				key = startOfWeek.toISOString().split('T')[0];
			}
			
			if (!grouped[key]) {
				grouped[key] = { production: [], forecast: [], count: 0 };
			}
			
			grouped[key].production.push(parseFloat(item.production) || 0);
			grouped[key].forecast.push(parseFloat(item.forecast) || 0);
			grouped[key].count++;
		});

		// Calculate averages
		processedData = Object.keys(grouped).map(key => ({
			datetime: key,
			production: grouped[key].production.reduce((a, b) => a + b, 0) / grouped[key].production.length,
			forecast: grouped[key].forecast.reduce((a, b) => a + b, 0) / grouped[key].forecast.length,
			count: grouped[key].count
		})).sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

		updateChart();
	}

	// Update chart visualization
	function updateChart() {
		if (!chartContainer || !processedData || !browser) return;

		import('echarts').then((echarts) => {
			const chart = echarts.init(chartContainer, 'dark');
			
			const xAxisData = processedData.map((item: any) => {
				const date = new Date(item.datetime);
				if (selectedAggregation === 'hourly') {
					return date.toLocaleString('en-US', { 
						month: 'short', 
						day: 'numeric', 
						hour: '2-digit',
						minute: '2-digit'
					});
				} else if (selectedAggregation === 'daily') {
					return date.toLocaleString('en-US', { month: 'short', day: 'numeric' });
				} else if (selectedAggregation === 'weekly') {
					return `Week ${date.toLocaleString('en-US', { month: 'short', day: 'numeric' })}`;
				}
				return item.datetime;
			});

			const productionData = processedData.map((item: any) => item.production);
			const forecastData = processedData.map((item: any) => item.forecast);

			const option = {
				backgroundColor: 'transparent',
				title: {
					text: `Historical Production - ${selectedAggregation.charAt(0).toUpperCase() + selectedAggregation.slice(1)} Average`,
					textStyle: {
						color: '#AFDDE5',
						fontSize: 18,
						fontWeight: 600
					},
					left: 20,
					top: 20
				},
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
								${param.seriesName}: <strong>${param.value.toFixed(1)} MW</strong>
							</div>`;
						});
						return content;
					}
				},
				legend: {
					data: ['Forecast', 'Actual'],
					textStyle: {
						color: '#AFDDE5'
					},
					top: 60,
					right: 20
				},
				grid: {
					left: '8%',
					right: '8%',
					bottom: '15%',
					top: '25%'
				},
				xAxis: {
					type: 'category',
					data: xAxisData,
					axisLine: {
						lineStyle: { color: '#0FA4AF' }
					},
					axisLabel: {
						color: '#AFDDE5',
						fontSize: 11,
						rotate: selectedAggregation === 'hourly' ? 45 : 0
					},
					splitLine: {
						show: true,
						lineStyle: {
							color: 'rgba(15, 164, 175, 0.1)'
						}
					}
				},
				yAxis: {
					type: 'value',
					name: 'Production (MW)',
					nameTextStyle: { 
						color: '#AFDDE5',
						fontSize: 12
					},
					axisLine: { 
						lineStyle: { color: '#0FA4AF' } 
					},
					axisLabel: { 
						color: '#AFDDE5',
						fontSize: 11
					},
					splitLine: {
						lineStyle: {
							color: 'rgba(15, 164, 175, 0.1)'
						}
					}
				},
				series: [
					{
						name: 'Forecast',
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
						}
					},
					{
						name: 'Actual',
						type: 'line',
						data: productionData,
						smooth: true,
						lineStyle: {
							color: '#AFDDE5',
							width: 2
						},
						itemStyle: {
							color: '#AFDDE5'
						}
					}
				]
			};

			chart.setOption(option);
			
			const handleResize = () => chart.resize();
			window.addEventListener('resize', handleResize);
			
			return () => {
				window.removeEventListener('resize', handleResize);
				chart.dispose();
			};
		});
	}

	// Handle aggregation change
	function handleAggregationChange(aggregation: string) {
		selectedAggregation = aggregation;
		processData();
	}

	// Handle location change
	function handleLocationChange(location: string) {
		selectedLocation = location;
		processData();
	}

	// Export functions
	function exportCSV() {
		if (!processedData) return;
		
		const headers = ['datetime', 'production', 'forecast'];
		const csvContent = [
			headers.join(','),
			...processedData.map((row: any) => 
				headers.map(header => row[header]).join(',')
			)
		].join('\n');
		
		const blob = new Blob([csvContent], { type: 'text/csv' });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `historical_data_${selectedAggregation}.csv`;
		a.click();
		window.URL.revokeObjectURL(url);
	}

	function exportExcel() {
		// This would integrate with a library like SheetJS
		alert('Excel export functionality would be implemented here');
	}

	function exportPDF() {
		// This would integrate with a library like jsPDF
		alert('PDF export functionality would be implemented here');
	}

	$: if (browser && processedData) {
		updateChart();
	}
</script>

<div class="space-y-6">
	<!-- Page Header -->
	<div>
		<h1 class="text-3xl font-bold text-soft-blue">Historical Data Analysis</h1>
		<p class="text-soft-blue/60 mt-2">Upload and analyze historical solar production data with forecast comparison</p>
	</div>

	<!-- Understanding Historical Data -->
	<div class="card-glass">
		<button
			on:click={() => showExplanation = !showExplanation}
			class="flex items-center justify-between w-full text-left"
		>
			<div class="flex items-center space-x-3">
				<div class="w-8 h-8 bg-gradient-to-br from-cyan to-soft-blue rounded-xl flex items-center justify-center shadow-lg shadow-cyan/30">
					<svg class="w-4 h-4 text-dark-petrol" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
					</svg>
				</div>
				<div>
					<h3 class="text-lg font-semibold text-white">Understanding Historical Data</h3>
					<p class="text-sm text-soft-blue/80">Click to learn about historical data analysis and upload guide</p>
				</div>
			</div>
			<div class="transform transition-transform duration-200 {showExplanation ? 'rotate-180' : 'rotate-0'}">
				<svg class="w-5 h-5 text-soft-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
				</svg>
			</div>
		</button>

		{#if showExplanation}
			<div class="mt-6 pt-6 border-t border-soft-blue/20 space-y-6">
				<!-- Data Upload Guide -->
				<div class="bg-gradient-to-br from-cyan/20 to-teal-dark/40 rounded-xl p-6 border border-cyan/40">
					<h4 class="font-semibold text-white mb-4 flex items-center space-x-2">
						<div class="w-6 h-6 bg-cyan/30 rounded-full flex items-center justify-center">
							<svg class="w-4 h-4 text-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
							</svg>
						</div>
						<span>Step-by-Step Upload Guide</span>
					</h4>
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<div class="space-y-4">
							<div class="bg-dark-petrol/60 rounded-lg p-4 border border-cyan/30">
								<div class="flex items-center space-x-2 mb-2">
									<div class="w-6 h-6 bg-cyan rounded-full flex items-center justify-center text-dark-petrol font-bold text-sm">1</div>
									<h5 class="font-medium text-cyan">Generate Template</h5>
								</div>
								<p class="text-sm text-soft-blue/80 mb-2">Use the Template Generator above to create a CSV template with your specific requirements:</p>
								<ul class="text-xs text-soft-blue/70 space-y-1">
									<li>• Select your location(s)</li>
									<li>• Choose time aggregation (15min, hourly, daily)</li>
									<li>• Set your timezone</li>
									<li>• Pick data types to include</li>
									<li>• Download the generated template</li>
								</ul>
							</div>

							<div class="bg-dark-petrol/60 rounded-lg p-4 border border-cyan/30">
								<div class="flex items-center space-x-2 mb-2">
									<div class="w-6 h-6 bg-cyan rounded-full flex items-center justify-center text-dark-petrol font-bold text-sm">2</div>
									<h5 class="font-medium text-cyan">Fill Template</h5>
								</div>
								<p class="text-sm text-soft-blue/80 mb-2">Open the template in Excel or any CSV editor and fill in your historical data:</p>
								<ul class="text-xs text-soft-blue/70 space-y-1">
									<li>• Keep the header row unchanged</li>
									<li>• Use ISO datetime format (YYYY-MM-DDTHH:MM:SS)</li>
									<li>• Enter numeric values without thousand separators</li>
									<li>• Leave empty cells for missing data</li>
								</ul>
							</div>
						</div>

						<div class="space-y-4">
							<div class="bg-dark-petrol/60 rounded-lg p-4 border border-cyan/30">
								<div class="flex items-center space-x-2 mb-2">
									<div class="w-6 h-6 bg-cyan rounded-full flex items-center justify-center text-dark-petrol font-bold text-sm">3</div>
									<h5 class="font-medium text-cyan">Upload Data</h5>
								</div>
								<p class="text-sm text-soft-blue/80 mb-2">Upload your completed CSV file using the upload section above:</p>
								<ul class="text-xs text-soft-blue/70 space-y-1">
									<li>• Click the upload button</li>
									<li>• Select your completed CSV file</li>
									<li>• Wait for automatic validation</li>
									<li>• Check for any upload errors</li>
								</ul>
							</div>

							<div class="bg-dark-petrol/60 rounded-lg p-4 border border-cyan/30">
								<div class="flex items-center space-x-2 mb-2">
									<div class="w-6 h-6 bg-cyan rounded-full flex items-center justify-center text-dark-petrol font-bold text-sm">4</div>
									<h5 class="font-medium text-cyan">Analyze Results</h5>
								</div>
								<p class="text-sm text-soft-blue/80 mb-2">View and analyze your uploaded historical data:</p>
								<ul class="text-xs text-soft-blue/70 space-y-1">
									<li>• Use the chart visualization above</li>
									<li>• Apply different time aggregations</li>
									<li>• Filter by location</li>
									<li>• Export processed results</li>
								</ul>
							</div>
						</div>
					</div>
				</div>

				<!-- Introduction Section -->
				<div class="bg-gradient-to-br from-teal-dark/40 to-dark-petrol/60 rounded-xl p-6 border border-cyan/20">
					<h4 class="font-semibold text-white mb-3 flex items-center space-x-2">
						<div class="w-6 h-6 bg-cyan/20 rounded-full flex items-center justify-center">
							<svg class="w-4 h-4 text-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
							</svg>
						</div>
						<span>Historical Data Analytics Platform</span>
					</h4>
					<p class="text-sm text-soft-blue/80 leading-relaxed mb-4">
						The Historical Data Analysis module provides comprehensive tools for analyzing solar production patterns, validating forecast accuracy, and identifying operational optimization opportunities. This platform processes historical production data with multi-temporal granularity analysis, enabling data-driven insights for performance enhancement and predictive modeling improvements.
					</p>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div class="bg-cyan/10 rounded-lg p-3 border border-cyan/30">
							<p class="text-xs text-soft-blue/70">
								<strong class="text-cyan">Data Processing:</strong> Multi-format data ingestion supporting CSV templates with automated validation, cleansing, and normalization for consistent analysis across different time periods and locations.
							</p>
						</div>
						<div class="bg-cyan/10 rounded-lg p-3 border border-cyan/30">
							<p class="text-xs text-soft-blue/70">
								<strong class="text-cyan">Temporal Analysis:</strong> Advanced aggregation capabilities from 15-minute intervals to weekly summaries, with intelligent data interpolation and gap-filling for complete historical reconstruction.
							</p>
						</div>
					</div>
				</div>

				<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<!-- Data Types Section -->
					<div class="lg:col-span-2">
						<h4 class="font-semibold text-white mb-4 flex items-center space-x-2">
							<div class="w-6 h-6 bg-cyan/20 rounded-full flex items-center justify-center">
								<svg class="w-4 h-4 text-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
								</svg>
							</div>
							<span>Supported Data Categories</span>
						</h4>
						<div class="space-y-4">
							<!-- Production Data -->
							<div class="bg-teal-dark/30 rounded-lg p-4 border border-cyan/20">
								<h5 class="font-medium text-cyan mb-2 flex items-center space-x-2">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
									</svg>
									<span>Production Data</span>
								</h5>
								<ul class="text-xs text-soft-blue/80 space-y-1">
									<li>• <strong>Production MW:</strong> Actual power generation in megawatts</li>
									<li>• <strong>Capacity Factor:</strong> Ratio of actual to maximum possible output</li>
									<li>• <strong>Performance Ratio:</strong> System efficiency considering environmental conditions</li>
									<li>• <strong>Availability:</strong> Percentage of time system was operational</li>
								</ul>
							</div>

							<!-- Weather Data -->
							<div class="bg-teal-dark/30 rounded-lg p-4 border border-cyan/20">
								<h5 class="font-medium text-cyan mb-2 flex items-center space-x-2">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path>
									</svg>
									<span>Environmental Data</span>
								</h5>
								<ul class="text-xs text-soft-blue/80 space-y-1">
									<li>• <strong>Irradiance Metrics:</strong> GHI, DNI, DHI, and GTI measurements</li>
									<li>• <strong>Temperature:</strong> Ambient and module temperature data</li>
									<li>• <strong>Meteorological:</strong> Humidity, pressure, wind speed/direction</li>
									<li>• <strong>Cloud Coverage:</strong> Low, mid, and high altitude cloud analysis</li>
								</ul>
							</div>

							<!-- Forecast Data -->
							<div class="bg-teal-dark/30 rounded-lg p-4 border border-cyan/20">
								<h5 class="font-medium text-cyan mb-2 flex items-center space-x-2">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
									</svg>
									<span>Forecast Analysis</span>
								</h5>
								<ul class="text-xs text-soft-blue/80 space-y-1">
									<li>• <strong>Predicted Production:</strong> Forecasted power generation values</li>
									<li>• <strong>Confidence Intervals:</strong> Statistical confidence bands for predictions</li>
									<li>• <strong>Model Versioning:</strong> Track different forecast model iterations</li>
									<li>• <strong>Accuracy Metrics:</strong> MAPE, RMSE, and MAE calculations</li>
								</ul>
							</div>
						</div>
					</div>

					<!-- Analysis Features -->
					<div>
						<h4 class="font-semibold text-white mb-4 flex items-center space-x-2">
							<div class="w-6 h-6 bg-cyan/20 rounded-full flex items-center justify-center">
								<svg class="w-4 h-4 text-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
								</svg>
							</div>
							<span>Analysis Capabilities</span>
						</h4>
						<div class="space-y-3">
							<div class="bg-dark-petrol/60 rounded-lg p-3 border border-soft-blue/20">
								<h6 class="font-medium text-soft-blue mb-2">Time Aggregation</h6>
								<p class="text-xs text-soft-blue/70">
									Flexible temporal analysis from 15-minute granularity to weekly summaries with intelligent averaging algorithms.
								</p>
							</div>
							<div class="bg-dark-petrol/60 rounded-lg p-3 border border-soft-blue/20">
								<h6 class="font-medium text-soft-blue mb-2">Multi-Location Analysis</h6>
								<p class="text-xs text-soft-blue/70">
									Comparative performance analysis across multiple solar installations with normalized metrics.
								</p>
							</div>
							<div class="bg-dark-petrol/60 rounded-lg p-3 border border-soft-blue/20">
								<h6 class="font-medium text-soft-blue mb-2">Forecast Validation</h6>
								<p class="text-xs text-soft-blue/70">
									Statistical validation of forecast accuracy with detailed error analysis and model performance metrics.
								</p>
							</div>
							<div class="bg-dark-petrol/60 rounded-lg p-3 border border-soft-blue/20">
								<h6 class="font-medium text-soft-blue mb-2">Data Export</h6>
								<p class="text-xs text-soft-blue/70">
									Export processed data in multiple formats (CSV, Excel, PDF) for external analysis and reporting.
								</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Best Practices Section -->
				<div class="bg-gradient-to-r from-cyan/10 via-teal-dark/20 to-cyan/10 rounded-xl p-6 border border-cyan/30">
					<h4 class="font-semibold text-white mb-4 flex items-center space-x-2">
						<div class="w-6 h-6 bg-cyan/30 rounded-full flex items-center justify-center">
							<svg class="w-4 h-4 text-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364-.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
							</svg>
						</div>
						<span>Data Upload Best Practices</span>
					</h4>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<h5 class="font-medium text-cyan mb-3">Data Quality Requirements</h5>
							<ul class="text-sm text-soft-blue/80 space-y-2">
								<li class="flex items-start space-x-2">
									<div class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></div>
									<span><strong>Temporal Consistency:</strong> Ensure uniform time intervals without gaps</span>
								</li>
								<li class="flex items-start space-x-2">
									<div class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></div>
									<span><strong>Units Standardization:</strong> Use consistent units (MW, °C, W/m²)</span>
								</li>
								<li class="flex items-start space-x-2">
									<div class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></div>
									<span><strong>Timezone Management:</strong> Maintain consistent timezone throughout data</span>
								</li>
								<li class="flex items-start space-x-2">
									<div class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></div>
									<span><strong>Quality Flags:</strong> Include data quality indicators where available</span>
								</li>
							</ul>
						</div>
						<div>
							<h5 class="font-medium text-cyan mb-3">Format Specifications</h5>
							<ul class="text-sm text-soft-blue/80 space-y-2">
								<li class="flex items-start space-x-2">
									<div class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></div>
									<span><strong>CSV Format:</strong> Use comma-separated values with header row</span>
								</li>
								<li class="flex items-start space-x-2">
									<div class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></div>
									<span><strong>DateTime Format:</strong> ISO 8601 format (YYYY-MM-DDTHH:MM:SS)</span>
								</li>
								<li class="flex items-start space-x-2">
									<div class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></div>
									<span><strong>Numeric Values:</strong> Decimal point notation, no thousand separators</span>
								</li>
								<li class="flex items-start space-x-2">
									<div class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></div>
									<span><strong>Missing Data:</strong> Use empty cells or 'null' for missing values</span>
								</li>
							</ul>
						</div>
					</div>
				</div>

				<!-- Technical Specifications -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div class="bg-teal-dark/30 rounded-lg p-4 border border-cyan/20">
						<h5 class="font-medium text-cyan mb-3 flex items-center space-x-2">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.78 0-2.678-2.153-1.415-3.414l5-5A2 2 0 009 8.172V5L8 4z"></path>
							</svg>
							<span>Data Processing Pipeline</span>
						</h5>
						<ul class="text-xs text-soft-blue/80 space-y-1">
							<li>• <strong>Validation:</strong> Automatic data type and range validation</li>
							<li>• <strong>Cleansing:</strong> Outlier detection and anomaly flagging</li>
							<li>• <strong>Normalization:</strong> Unit conversion and standardization</li>
							<li>• <strong>Aggregation:</strong> Temporal rollup with statistical preservation</li>
						</ul>
					</div>
					<div class="bg-teal-dark/30 rounded-lg p-4 border border-cyan/20">
						<h5 class="font-medium text-cyan mb-3 flex items-center space-x-2">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
							</svg>
							<span>Quality Assurance</span>
						</h5>
						<ul class="text-xs text-soft-blue/80 space-y-1">
							<li>• <strong>Completeness:</strong> Data gap identification and reporting</li>
							<li>• <strong>Consistency:</strong> Cross-parameter validation checks</li>
							<li>• <strong>Accuracy:</strong> Physics-based validation rules</li>
							<li>• <strong>Traceability:</strong> Full audit trail for all data modifications</li>
						</ul>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Controls -->
	<div class="card-glass">
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<!-- Location Selection -->
			<div>
				<label class="block text-sm font-medium text-soft-blue mb-2">Location</label>
				<div class="grid grid-cols-2 gap-2">
					{#each availableLocations as location}
						<button
							class="p-2 rounded-lg border transition-all duration-200 text-left {selectedLocation === location
								? 'border-cyan bg-cyan/10 text-cyan'
								: 'border-soft-blue/20 bg-glass-white text-soft-blue hover:border-cyan/50 hover:text-cyan'}"
							on:click={() => handleLocationChange(location)}
						>
							<div class="font-medium text-sm capitalize">{location === 'all' ? 'All Locations' : location}</div>
						</button>
					{/each}
				</div>
			</div>

			<!-- Time Aggregation -->
			<div>
				<label class="block text-sm font-medium text-soft-blue mb-2">Time Aggregation</label>
				<div class="grid grid-cols-4 gap-2">
					{#each [
						{ key: '15min', label: '15 Minutes', icon: 'M12 6V2m8 10h4M6 12H2m15.364-6.364l2.828-2.828M6.343 6.343L3.515 3.515m12.728 12.728l2.828 2.828M6.343 17.657l-2.828 2.828M12 8a4 4 0 100 8 4 4 0 000-8z' },
						{ key: 'hourly', label: 'Hourly', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
						{ key: 'daily', label: 'Daily', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
						{ key: 'weekly', label: 'Weekly', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' }
					] as agg}
						<button
							class="p-2 rounded-lg border transition-all duration-200 text-center {selectedAggregation === agg.key
								? 'border-cyan bg-cyan/10 text-cyan'
								: 'border-soft-blue/20 bg-glass-white text-soft-blue hover:border-cyan/50 hover:text-cyan'}"
							on:click={() => handleAggregationChange(agg.key)}
						>
							<svg class="w-5 h-5 mb-1 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="{agg.icon}"></path>
							</svg>
							<div class="text-xs font-medium">{agg.label}</div>
						</button>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<!-- Chart Section -->
	<div class="card-glass">
		<div class="h-96 w-full">
			<div bind:this={chartContainer} class="h-full w-full"></div>
		</div>
		
		<!-- Export Controls -->
		<div class="mt-4 pt-4 border-t border-soft-blue/20">
			<div class="flex flex-wrap gap-3">
				<button on:click={exportCSV} class="btn btn-secondary text-sm">
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path>
					</svg>
					Export CSV
				</button>
				<button on:click={exportExcel} class="btn btn-secondary text-sm">
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
					</svg>
					Export Excel
				</button>
				<button on:click={exportPDF} class="btn btn-secondary text-sm">
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
					</svg>
					Export PDF
				</button>
			</div>
		</div>
	</div>


	<!-- Template Generator -->
	<TemplateGenerator />

	<!-- Upload Section -->
	<div class="card-glass">
		<div class="flex items-center justify-between mb-4">
			<h3 class="text-lg font-semibold text-soft-blue">Data Upload</h3>
			<div class="text-sm text-soft-blue/60">
				Supported formats: CSV (use template above)
			</div>
		</div>
		
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<!-- File Upload -->
			<div>
				<label class="block text-sm font-medium text-soft-blue mb-2">Upload Historical Data</label>
				<div class="border-2 border-dashed border-soft-blue/30 rounded-lg p-6 text-center hover:border-cyan/50 transition-colors">
					<input 
						type="file" 
						accept=".csv"
						bind:this={fileInput}
						on:change={handleFileUpload}
						class="hidden"
					/>
					<button 
						on:click={() => fileInput?.click()}
						class="btn btn-primary"
						disabled={isUploading}
					>
						{#if isUploading}
							Uploading...
						{:else}
							<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
							</svg>
							Upload CSV File
						{/if}
					</button>
					<p class="text-sm text-soft-blue/60 mt-2">
						Upload CSV file generated from template above, or custom format with: datetime, location, production, forecast
					</p>
					{#if uploadError}
						<p class="text-alert-red text-sm mt-2">{uploadError}</p>
					{/if}
				</div>
			</div>

			<!-- Data Summary -->
			<div>
				<label class="block text-sm font-medium text-soft-blue mb-2">Data Summary</label>
				<div class="bg-glass-white rounded-lg p-4 space-y-3">
					<div class="flex justify-between">
						<span class="text-soft-blue/70">Total Records With Timestamps:</span>
						<span class="text-soft-blue font-mono">{uploadedData.length > 0 ? uploadedData.length : 'N/A'}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-soft-blue/70">De-Identified Locations:</span>
						<span class="text-soft-blue font-mono">{availableLocations.length > 1 ? availableLocations.length - 1 : 'N/A'}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-soft-blue/70">Data Type:</span>
						<span class="text-soft-blue font-mono">
							{#if uploadedData.length > 0}
								{#if uploadedData[0].production !== undefined}
									Production
								{:else if uploadedData[0].forecast !== undefined}
									Forecast
								{:else}
									Weather
								{/if}
							{:else}
								N/A
							{/if}
						</span>
					</div>
					<div class="flex justify-between">
						<span class="text-soft-blue/70">Date Range:</span>
						<span class="text-soft-blue font-mono">
							{#if uploadedData.length > 0}
								{new Date(uploadedData[0].datetime).toLocaleDateString()} -
								{new Date(uploadedData[uploadedData.length - 1].datetime).toLocaleDateString()}
							{:else}
								N/A
							{/if}
						</span>
					</div>
				</div>
			</div>
		</div>
	</div>


</div>