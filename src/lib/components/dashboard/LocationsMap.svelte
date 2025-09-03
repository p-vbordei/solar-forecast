<script lang="ts">
	// Mock location data
	const locations = [
		{ id: 1, name: 'Site A', lat: 44.4268, lng: 26.1025, status: 'active', production: 12.5 },
		{ id: 2, name: 'Site B', lat: 45.6578, lng: 25.6012, status: 'active', production: 8.3 },
		{ id: 3, name: 'Site C', lat: 46.7712, lng: 23.6236, status: 'maintenance', production: 0 },
		{ id: 4, name: 'Site D', lat: 44.3190, lng: 23.8003, status: 'active', production: 15.7 },
		{ id: 5, name: 'Site E', lat: 45.9432, lng: 24.9668, status: 'offline', production: 0 }
	];
	
	const getStatusColor = (status: string) => {
		switch (status) {
			case 'active': return 'bg-cyan';
			case 'maintenance': return 'bg-alert-orange';
			case 'offline': return 'bg-alert-red';
			default: return 'bg-gray-500';
		}
	};
</script>

<div class="card-glass h-96">
	<div class="flex items-center justify-between mb-4">
		<h3 class="text-lg font-semibold text-soft-blue">Location Overview</h3>
		<div class="flex items-center gap-3 text-xs">
			<div class="flex items-center gap-1">
				<span class="w-2 h-2 rounded-full bg-cyan"></span>
				<span class="text-soft-blue/60">Active</span>
			</div>
			<div class="flex items-center gap-1">
				<span class="w-2 h-2 rounded-full bg-alert-orange"></span>
				<span class="text-soft-blue/60">Maintenance</span>
			</div>
			<div class="flex items-center gap-1">
				<span class="w-2 h-2 rounded-full bg-alert-red"></span>
				<span class="text-soft-blue/60">Offline</span>
			</div>
		</div>
	</div>
	
	<!-- Map placeholder -->
	<div class="relative h-64 bg-gradient-to-b from-teal-dark/30 to-dark-petrol/30 rounded-lg border border-glass-border overflow-hidden">
		<!-- Grid overlay -->
		<div class="absolute inset-0 opacity-20">
			<svg width="100%" height="100%">
				<defs>
					<pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
						<path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" stroke-width="0.5" class="text-cyan"/>
					</pattern>
				</defs>
				<rect width="100%" height="100%" fill="url(#grid)" />
			</svg>
		</div>
		
		<!-- Location markers -->
		{#each locations as location, i}
			<div 
				class="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
				style="left: {20 + (i * 15)}%; top: {30 + (i * 10)}%"
			>
				<!-- Pulse effect for active locations -->
				{#if location.status === 'active'}
					<div class="absolute inset-0 w-8 h-8 rounded-full bg-cyan/30 animate-ping"></div>
				{/if}
				
				<!-- Marker -->
				<div class="relative w-8 h-8 rounded-full {getStatusColor(location.status)} shadow-lg flex items-center justify-center">
					<svg class="w-4 h-4 text-dark-petrol" fill="currentColor" viewBox="0 0 24 24">
						<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
					</svg>
				</div>
				
				<!-- Tooltip -->
				<div class="absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-dark-petrol/95 border border-glass-border rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
					<p class="text-xs font-semibold text-soft-blue">{location.name}</p>
					<p class="text-xs text-soft-blue/60">Status: {location.status}</p>
					{#if location.production > 0}
						<p class="text-xs text-cyan">Production: {location.production} MW</p>
					{/if}
				</div>
			</div>
		{/each}
		
		<!-- Map attribution -->
		<div class="absolute bottom-2 right-2 text-xs text-soft-blue/40">
			Interactive map view
		</div>
	</div>
	
	<!-- Location list -->
	<div class="mt-4 flex gap-2 overflow-x-auto">
		{#each locations as location}
			<button class="flex items-center gap-2 px-3 py-2 bg-glass-white rounded-lg hover:bg-white/10 transition-colors whitespace-nowrap">
				<span class="w-2 h-2 rounded-full {getStatusColor(location.status)}"></span>
				<span class="text-xs text-soft-blue">{location.name}</span>
				{#if location.production > 0}
					<span class="text-xs text-cyan font-mono">{location.production}MW</span>
				{/if}
			</button>
		{/each}
	</div>
</div>