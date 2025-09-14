<script lang="ts">
	import { onMount } from 'svelte';

	let apiResults: Record<string, any> = {};
	let loading: Record<string, boolean> = {};

	async function testAPI(endpoint: string, name: string) {
		loading[name] = true;
		try {
			const response = await fetch(`/api${endpoint}`);
			const data = await response.json();
			apiResults[name] = { success: true, data, status: response.status };
		} catch (error) {
			apiResults[name] = { success: false, error: error.message };
		}
		loading[name] = false;
	}

	onMount(() => {
		// Auto-test dashboard on load
		testAPI('/dashboard', 'dashboard');
	});
</script>

<svelte:head>
	<title>API Tester - Solar Forecast Platform</title>
</svelte:head>

<div class="min-h-screen bg-dark-petrol">
	<!-- Header -->
	<div class="bg-teal-dark border-b border-soft-blue/20 px-6 py-4">
		<div class="max-w-7xl mx-auto">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-2xl font-bold text-white">API Tester</h1>
					<p class="text-soft-blue mt-1">Simple API testing interface for Solar Forecast Platform</p>
				</div>
				<div class="flex space-x-4">
					<a href="/" class="px-4 py-2 bg-cyan text-dark-petrol font-semibold rounded-lg hover:bg-soft-blue transition-colors">
						← Back to Dashboard
					</a>
					<a href="/api-docs" class="px-4 py-2 border border-soft-blue text-soft-blue font-semibold rounded-lg hover:bg-soft-blue hover:text-dark-petrol transition-colors">
						Swagger UI
					</a>
				</div>
			</div>
		</div>
	</div>

	<div class="max-w-7xl mx-auto px-6 py-8">
		<!-- API Test Buttons -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
			<!-- Dashboard API -->
			<div class="bg-teal-dark border border-soft-blue/20 rounded-lg p-6">
				<h3 class="text-lg font-semibold text-white mb-4">🏠 Dashboard API</h3>
				<button
					on:click={() => testAPI('/dashboard', 'dashboard')}
					disabled={loading.dashboard}
					class="w-full px-4 py-2 bg-cyan text-dark-petrol font-semibold rounded-lg hover:bg-soft-blue transition-colors disabled:opacity-50"
				>
					{loading.dashboard ? 'Testing...' : 'Test GET /dashboard'}
				</button>
			</div>

			<!-- Locations API -->
			<div class="bg-teal-dark border border-soft-blue/20 rounded-lg p-6">
				<h3 class="text-lg font-semibold text-white mb-4">📍 Locations API</h3>
				<button
					on:click={() => testAPI('/locations?limit=5', 'locations')}
					disabled={loading.locations}
					class="w-full px-4 py-2 bg-cyan text-dark-petrol font-semibold rounded-lg hover:bg-soft-blue transition-colors disabled:opacity-50"
				>
					{loading.locations ? 'Testing...' : 'Test GET /locations'}
				</button>
			</div>

			<!-- Weather API -->
			<div class="bg-teal-dark border border-soft-blue/20 rounded-lg p-6">
				<h3 class="text-lg font-semibold text-white mb-4">🌤️ Weather API</h3>
				<button
					on:click={() => testAPI('/weather/chart-data?location_id=1&time_range=Today', 'weather')}
					disabled={loading.weather}
					class="w-full px-4 py-2 bg-cyan text-dark-petrol font-semibold rounded-lg hover:bg-soft-blue transition-colors disabled:opacity-50"
				>
					{loading.weather ? 'Testing...' : 'Test GET /weather/chart-data'}
				</button>
			</div>
		</div>

		<!-- Results Display -->
		{#each Object.entries(apiResults) as [name, result]}
			<div class="bg-teal-dark border border-soft-blue/20 rounded-lg p-6 mb-6">
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-lg font-semibold text-white capitalize">{name} API Result</h3>
					<span class="px-3 py-1 rounded-full text-sm font-semibold {result.success ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}">
						{result.success ? 'SUCCESS' : 'ERROR'}
					</span>
				</div>

				<div class="bg-dark-petrol rounded-lg p-4 overflow-auto">
					<pre class="text-soft-blue text-sm font-mono whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
				</div>
			</div>
		{/each}

		{#if Object.keys(apiResults).length === 0}
			<div class="bg-teal-dark border border-soft-blue/20 rounded-lg p-8 text-center">
				<p class="text-soft-blue">Click the buttons above to test API endpoints</p>
			</div>
		{/if}
	</div>
</div>

<style>
	button:disabled {
		cursor: not-allowed;
	}
</style>