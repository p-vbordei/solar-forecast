<script lang="ts">
	import { onMount } from 'svelte';

	let apiSpec: any = null;
	let loading = true;
	let error = '';

	onMount(async () => {
		try {
			console.log('Loading OpenAPI spec...');
			const response = await fetch('/api/openapi');
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			apiSpec = await response.json();
			console.log('OpenAPI spec loaded:', apiSpec);
		} catch (e) {
			console.error('Failed to load OpenAPI spec:', e);
			error = e.message;
		} finally {
			loading = false;
		}
	});

	async function testEndpoint(path: string, method: string = 'GET') {
		try {
			console.log(`Testing ${method} ${path}`);
			const response = await fetch(`/api${path}`, { method });
			const data = await response.json();
			console.log('Response:', data);
			alert(`✅ ${method} ${path}\n\nStatus: ${response.status}\n\nResponse:\n${JSON.stringify(data, null, 2)}`);
		} catch (e) {
			console.error('Test failed:', e);
			alert(`❌ ${method} ${path}\n\nError: ${e.message}`);
		}
	}
</script>

<svelte:head>
	<title>Simple API Explorer - Solar Forecast Platform</title>
</svelte:head>

<div class="min-h-screen bg-dark-petrol">
	<!-- Header -->
	<div class="bg-teal-dark border-b border-soft-blue/20 px-6 py-4">
		<div class="max-w-7xl mx-auto">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-2xl font-bold text-white">🔧 Simple API Explorer</h1>
					<p class="text-soft-blue mt-1">No external dependencies • Always works • Direct API testing</p>
				</div>
				<div class="flex space-x-4">
					<a href="/" class="px-4 py-2 bg-cyan text-dark-petrol font-semibold rounded-lg hover:bg-soft-blue transition-colors">
						← Dashboard
					</a>
					<div class="flex items-center space-x-2">
						<div class="w-2 h-2 bg-green-400 rounded-full"></div>
						<span class="text-soft-blue text-sm">Port 5173</span>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="max-w-7xl mx-auto px-6 py-8">
		{#if loading}
			<div class="bg-teal-dark border border-soft-blue/20 rounded-lg p-8 text-center">
				<div class="inline-block w-8 h-8 border-4 border-cyan border-t-transparent rounded-full animate-spin mb-4"></div>
				<p class="text-soft-blue">Loading API specification...</p>
			</div>
		{:else if error}
			<div class="bg-red-900 border border-red-500 rounded-lg p-6 mb-8">
				<h3 class="text-red-200 font-semibold mb-2">❌ Failed to Load API Spec</h3>
				<p class="text-red-300">Error: {error}</p>
				<button
					on:click={() => window.location.reload()}
					class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
				>
					Retry
				</button>
			</div>
		{:else if apiSpec}
			<!-- API Info -->
			<div class="bg-teal-dark border border-soft-blue/20 rounded-lg p-6 mb-8">
				<h2 class="text-xl font-bold text-white mb-4">{apiSpec.info?.title || 'API Documentation'}</h2>
				<p class="text-soft-blue mb-4">{apiSpec.info?.description || 'No description available'}</p>

				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div class="bg-dark-petrol rounded p-4">
						<h4 class="text-cyan font-semibold">Version</h4>
						<p class="text-soft-blue">{apiSpec.info?.version || 'Unknown'}</p>
					</div>
					<div class="bg-dark-petrol rounded p-4">
						<h4 class="text-cyan font-semibold">Base URL</h4>
						<p class="text-soft-blue font-mono">/api</p>
					</div>
					<div class="bg-dark-petrol rounded p-4">
						<h4 class="text-cyan font-semibold">Endpoints</h4>
						<p class="text-soft-blue">{Object.keys(apiSpec.paths || {}).length} available</p>
					</div>
				</div>
			</div>

			<!-- Quick Test Buttons -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
				<button
					on:click={() => testEndpoint('/dashboard')}
					class="bg-teal-dark border border-soft-blue/20 rounded-lg p-6 text-left hover:bg-teal-dark/80 transition-colors group"
				>
					<h3 class="text-white font-semibold mb-2 group-hover:text-cyan">🏠 Dashboard</h3>
					<p class="text-soft-blue text-sm mb-3">Get real-time dashboard statistics</p>
					<div class="text-cyan text-xs font-mono">GET /api/dashboard</div>
				</button>

				<button
					on:click={() => testEndpoint('/locations?limit=5')}
					class="bg-teal-dark border border-soft-blue/20 rounded-lg p-6 text-left hover:bg-teal-dark/80 transition-colors group"
				>
					<h3 class="text-white font-semibold mb-2 group-hover:text-cyan">📍 Locations</h3>
					<p class="text-soft-blue text-sm mb-3">List solar farm locations</p>
					<div class="text-cyan text-xs font-mono">GET /api/locations</div>
				</button>

				<button
					on:click={() => testEndpoint('/weather/chart-data?location_id=1&time_range=Today')}
					class="bg-teal-dark border border-soft-blue/20 rounded-lg p-6 text-left hover:bg-teal-dark/80 transition-colors group"
				>
					<h3 class="text-white font-semibold mb-2 group-hover:text-cyan">🌤️ Weather</h3>
					<p class="text-soft-blue text-sm mb-3">Get weather chart data</p>
					<div class="text-cyan text-xs font-mono">GET /api/weather/chart-data</div>
				</button>
			</div>

			<!-- All Endpoints -->
			<div class="bg-teal-dark border border-soft-blue/20 rounded-lg p-6">
				<h3 class="text-lg font-semibold text-white mb-4">📡 All Available Endpoints</h3>

				{#each Object.entries(apiSpec.paths || {}) as [path, methods]}
					<div class="mb-6 last:mb-0">
						<h4 class="text-cyan font-semibold mb-2 font-mono">{path}</h4>

						{#each Object.entries(methods) as [method, details]}
							<div class="ml-4 mb-3 bg-dark-petrol rounded-lg p-4">
								<div class="flex items-center justify-between mb-2">
									<div class="flex items-center space-x-3">
										<span class="px-2 py-1 text-xs font-semibold rounded uppercase {
											method === 'get' ? 'bg-blue-600 text-white' :
											method === 'post' ? 'bg-green-600 text-white' :
											method === 'put' ? 'bg-yellow-600 text-white' :
											method === 'delete' ? 'bg-red-600 text-white' :
											'bg-gray-600 text-white'
										}">{method}</span>
										<span class="text-white font-medium">{details.summary || 'No summary'}</span>
									</div>
									<button
										on:click={() => testEndpoint(path, method.toUpperCase())}
										class="px-3 py-1 text-xs bg-cyan text-dark-petrol font-semibold rounded hover:bg-soft-blue transition-colors"
									>
										Test
									</button>
								</div>

								{#if details.description}
									<p class="text-soft-blue text-sm mb-2">{details.description}</p>
								{/if}

								{#if details.parameters && details.parameters.length > 0}
									<div class="text-xs text-soft-blue">
										<strong>Parameters:</strong>
										{#each details.parameters as param}
											<span class="inline-block mr-2 text-cyan">{param.name}</span>
										{/each}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	.animate-spin {
		animation: spin 1s linear infinite;
	}
</style>