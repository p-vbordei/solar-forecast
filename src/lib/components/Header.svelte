<script lang="ts">
	import { onMount } from 'svelte';
	
	let currentTime = new Date();
	let weatherData = {
		temperature: 22,
		condition: 'sunny',
		solarIrradiance: 850
	};
	
	onMount(() => {
		const interval = setInterval(() => {
			currentTime = new Date();
		}, 1000);
		
		return () => clearInterval(interval);
	});
	
	$: formattedTime = currentTime.toLocaleTimeString('en-US', { 
		hour: '2-digit', 
		minute: '2-digit',
		second: '2-digit'
	});
	
	$: formattedDate = currentTime.toLocaleDateString('en-US', { 
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
</script>

<header class="bg-teal-dark border-b border-glass-border px-6 py-4">
	<div class="flex items-center justify-between">
		<!-- Left Section -->
		<div class="flex items-center gap-6">
			<!-- Search -->
			<div class="relative">
				<input
					type="search"
					placeholder="Search locations, forecasts..."
					class="input w-80 pl-10"
				/>
				<svg class="absolute left-3 top-2.5 w-5 h-5 text-soft-blue/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
			</div>
			
			<!-- Quick Stats -->
			<div class="flex items-center gap-4 text-sm">
				<div class="flex items-center gap-2">
					<span class="text-soft-blue/60">Active Locations:</span>
					<span class="text-cyan font-semibold">42</span>
				</div>
				<div class="flex items-center gap-2">
					<span class="text-soft-blue/60">Total Capacity:</span>
					<span class="text-cyan font-semibold">125.4 MW</span>
				</div>
			</div>
		</div>
		
		<!-- Right Section -->
		<div class="flex items-center gap-6">
			<!-- Weather Info -->
			<div class="flex items-center gap-4 text-sm">
				<div class="flex items-center gap-2">
					<svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
						<path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>
					</svg>
					<span class="text-soft-blue">{weatherData.temperature}°C</span>
				</div>
				<div class="flex items-center gap-2">
					<span class="text-soft-blue/60">Solar:</span>
					<span class="text-cyan font-semibold">{weatherData.solarIrradiance} W/m²</span>
				</div>
			</div>
			
			<!-- Time Display -->
			<div class="text-right">
				<div class="text-cyan font-mono text-lg">{formattedTime}</div>
				<div class="text-soft-blue/60 text-xs">{formattedDate}</div>
			</div>
			
			<!-- Notifications -->
			<button class="relative p-2 rounded-lg hover:bg-glass-white transition-colors">
				<svg class="w-6 h-6 text-soft-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
				</svg>
				<span class="absolute top-1 right-1 w-2 h-2 bg-alert-red rounded-full"></span>
			</button>
			
			<!-- Settings -->
			<button class="p-2 rounded-lg hover:bg-glass-white transition-colors">
				<svg class="w-6 h-6 text-soft-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
				</svg>
			</button>
		</div>
	</div>
</header>