<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import Navigation from '$lib/components/Navigation.svelte';
	import Header from '$lib/components/Header.svelte';
	
	// Define navigation items
	const navItems = [
		{ href: '/', label: 'Dashboard', icon: 'dashboard' },
		{ href: '/locations', label: 'Locations', icon: 'location' },
		{ href: '/forecast', label: 'Forecast', icon: 'forecast' },
		{ href: '/analysis', label: 'Analysis', icon: 'analysis' },
		{ href: '/alerts', label: 'Alerts', icon: 'alert' },
		{ href: '/reports', label: 'Reports', icon: 'report' },
	];
</script>

<div class="min-h-screen bg-dark-petrol flex">
	<!-- Sidebar Navigation -->
	<aside class="w-64 bg-teal-dark border-r border-glass-border">
		<div class="p-6">
			<div class="flex items-center gap-3 mb-8">
				<!-- Logo -->
				<div class="w-10 h-10 bg-cyan rounded-lg flex items-center justify-center">
					<svg class="w-6 h-6 text-dark-petrol" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
					</svg>
				</div>
				<div>
					<h1 class="text-xl font-bold text-soft-blue">Solar Forecast</h1>
					<p class="text-xs text-soft-blue/60">Energy Intelligence</p>
				</div>
			</div>
			
			<Navigation {navItems} currentPath={$page.url.pathname} />
		</div>
		
		<!-- User Section -->
		<div class="absolute bottom-0 left-0 right-0 p-6 border-t border-glass-border">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 bg-glass-white rounded-full flex items-center justify-center">
					<svg class="w-6 h-6 text-soft-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
					</svg>
				</div>
				<div class="flex-1">
					<p class="text-sm font-medium text-soft-blue">Admin User</p>
					<p class="text-xs text-soft-blue/60">admin@solar.com</p>
				</div>
			</div>
		</div>
	</aside>
	
	<!-- Main Content Area -->
	<div class="flex-1 flex flex-col">
		<!-- Header -->
		<Header />
		
		<!-- Page Content -->
		<main class="flex-1 p-6 overflow-y-auto">
			<slot />
		</main>
	</div>
</div>