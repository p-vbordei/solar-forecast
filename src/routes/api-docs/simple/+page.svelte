<script lang="ts">
	import { onMount } from 'svelte';

	let apiSpec: any = null;

	onMount(async () => {
		try {
			const response = await fetch('/api/openapi');
			apiSpec = await response.json();
		} catch (error) {
			console.error('Failed to load API spec:', error);
		}
	});

	function formatExample(example: any): string {
		if (typeof example === 'string') return example;
		return JSON.stringify(example, null, 2);
	}

	function getParameterType(parameter: any): string {
		const schema = parameter.schema || {};
		let type = schema.type || 'string';
		if (schema.format) type += ` (${schema.format})`;
		if (schema.enum) type += ` [${schema.enum.join('|')}]`;
		return type;
	}
</script>

<svelte:head>
	<title>API Documentation - Solar Forecast Platform</title>
	<meta name="description" content="API documentation for Solar Forecast Platform" />
</svelte:head>

<div class="min-h-screen bg-dark-petrol text-white">
	<!-- Header -->
	<div class="bg-teal-dark border-b border-soft-blue/20 px-6 py-4">
		<div class="max-w-7xl mx-auto">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-2xl font-bold text-white">API Documentation</h1>
					<p class="text-soft-blue mt-1">Solar Forecast Platform REST API</p>
				</div>
				<div class="flex space-x-4">
					<a href="/" class="px-4 py-2 bg-cyan text-dark-petrol font-semibold rounded-lg hover:bg-soft-blue transition-colors">
						← Back to Dashboard
					</a>
					<a href="/api-docs" class="px-4 py-2 border border-soft-blue text-soft-blue font-semibold rounded-lg hover:bg-soft-blue hover:text-dark-petrol transition-colors">
						Try Swagger UI
					</a>
					<a href="/api/openapi" target="_blank" class="px-4 py-2 border border-soft-blue text-soft-blue font-semibold rounded-lg hover:bg-soft-blue hover:text-dark-petrol transition-colors">
						Download JSON
					</a>
				</div>
			</div>
		</div>
	</div>

	{#if apiSpec}
		<div class="max-w-7xl mx-auto px-6 py-6">
			<!-- API Info -->
			<div class="mb-8">
				<h2 class="text-3xl font-bold text-white mb-4">{apiSpec.info.title}</h2>
				<p class="text-soft-blue mb-4">{apiSpec.info.description.split('\n')[0]}</p>

				<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
					<div class="bg-teal-dark border border-soft-blue/20 rounded-lg p-4">
						<h3 class="font-semibold text-cyan mb-2">Version</h3>
						<p class="text-soft-blue">{apiSpec.info.version}</p>
					</div>
					<div class="bg-teal-dark border border-soft-blue/20 rounded-lg p-4">
						<h3 class="font-semibold text-cyan mb-2">Base URL</h3>
						<p class="text-soft-blue font-mono text-sm">{apiSpec.servers[0].url}</p>
					</div>
					<div class="bg-teal-dark border border-soft-blue/20 rounded-lg p-4">
						<h3 class="font-semibold text-cyan mb-2">Endpoints</h3>
						<p class="text-soft-blue">{Object.keys(apiSpec.paths).length} paths</p>
					</div>
				</div>
			</div>

			<!-- Endpoints -->
			<div class="space-y-8">
				{#each Object.entries(apiSpec.paths) as [path, pathObj]}
					{#each Object.entries(pathObj) as [method, operation]}
						<div class="bg-teal-dark border border-soft-blue/20 rounded-lg overflow-hidden">
							<!-- Method Header -->
							<div class="flex items-center space-x-4 p-4 border-b border-soft-blue/20">
								<span class="px-3 py-1 rounded-full text-xs font-bold {
									method === 'get' ? 'bg-cyan text-dark-petrol' :
									method === 'post' ? 'bg-green-500 text-white' :
									method === 'put' ? 'bg-yellow-500 text-black' :
									method === 'delete' ? 'bg-red-500 text-white' : 'bg-gray-500 text-white'
								}">
									{method.toUpperCase()}
								</span>
								<code class="text-soft-blue font-mono">{path}</code>
								<h3 class="text-white font-semibold">{operation.summary}</h3>
							</div>

							<div class="p-4">
								<!-- Description -->
								{#if operation.description}
									<div class="mb-6">
										<h4 class="text-cyan font-semibold mb-2">Description</h4>
										<div class="text-soft-blue text-sm whitespace-pre-line">{operation.description.split('##')[0]}</div>
									</div>
								{/if}

								<!-- Parameters -->
								{#if operation.parameters && operation.parameters.length > 0}
									<div class="mb-6">
										<h4 class="text-cyan font-semibold mb-3">Parameters</h4>
										<div class="overflow-x-auto">
											<table class="w-full text-sm">
												<thead>
													<tr class="border-b border-soft-blue/20">
														<th class="text-left py-2 text-cyan">Name</th>
														<th class="text-left py-2 text-cyan">Type</th>
														<th class="text-left py-2 text-cyan">Required</th>
														<th class="text-left py-2 text-cyan">Description</th>
														<th class="text-left py-2 text-cyan">Example</th>
													</tr>
												</thead>
												<tbody>
													{#each operation.parameters as param}
														<tr class="border-b border-soft-blue/10">
															<td class="py-2 text-white font-mono">{param.name}</td>
															<td class="py-2 text-soft-blue">{getParameterType(param)}</td>
															<td class="py-2">
																{#if param.required}
																	<span class="text-red-400">Yes</span>
																{:else}
																	<span class="text-green-400">No</span>
																{/if}
															</td>
															<td class="py-2 text-soft-blue">{param.description}</td>
															<td class="py-2 text-soft-blue font-mono text-xs">{param.example || param.schema?.default || ''}</td>
														</tr>
													{/each}
												</tbody>
											</table>
										</div>
									</div>
								{/if}

								<!-- Responses -->
								{#if operation.responses}
									<div class="mb-6">
										<h4 class="text-cyan font-semibold mb-3">Responses</h4>
										{#each Object.entries(operation.responses) as [statusCode, response]}
											<div class="mb-4 border border-soft-blue/20 rounded-lg p-4">
												<div class="flex items-center space-x-2 mb-2">
													<span class="px-2 py-1 rounded text-xs font-bold {
														statusCode.startsWith('2') ? 'bg-green-500 text-white' :
														statusCode.startsWith('4') ? 'bg-yellow-500 text-black' :
														statusCode.startsWith('5') ? 'bg-red-500 text-white' : 'bg-gray-500 text-white'
													}">
														{statusCode}
													</span>
													<span class="text-white font-semibold">{response.description}</span>
												</div>

												{#if response.content}
													{#each Object.entries(response.content) as [contentType, contentObj]}
														<div class="mt-3">
															<h5 class="text-soft-blue font-semibold mb-2">Content-Type: {contentType}</h5>
															{#if contentObj.examples}
																{#each Object.entries(contentObj.examples) as [exampleName, example]}
																	<div class="mb-3">
																		<h6 class="text-cyan text-sm mb-1">{example.summary || exampleName}</h6>
																		<pre class="bg-dark-petrol p-3 rounded text-soft-blue text-xs overflow-x-auto"><code>{formatExample(example.value)}</code></pre>
																	</div>
																{/each}
															{:else if contentObj.example}
																<pre class="bg-dark-petrol p-3 rounded text-soft-blue text-xs overflow-x-auto"><code>{formatExample(contentObj.example)}</code></pre>
															{/if}
														</div>
													{/each}
												{/if}
											</div>
										{/each}
									</div>
								{/if}

								<!-- Try It Out -->
								<div class="border-t border-soft-blue/20 pt-4">
									<h4 class="text-cyan font-semibold mb-3">Try it out</h4>
									{#if method === 'get'}
										{@const exampleParams = operation.parameters?.filter(p => p.example).map(p => `${p.name}=${encodeURIComponent(p.example)}`).join('&')}
										{@const exampleUrl = `${apiSpec.servers[0].url}${path}${exampleParams ? '?' + exampleParams : ''}`}
										<div class="space-y-2">
											<code class="block bg-dark-petrol p-3 rounded text-soft-blue text-sm overflow-x-auto">
												curl "{exampleUrl}"
											</code>
											<a
												href={exampleUrl}
												target="_blank"
												class="inline-block px-4 py-2 bg-cyan text-dark-petrol font-semibold rounded hover:bg-soft-blue transition-colors"
											>
												Test in Browser
											</a>
										</div>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				{/each}
			</div>
		</div>
	{:else}
		<div class="max-w-7xl mx-auto px-6 py-20 text-center">
			<div class="text-cyan text-4xl mb-4">📊</div>
			<h2 class="text-2xl font-bold text-white mb-4">Loading API Documentation...</h2>
			<p class="text-soft-blue">Please wait while we fetch the API specification.</p>
		</div>
	{/if}
</div>