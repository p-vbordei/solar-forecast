<script lang="ts">
	// Template configuration options
	let selectedLocation = 'site_a';
	let selectedAggregation = 'hourly';
	let selectedTimezone = 'Europe/Bucharest';
	let startDate = new Date().toISOString().split('T')[0];
	let endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 7 days from now
	let includeWeatherData = true;
	let includeProductionData = true;
	let includeForecastData = true;

	// Available options
	const locations = [
		{ id: 'site_a', name: 'Solar Farm Site A', coordinates: '45.1234, 25.5678' },
		{ id: 'site_b', name: 'Solar Farm Site B', coordinates: '44.9876, 26.9012' },
		{ id: 'veranda_mall', name: 'Veranda Mall Bucharest', coordinates: '44.4522, 26.1306' },
		{ id: 'custom', name: 'Custom Location', coordinates: 'User defined' }
	];

	const aggregations = [
		{ key: '15min', label: '15 Minutes', duration: 15, unit: 'minutes' },
		{ key: 'hourly', label: 'Hourly', duration: 1, unit: 'hours' },
		{ key: 'daily', label: 'Daily', duration: 1, unit: 'days' }
	];

	const timezones = [
		{ id: 'UTC', name: 'UTC (Coordinated Universal Time)', offset: '+00:00' },
		{ id: 'Europe/Bucharest', name: 'Europe/Bucharest (EET/EEST)', offset: '+02:00' },
		{ id: 'Europe/London', name: 'Europe/London (GMT/BST)', offset: '+00:00' },
		{ id: 'Europe/Berlin', name: 'Europe/Berlin (CET/CEST)', offset: '+01:00' },
		{ id: 'America/New_York', name: 'America/New_York (EST/EDT)', offset: '-05:00' },
		{ id: 'America/Los_Angeles', name: 'America/Los_Angeles (PST/PDT)', offset: '-08:00' },
		{ id: 'Asia/Tokyo', name: 'Asia/Tokyo (JST)', offset: '+09:00' },
		{ id: 'Australia/Sydney', name: 'Australia/Sydney (AEST/AEDT)', offset: '+10:00' }
	];

	// CSV column definitions
	const baseColumns = ['datetime', 'location'];
	
	const weatherColumns = [
		'temperature_2m', 'relative_humidity_2m', 'surface_pressure', 'dew_point_2m',
		'shortwave_radiation', 'direct_radiation', 'diffuse_radiation', 'global_tilted_irradiance',
		'cloud_cover', 'cloud_cover_low', 'cloud_cover_mid', 'cloud_cover_high',
		'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m',
		'precipitation', 'rain', 'visibility', 'sunshine_duration'
	];

	const productionColumns = [
		'production_mw', 'capacity_factor', 'performance_ratio', 'availability'
	];

	const forecastColumns = [
		'forecast_production_mw', 'forecast_confidence', 'forecast_model_version'
	];

	// Generate datetime array based on configuration
	function generateDatetimeArray() {
		const start = new Date(startDate);
		const end = new Date(endDate);
		const datetimes: string[] = [];
		
		const aggregation = aggregations.find(a => a.key === selectedAggregation);
		if (!aggregation) return datetimes;

		let current = new Date(start);
		
		while (current <= end) {
			// Format datetime based on timezone
			const utcTime = current.toISOString();
			const localTime = new Date(current.toLocaleString('en-US', { timeZone: selectedTimezone }));
			
			// Format based on aggregation level
			let formattedTime: string;
			if (selectedAggregation === '15min') {
				formattedTime = current.toISOString().slice(0, 16) + ':00'; // YYYY-MM-DDTHH:MM:SS
			} else if (selectedAggregation === 'hourly') {
				formattedTime = current.toISOString().slice(0, 13) + ':00:00'; // YYYY-MM-DDTHH:00:00
			} else {
				formattedTime = current.toISOString().slice(0, 10) + 'T00:00:00'; // YYYY-MM-DDTHH:00:00
			}
			
			datetimes.push(formattedTime);
			
			// Increment based on aggregation
			if (selectedAggregation === '15min') {
				current.setMinutes(current.getMinutes() + 15);
			} else if (selectedAggregation === 'hourly') {
				current.setHours(current.getHours() + 1);
			} else {
				current.setDate(current.getDate() + 1);
			}
		}
		
		return datetimes;
	}

	// Generate CSV template
	function generateTemplate() {
		const datetimes = generateDatetimeArray();
		const selectedLocationData = locations.find(l => l.id === selectedLocation);
		
		// Build columns array
		let columns = [...baseColumns];
		
		if (includeWeatherData) {
			columns = [...columns, ...weatherColumns];
		}
		
		if (includeProductionData) {
			columns = [...columns, ...productionColumns];
		}
		
		if (includeForecastData) {
			columns = [...columns, ...forecastColumns];
		}

		// Generate CSV content
		const csvContent = [
			// Header row
			columns.join(','),
			// Data rows with sample/placeholder values
			...datetimes.map(datetime => {
				const row = [datetime, selectedLocationData?.name || 'Custom Location'];
				
				// Add weather data placeholders
				if (includeWeatherData) {
					row.push(
						'20.5',    // temperature_2m
						'65',      // relative_humidity_2m
						'1013.2',  // surface_pressure
						'12.3',    // dew_point_2m
						'650',     // shortwave_radiation
						'800',     // direct_radiation
						'150',     // diffuse_radiation
						'700',     // global_tilted_irradiance
						'25',      // cloud_cover
						'15',      // cloud_cover_low
						'10',      // cloud_cover_mid
						'5',       // cloud_cover_high
						'8.2',     // wind_speed_10m
						'180',     // wind_direction_10m
						'12.5',    // wind_gusts_10m
						'0',       // precipitation
						'0',       // rain
						'15.5',    // visibility
						'45'       // sunshine_duration
					);
				}
				
				// Add production data placeholders
				if (includeProductionData) {
					row.push(
						'45.8',    // production_mw
						'0.82',    // capacity_factor
						'0.89',    // performance_ratio
						'0.98'     // availability
					);
				}
				
				// Add forecast data placeholders
				if (includeForecastData) {
					row.push(
						'47.2',    // forecast_production_mw
						'0.95',    // forecast_confidence
						'v2.1.3'   // forecast_model_version
					);
				}
				
				return row.join(',');
			})
		].join('\n');

		return csvContent;
	}

	// Download template
	function downloadTemplate() {
		const csvContent = generateTemplate();
		const aggregation = aggregations.find(a => a.key === selectedAggregation);
		const location = locations.find(l => l.id === selectedLocation);
		
		const filename = `solar_data_template_${location?.id || 'custom'}_${selectedAggregation}_${startDate}_${endDate}.csv`;
		
		const blob = new Blob([csvContent], { type: 'text/csv' });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		window.URL.revokeObjectURL(url);
	}

	// Calculate template statistics
	$: templateStats = {
		totalRows: generateDatetimeArray().length,
		dateRange: `${startDate} to ${endDate}`,
		columns: baseColumns.length + 
			(includeWeatherData ? weatherColumns.length : 0) + 
			(includeProductionData ? productionColumns.length : 0) + 
			(includeForecastData ? forecastColumns.length : 0),
		estimatedSize: Math.round((generateDatetimeArray().length * 
			(baseColumns.length + 
			(includeWeatherData ? weatherColumns.length : 0) + 
			(includeProductionData ? productionColumns.length : 0) + 
			(includeForecastData ? forecastColumns.length : 0)) * 8) / 1024) // KB estimate
	};
