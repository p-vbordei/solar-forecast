<script lang="ts">
	export let alerts: Array<{
		id: number;
		type: 'info' | 'warning' | 'critical';
		message: string;
		time: string;
	}> = [];
	
	const getAlertIcon = (type: string) => {
		switch (type) {
			case 'critical':
				return 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z';
			case 'warning':
				return 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z';
			default:
				return 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z';
		}
	};
	
	const getAlertColor = (type: string) => {
		switch (type) {
			case 'critical':
				return 'text-alert-red border-alert-red/30 bg-alert-red/10';
			case 'warning':
				return 'text-alert-orange border-alert-orange/30 bg-alert-orange/10';
			default:
				return 'text-cyan border-cyan/30 bg-cyan/10';
		}
	};
</script>

<div class="card-glass h-96 flex flex-col" data-testid="alerts-panel">
	<div class="flex items-center justify-between mb-4">
		<h3 class="text-lg font-semibold text-soft-blue">Recent Alerts</h3>
		<a href="/alerts" class="text-cyan text-sm hover:text-soft-blue transition-colors">
			View All →
		</a>
	</div>
	
	<div class="flex-1 overflow-y-auto space-y-3">
		{#each alerts as alert}
			<div class="p-3 rounded-lg border {getAlertColor(alert.type)} transition-all hover:scale-[1.02]">
				<div class="flex items-start gap-3">
					<div class="w-8 h-8 rounded-lg bg-current/10 flex items-center justify-center flex-shrink-0">
						<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
							<path d={getAlertIcon(alert.type)} />
						</svg>
					</div>
					<div class="flex-1">
						<p class="text-sm font-medium">{alert.message}</p>
						<p class="text-xs opacity-60 mt-1">{alert.time}</p>
					</div>
					<button class="p-1 hover:bg-white/10 rounded transition-colors">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>
		{/each}
		
		{#if alerts.length === 0}
			<div class="text-center py-8 text-soft-blue/40">
				<svg class="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<p class="text-sm">No active alerts</p>
				<p class="text-xs mt-1">System operating normally</p>
			</div>
		{/if}
	</div>
	
	<!-- Quick filters -->
	<div class="flex items-center gap-2 mt-4 pt-4 border-t border-glass-border">
		<button class="px-3 py-1 text-xs rounded-full bg-glass-white text-soft-blue">All</button>
		<button class="px-3 py-1 text-xs rounded-full text-soft-blue/60 hover:bg-glass-white">Critical</button>
		<button class="px-3 py-1 text-xs rounded-full text-soft-blue/60 hover:bg-glass-white">Warning</button>
		<button class="px-3 py-1 text-xs rounded-full text-soft-blue/60 hover:bg-glass-white">Info</button>
	</div>
</div>