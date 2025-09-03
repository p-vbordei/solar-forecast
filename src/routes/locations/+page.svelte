<script lang="ts">
	import { onMount } from 'svelte';
	import type { Location } from '$lib/types/location';
	
	let locations: Location[] = [];
	let loading = true;
	let error: string | null = null;
	let showAddModal = false;
	
	onMount(async () => {
		await loadLocations();
	});
	
	async function loadLocations() {
		try {
			loading = true;
			const response = await fetch('/api/locations');
			const data = await response.json();
			
			if (data.success) {
				locations = data.data;
			} else {
				error = data.error || 'Failed to load locations';
			}
		} catch (err) {
			error = 'Failed to fetch locations';
			console.error(err);
		} finally {
			loading = false;
		}
	}
	
	function getStatusColor(status: string) {
		switch (status) {
			case 'active': return 'badge-cyan';
			case 'maintenance': return 'badge-warning';
			case 'offline': return 'badge-danger';
			default: return 'badge';
		}
	}
</script>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-soft-blue">Locations</h1>
			<p class="text-soft-blue/60 mt-2">Manage solar installation sites</p>
		</div>
		<button 
			class="btn btn-primary"
			on:click={() => showAddModal = true}
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			Add Location
		</button>
	</div>
	
	<!-- Filters -->
	<div class="card-glass">
		<div class="flex flex-wrap gap-4">
			<select class="select">
				<option>All Clients</option>
				<option>Green Energy Corp</option>
				<option>Renewable Power Systems</option>
			</select>
			<select class="select">
				<option>All Status</option>
				<option>Active</option>
				<option>Maintenance</option>
				<option>Offline</option>
			</select>
			<input 
				type="search" 
				placeholder="Search locations..." 
				class="input flex-1 min-w-[200px]"
			/>
		</div>
	</div>
	
	<!-- Locations Grid -->
	{#if loading}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each [1, 2, 3, 4, 5, 6] as _}
				<div class="card-glass h-64 animate-pulse">
					<div class="h-4 bg-glass-white rounded w-3/4 mb-4"></div>
					<div class="h-3 bg-glass-white rounded w-1/2 mb-8"></div>
					<div class="space-y-2">
						<div class="h-3 bg-glass-white rounded"></div>
						<div class="h-3 bg-glass-white rounded"></div>
						<div class="h-3 bg-glass-white rounded"></div>
					</div>
				</div>
			{/each}
		</div>
	{:else if error}
		<div class="alert alert-error">
			<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
				<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
			</svg>
			{error}
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each locations as location}
				<div class="card-glass hover:scale-[1.02] transition-transform cursor-pointer">
					<div class="flex items-start justify-between mb-4">
						<div>
							<h3 class="text-lg font-semibold text-soft-blue">{location.name}</h3>
							<p class="text-sm text-soft-blue/60">ID: {location.id}</p>
						</div>
						<span class="badge {getStatusColor(location.status)}">
							{location.status}
						</span>
					</div>
					
					<div class="space-y-3">
						<!-- Capacity -->
						<div class="flex items-center justify-between">
							<span class="text-sm text-soft-blue/60">Capacity</span>
							<span class="text-cyan font-mono">{location.capacity} MW</span>
						</div>
						
						<!-- Location -->
						<div class="flex items-center justify-between">
							<span class="text-sm text-soft-blue/60">Coordinates</span>
							<span class="text-xs font-mono text-soft-blue">
								{location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
							</span>
						</div>
						
						<!-- Panels -->
						{#if location.panelCount}
							<div class="flex items-center justify-between">
								<span class="text-sm text-soft-blue/60">Panels</span>
								<span class="text-soft-blue">{location.panelCount.toLocaleString()}</span>
							</div>
						{/if}
						
						<!-- Efficiency -->
						{#if location.efficiency}
							<div class="flex items-center justify-between">
								<span class="text-sm text-soft-blue/60">Efficiency</span>
								<div class="flex items-center gap-2">
									<div class="w-24 h-2 bg-dark-petrol/50 rounded-full overflow-hidden">
										<div 
											class="h-full bg-gradient-to-r from-cyan to-soft-blue"
											style="width: {location.efficiency}%"
										></div>
									</div>
									<span class="text-xs text-cyan font-mono">{location.efficiency}%</span>
								</div>
							</div>
						{/if}
					</div>
					
					<div class="flex items-center gap-2 mt-4 pt-4 border-t border-glass-border">
						<a href="/locations/{location.id}" class="btn btn-secondary btn-sm flex-1">
							View Details
						</a>
						<button class="p-2 hover:bg-glass-white rounded-lg transition-colors">
							<svg class="w-4 h-4 text-soft-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
							</svg>
						</button>
					</div>
				</div>
			{/each}
		</div>
		
		{#if locations.length === 0}
			<div class="card-glass text-center py-12">
				<svg class="w-16 h-16 mx-auto mb-4 text-soft-blue/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
				</svg>
				<p class="text-soft-blue/60">No locations found</p>
				<p class="text-sm text-soft-blue/40 mt-2">Add your first solar installation site to get started</p>
			</div>
		{/if}
	{/if}
</div>

<style>
	.btn-sm {
		@apply px-3 py-1.5 text-sm;
	}
</style>