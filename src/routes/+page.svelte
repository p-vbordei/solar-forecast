<script lang="ts">
	import { onMount } from 'svelte';
	import MetricCard from '$lib/components/dashboard/MetricCard.svelte';
	import DashboardSolarForecast from '$lib/components/dashboard/DashboardSolarForecast.svelte';
	import DashboardProductionForecast from '$lib/components/dashboard/DashboardProductionForecast.svelte';
	import WeatherSyncButton from '$lib/components/weather/WeatherSyncButton.svelte';
	import DocumentTextIcon from '$lib/components/icons/DocumentTextIcon.svelte';
	import ChartBarIcon from '$lib/components/icons/ChartBarIcon.svelte';

	let showExplanation = false;

	// Dashboard location selection
	let selectedDashboardLocation = '550e8400-e29b-41d4-a716-446655440004'; // Default UUID

	// Get locations from API
	let locations: any[] = [];
	let isLoadingLocations = true;

	async function loadLocations() {
		try {
			const response = await fetch('/api/locations');
			if (response.ok) {
				const result = await response.json();
				locations = result.data || [];
				if (locations.length > 0) {
					selectedDashboardLocation = locations[0].id;
				}
			} else {
				console.error('Failed to load locations');
			}
		} catch (error) {
			console.error('Error loading locations:', error);
		} finally {
			isLoadingLocations = false;
		}
	}

	// Load data on mount
	onMount(() => {
		loadLocations();
	});

	// Mock data for now
	const metrics = {
		currentProduction: 87.5,
		dailyEnergy: 1245.8,
		forecastAccuracy: 94.2
	};
