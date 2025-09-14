<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	let syncing = false;
	let lastSyncResult: {
		success: boolean;
		message: string;
		data?: any;
	} | null = null;

	/**
	 * Trigger weather data sync
	 */
	async function syncWeatherData() {
		if (syncing) return;

		syncing = true;
		lastSyncResult = null;

		try {
			console.log('Triggering manual weather data sync...');

			const response = await fetch('/api/weather/sync', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					includeForecasts: true,
					forecastDays: 7,
					forceRefresh: true
				})
			});

			const result = await response.json();

			lastSyncResult = {
				success: result.success,
				message: result.message || 'Weather sync completed',
				data: result.data
			};

			if (result.success) {
				console.log('Weather sync successful:', result.data);
				dispatch('syncSuccess', result.data);
			} else {
				console.error('Weather sync failed:', result.message);
				dispatch('syncError', result.message);
			}

		} catch (error) {
			console.error('Weather sync error:', error);
			lastSyncResult = {
				success: false,
				message: `Sync failed: ${error.message}`
			};
			dispatch('syncError', error.message);
		} finally {
			syncing = false;
		}
	}

	/**
	 * Get status display class based on result
	 */
	function getStatusClass(success: boolean): string {
		return success
			? 'text-cyan border-cyan/30 bg-cyan/10'
			: 'text-alert-red border-alert-red/30 bg-alert-red/10';
	}
</script>

<!-- Weather Sync Button -->
<div class="flex flex-col items-start space-y-3">
	<!-- Sync Button -->
	<button
		class="flex items-center space-x-2 px-4 py-2 bg-teal-dark border border-cyan/30 rounded-lg text-soft-blue hover:bg-cyan/20 hover:border-cyan/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
		on:click={syncWeatherData}
		disabled={syncing}
		title="Manually fetch latest weather data for all locations"
	>
		<!-- Weather Icon -->
		<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.004 4.004 0 003 15z" />
		</svg>

		<!-- Loading Spinner -->
		{#if syncing}
			<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
			</svg>
		{/if}

		<span class="font-medium">
			{#if syncing}
				Syncing...
			{:else}
				Sync Weather Data
			{/if}
		</span>
	</button>

	<!-- Sync Result Status -->
	{#if lastSyncResult}
		<div class="text-xs px-3 py-1 border rounded {getStatusClass(lastSyncResult.success)}">
			<div class="font-medium">{lastSyncResult.success ? 'Success' : 'Error'}</div>
			<div class="opacity-80">{lastSyncResult.message}</div>

			{#if lastSyncResult.success && lastSyncResult.data}
				<div class="mt-1 space-y-0.5 opacity-70">
					<div>Locations: {lastSyncResult.data.locationsProcessed}</div>
					<div>Records: {lastSyncResult.data.recordsInserted + lastSyncResult.data.recordsUpdated}</div>
					<div>Time: {Math.round(lastSyncResult.data.processingTimeMs / 1000)}s</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Info Text -->
	<div class="text-xs text-soft-blue/50">
		<div>Next scheduled sync: Daily at UTC 08:00</div>
		<div>Last manual sync: {syncing ? 'In progress...' : lastSyncResult ? 'Just now' : 'Never'}</div>
	</div>
</div>

<style>
	/* Button hover effects */
	button:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(15, 164, 175, 0.2);
	}

	button:active:not(:disabled) {
		transform: translateY(0);
	}
</style>