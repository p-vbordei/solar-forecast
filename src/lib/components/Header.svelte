<script lang="ts">
	import { onMount } from 'svelte';

	let currentTime = new Date();
	let dashboardStats = {
		activeLocations: 0,
		totalCapacityMW: 0,
		currentSolarPowerWM2: 0,
		currentTemperatureC: 0,
		lastUpdated: ''
	};
	let loading = true;

	async function fetchDashboardStats() {
		try {
			const response = await fetch('/api/dashboard');
			const result = await response.json();

			if (result.success) {
				dashboardStats = result.data;
			}
		} catch (error) {
			console.error('Failed to fetch dashboard stats:', error);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		// Fetch initial dashboard data
		fetchDashboardStats();

		// Update time every second
		const timeInterval = setInterval(() => {
			currentTime = new Date();
		}, 1000);

		// Refresh dashboard data every 30 seconds
		const dataInterval = setInterval(() => {
			fetchDashboardStats();
		}, 30000);

		// Listen for custom dashboard refresh events
		const handleDashboardRefresh = () => {
			fetchDashboardStats();
		};
		window.addEventListener('dashboardRefresh', handleDashboardRefresh);

		return () => {
			clearInterval(timeInterval);
			clearInterval(dataInterval);
			window.removeEventListener('dashboardRefresh', handleDashboardRefresh);
		};
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
			<!-- Quick Stats -->
			<div class="flex items-center gap-4 text-sm">
				<div class="flex items-center gap-2">
					<span class="text-soft-blue/60">Active Locations:</span>
					{#if loading}
						<span class="text-cyan font-semibold">Loading...</span>
					{:else}
						<span class="text-cyan font-semibold">{dashboardStats.activeLocations}</span>
					{/if}
				</div>
				<div class="flex items-center gap-2">
					<span class="text-soft-blue/60">Total Capacity:</span>
					{#if loading}
						<span class="text-cyan font-semibold">Loading...</span>
					{:else}
						<span class="text-cyan font-semibold">{dashboardStats.totalCapacityMW} MW</span>
					{/if}
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
					{#if loading}
						<span class="text-soft-blue">Loading...</span>
					{:else}
						<span class="text-soft-blue">{dashboardStats.currentTemperatureC}°C</span>
					{/if}
				</div>
				<div class="flex items-center gap-2">
					<span class="text-soft-blue/60">Solar:</span>
					{#if loading}
						<span class="text-cyan font-semibold">Loading...</span>
					{:else}
						<span class="text-cyan font-semibold">{dashboardStats.currentSolarPowerWM2} W/m²</span>
					{/if}
				</div>
			</div>
			
			<!-- Time Display -->
			<div class="text-right">
				<div class="text-cyan font-mono text-lg">{formattedTime}</div>
				<div class="text-soft-blue/60 text-xs">{formattedDate}</div>
			</div>
			
		</div>
	</div>
</header>