</script>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex justify-between items-start">
		<div>
			<h1 class="text-3xl font-bold text-soft-blue">Energy Dashboard</h1>
			<p class="text-soft-blue/60 mt-2">Real-time solar energy production monitoring and forecasting</p>
		</div>

		<!-- Weather Sync Controls -->
		<div class="mt-2">
			<WeatherSyncButton
				on:syncSuccess={() => console.log('Weather sync successful - dashboard can refresh')}
				on:syncError={(e) => console.error('Weather sync error:', e.detail)}
			/>
		</div>
	</div>
	
	<!-- Metrics Grid -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<MetricCard
			title="Current Production"
			value="{metrics.currentProduction}"
			unit="MW"
			change="+12.5%"
			trend="up"
			icon="solar"
		/>
		<MetricCard
			title="Daily Energy"
			value="{metrics.dailyEnergy}"
			unit="MWh"
			change="+8.3%"
			trend="up"
			icon="energy"
		/>
		<MetricCard
			title="Forecast Accuracy"
			value="{metrics.forecastAccuracy}"
			unit="%"
			change="+2.1%"
			trend="up"
			icon="accuracy"
		/>
	</div>
	
	<!-- Weather Location Selector -->
	<div class="card-glass">
		<h2 class="text-lg font-semibold text-soft-blue mb-4">Dashboard Location</h2>
		<div class="flex items-center gap-4">
			<div class="flex-1">
				<label for="dashboard-location-select" class="label">Select Location for Weather Data</label>
				<select id="dashboard-location-select" class="select" bind:value={selectedDashboardLocation}>
					{#if isLoadingLocations}
						<option>Loading locations...</option>
					{:else}
						{#each locations as location}
							<option value={location.id}>{location.name}</option>
						{/each}
					{/if}
				</select>
			</div>
			<div class="text-sm text-soft-blue/60 max-w-xs">
				<p>Choose which location's data to display in the dashboard metrics and weather parameters.</p>
			</div>
		</div>
	</div>

	<!-- Main Content Grid -->
	<div class="grid grid-cols-1 gap-6">
		{#if isLoadingLocations}
			<div class="card-glass">
				<div class="flex items-center justify-center p-8">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan"></div>
					<span class="ml-3 text-soft-blue">Loading dashboard data...</span>
				</div>
			</div>
		{:else}
			<!-- Solar Forecast -->
			<div>
				<DashboardSolarForecast
					locationId={selectedDashboardLocation}
					locationName={locations.find(l => l.id === selectedDashboardLocation)?.name || 'Selected Location'}
					isMockData={false}
				/>
			</div>

			<!-- Production Forecast -->
			<div>
				<DashboardProductionForecast
					locationId={selectedDashboardLocation}
					locationName={locations.find(l => l.id === selectedDashboardLocation)?.name || 'Selected Location'}
				/>
			</div>
		{/if}
	</div>
	
	

	<!-- Understanding Solar Dashboard -->
	<div class="card-glass">
		<button 
			on:click={() => showExplanation = !showExplanation}
			class="flex items-center justify-between w-full text-left"
		>
			<div class="flex items-center space-x-3">
				<div class="w-8 h-8 bg-gradient-to-br from-cyan to-soft-blue rounded-xl flex items-center justify-center shadow-lg shadow-cyan/30">
					<DocumentTextIcon class="w-4 h-4 text-dark-petrol" />
				</div>
				<div>
					<h3 class="text-lg font-semibold text-white">Understanding the Solar Dashboard</h3>
					<p class="text-sm text-soft-blue/80">Comprehensive guide to real-time monitoring and analytics platform</p>
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
				<!-- Platform Introduction -->
				<div class="bg-gradient-to-br from-teal-dark/40 to-dark-petrol/60 rounded-xl p-6 border border-cyan/20">
					<h4 class="font-semibold text-white mb-3 flex items-center space-x-2">
						<div class="w-6 h-6 bg-cyan/20 rounded-full flex items-center justify-center">
							<svg class="w-4 h-4 text-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
							</svg>
						</div>
						<span>Professional Solar Energy Command Center</span>
					</h4>
					<p class="text-sm text-soft-blue/80 leading-relaxed mb-4">
						The Solar Dashboard serves as a comprehensive command center for solar energy portfolio management, providing real-time operational intelligence, 
						predictive analytics, and strategic insights. Built for professional solar operators, energy traders, and facility managers, 
						this platform integrates live production data, weather correlations, and advanced forecasting models to optimize energy generation and grid integration strategies.
					</p>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div class="bg-cyan/10 rounded-lg p-3 border border-cyan/30">
							<p class="text-xs text-soft-blue/70">
								<strong class="text-cyan">Real-Time Intelligence:</strong> Sub-15-minute data processing with automated anomaly detection, 
								performance benchmarking, and predictive maintenance alerting across multi-site solar installations.
							</p>
						</div>
						<div class="bg-cyan/10 rounded-lg p-3 border border-cyan/30">
							<p class="text-xs text-soft-blue/70">
								<strong class="text-cyan">Advanced Analytics:</strong> Machine learning-powered forecasting models combining meteorological data, 
								historical patterns, and real-time performance metrics for accurate production predictions and optimization.
							</p>
						</div>
					</div>
				</div>

				<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<!-- Dashboard Components -->
					<div class="lg:col-span-2">
						<h4 class="font-semibold text-white mb-4 flex items-center space-x-2">
							<div class="w-6 h-6 bg-cyan/20 rounded-full flex items-center justify-center">
								<svg class="w-4 h-4 text-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
								</svg>
							</div>
							<span>Dashboard Components & Analytics</span>
						</h4>
						<div class="space-y-4">
							<!-- Metrics Overview -->
							<div class="bg-teal-dark/30 rounded-lg p-4 border border-cyan/20">
								<h5 class="font-medium text-cyan mb-2 flex items-center space-x-2">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
									</svg>
									<span>Real-Time Production Metrics</span>
								</h5>
								<ul class="text-xs text-soft-blue/80 space-y-1">
									<li>• <strong>Current Production (MW):</strong> Live power generation with 15-second refresh intervals and trend analysis</li>
									<li>• <strong>Daily Energy (MWh):</strong> Cumulative energy production with capacity factor calculations and performance ratios</li>
									<li>• <strong>Forecast Accuracy (%):</strong> Real-time validation of prediction models with MAPE and RMSE metrics</li>
									<li>• <strong>System Availability:</strong> Operational status monitoring with downtime tracking and maintenance alerting</li>
								</ul>
							</div>

							<!-- Forecasting Engine -->
							<div class="bg-teal-dark/30 rounded-lg p-4 border border-cyan/20">
								<h5 class="font-medium text-cyan mb-2 flex items-center space-x-2">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path>
									</svg>
									<span>Advanced Forecasting System</span>
								</h5>
								<ul class="text-xs text-soft-blue/80 space-y-1">
									<li>• <strong>Solar Irradiance Forecasting:</strong> GHI, DNI, and DHI predictions with confidence intervals</li>
									<li>• <strong>Weather Impact Analysis:</strong> Cloud coverage, temperature, and atmospheric conditions correlation</li>
									<li>• <strong>Production Predictions:</strong> 1-5 day ahead forecasts with ensemble model averaging</li>
									<li>• <strong>Grid Integration Support:</strong> Optimized for energy trading and ancillary services planning</li>
								</ul>
							</div>

							<!-- Performance Analytics -->
							<div class="bg-teal-dark/30 rounded-lg p-4 border border-cyan/20">
								<h5 class="font-medium text-cyan mb-2 flex items-center space-x-2">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
									</svg>
									<span>Performance Monitoring & Alerts</span>
								</h5>
								<ul class="text-xs text-soft-blue/80 space-y-1">
									<li>• <strong>Automated Anomaly Detection:</strong> AI-powered identification of performance deviations and equipment issues</li>
									<li>• <strong>Comparative Analysis:</strong> Site-to-site performance benchmarking with normalized weather conditions</li>
									<li>• <strong>Revenue Impact Tracking:</strong> Energy production value with market price integration</li>
									<li>• <strong>Maintenance Optimization:</strong> Predictive maintenance scheduling based on performance trends</li>
								</ul>
							</div>
						</div>
					</div>

					<!-- Dashboard Navigation -->
					<div>
						<h4 class="font-semibold text-white mb-4 flex items-center space-x-2">
							<div class="w-6 h-6 bg-cyan/20 rounded-full flex items-center justify-center">
								<svg class="w-4 h-4 text-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"></path>
								</svg>
							</div>
							<span>Navigation & Actions</span>
						</h4>
						<div class="space-y-3">
							<div class="bg-dark-petrol/60 rounded-lg p-3 border border-soft-blue/20">
								<h6 class="font-medium text-soft-blue mb-2">Platform Navigation</h6>
								<ul class="text-xs text-soft-blue/70 space-y-1">
									<li>• <strong>Reports:</strong> Access detailed production and forecast accuracy reports</li>
									<li>• <strong>Analysis:</strong> Advanced analytics with forecast visualization and accuracy metrics</li>
									<li>• <strong>Historical Data:</strong> Upload and analyze historical production data for model training</li>
									<li>• <strong>Locations:</strong> Manage solar installation sites and their configurations</li>
								</ul>
							</div>
							<div class="bg-dark-petrol/60 rounded-lg p-3 border border-soft-blue/20">
								<h6 class="font-medium text-soft-blue mb-2">Data Integration</h6>
								<ul class="text-xs text-soft-blue/70 space-y-1">
									<li>• <strong>SCADA Integration:</strong> Direct connection to plant control systems</li>
									<li>• <strong>Weather APIs:</strong> Multiple meteorological data sources</li>
									<li>• <strong>Market Data:</strong> Real-time energy pricing integration</li>
									<li>• <strong>Export Capabilities:</strong> API endpoints for external system integration</li>
								</ul>
							</div>
						</div>
					</div>
				</div>

				<!-- Business Intelligence Features -->
				<div class="bg-gradient-to-r from-cyan/10 via-teal-dark/20 to-cyan/10 rounded-xl p-6 border border-cyan/30">
					<h4 class="font-semibold text-white mb-4 flex items-center space-x-2">
						<div class="w-6 h-6 bg-cyan/30 rounded-full flex items-center justify-center">
							<svg class="w-4 h-4 text-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
							</svg>
						</div>
						<span>Advanced Business Intelligence</span>
					</h4>
					<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div>
							<h5 class="font-medium text-cyan mb-3">Operational Intelligence</h5>
							<ul class="text-sm text-soft-blue/80 space-y-2">
								<li class="flex items-start space-x-2">
									<div class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></div>
									<span><strong>Real-Time Monitoring:</strong> Continuous system health and performance tracking</span>
								</li>
								<li class="flex items-start space-x-2">
									<div class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></div>
									<span><strong>Alert Management:</strong> Automated notifications for performance anomalies</span>
								</li>
								<li class="flex items-start space-x-2">
									<div class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></div>
									<span><strong>Maintenance Planning:</strong> Predictive maintenance scheduling optimization</span>
								</li>
							</ul>
						</div>
						<div>
							<h5 class="font-medium text-cyan mb-3">Financial Analytics</h5>
							<ul class="text-sm text-soft-blue/80 space-y-2">
								<li class="flex items-start space-x-2">
									<div class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></div>
									<span><strong>Revenue Tracking:</strong> Real-time energy value calculation with market pricing</span>
								</li>
								<li class="flex items-start space-x-2">
									<div class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></div>
									<span><strong>ROI Analysis:</strong> Performance impact on investment returns</span>
								</li>
								<li class="flex items-start space-x-2">
									<div class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></div>
									<span><strong>Trading Support:</strong> Production forecasts optimized for energy markets</span>
								</li>
							</ul>
						</div>
						<div>
							<h5 class="font-medium text-cyan mb-3">Strategic Planning</h5>
							<ul class="text-sm text-soft-blue/80 space-y-2">
								<li class="flex items-start space-x-2">
									<div class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></div>
									<span><strong>Portfolio Optimization:</strong> Multi-site performance analysis and benchmarking</span>
								</li>
								<li class="flex items-start space-x-2">
									<div class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></div>
									<span><strong>Capacity Planning:</strong> Future installation site evaluation and sizing</span>
								</li>
								<li class="flex items-start space-x-2">
									<div class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></div>
									<span><strong>Grid Integration:</strong> Network impact analysis and ancillary services optimization</span>
								</li>
							</ul>
						</div>
					</div>
				</div>

				<!-- Technical Architecture -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div class="bg-teal-dark/30 rounded-lg p-4 border border-cyan/20">
						<h5 class="font-medium text-cyan mb-3 flex items-center space-x-2">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path>
							</svg>
							<span>Platform Architecture</span>
						</h5>
						<ul class="text-xs text-soft-blue/80 space-y-1">
							<li>• <strong>Microservices:</strong> Scalable, distributed system architecture</li>
							<li>• <strong>Real-Time Processing:</strong> Event-driven data pipeline with sub-minute latency</li>
							<li>• <strong>Machine Learning:</strong> Integrated ML models for forecasting and anomaly detection</li>
							<li>• <strong>API Integration:</strong> RESTful APIs for external system connectivity</li>
						</ul>
					</div>
					<div class="bg-teal-dark/30 rounded-lg p-4 border border-cyan/20">
						<h5 class="font-medium text-cyan mb-3 flex items-center space-x-2">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
							</svg>
							<span>Security & Compliance</span>
						</h5>
						<ul class="text-xs text-soft-blue/80 space-y-1">
							<li>• <strong>Data Encryption:</strong> End-to-end encryption for all data transmission and storage</li>
							<li>• <strong>Access Control:</strong> Role-based authentication with multi-factor security</li>
							<li>• <strong>Audit Trails:</strong> Comprehensive logging for regulatory compliance</li>
							<li>• <strong>Data Privacy:</strong> GDPR and industry standard compliance measures</li>
						</ul>
					</div>
				</div>

				<!-- User Experience Features -->
				<div class="bg-gradient-to-br from-dark-petrol/60 to-teal-dark/40 rounded-xl p-6 border border-cyan/20">
					<h4 class="font-medium text-white mb-4 flex items-center space-x-2">
						<svg class="w-5 h-5 text-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
						</svg>
						<span>Professional User Experience</span>
					</h4>
					
					<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
						<div class="bg-dark-petrol/50 rounded-lg p-3 border border-cyan/30">
							<div class="text-cyan font-medium mb-1">Responsive Design</div>
							<div class="text-soft-blue/80 text-xs">Optimized for desktop, tablet, and mobile devices</div>
						</div>
						
						<div class="bg-dark-petrol/50 rounded-lg p-3 border border-cyan/30">
							<div class="text-cyan font-medium mb-1">Real-Time Updates</div>
							<div class="text-soft-blue/80 text-xs">Auto-refresh with WebSocket connections</div>
						</div>
						
						<div class="bg-dark-petrol/50 rounded-lg p-3 border border-cyan/30">
							<div class="text-cyan font-medium mb-1">Interactive Charts</div>
							<div class="text-soft-blue/80 text-xs">Advanced data visualization with drill-down capabilities</div>
						</div>
						
						<div class="bg-dark-petrol/50 rounded-lg p-3 border border-cyan/30">
							<div class="text-cyan font-medium mb-1">Custom Alerts</div>
							<div class="text-soft-blue/80 text-xs">Configurable thresholds and notification channels</div>
						</div>
						
						<div class="bg-dark-petrol/50 rounded-lg p-3 border border-cyan/30">
							<div class="text-cyan font-medium mb-1">Export Tools</div>
							<div class="text-soft-blue/80 text-xs">PDF, Excel, CSV formats with custom templates</div>
						</div>
						
						<div class="bg-dark-petrol/50 rounded-lg p-3 border border-cyan/30">
							<div class="text-cyan font-medium mb-1">Multi-Timezone</div>
							<div class="text-soft-blue/80 text-xs">Global timezone support with DST handling</div>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>

</div>