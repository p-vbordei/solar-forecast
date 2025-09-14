<script>
	import { onMount } from 'svelte';

	let formData = {
		location_name: 'Solar Farm Site A',
		location_guid: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
		time_aggregation: 'hourly',
		start_date: '2025-09-14',
		end_date: '2025-09-21',
		timezone: '+03:00',
		format: 'csv'
	};

	let isGenerating = false;

	function generateTemplate() {
		isGenerating = true;

		// Create download link
		const params = new URLSearchParams({
			location_name: formData.location_name,
			location_guid: formData.location_guid,
			time_aggregation: formData.time_aggregation,
			start_date: formData.start_date,
			end_date: formData.end_date,
			timezone: formData.timezone,
			format: formData.format
		});

		const url = `/api/historical-analysis/generate-template?${params.toString()}`;

		// Create temporary link and click it to trigger download
		const link = document.createElement('a');
		link.href = url;
		link.download = `production_data_template_${formData.start_date}_to_${formData.end_date}.csv`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		setTimeout(() => {
			isGenerating = false;
		}, 1000);
	}

</script>

<svelte:head>
	<title>Production Data Template Generator</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-dark-petrol to-teal-dark p-6">
	<div class="max-w-4xl mx-auto">
		<div class="text-center mb-8">
			<h1 class="text-4xl font-bold text-soft-blue mb-2">Production Data Template Generator</h1>
			<p class="text-soft-blue/80">Generate CSV templates for solar production data with custom parameters</p>
		</div>

		<div class="bg-dark-petrol/80 backdrop-blur-md rounded-xl border border-soft-blue/20 p-8 shadow-xl">
			<form on:submit|preventDefault class="space-y-6">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<label for="location_name" class="block text-sm font-medium text-soft-blue mb-2">
							Location Name
						</label>
						<input
							type="text"
							id="location_name"
							bind:value={formData.location_name}
							class="w-full px-4 py-2 bg-teal-dark/50 border border-soft-blue/30 rounded-lg text-soft-blue placeholder-soft-blue/60 focus:ring-2 focus:ring-cyan focus:border-transparent"
							placeholder="Solar Farm Site A"
						/>
					</div>

					<div>
						<label for="location_guid" class="block text-sm font-medium text-soft-blue mb-2">
							Location GUID
						</label>
						<input
							type="text"
							id="location_guid"
							bind:value={formData.location_guid}
							class="w-full px-4 py-2 bg-teal-dark/50 border border-soft-blue/30 rounded-lg text-soft-blue placeholder-soft-blue/60 focus:ring-2 focus:ring-cyan focus:border-transparent"
							placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
						/>
					</div>

					<div>
						<label for="time_aggregation" class="block text-sm font-medium text-soft-blue mb-2">
							Time Aggregation
						</label>
						<select
							id="time_aggregation"
							bind:value={formData.time_aggregation}
							class="w-full px-4 py-2 bg-teal-dark/50 border border-soft-blue/30 rounded-lg text-soft-blue focus:ring-2 focus:ring-cyan focus:border-transparent"
						>
							<option value="hourly">Hourly</option>
							<option value="daily">Daily</option>
							<option value="monthly">Monthly</option>
						</select>
					</div>

					<div>
						<label for="timezone" class="block text-sm font-medium text-soft-blue mb-2">
							Timezone
						</label>
						<input
							type="text"
							id="timezone"
							bind:value={formData.timezone}
							class="w-full px-4 py-2 bg-teal-dark/50 border border-soft-blue/30 rounded-lg text-soft-blue placeholder-soft-blue/60 focus:ring-2 focus:ring-cyan focus:border-transparent"
							placeholder="+03:00"
							pattern="^[+-]\d{2}:\d{2}$"
						/>
					</div>

					<div>
						<label for="start_date" class="block text-sm font-medium text-soft-blue mb-2">
							Start Date
						</label>
						<input
							type="date"
							id="start_date"
							bind:value={formData.start_date}
							class="w-full px-4 py-2 bg-teal-dark/50 border border-soft-blue/30 rounded-lg text-soft-blue focus:ring-2 focus:ring-cyan focus:border-transparent"
						/>
					</div>

					<div>
						<label for="end_date" class="block text-sm font-medium text-soft-blue mb-2">
							End Date
						</label>
						<input
							type="date"
							id="end_date"
							bind:value={formData.end_date}
							class="w-full px-4 py-2 bg-teal-dark/50 border border-soft-blue/30 rounded-lg text-soft-blue focus:ring-2 focus:ring-cyan focus:border-transparent"
						/>
					</div>


					<div>
						<label for="format" class="block text-sm font-medium text-soft-blue mb-2">
							Format
						</label>
						<select
							id="format"
							bind:value={formData.format}
							class="w-full px-4 py-2 bg-teal-dark/50 border border-soft-blue/30 rounded-lg text-soft-blue focus:ring-2 focus:ring-cyan focus:border-transparent"
						>
							<option value="csv">CSV</option>
							<option value="json">JSON</option>
						</select>
					</div>
				</div>

				<div class="pt-6">
					<button
						type="button"
						on:click={generateTemplate}
						disabled={isGenerating}
						class="w-full bg-cyan hover:bg-soft-blue text-dark-petrol font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
					>
						{#if isGenerating}
							Generating Template...
						{:else}
							Generate Template
						{/if}
					</button>
				</div>
			</form>

		</div>
	</div>
</div>

<style>
	:global(.bg-dark-petrol) { background-color: #003135; }
	:global(.bg-teal-dark) { background-color: #024950; }
	:global(.text-soft-blue) { color: #AFDDE5; }
	:global(.text-cyan) { color: #0FA4AF; }
	:global(.bg-cyan) { background-color: #0FA4AF; }
	:global(.border-soft-blue\\/20) { border-color: rgba(175, 221, 229, 0.2); }
	:global(.border-soft-blue\\/30) { border-color: rgba(175, 221, 229, 0.3); }
</style>