</script>

<div class="card-glass">
	<div class="flex items-center justify-between mb-6">
		<div>
			<h3 class="text-lg font-semibold text-soft-blue">Data Template Generator</h3>
			<p class="text-sm text-soft-blue/60 mt-1">Create customized CSV templates for historical data upload</p>
		</div>
		<button 
			on:click={downloadTemplate}
			class="btn btn-primary"
		>
			<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path>
			</svg>
			Generate Template
		</button>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Configuration Options -->
		<div class="space-y-4">
			<!-- Location Selection -->
			<div>
				<label class="block text-sm font-medium text-soft-blue mb-2">Location</label>
				<div class="space-y-2">
					{#each locations as location}
						<label class="flex items-center space-x-3 cursor-pointer">
							<input 
								type="radio" 
								bind:group={selectedLocation} 
								value={location.id}
								class="w-4 h-4 text-cyan bg-glass-white border-soft-blue/30 focus:ring-cyan focus:ring-2"
							/>
							<div class="flex-1">
								<div class="text-sm font-medium text-soft-blue">{location.name}</div>
								<div class="text-xs text-soft-blue/60">{location.coordinates}</div>
							</div>
						</label>
					{/each}
				</div>
			</div>

			<!-- Time Aggregation -->
			<div>
				<label class="block text-sm font-medium text-soft-blue mb-2">Time Aggregation</label>
				<div class="grid grid-cols-3 gap-2">
					{#each aggregations as agg}
						<label class="cursor-pointer">
							<input 
								type="radio" 
								bind:group={selectedAggregation} 
								value={agg.key}
								class="sr-only"
							/>
							<div class="p-3 rounded-lg border transition-all duration-200 text-center {selectedAggregation === agg.key
								? 'border-cyan bg-cyan/10 text-cyan'
								: 'border-soft-blue/20 bg-glass-white text-soft-blue hover:border-cyan/50 hover:text-cyan'}">
								<svg class="w-5 h-5 mb-1 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="{
										agg.key === '15min' ? 'M12 6V2m8 10h4M6 12H2m15.364-6.364l2.828-2.828M6.343 6.343L3.515 3.515m12.728 12.728l2.828 2.828M6.343 17.657l-2.828 2.828M12 8a4 4 0 100 8 4 4 0 000-8z' :
										agg.key === 'hourly' ? 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' :
										'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
									}"></path>
								</svg>
								<div class="text-xs font-medium">{agg.label}</div>
							</div>
						</label>
					{/each}
				</div>
			</div>

			<!-- Timezone Selection -->
			<div>
				<label class="block text-sm font-medium text-soft-blue mb-2">Timezone</label>
				<select 
					bind:value={selectedTimezone}
					class="w-full px-3 py-2 border border-soft-blue/30 rounded-lg bg-glass-white text-soft-blue focus:border-cyan focus:ring-1 focus:ring-cyan"
				>
					{#each timezones as tz}
						<option value={tz.id}>{tz.name}</option>
					{/each}
				</select>
			</div>

			<!-- Date Range -->
			<div class="grid grid-cols-2 gap-3">
				<div>
					<label class="block text-sm font-medium text-soft-blue mb-2">Start Date</label>
					<input 
						type="date" 
						bind:value={startDate}
						class="w-full px-3 py-2 border border-soft-blue/30 rounded-lg bg-glass-white text-soft-blue focus:border-cyan focus:ring-1 focus:ring-cyan"
					/>
				</div>
				<div>
					<label class="block text-sm font-medium text-soft-blue mb-2">End Date</label>
					<input 
						type="date" 
						bind:value={endDate}
						class="w-full px-3 py-2 border border-soft-blue/30 rounded-lg bg-glass-white text-soft-blue focus:border-cyan focus:ring-1 focus:ring-cyan"
					/>
				</div>
			</div>
		</div>

		<!-- Data Types & Template Preview -->
		<div class="space-y-4">
			<!-- Data Types -->
			<div>
				<label class="block text-sm font-medium text-soft-blue mb-3">Include Data Types</label>
				<div class="space-y-3">
					<label class="flex items-center space-x-3 cursor-pointer">
						<input 
							type="checkbox" 
							bind:checked={includeWeatherData}
							class="w-4 h-4 text-cyan bg-glass-white border-soft-blue/30 rounded focus:ring-cyan focus:ring-2"
						/>
						<div class="flex-1">
							<div class="text-sm font-medium text-soft-blue">Weather Data</div>
							<div class="text-xs text-soft-blue/60">{weatherColumns.length} columns: temperature, humidity, radiation, etc.</div>
						</div>
					</label>

					<label class="flex items-center space-x-3 cursor-pointer">
						<input 
							type="checkbox" 
							bind:checked={includeProductionData}
							class="w-4 h-4 text-cyan bg-glass-white border-soft-blue/30 rounded focus:ring-cyan focus:ring-2"
						/>
						<div class="flex-1">
							<div class="text-sm font-medium text-soft-blue">Production Data</div>
							<div class="text-xs text-soft-blue/60">{productionColumns.length} columns: production, capacity factor, availability</div>
						</div>
					</label>

					<label class="flex items-center space-x-3 cursor-pointer">
						<input 
							type="checkbox" 
							bind:checked={includeForecastData}
							class="w-4 h-4 text-cyan bg-glass-white border-soft-blue/30 rounded focus:ring-cyan focus:ring-2"
						/>
						<div class="flex-1">
							<div class="text-sm font-medium text-soft-blue">Forecast Data</div>
							<div class="text-xs text-soft-blue/60">{forecastColumns.length} columns: forecast values, confidence, model version</div>
						</div>
					</label>
				</div>
			</div>

			<!-- Template Statistics -->
			<div class="bg-glass-white rounded-lg p-4">
				<h4 class="text-sm font-medium text-soft-blue mb-3">Template Statistics</h4>
				<div class="space-y-2 text-sm">
					<div class="flex justify-between">
						<span class="text-soft-blue/70">Total Rows:</span>
						<span class="text-soft-blue font-mono">{templateStats.totalRows.toLocaleString()}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-soft-blue/70">Total Columns:</span>
						<span class="text-soft-blue font-mono">{templateStats.columns}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-soft-blue/70">Date Range:</span>
						<span class="text-soft-blue font-mono text-xs">{templateStats.dateRange}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-soft-blue/70">Estimated Size:</span>
						<span class="text-soft-blue font-mono">{templateStats.estimatedSize} KB</span>
					</div>
				</div>
			</div>

			<!-- Instructions -->
			<div class="bg-cyan/10 border border-cyan/30 rounded-lg p-4">
				<h4 class="text-sm font-medium text-cyan mb-2">Instructions</h4>
				<ol class="text-xs text-soft-blue/80 space-y-1 list-decimal list-inside">
					<li>Configure your location, aggregation, and timezone settings</li>
					<li>Select which data types to include in the template</li>
					<li>Click "Generate Template" to download the CSV file</li>
					<li>Fill in your actual data in the generated template</li>
					<li>Upload the completed template using the file upload above</li>
				</ol>
			</div>
		</div>
	</div>
</div>