<script lang="ts">
	export let title: string;
	export let value: string | number;
	export let unit: string = '';
	export let change: string = '';
	export let trend: 'up' | 'down' | 'neutral' = 'neutral';
	export let icon: string = 'default';
	export let variant: 'default' | 'warning' | 'danger' = 'default';
	
	const getIconPath = (iconName: string) => {
		const icons: Record<string, string> = {
			solar: 'M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1z',
			energy: 'M13 2.05v3.03c3.39.49 6 3.39 6 6.92 0 .9-.18 1.75-.48 2.54l2.6 1.53c.56-1.24.88-2.62.88-4.07 0-5.18-3.95-9.45-9-9.95zM12 19c-3.87 0-7-3.13-7-7 0-3.53 2.61-6.43 6-6.92V2.05c-5.06.5-9 4.76-9 9.95 0 5.52 4.47 10 9.99 10 3.31 0 6.24-1.61 8.06-4.09l-2.6-1.53C16.17 17.98 14.21 19 12 19z',
			accuracy: 'M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z',
			alert: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
			default: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z'
		};
		return icons[iconName] || icons.default;
	};
	
	$: trendColor = trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-alert-red' : 'text-soft-blue/60';
	$: variantClass = variant === 'warning' ? 'border-alert-orange/30' : variant === 'danger' ? 'border-alert-red/30' : '';
</script>

<div class="card-glass {variantClass} relative overflow-hidden">
	<!-- Background decoration -->
	<div class="absolute top-0 right-0 w-32 h-32 opacity-10">
		<svg class="w-full h-full text-cyan" fill="currentColor" viewBox="0 0 24 24">
			<path d={getIconPath(icon)} />
		</svg>
	</div>
	
	<div class="relative z-10">
		<!-- Header -->
		<div class="flex items-center justify-between mb-4">
			<h3 class="metric-label">{title}</h3>
			<div class="w-10 h-10 bg-glass-white rounded-lg flex items-center justify-center">
				<svg class="w-6 h-6 text-cyan" fill="currentColor" viewBox="0 0 24 24">
					<path d={getIconPath(icon)} />
				</svg>
			</div>
		</div>
		
		<!-- Value -->
		<div class="flex items-baseline gap-1">
			<span class="metric-value">{value}</span>
			{#if unit}
				<span class="text-soft-blue/60 text-lg font-medium">{unit}</span>
			{/if}
		</div>
		
		<!-- Change indicator -->
		{#if change}
			<div class="flex items-center gap-2 mt-3">
				<div class="flex items-center gap-1 {trendColor}">
					{#if trend === 'up'}
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
						</svg>
					{:else if trend === 'down'}
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
						</svg>
					{/if}
					<span class="text-sm font-medium">{change}</span>
				</div>
				<span class="text-soft-blue/40 text-sm">vs yesterday</span>
			</div>
		{/if}
	</div>
</div>