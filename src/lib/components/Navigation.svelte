<script lang="ts">
	export let navItems: Array<{ href: string; label: string; icon: string }> = [];
	export let currentPath: string = '/';
	
	// Icon components mapping
	const getIcon = (icon: string) => {
		const icons: Record<string, string> = {
			dashboard: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
			location: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
			forecast: 'M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z',
			analysis: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z',
			alert: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
			report: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z'
		};
		return icons[icon] || icons.dashboard;
	};
</script>

<nav class="space-y-1">
	{#each navItems as item}
		<a
			href={item.href}
			class="flex items-center gap-3 px-4 py-3 rounded-lg transition-all {
				currentPath === item.href 
					? 'bg-glass-white text-cyan' 
					: 'text-soft-blue/80 hover:text-soft-blue hover:bg-glass-white'
			}"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path d={getIcon(item.icon)} fill="currentColor" stroke="none"/>
			</svg>
			<span class="font-medium">{item.label}</span>
			
			{#if item.label === 'Alerts' && currentPath !== '/alerts'}
				<span class="ml-auto bg-alert-red text-white text-xs px-2 py-1 rounded-full">3</span>
			{/if}
		</a>
	{/each}
</nav>