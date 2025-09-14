<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';

	let swaggerContainer: HTMLDivElement;

	onMount(() => {
		// Load CSS first
		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = 'https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css';
		document.head.appendChild(link);

		// Load Swagger UI scripts in sequence
		const loadScript = (src: string): Promise<void> => {
			return new Promise((resolve) => {
				const script = document.createElement('script');
				script.src = src;
				script.onload = () => resolve();
				document.head.appendChild(script);
			});
		};

		// Load scripts in order
		Promise.all([
			loadScript('https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js'),
			loadScript('https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js')
		]).then(() => {
			// Initialize Swagger UI after all scripts are loaded
			setTimeout(() => {
				// @ts-ignore
				if (window.SwaggerUIBundle && window.SwaggerUIStandalonePreset) {
					// @ts-ignore
					window.SwaggerUIBundle({
						url: '/api/openapi',
						dom_id: '#swagger-ui',
						deepLinking: true,
						presets: [
							// @ts-ignore
							window.SwaggerUIBundle.presets.apis,
							// @ts-ignore
							window.SwaggerUIStandalonePreset
						],
						plugins: [
							// @ts-ignore
							window.SwaggerUIBundle.plugins.DownloadUrl
						],
						layout: 'StandaloneLayout',
						tryItOutEnabled: true,
						validatorUrl: null,
						requestInterceptor: (request: any) => {
							// Add base URL if needed
							if (request.url.startsWith('/api/')) {
								request.url = `${window.location.origin}${request.url}`;
							}
							return request;
						}
					});
				} else {
					console.error('Swagger UI scripts not loaded properly');
				}
			}, 100);
		});
	});
</script>

<svelte:head>
	<title>API Documentation - Solar Forecast Platform</title>
	<meta name="description" content="Interactive API documentation for Solar Forecast Platform" />
</svelte:head>

<div class="min-h-screen bg-dark-petrol">
	<!-- Header -->
	<div class="bg-teal-dark border-b border-soft-blue/20 px-6 py-4">
		<div class="max-w-7xl mx-auto">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-2xl font-bold text-white">API Documentation</h1>
					<p class="text-soft-blue mt-1">Interactive documentation for Solar Forecast Platform API</p>
				</div>
				<div class="flex space-x-4">
					<a href="/" class="px-4 py-2 bg-cyan text-dark-petrol font-semibold rounded-lg hover:bg-soft-blue transition-colors">
						← Back to Dashboard
					</a>
					<a href="/api/openapi" target="_blank" class="px-4 py-2 border border-soft-blue text-soft-blue font-semibold rounded-lg hover:bg-soft-blue hover:text-dark-petrol transition-colors">
						Download OpenAPI Spec
					</a>
				</div>
			</div>
		</div>
	</div>

	<!-- API Info Cards -->
	<div class="max-w-7xl mx-auto px-6 py-6">
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
			<div class="bg-teal-dark border border-soft-blue/20 rounded-lg p-6">
				<h3 class="text-lg font-semibold text-white mb-2">🚀 Base URL</h3>
				<p class="text-soft-blue font-mono text-sm">http://localhost:5173/api</p>
			</div>

			<div class="bg-teal-dark border border-soft-blue/20 rounded-lg p-6">
				<h3 class="text-lg font-semibold text-white mb-2">📊 Reports API</h3>
				<p class="text-soft-blue text-sm">Generate Excel reports with FILE and CODE templates</p>
			</div>

			<div class="bg-teal-dark border border-soft-blue/20 rounded-lg p-6">
				<h3 class="text-lg font-semibold text-white mb-2">📍 Locations API</h3>
				<p class="text-soft-blue text-sm">Manage solar farm locations with CRUD operations</p>
			</div>
		</div>

		<!-- Quick Examples -->
		<div class="bg-teal-dark border border-soft-blue/20 rounded-lg p-6 mb-8">
			<h3 class="text-lg font-semibold text-white mb-4">🎯 Quick Examples</h3>
			<div class="space-y-4">
				<div>
					<h4 class="text-sm font-semibold text-cyan mb-2">Generate Excel Report (FILE mode)</h4>
					<code class="block bg-dark-petrol p-3 rounded text-soft-blue text-sm font-mono overflow-x-auto">
						GET /api/reports?template=template_1&from=2025-01-01T00:00:00Z&to=2025-01-02T00:00:00Z
					</code>
				</div>
				<div>
					<h4 class="text-sm font-semibold text-cyan mb-2">Generate Advanced Report (CODE mode)</h4>
					<code class="block bg-dark-petrol p-3 rounded text-soft-blue text-sm font-mono overflow-x-auto">
						GET /api/reports?template=template_code_1&from=2025-01-01T00:00:00Z&to=2025-01-03T00:00:00Z&tz=America/New_York
					</code>
				</div>
				<div>
					<h4 class="text-sm font-semibold text-cyan mb-2">List All Locations</h4>
					<code class="block bg-dark-petrol p-3 rounded text-soft-blue text-sm font-mono overflow-x-auto">
						GET /api/locations?limit=20&status=ACTIVE
					</code>
				</div>
			</div>
		</div>
	</div>

	<!-- Swagger UI Container -->
	<div class="max-w-7xl mx-auto px-6">
		<div class="bg-white rounded-lg shadow-lg overflow-hidden">
			<div id="swagger-ui" bind:this={swaggerContainer}></div>
		</div>
	</div>

	<div class="h-20"></div>
</div>

<style>
	:global(#swagger-ui) {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
	}

	:global(#swagger-ui .swagger-ui .topbar) {
		display: none;
	}

	:global(#swagger-ui .swagger-ui .info) {
		margin: 30px 0;
	}

	:global(#swagger-ui .swagger-ui .scheme-container) {
		background: #f8f9fa;
		padding: 15px;
		border-radius: 8px;
		margin: 20px 0;
	}

	:global(#swagger-ui .swagger-ui .opblock.opblock-get) {
		border-color: #0fa4af;
		background: rgba(15, 164, 175, 0.05);
	}

	:global(#swagger-ui .swagger-ui .opblock.opblock-post) {
		border-color: #16a34a;
		background: rgba(22, 163, 74, 0.05);
	}

	:global(#swagger-ui .swagger-ui .opblock.opblock-put) {
		border-color: #eab308;
		background: rgba(234, 179, 8, 0.05);
	}

	:global(#swagger-ui .swagger-ui .opblock.opblock-delete) {
		border-color: #dc2626;
		background: rgba(220, 38, 38, 0.05);
	}
</style>