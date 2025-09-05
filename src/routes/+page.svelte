<script lang="ts">
	import MetricCard from '$lib/components/dashboard/MetricCard.svelte';
	import ProductionChart from '$lib/components/dashboard/ProductionChart.svelte';
	import LocationsMap from '$lib/components/dashboard/LocationsMap.svelte';
	import ForecastAccuracy from '$lib/components/dashboard/ForecastAccuracy.svelte';
	import DocumentTextIcon from '$lib/components/icons/DocumentTextIcon.svelte';
	import ChartBarIcon from '$lib/components/icons/ChartBarIcon.svelte';
	
	let showExplanation = false;
	
	// Mock data for now
	const metrics = {
		currentProduction: 87.5,
		dailyEnergy: 1245.8,
		forecastAccuracy: 94.2
	};
</script>

<div class="space-y-6">
	<!-- Page Header -->
	<div>
		<h1 class="text-3xl font-bold text-soft-blue">Energy Dashboard</h1>
		<p class="text-soft-blue/60 mt-2">Real-time solar energy production monitoring and forecasting</p>
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
	
	<!-- Main Content Grid -->
	<div class="grid grid-cols-1 gap-6">
		<!-- Production Chart -->
		<div>
			<ProductionChart />
		</div>
	</div>
	
	<!-- Secondary Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Locations Map -->
		<div>
			<LocationsMap />
		</div>
		
		<!-- Forecast Accuracy -->
		<div>
			<ForecastAccuracy />
		</div>
	</div>
	
	<!-- Quick Actions -->
	<div class="card-glass">
		<h3 class="text-lg font-semibold text-soft-blue mb-4">Quick Actions</h3>
		<div class="flex flex-wrap gap-3">
			<button class="btn btn-primary">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				Add Location
			</button>
			<button class="btn btn-secondary">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
				</svg>
				Generate Forecast
			</button>
			<button class="btn btn-secondary">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
				</svg>
				Export Report
			</button>
			<button class="btn btn-secondary">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
				</svg>
				Settings
			</button>
		</div>
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
					<p class="text-sm text-soft-blue/80">Learn how to monitor and analyze your solar energy production</p>
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
					<!-- Dashboard Overview -->
					<div>
						<h4 class="font-semibold text-white mb-3 flex items-center space-x-2">
							<span class="w-6 h-6 bg-cyan/20 rounded-full flex items-center justify-center text-cyan text-sm font-bold">1</span>
							<span>Real-time Monitoring</span>
						</h4>
						<p class="text-sm text-soft-blue/80 leading-relaxed mb-3">
							The dashboard provides real-time insights into your solar energy production across all locations.
							Monitor current output, daily energy generation, forecast accuracy, and system health from a unified view.
						</p>
						<div class="bg-cyan/20 rounded-lg p-3 border border-cyan/30">
							<p class="text-xs text-soft-blue/70">
								<strong class="text-cyan">Live Data:</strong> All metrics update automatically every 15 minutes 
								with direct data feeds from inverters and weather stations.
							</p>
						</div>
					</div>

					<!-- Key Metrics -->
					<div>
						<h4 class="font-semibold text-white mb-3 flex items-center space-x-2">
							<span class="w-6 h-6 bg-cyan/20 rounded-full flex items-center justify-center text-cyan text-sm font-bold">2</span>
							<span>Key Performance Metrics</span>
						</h4>
						<div class="space-y-2">
							<div class="flex items-start space-x-2">
								<span class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></span>
								<p class="text-sm text-soft-blue/80"><strong class="text-white">Current Production:</strong> Live power generation in MW</p>
							</div>
							<div class="flex items-start space-x-2">
								<span class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></span>
								<p class="text-sm text-soft-blue/80"><strong class="text-white">Daily Energy:</strong> Cumulative energy produced today in MWh</p>
							</div>
							<div class="flex items-start space-x-2">
								<span class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></span>
								<p class="text-sm text-soft-blue/80"><strong class="text-white">Forecast Accuracy:</strong> How well predictions match actual output</p>
							</div>
						</div>
					</div>

					<!-- Visual Components -->
					<div>
						<h4 class="font-semibold text-white mb-3 flex items-center space-x-2">
							<span class="w-6 h-6 bg-cyan/20 rounded-full flex items-center justify-center text-cyan text-sm font-bold">3</span>
							<span>Interactive Charts & Maps</span>
						</h4>
						<div class="space-y-2 text-sm">
							<div class="flex justify-between">
								<span class="text-cyan"><strong>Production Chart:</strong></span>
								<span class="text-soft-blue/80">24-hour energy generation trends</span>
							</div>
							<div class="flex justify-between">
								<span class="text-cyan"><strong>Locations Map:</strong></span>
								<span class="text-soft-blue/80">Geographic distribution of solar farms</span>
							</div>
							<div class="flex justify-between">
								<span class="text-cyan"><strong>Forecast Accuracy:</strong></span>
								<span class="text-soft-blue/80">Prediction vs actual performance</span>
							</div>
						</div>
					</div>

					<!-- Quick Actions -->
					<div>
						<h4 class="font-semibold text-white mb-3 flex items-center space-x-2">
							<span class="w-6 h-6 bg-cyan/20 rounded-full flex items-center justify-center text-cyan text-sm font-bold">4</span>
							<span>Quick Actions</span>
						</h4>
						<div class="space-y-2">
							<div class="flex items-start space-x-2">
								<span class="text-cyan">•</span>
								<p class="text-sm text-soft-blue/80"><strong class="text-white">Add Location:</strong> Register new solar installation sites</p>
							</div>
							<div class="flex items-start space-x-2">
								<span class="text-cyan">•</span>
								<p class="text-sm text-soft-blue/80"><strong class="text-white">Generate Forecast:</strong> Create production predictions</p>
							</div>
							<div class="flex items-start space-x-2">
								<span class="text-cyan">•</span>
								<p class="text-sm text-soft-blue/80"><strong class="text-white">Export Report:</strong> Download performance summaries</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Dashboard Tools -->
				<div class="bg-teal-dark/30 rounded-xl p-4 border border-cyan/20">
					<h5 class="font-medium text-white mb-2 flex items-center space-x-2">
						<ChartBarIcon class="w-4 h-4 text-cyan" />
						<span>Dashboard Features</span>
					</h5>
					<div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
						<div class="text-soft-blue/80">• <strong class="text-white">Auto-refresh:</strong> Real-time data updates</div>
						<div class="text-soft-blue/80">• <strong class="text-white">Responsive Design:</strong> Works on all devices</div>
						<div class="text-soft-blue/80">• <strong class="text-white">Interactive Charts:</strong> Click to drill down</div>
						<div class="text-soft-blue/80">• <strong class="text-white">Export Tools:</strong> Download reports and data</div>
					</div>
				</div>
			</div>
		{/if}
	</div>

</div>