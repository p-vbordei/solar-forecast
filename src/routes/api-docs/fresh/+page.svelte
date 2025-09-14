<script lang="ts">
	import { onMount } from 'svelte';

	onMount(() => {
		// Load CSS first
		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = 'https://unpkg.com/swagger-ui-dist@5.0.0/swagger-ui.css';
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

		// Load latest Swagger UI scripts
		Promise.all([
			loadScript('https://unpkg.com/swagger-ui-dist@5.0.0/swagger-ui-bundle.js'),
			loadScript('https://unpkg.com/swagger-ui-dist@5.0.0/swagger-ui-standalone-preset.js')
		]).then(() => {
			setTimeout(() => {
				console.log('Loading fresh Swagger UI...');

				// @ts-ignore
				if (window.SwaggerUIBundle) {
					// @ts-ignore
					const ui = window.SwaggerUIBundle({
						url: `/api/openapi?fresh=${Date.now()}`,
						dom_id: '#fresh-swagger-ui',
						deepLinking: true,
						presets: [
							// @ts-ignore
							window.SwaggerUIBundle.presets.apis,
							// @ts-ignore
							window.SwaggerUIStandalonePreset
						],
						layout: 'StandaloneLayout',
						tryItOutEnabled: true,
						validatorUrl: null,
						docExpansion: 'list',
						operationsSorter: 'alpha',
						onComplete: () => {
							console.log('Fresh Swagger UI loaded successfully!');
						},
						onFailure: (error: any) => {
							console.error('Fresh Swagger UI failed to load:', error);
						}
					});

					console.log('Swagger UI instance created:', ui);
				} else {
					console.error('SwaggerUIBundle not available');
					document.getElementById('fresh-swagger-ui')!.innerHTML =
						`<div style="padding: 20px; color: red; text-align: center;">
							<h2>Error: Swagger UI failed to load</h2>
							<p>SwaggerUIBundle is not available. Please check your internet connection.</p>
						</div>`;
				}
			}, 200);
		}).catch((error) => {
			console.error('Failed to load Swagger UI scripts:', error);
		});
	});
</script>

<svelte:head>
	<title>Fresh API Documentation - Solar Forecast Platform</title>
</svelte:head>

<div class="min-h-screen bg-dark-petrol">
	<!-- Header -->
	<div class="bg-teal-dark border-b border-soft-blue/20 px-6 py-4">
		<div class="max-w-7xl mx-auto">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-2xl font-bold text-white">🔄 Fresh API Documentation</h1>
					<p class="text-soft-blue mt-1">Clean Swagger UI instance - no caching issues</p>
				</div>
				<div class="flex space-x-4">
					<a href="/" class="px-4 py-2 bg-cyan text-dark-petrol font-semibold rounded-lg hover:bg-soft-blue transition-colors">
						← Dashboard
					</a>
					<a href="/api-test" class="px-4 py-2 border border-cyan text-cyan font-semibold rounded-lg hover:bg-cyan hover:text-dark-petrol transition-colors">
						API Tester
					</a>
				</div>
			</div>
		</div>
	</div>

	<!-- Status Info -->
	<div class="max-w-7xl mx-auto px-6 py-4">
		<div class="bg-teal-dark border border-soft-blue/20 rounded-lg p-4 mb-6">
			<div class="flex items-center space-x-4">
				<div class="w-3 h-3 bg-green-400 rounded-full"></div>
				<div>
					<span class="text-white font-semibold">Server Status: </span>
					<span class="text-green-400">Running on http://localhost:5173</span>
				</div>
				<div class="text-soft-blue text-sm">
					Fresh instance • Cache-free • Latest Swagger UI v5.0.0
				</div>
			</div>
		</div>
	</div>

	<!-- Swagger UI Container -->
	<div class="max-w-7xl mx-auto px-6">
		<div class="bg-white rounded-lg shadow-lg overflow-hidden">
			<div id="fresh-swagger-ui">
				<div style="padding: 40px; text-align: center; color: #666;">
					<div class="loading-spinner" style="margin: 0 auto 20px; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #0FA4AF; border-radius: 50%; animation: spin 1s linear infinite;"></div>
					<p>Loading fresh Swagger UI...</p>
				</div>
			</div>
		</div>
	</div>

	<div class="h-20"></div>
</div>

<style>
	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	:global(#fresh-swagger-ui .swagger-ui .topbar) {
		display: none;
	}

	:global(#fresh-swagger-ui .swagger-ui .info) {
		margin: 30px 0;
	}
</style>