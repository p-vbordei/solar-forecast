<script lang="ts">
	import { onMount } from 'svelte';
	
	let chartContainer: HTMLDivElement;
	let chart: any;
	
	// Mock data for production chart
	const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
	const actualProduction = [
		0, 0, 0, 0, 0, 2.5, 8.3, 15.6, 28.4, 42.5, 
		58.3, 71.2, 78.9, 82.4, 79.6, 72.3, 61.5, 45.2, 
		28.7, 12.4, 4.2, 1.1, 0, 0
	];
	const forecastProduction = [
		0, 0, 0, 0, 0, 3.1, 9.2, 17.3, 31.2, 45.8,
		62.1, 75.3, 81.2, 85.7, 82.3, 74.6, 63.8, 47.1,
		30.2, 13.8, 5.1, 1.5, 0, 0
	];
	
	onMount(async () => {
		// Dynamically import ECharts
		const echarts = (await import('echarts')).default;
		
		// Initialize chart
		chart = echarts.init(chartContainer);
		
		const option = {
			backgroundColor: 'transparent',
			tooltip: {
				trigger: 'axis',
				backgroundColor: 'rgba(0, 49, 53, 0.9)',
				borderColor: 'rgba(175, 221, 229, 0.2)',
				textStyle: {
					color: '#AFDDE5'
				},
				formatter: (params: any) => {
					let html = `<div class="font-mono text-xs">${params[0].axisValue}</div>`;
					params.forEach((param: any) => {
						html += `<div class="flex items-center gap-2 mt-1">
							<span class="w-2 h-2 rounded-full" style="background: ${param.color}"></span>
							<span>${param.seriesName}: ${param.value} MW</span>
						</div>`;
					});
					return html;
				}
			},
			legend: {
				data: ['Actual', 'Forecast'],
				textStyle: {
					color: '#AFDDE5'
				},
				top: 10,
				right: 10
			},
			grid: {
				left: '3%',
				right: '4%',
				bottom: '3%',
				top: '15%',
				containLabel: true
			},
			xAxis: {
				type: 'category',
				boundaryGap: false,
				data: hours,
				axisLine: {
					lineStyle: {
						color: 'rgba(175, 221, 229, 0.2)'
					}
				},
				axisLabel: {
					color: '#AFDDE5',
					fontSize: 10
				}
			},
			yAxis: {
				type: 'value',
				name: 'Power (MW)',
				nameTextStyle: {
					color: '#AFDDE5',
					fontSize: 12
				},
				axisLine: {
					lineStyle: {
						color: 'rgba(175, 221, 229, 0.2)'
					}
				},
				axisLabel: {
					color: '#AFDDE5',
					fontSize: 10
				},
				splitLine: {
					lineStyle: {
						color: 'rgba(175, 221, 229, 0.1)'
					}
				}
			},
			series: [
				{
					name: 'Actual',
					type: 'line',
					smooth: true,
					symbol: 'none',
					lineStyle: {
						width: 2,
						color: '#0FA4AF'
					},
					areaStyle: {
						color: {
							type: 'linear',
							x: 0,
							y: 0,
							x2: 0,
							y2: 1,
							colorStops: [
								{ offset: 0, color: 'rgba(15, 164, 175, 0.3)' },
								{ offset: 1, color: 'rgba(15, 164, 175, 0.05)' }
							]
						}
					},
					data: actualProduction
				},
				{
					name: 'Forecast',
					type: 'line',
					smooth: true,
					symbol: 'none',
					lineStyle: {
						width: 2,
						color: '#AFDDE5',
						type: 'dashed'
					},
					data: forecastProduction
				}
			]
		};
		
		chart.setOption(option);
		
		// Handle resize
		const handleResize = () => chart?.resize();
		window.addEventListener('resize', handleResize);
		
		return () => {
			window.removeEventListener('resize', handleResize);
			chart?.dispose();
		};
	});
</script>

<div class="card-glass h-96" data-testid="production-chart">
	<div class="flex items-center justify-between mb-4">
		<h3 class="text-lg font-semibold text-soft-blue">24-Hour Production Overview</h3>
		<div class="flex items-center gap-3">
			<button class="px-3 py-1 text-xs rounded-lg bg-glass-white text-cyan">Today</button>
			<button class="px-3 py-1 text-xs rounded-lg text-soft-blue/60 hover:bg-glass-white">Yesterday</button>
			<button class="px-3 py-1 text-xs rounded-lg text-soft-blue/60 hover:bg-glass-white">7 Days</button>
			<button class="px-3 py-1 text-xs rounded-lg text-soft-blue/60 hover:bg-glass-white">30 Days</button>
		</div>
	</div>
	
	<div bind:this={chartContainer} class="h-80"></div>
</div>