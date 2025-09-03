<script lang="ts">
	import MetricCard from '$lib/components/dashboard/MetricCard.svelte';
	import ProductionChart from '$lib/components/dashboard/ProductionChart.svelte';
	import LocationsMap from '$lib/components/dashboard/LocationsMap.svelte';
	import AlertsPanel from '$lib/components/dashboard/AlertsPanel.svelte';
	import ForecastAccuracy from '$lib/components/dashboard/ForecastAccuracy.svelte';
	
	// Mock data for now
	const metrics = {
		currentProduction: 87.5,
		dailyEnergy: 1245.8,
		forecastAccuracy: 94.2,
		activeAlerts: 3
	};
	
	const recentAlerts = [
		{ id: 1, type: 'warning', message: 'Low irradiance detected at Site A', time: '5 min ago' },
		{ id: 2, type: 'critical', message: 'Inverter offline at Site B', time: '12 min ago' },
		{ id: 3, type: 'info', message: 'Forecast model updated successfully', time: '1 hour ago' }
	];
</script>

<div class="space-y-6">
	<!-- Page Header -->
	<div>
		<h1 class="text-3xl font-bold text-soft-blue">Energy Dashboard</h1>
		<p class="text-soft-blue/60 mt-2">Real-time solar energy production monitoring and forecasting</p>
	</div>
	
	<!-- Metrics Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
		<MetricCard
			title="Active Alerts"
			value="{metrics.activeAlerts}"
			unit=""
			change="-2"
			trend="down"
			icon="alert"
			variant="warning"
		/>
	</div>
	
	<!-- Main Content Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Production Chart (2 cols) -->
		<div class="lg:col-span-2">
			<ProductionChart />
		</div>
		
		<!-- Alerts Panel (1 col) -->
		<div>
			<AlertsPanel alerts={recentAlerts} />
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
				Configure Alerts
			</button>
		</div>
	</div>
</div>