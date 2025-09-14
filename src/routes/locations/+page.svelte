<script lang="ts">
	import { onMount } from 'svelte';
	import type { LocationCreateInput, LocationSummary, LocationTechnicalDetails } from '$lib/features/locations/models/dto/location';
	import { LOCATION_DEFAULTS, getOptimalTilt, detectTimezone } from '$lib/features/locations/models/dto/location';
	import { TIMEZONES, detectTimezoneFromCoordinates, getDefaultTimezone } from '$lib/constants/timezones';
	import DocumentTextIcon from '$lib/components/icons/DocumentTextIcon.svelte';
	import ChartBarIcon from '$lib/components/icons/ChartBarIcon.svelte';
	import PlusIcon from '$lib/components/icons/PlusIcon.svelte';
	import PencilIcon from '$lib/components/icons/PencilIcon.svelte';
	import TrashIcon from '$lib/components/icons/TrashIcon.svelte';
	import MapPinIcon from '$lib/components/icons/MapPinIcon.svelte';
	
	// UI State Management
	let showExplanation = false;
	let locations: LocationSummary[] = [];
	let loading = true;
	let error: string | null = null;
	let showLocationModal = false;
	let showTechnicalModal = false;
	let editingLocation: any = null;
	let selectedLocationTechnical: LocationTechnicalDetails | null = null;
	
	// Form State - Comprehensive defaults to support all form bindings
	let formData: LocationCreateInput = {
		// Mandatory fields only
		name: '',
		latitude: 0,
		longitude: 0,
		
		// Initialize all nested objects to prevent binding errors
		location: {
			timezone: getDefaultTimezone().value, // Default to UTC+2 (Bucharest)
			altitude: 0
		},
		plant: {
			capacity_mw: 1.0,
			panels: {
				tilt: 30,
				azimuth: 180,
				technology: 'monocrystalline',
				temperature_coefficient: -0.004,
				nominal_efficiency: 0.20,
				bifacial: false,
				bifaciality_factor: 0.0
			},
			inverter: {
				model: 'Generic 3-phase inverter',
				power_factor: 1.0
			},
			mounting: {
				type: 'fixed',
				ground_coverage_ratio: 0.4,
				row_spacing: 0
			},
			losses: {
				soiling_monthly: [0.04, 0.04, 0.03, 0.03, 0.02, 0.02, 0.02, 0.02, 0.02, 0.03, 0.04, 0.04],
				shading: 0.01,
				snow: 0.00,
				mismatch: 0.02,
				wiring_dc: 0.015,
				wiring_ac: 0.01,
				transformer: 0.01,
				availability: 0.02
			}
		},
		performance: {
			clear_sky: 0.95,
			partly_cloudy: 0.88,
			cloudy: 0.82,
			overcast: 0.75,
			dawn_dusk_factor: 0.85,
			horizon_shading: {
				north: 0, east: 0, south: 0, west: 0,
				northeast: 0, southeast: 0, southwest: 0, northwest: 0
			},
			temperature_model: 'sapm'
		},
		output: {
			formats: ['csv_15min', 'csv_hourly', 'json_api'],
			email_reports: true,
			email_schedule: 'daily',
			email_time: '06:00'
		},
		calibration: {
			adjustment_factor: 1.0,
			seasonal_adjustments: Array(12).fill(1.0),
			auto_calibrate: false,
			calibration_frequency: 'monthly',
			min_data_days: 30
		}
	};
	
	// Advanced form sections (collapsed by default)
	let showAdvancedSections = {
		clientInfo: false,
		plantSpecs: false,
		performance: false,
		losses: false,
		calibration: false,
		output: false
	};
	
	// Form validation state
	let formErrors: { [key: string]: string } = {};
	let formTouched: { [key: string]: boolean } = {};
	
	// Smart input assistance
	let locationSuggestions: any[] = [];
	let isValidatingGPS = false;
	let gpsValidationResult: any = null;

	onMount(async () => {
		await loadLocations();
	});

	// Load locations with summary view for optimal performance
	async function loadLocations() {
		try {
			loading = true;
			const response = await fetch('/api/locations?view=summary');
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

	// Refresh dashboard statistics (to update header)
	async function refreshDashboard() {
		try {
			// Call the dashboard API to refresh data
			await fetch('/api/dashboard');

			// Dispatch custom event to notify header component to refresh immediately
			window.dispatchEvent(new CustomEvent('dashboardRefresh'));
		} catch (err) {
			console.warn('Failed to refresh dashboard:', err);
		}
	}

	// Smart form management
	function openLocationModal() {
		editingLocation = null;
		resetForm();
		// Clear any existing errors
		formErrors = {};
		formTouched = {};
		showLocationModal = true;
	}

	function openEditModal(location: LocationSummary) {
		editingLocation = location;
		loadLocationForEdit(location.id);
		showLocationModal = true;
	}

	async function loadLocationForEdit(locationId: string) {
		try {
			const response = await fetch(`/api/locations/${locationId}?view=detailed`);
			const data = await response.json();
			
			if (data.success) {
				// Populate form with existing data
				const location = data.data;
				formData = {
					name: location.name,
					latitude: location.location.latitude,
					longitude: location.location.longitude,
					location: location.location,
					plant: location.plant,
					performance: location.performance,
					output: location.output,
					calibration: location.calibration,
					client: location.client,
					status: location.status,
					notes: location.notes,
					tags: location.tags
				};
			}
		} catch (err) {
			console.error('Error loading location for edit:', err);
		}
	}

	function resetForm() {
		formData = {
			// Mandatory fields only
			name: '',
			latitude: 0,
			longitude: 0,
			
			// Initialize all nested objects to prevent binding errors
			location: {
				timezone: getDefaultTimezone().value, // Default to UTC+2 (Bucharest)
				altitude: 0
			},
			plant: {
				capacity_mw: 1.0,
				panels: {
					tilt: 30,
					azimuth: 180,
					technology: 'monocrystalline',
					temperature_coefficient: -0.004,
					nominal_efficiency: 0.20,
					bifacial: false,
					bifaciality_factor: 0.0
				},
				inverter: {
					model: 'Generic 3-phase inverter',
					power_factor: 1.0
				},
				mounting: {
					type: 'fixed',
					ground_coverage_ratio: 0.4,
					row_spacing: 0
				},
				losses: {
					soiling_monthly: [0.04, 0.04, 0.03, 0.03, 0.02, 0.02, 0.02, 0.02, 0.02, 0.03, 0.04, 0.04],
					shading: 0.01,
					snow: 0.00,
					mismatch: 0.02,
					wiring_dc: 0.015,
					wiring_ac: 0.01,
					transformer: 0.01,
					availability: 0.02
				}
			},
			performance: {
				clear_sky: 0.95,
				partly_cloudy: 0.88,
				cloudy: 0.82,
				overcast: 0.75,
				dawn_dusk_factor: 0.85,
				horizon_shading: {
					north: 0, east: 0, south: 0, west: 0,
					northeast: 0, southeast: 0, southwest: 0, northwest: 0
				},
				temperature_model: 'sapm'
			},
			output: {
				formats: ['csv_15min', 'csv_hourly', 'json_api'],
				email_reports: true,
				email_schedule: 'daily',
				email_time: '06:00'
			},
			calibration: {
				adjustment_factor: 1.0,
				seasonal_adjustments: Array(12).fill(1.0),
				auto_calibrate: false,
				calibration_frequency: 'monthly',
				min_data_days: 30
			}
		};
		formErrors = {};
		formTouched = {};
		gpsValidationResult = null;
		// Reset all advanced sections to collapsed (using proper Svelte reactivity)
		showAdvancedSections = {
			clientInfo: false,
			plantSpecs: false,
			performance: false,
			losses: false,
			calibration: false,
			output: false
		};
	}

	// Smart GPS validation and optimization
	async function validateAndOptimizeGPS() {
		if (!formData.latitude || !formData.longitude) return;
		
		isValidatingGPS = true;
		
		try {
			// Validate GPS coordinates
			if (formData.latitude < -90 || formData.latitude > 90) {
				formErrors.latitude = 'Latitude must be between -90 and 90';
				return;
			}
			
			if (formData.longitude < -180 || formData.longitude > 180) {
				formErrors.longitude = 'Longitude must be between -180 and 180';
				return;
			}
			
			// Auto-optimize based on GPS location
			await optimizeLocationDefaults();
			
			gpsValidationResult = {
				valid: true,
				optimized: true,
				suggestions: [
					`Timezone auto-detected: ${formData.location?.timezone}`,
					`Optimal panel tilt: ${formData.plant?.panels?.tilt}°`,
					`Geographic region optimizations applied`
				]
			};
			
			// Clear GPS errors
			delete formErrors.latitude;
			delete formErrors.longitude;
			
		} catch (err) {
			gpsValidationResult = {
				valid: false,
				error: 'Could not validate coordinates'
			};
		} finally {
			isValidatingGPS = false;
		}
	}

	// Intelligent location defaults based on GPS
	async function optimizeLocationDefaults() {
		if (!formData.latitude || !formData.longitude) return;

		// Auto-detect timezone using our UTC-based system
		const detectedTimezone = detectTimezoneFromCoordinates(formData.latitude, formData.longitude);

		// Initialize location object if it doesn't exist
		if (!formData.location) {
			formData.location = { timezone: getDefaultTimezone().value, altitude: 0 };
		}
		formData.location.timezone = detectedTimezone;
		
		// Auto-optimize panel tilt based on latitude
		const optimalTilt = getOptimalTilt(formData.latitude);
		
		// Initialize plant object if it doesn't exist
		if (!formData.plant) {
			formData.plant = { capacity_mw: 1.0 };
		}
		
		// Initialize panels section with optimized values
		if (!formData.plant.panels) {
			formData.plant.panels = {
				tilt: optimalTilt,
				azimuth: 180, // South-facing
				technology: 'monocrystalline',
				temperature_coefficient: -0.004,
				nominal_efficiency: 0.20,
				bifacial: false,
				bifaciality_factor: 0.0
			};
		} else {
			formData.plant.panels.tilt = optimalTilt;
		}
		
		// Regional climate optimizations
		if (Math.abs(formData.latitude) > 60) {
			// High latitude optimizations
			if (!formData.plant.losses) formData.plant.losses = {};
			formData.plant.losses.snow = 0.05; // Higher snow losses
		}
		
		// Trigger reactive updates
		formData = formData;
	}

	// Real-time form validation
	function validateField(field: string, value: any) {
		switch (field) {
			case 'name':
				if (!value?.trim()) {
					formErrors.name = 'Location name is required';
				} else if (value.length < 2) {
					formErrors.name = 'Name must be at least 2 characters';
				} else {
					delete formErrors.name;
				}
				break;
				
			case 'latitude':
				if (typeof value !== 'number' || value < -90 || value > 90) {
					formErrors.latitude = 'Valid latitude is required (-90 to 90)';
				} else {
					delete formErrors.latitude;
				}
				break;
				
			case 'longitude':
				if (typeof value !== 'number' || value < -180 || value > 180) {
					formErrors.longitude = 'Valid longitude is required (-180 to 180)';
				} else {
					delete formErrors.longitude;
				}
				break;
				
			case 'capacity_mw':
				if (value && (typeof value !== 'number' || value <= 0)) {
					formErrors.capacity_mw = 'Capacity must be a positive number';
				} else {
					delete formErrors.capacity_mw;
				}
				break;
		}
		
		// Trigger reactive updates
		formErrors = formErrors;
	}

	// Handle form field updates with validation
	function handleFieldUpdate(field: string, value: any) {
		formTouched[field] = true;
		validateField(field, value);
		
		// Auto-optimize when GPS coordinates change
		if (field === 'latitude' || field === 'longitude') {
			if (formData.latitude && formData.longitude) {
				validateAndOptimizeGPS();
			}
		}
	}

	// Save location with comprehensive error handling
	async function saveLocation() {
		try {
			// Final validation
			validateField('name', formData.name);
			validateField('latitude', formData.latitude);
			validateField('longitude', formData.longitude);
			
			if (Object.keys(formErrors).length > 0) {
				// Highlight first error field
				const firstErrorField = Object.keys(formErrors)[0];
				document.getElementById(firstErrorField)?.focus();
				return;
			}
			
			const endpoint = editingLocation ? `/api/locations/${editingLocation.id}` : '/api/locations';
			const method = editingLocation ? 'PUT' : 'POST';

			// Transform formData to match API expectations
			const apiData = {
				name: formData.name,
				coordinates: {
					latitude: formData.latitude,
					longitude: formData.longitude
				},
				// Include required basic configuration
				basic: {
					capacityMW: formData.plant?.capacity_mw || 1.0,
					timezone: formData.location?.timezone || 'UTC'
				}
			};

			console.log('Sending to API:', apiData);

			const response = await fetch(endpoint, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(apiData)
			});
			
			const result = await response.json();
			
			if (result.success) {
				showLocationModal = false;
				await loadLocations();

				// Refresh dashboard statistics to update header
				await refreshDashboard();

				// Show success message with smart defaults info
				if (!editingLocation && result.message) {
					// Could show a toast notification here
					console.log('Location created with smart defaults:', result.message);
				}
			} else {
				// Handle field-specific errors
				if (result.field && result.error) {
					formErrors[result.field] = result.error;
					document.getElementById(result.field)?.focus();
				} else {
					alert('Failed to save location: ' + result.error);
				}
			}
		} catch (err) {
			alert('Error saving location: ' + err);
		}
	}

	// Delete location with confirmation
	async function deleteLocation(id: string, name: string) {
		if (confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
			try {
				const response = await fetch(`/api/locations/${id}`, {
					method: 'DELETE'
				});
				
				const result = await response.json();
				
				if (result.success) {
					await loadLocations();

					// Refresh dashboard statistics to update header
					await refreshDashboard();
				} else {
					alert('Failed to delete location: ' + result.error);
				}
			} catch (err) {
				alert('Error deleting location: ' + err);
			}
		}
	}

	// View technical details
	async function viewTechnicalDetails(locationId: string) {
		try {
			const response = await fetch(`/api/locations/${locationId}?view=technical`);
			const data = await response.json();
			
			if (data.success) {
				selectedLocationTechnical = data.data;
				showTechnicalModal = true;
			} else {
				alert('Failed to load technical details: ' + data.error);
			}
		} catch (err) {
			alert('Error loading technical details: ' + err);
		}
	}

	// Utility functions
	function getStatusColor(status: string) {
		switch (status) {
			case 'active': return 'status-active';
			case 'maintenance': return 'status-warning';
			case 'offline': return 'status-danger';
			case 'commissioning': return 'status-info';
			default: return 'status-neutral';
		}
	}

	function formatCoordinates(lat: number, lng: number) {
		return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
	}

	function toggleAdvancedSection(section: keyof typeof showAdvancedSections) {
		showAdvancedSections = {
			...showAdvancedSections,
			[section]: !showAdvancedSections[section]
		};
	}

	// Helper functions imported from types/location.ts
</script>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-soft-blue">Solar Locations</h1>
			<p class="text-soft-blue/60 mt-2">Manage solar farm locations with intelligent technical configuration</p>
		</div>
		<div class="flex items-center space-x-4">
			<button on:click={openLocationModal} class="btn btn-primary">
				<PlusIcon className="w-5 h-5 mr-2" />
				Add Location
			</button>
		</div>
	</div>

	<!-- Understanding Location Management Help -->
	<div class="card-glass">
		<button
			on:click={() => showExplanation = !showExplanation}
			class="flex items-center justify-between w-full text-left"
		>
			<div class="flex items-center space-x-3">
				<div class="w-8 h-8 bg-gradient-to-br from-cyan to-soft-blue rounded-xl flex items-center justify-center shadow-lg shadow-cyan/30">
					<DocumentTextIcon class="w-4 h-4 text-dark-petrol" />
				</div>
				<div>
					<h3 class="text-lg font-semibold text-white">Understanding Smart Location Management</h3>
					<p class="text-sm text-soft-blue/80">Learn how the intelligent parameter system optimizes your solar configurations</p>
				</div>
			</div>
			<div class="transform transition-transform duration-200 {showExplanation ? 'rotate-180' : 'rotate-0'}">
				<svg class="w-5 h-5 text-soft-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
				</svg>
			</div>
		</button>

		{#if showExplanation}
			<div class="mt-6 pt-6 border-t border-soft-blue/20 space-y-4 animate-slide-down">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<h4 class="font-semibold text-white mb-3 flex items-center space-x-2">
							<span class="w-6 h-6 bg-cyan/20 rounded-full flex items-center justify-center text-cyan text-sm font-bold">1</span>
							<span>Intelligent Defaults System</span>
						</h4>
						<p class="text-sm text-soft-blue/80 leading-relaxed mb-3">
							Only location name and GPS coordinates are mandatory. All technical parameters are automatically
							optimized based on geographic location, climate data, and industry best practices.
						</p>
						<div class="bg-cyan/20 rounded-lg p-3 border border-cyan/30">
							<p class="text-xs text-soft-blue/70">
								<strong class="text-cyan">Smart Optimization:</strong> Panel tilt angles, timezone detection,
								and climate-specific loss factors are automatically calculated from your GPS coordinates.
							</p>
						</div>
					</div>
					<div>
						<h4 class="font-semibold text-white mb-3 flex items-center space-x-2">
							<span class="w-6 h-6 bg-cyan/20 rounded-full flex items-center justify-center text-cyan text-sm font-bold">2</span>
							<span>Expandable Technical Configuration</span>
						</h4>
						<div class="space-y-2">
							<div class="flex items-start space-x-2">
								<span class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></span>
								<p class="text-sm text-soft-blue/80"><strong class="text-white">Basic Mode:</strong> Just enter name and GPS coordinates</p>
							</div>
							<div class="flex items-start space-x-2">
								<span class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></span>
								<p class="text-sm text-soft-blue/80"><strong class="text-white">Advanced Mode:</strong> Expand sections to customize technical parameters</p>
							</div>
							<div class="flex items-start space-x-2">
								<span class="w-1.5 h-1.5 bg-cyan rounded-full mt-2 flex-shrink-0"></span>
								<p class="text-sm text-soft-blue/80"><strong class="text-white">Expert Mode:</strong> Full YAML-compatible parameter control</p>
							</div>
						</div>
					</div>
					<div>
						<h4 class="font-semibold text-white mb-3 flex items-center space-x-2">
							<span class="w-6 h-6 bg-cyan/20 rounded-full flex items-center justify-center text-cyan text-sm font-bold">3</span>
							<span>Data Persistence & Versioning</span>
						</h4>
						<p class="text-sm text-soft-blue/80 leading-relaxed mb-3">
							All location data is stored with full version control. Edit configurations anytime without
							losing historical data. Export to YAML format for external systems integration.
						</p>
					</div>
					<div>
						<h4 class="font-semibold text-white mb-3 flex items-center space-x-2">
							<span class="w-6 h-6 bg-cyan/20 rounded-full flex items-center justify-center text-cyan text-sm font-bold">4</span>
							<span>Real-time Monitoring Integration</span>
						</h4>
						<p class="text-sm text-soft-blue/80 leading-relaxed mb-3">
							Location technical parameters directly feed into forecast models, production monitoring,
							and performance analytics for accurate energy predictions and optimization.
						</p>
					</div>
				</div>

				<!-- Features Summary -->
				<div class="bg-teal-dark/30 rounded-xl p-4 border border-cyan/20">
					<h5 class="font-medium text-white mb-2">
						<span>Key Smart Features</span>
					</h5>
					<div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
						<div class="text-soft-blue/80">• <strong class="text-white">GPS Optimization:</strong> Auto-tilt and timezone</div>
						<div class="text-soft-blue/80">• <strong class="text-white">Climate Adaptation:</strong> Regional loss factors</div>
						<div class="text-soft-blue/80">• <strong class="text-white">Industry Standards:</strong> PVLIB-compatible defaults</div>
						<div class="text-soft-blue/80">• <strong class="text-white">Version Control:</strong> Track all configuration changes</div>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Locations Display -->
	{#if loading}
		<div class="flex justify-center items-center py-12">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan"></div>
		</div>
	{:else if error}
		<div class="card-glass text-center py-8">
			<p class="text-alert-red">{error}</p>
			<button on:click={loadLocations} class="btn btn-secondary mt-4">Retry</button>
		</div>
	{:else if locations.length === 0}
		<div class="card-glass text-center py-12">
			<MapPinIcon className="w-16 h-16 text-soft-blue/40 mx-auto mb-4" />
			<h3 class="text-xl font-semibold text-soft-blue mb-2">No locations configured</h3>
			<p class="text-soft-blue/60 mb-6">Create your first solar location with intelligent parameter optimization</p>
			<button on:click={openLocationModal} class="btn btn-primary">
				<PlusIcon className="w-5 h-5 mr-2" />
				Create First Location
			</button>
		</div>
	{:else}
		<div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
			{#each locations as location}
				<div class="card-glass group hover:shadow-lg hover:shadow-cyan/10 transition-all duration-200">
					<!-- Location Header -->
					<div class="flex items-start justify-between mb-4">
						<div class="flex items-center space-x-3">
							<div class="w-12 h-12 bg-gradient-to-br from-cyan/20 to-soft-blue/20 rounded-xl flex items-center justify-center">
								<MapPinIcon className="w-6 h-6 text-cyan" />
							</div>
							<div>
								<h3 class="font-semibold text-white">{location.name}</h3>
								<p class="text-sm text-soft-blue/60">{location.city || formatCoordinates(location.latitude, location.longitude)}</p>
							</div>
						</div>
						<span class="status {getStatusColor(location.status)}">{location.status}</span>
					</div>

					<!-- Key Metrics -->
					<div class="grid grid-cols-2 gap-4 mb-4">
						<div class="bg-teal-dark/50 rounded-lg p-3">
							<p class="text-xs text-soft-blue/60 mb-1">Capacity</p>
							<p class="text-lg font-mono text-white">{location.capacityMW || 1.0} MW</p>
						</div>
						<div class="bg-teal-dark/50 rounded-lg p-3">
							<p class="text-xs text-soft-blue/60 mb-1">Current Output</p>
							<p class="text-lg font-mono text-cyan">{location.currentOutput?.toFixed(1) || '0.0'} MW</p>
						</div>
						<div class="bg-teal-dark/50 rounded-lg p-3">
							<p class="text-xs text-soft-blue/60 mb-1">Today's Energy</p>
							<p class="text-lg font-mono text-cyan">{location.todayEnergy?.toFixed(1) || '0.0'} MWh</p>
						</div>
						<div class="bg-teal-dark/50 rounded-lg p-3">
							<p class="text-xs text-soft-blue/60 mb-1">Efficiency</p>
							<p class="text-lg font-mono text-white">{location.efficiency?.toFixed(1) || '0'}%</p>
						</div>
					</div>

					<!-- Health Score Bar -->
					{#if location.healthScore}
						<div class="mb-4">
							<div class="flex items-center justify-between text-sm mb-2">
								<span class="text-soft-blue/60">Health Score</span>
								<span class="font-mono text-white">{location.healthScore}/100</span>
							</div>
							<div class="w-full bg-teal-dark rounded-full h-2">
								<div 
									class="h-2 rounded-full transition-all duration-500 {
										location.healthScore >= 90 ? 'bg-green-500' :
										location.healthScore >= 70 ? 'bg-yellow-500' : 'bg-red-500'
									}"
									style="width: {location.healthScore}%"
								></div>
							</div>
						</div>
					{/if}

					<!-- Action Buttons -->
					<div class="flex space-x-2">
						<button 
							on:click={() => openEditModal(location)}
							class="btn btn-secondary btn-sm flex-1"
							title="Edit location configuration"
						>
							<PencilIcon className="w-4 h-4 mr-1" />
							Edit
						</button>
						<button 
							on:click={() => deleteLocation(location.id, location.name)}
							class="btn btn-danger btn-sm"
							title="Delete location"
						>
							<TrashIcon className="w-4 h-4" />
						</button>
					</div>

					<!-- Alert Indicator -->
					{#if location.alertCount && location.alertCount > 0}
						<div class="mt-3 flex items-center space-x-2 text-sm text-alert-orange">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"></path>
							</svg>
							<span>{location.alertCount} active alert{location.alertCount > 1 ? 's' : ''}</span>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<!-- Location Add/Edit Modal -->
	{#if showLocationModal}
		<div class="fixed inset-0 bg-dark-petrol/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
			<div class="bg-teal-dark border border-cyan/30 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
				<!-- Modal Header -->
				<div class="flex items-center justify-between p-6 border-b border-cyan/20">
					<div>
						<h2 class="text-2xl font-bold text-white">
							{editingLocation ? 'Edit Location' : 'Create New Location'}
						</h2>
						<p class="text-soft-blue/60 text-sm mt-1">
							{editingLocation ? 'Update location configuration' : 'Only name and GPS coordinates are required - all other parameters have intelligent defaults'}
						</p>
					</div>
					<button 
						on:click={() => showLocationModal = false} 
						class="text-soft-blue hover:text-white transition-colors"
						title="Close modal"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
						</svg>
					</button>
				</div>

				<!-- Modal Content -->
				<div class="p-6 max-h-[60vh] overflow-y-auto">
					<!-- Mandatory Fields Section -->
					<div class="bg-gradient-to-r from-cyan/10 to-soft-blue/10 rounded-xl p-6 border border-cyan/20 mb-6">
						<h3 class="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
							<span class="w-6 h-6 bg-cyan/20 rounded-full flex items-center justify-center text-cyan text-sm font-bold">*</span>
							<span>Required Information</span>
						</h3>
						
						<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
							<!-- Location Name -->
							<div class="md:col-span-1">
								<label for="name" class="label">
									Location Name <span class="text-alert-red">*</span>
								</label>
								<input
									id="name"
									type="text"
									bind:value={formData.name}
									on:blur={() => handleFieldUpdate('name', formData.name)}
									class="input {formErrors.name ? 'border-alert-red' : ''}"
									placeholder="e.g., Solar Farm Alpha"
									required
								/>
								{#if formErrors.name}
									<p class="text-xs text-alert-red mt-1">{formErrors.name}</p>
								{/if}
							</div>

							<!-- GPS Coordinates -->
							<div>
								<label for="latitude" class="label">
									Latitude <span class="text-alert-red">*</span>
								</label>
								<input
									id="latitude"
									type="number"
									step="0.0001"
									bind:value={formData.latitude}
									on:blur={() => handleFieldUpdate('latitude', formData.latitude)}
									class="input {formErrors.latitude ? 'border-alert-red' : ''}"
									placeholder="45.3104"
									required
								/>
								{#if formErrors.latitude}
									<p class="text-xs text-alert-red mt-1">{formErrors.latitude}</p>
								{/if}
							</div>

							<div>
								<label for="longitude" class="label">
									Longitude <span class="text-alert-red">*</span>
								</label>
								<input
									id="longitude"
									type="number"
									step="0.0001"
									bind:value={formData.longitude}
									on:blur={() => handleFieldUpdate('longitude', formData.longitude)}
									class="input {formErrors.longitude ? 'border-alert-red' : ''}"
									placeholder="27.8322"
									required
								/>
								{#if formErrors.longitude}
									<p class="text-xs text-alert-red mt-1">{formErrors.longitude}</p>
								{/if}
							</div>
						</div>

						<!-- GPS Validation Result -->
						{#if isValidatingGPS}
							<div class="mt-4 flex items-center space-x-2 text-soft-blue">
								<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan"></div>
								<span class="text-sm">Optimizing location parameters...</span>
							</div>
						{:else if gpsValidationResult}
							<div class="mt-4 p-3 rounded-lg {gpsValidationResult.valid ? 'bg-green-900/20 border border-green-500/30' : 'bg-red-900/20 border border-red-500/30'}">
								{#if gpsValidationResult.valid}
									<p class="text-sm text-green-400 font-medium mb-2">✓ Location optimized successfully!</p>
									{#if gpsValidationResult.suggestions}
										<ul class="text-xs text-green-300/80 space-y-1">
											{#each gpsValidationResult.suggestions as suggestion}
												<li>• {suggestion}</li>
											{/each}
										</ul>
									{/if}
								{:else}
									<p class="text-sm text-red-400">⚠ {gpsValidationResult.error}</p>
								{/if}
							</div>
						{/if}
					</div>

					<!-- Optional Basic Configuration -->
					<div class="card-glass mb-6">
						<h3 class="text-lg font-semibold text-white mb-4">Basic Configuration (Optional)</h3>
						
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label for="capacity_mw" class="label">Plant Capacity (MW)</label>
								<input
									id="capacity_mw"
									type="number"
									step="0.001"
									bind:value={formData.plant.capacity_mw}
									on:blur={() => handleFieldUpdate('capacity_mw', formData.plant?.capacity_mw)}
									class="input {formErrors.capacity_mw ? 'border-alert-red' : ''}"
									placeholder="1.0"
								/>
								{#if formErrors.capacity_mw}
									<p class="text-xs text-alert-red mt-1">{formErrors.capacity_mw}</p>
								{/if}
								<p class="text-xs text-soft-blue/60 mt-1">Default: 1.0 MW</p>
							</div>

							<div>
								<label for="timezone" class="label">
									Timezone <span class="text-alert-red">*</span>
								</label>
								<select
									id="timezone"
									bind:value={formData.location.timezone}
									on:blur={() => handleFieldUpdate('timezone', formData.location?.timezone)}
									class="select {formErrors.timezone ? 'border-alert-red' : ''}"
									required
								>
									{#each TIMEZONES as timezone}
										<option value={timezone.value}>{timezone.label}</option>
									{/each}
								</select>
								{#if formErrors.timezone}
									<p class="text-xs text-alert-red mt-1">{formErrors.timezone}</p>
								{/if}
								<p class="text-xs text-soft-blue/60 mt-1">Select the timezone for accurate solar calculations</p>
							</div>
						</div>
					</div>

					<!-- Advanced Technical Parameters (Expandable Sections) -->
					<div class="space-y-4">
						<!-- Panel Specifications -->
						<div class="card-glass">
							<button 
								type="button"
								on:click={() => toggleAdvancedSection('plantSpecs')}
								class="flex items-center justify-between w-full text-left"
							>
								<div>
									<h4 class="font-semibold text-white">Panel & Inverter Specifications</h4>
									<p class="text-sm text-soft-blue/60">Advanced technical parameters with intelligent defaults</p>
								</div>
								<div class="transform transition-transform duration-200 {showAdvancedSections.plantSpecs ? 'rotate-180' : 'rotate-0'}">
									<svg class="w-5 h-5 text-soft-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
									</svg>
								</div>
							</button>
							
							{#if showAdvancedSections.plantSpecs}
								<div class="mt-6 pt-6 border-t border-soft-blue/20 space-y-4 animate-slide-down">
									<!-- Panel Configuration -->
									<div>
										<h5 class="font-medium text-white mb-3">Panel Configuration</h5>
										<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
											<div>
												<label class="label">Panel Tilt (°)</label>
												<input
													type="number"
													min="0"
													max="90"
													bind:value={formData.plant.panels.tilt}
													class="input"
													placeholder="30"
												/>
												<p class="text-xs text-soft-blue/60 mt-1">Optimized to latitude</p>
											</div>
											<div>
												<label class="label">Azimuth (°)</label>
												<input
													type="number"
													min="0"
													max="360"
													bind:value={formData.plant.panels.azimuth}
													class="input"
													placeholder="180"
												/>
												<p class="text-xs text-soft-blue/60 mt-1">0=North, 180=South</p>
											</div>
											<div>
												<label class="label">Technology</label>
												<select
													bind:value={formData.plant.panels.technology}
													class="select"
												>
													<option value="monocrystalline">Monocrystalline</option>
													<option value="polycrystalline">Polycrystalline</option>
													<option value="thin_film">Thin Film</option>
												</select>
											</div>
											<div>
												<label class="label">Efficiency</label>
												<input
													type="number"
													step="0.01"
													min="0"
													max="1"
													bind:value={formData.plant.panels.nominal_efficiency}
													class="input"
													placeholder="0.20"
												/>
											</div>
										</div>
									</div>

									<!-- Inverter Configuration -->
									<div>
										<h5 class="font-medium text-white mb-3">Inverter Configuration</h5>
										<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div>
												<label class="label">Inverter Model</label>
												<input
													type="text"
													bind:value={formData.plant.inverter.model}
													class="input"
													placeholder="Generic 3-phase inverter"
												/>
											</div>
											<div>
												<label class="label">Power Factor</label>
												<input
													type="number"
													step="0.01"
													min="0"
													max="1"
													bind:value={formData.plant.inverter.power_factor}
													class="input"
													placeholder="1.0"
												/>
											</div>
										</div>
									</div>
								</div>
							{/if}
						</div>

						<!-- System Losses -->
						<div class="card-glass">
							<button 
								type="button"
								on:click={() => toggleAdvancedSection('losses')}
								class="flex items-center justify-between w-full text-left"
							>
								<div>
									<h4 class="font-semibold text-white">System Losses & Performance</h4>
									<p class="text-sm text-soft-blue/60">Configure system losses and weather-dependent performance</p>
								</div>
								<div class="transform transition-transform duration-200 {showAdvancedSections.losses ? 'rotate-180' : 'rotate-0'}">
									<svg class="w-5 h-5 text-soft-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
									</svg>
								</div>
							</button>
							
							{#if showAdvancedSections.losses}
								<div class="mt-6 pt-6 border-t border-soft-blue/20 space-y-4 animate-slide-down">
									<p class="text-sm text-soft-blue/80">All loss factors are automatically set to industry-standard values. Modify only if you have specific requirements.</p>
									
									<!-- Weather Performance -->
									<div>
										<h5 class="font-medium text-white mb-3">Weather-Dependent Performance</h5>
										<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
											<div>
												<label class="label">Clear Sky</label>
												<input
													type="number"
													step="0.01"
													min="0"
													max="1"
													bind:value={formData.performance.clear_sky}
													class="input"
													placeholder="0.95"
												/>
											</div>
											<div>
												<label class="label">Partly Cloudy</label>
												<input
													type="number"
													step="0.01"
													min="0"
													max="1"
													bind:value={formData.performance.partly_cloudy}
													class="input"
													placeholder="0.88"
												/>
											</div>
											<div>
												<label class="label">Cloudy</label>
												<input
													type="number"
													step="0.01"
													min="0"
													max="1"
													bind:value={formData.performance.cloudy}
													class="input"
													placeholder="0.82"
												/>
											</div>
											<div>
												<label class="label">Overcast</label>
												<input
													type="number"
													step="0.01"
													min="0"
													max="1"
													bind:value={formData.performance.overcast}
													class="input"
													placeholder="0.75"
												/>
											</div>
										</div>
									</div>
								</div>
							{/if}
						</div>
					</div>
				</div>

				<!-- Modal Footer -->
				<div class="flex items-center justify-between p-6 border-t border-cyan/20 bg-dark-petrol/50">
					<div class="text-sm text-soft-blue/60">
						{#if !editingLocation}
							<span class="flex items-center space-x-2">
								<svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
								</svg>
								<span>All technical parameters will be automatically optimized</span>
							</span>
						{/if}
					</div>
					
					<div class="flex space-x-2">
						<button
							type="button"
							on:click={() => showLocationModal = false}
							class="btn btn-ghost"
						>
							Cancel
						</button>
						<button
							type="button"
							on:click={saveLocation}
							class="btn btn-primary"
							disabled={!formData.name || !formData.latitude || !formData.longitude || !formData.plant?.capacity_mw || !formData.location?.timezone || Object.keys(formErrors).length > 0}
						>
							{editingLocation ? 'Update Location' : 'Create Location'}
						</button>
					</div>

				</div>
			</div>
		</div>
	{/if}

	<!-- Technical Details Modal -->
	{#if showTechnicalModal && selectedLocationTechnical}
		<div class="fixed inset-0 bg-dark-petrol/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
			<div class="bg-teal-dark border border-cyan/30 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
				<!-- Modal Header -->
				<div class="flex items-center justify-between p-6 border-b border-cyan/20">
					<div>
						<h2 class="text-2xl font-bold text-white">Technical Specifications</h2>
						<p class="text-soft-blue/60 text-sm mt-1">Complete technical parameter overview</p>
					</div>
					<button 
						on:click={() => showTechnicalModal = false} 
						class="text-soft-blue hover:text-white transition-colors"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
						</svg>
					</button>
				</div>

				<!-- Technical Details Content -->
				<div class="p-6 max-h-[70vh] overflow-y-auto">
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<!-- Plant Specifications -->
						<div class="card-glass">
							<h3 class="text-lg font-semibold text-white mb-4">
								<span>Plant Specifications</span>
							</h3>
							<div class="space-y-3 text-sm">
								<div class="flex justify-between">
									<span class="text-soft-blue/60">Capacity:</span>
									<span class="font-mono text-white">{selectedLocationTechnical.plant.capacity_mw} MW</span>
								</div>
								<div class="flex justify-between">
									<span class="text-soft-blue/60">Panel Technology:</span>
									<span class="text-white capitalize">{selectedLocationTechnical.plant.panels.technology}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-soft-blue/60">Panel Tilt:</span>
									<span class="font-mono text-white">{selectedLocationTechnical.plant.panels.tilt}°</span>
								</div>
								<div class="flex justify-between">
									<span class="text-soft-blue/60">Panel Azimuth:</span>
									<span class="font-mono text-white">{selectedLocationTechnical.plant.panels.azimuth}°</span>
								</div>
								<div class="flex justify-between">
									<span class="text-soft-blue/60">Nominal Efficiency:</span>
									<span class="font-mono text-white">{(selectedLocationTechnical.plant.panels.nominal_efficiency * 100).toFixed(1)}%</span>
								</div>
								<div class="flex justify-between">
									<span class="text-soft-blue/60">Mounting Type:</span>
									<span class="text-white capitalize">{selectedLocationTechnical.plant.mounting.type.replace('_', ' ')}</span>
								</div>
							</div>
						</div>

						<!-- Performance Parameters -->
						<div class="card-glass">
							<h3 class="text-lg font-semibold text-white mb-4">Performance Parameters</h3>
							<div class="space-y-3 text-sm">
								<div class="flex justify-between">
									<span class="text-soft-blue/60">Clear Sky Performance:</span>
									<span class="font-mono text-white">{(selectedLocationTechnical.performance.clear_sky * 100).toFixed(1)}%</span>
								</div>
								<div class="flex justify-between">
									<span class="text-soft-blue/60">Partly Cloudy:</span>
									<span class="font-mono text-white">{(selectedLocationTechnical.performance.partly_cloudy * 100).toFixed(1)}%</span>
								</div>
								<div class="flex justify-between">
									<span class="text-soft-blue/60">Cloudy:</span>
									<span class="font-mono text-white">{(selectedLocationTechnical.performance.cloudy * 100).toFixed(1)}%</span>
								</div>
								<div class="flex justify-between">
									<span class="text-soft-blue/60">Overcast:</span>
									<span class="font-mono text-white">{(selectedLocationTechnical.performance.overcast * 100).toFixed(1)}%</span>
								</div>
								<div class="flex justify-between">
									<span class="text-soft-blue/60">Temperature Model:</span>
									<span class="text-white uppercase">{selectedLocationTechnical.performance.temperature_model}</span>
								</div>
							</div>
						</div>

						<!-- System Losses -->
						<div class="card-glass">
							<h3 class="text-lg font-semibold text-white mb-4">System Losses</h3>
							<div class="space-y-3 text-sm">
								<div class="flex justify-between">
									<span class="text-soft-blue/60">Shading:</span>
									<span class="font-mono text-white">{(selectedLocationTechnical.plant.losses.shading * 100).toFixed(1)}%</span>
								</div>
								<div class="flex justify-between">
									<span class="text-soft-blue/60">Snow:</span>
									<span class="font-mono text-white">{(selectedLocationTechnical.plant.losses.snow * 100).toFixed(1)}%</span>
								</div>
								<div class="flex justify-between">
									<span class="text-soft-blue/60">Mismatch:</span>
									<span class="font-mono text-white">{(selectedLocationTechnical.plant.losses.mismatch * 100).toFixed(1)}%</span>
								</div>
								<div class="flex justify-between">
									<span class="text-soft-blue/60">DC Wiring:</span>
									<span class="font-mono text-white">{(selectedLocationTechnical.plant.losses.wiring_dc * 100).toFixed(1)}%</span>
								</div>
								<div class="flex justify-between">
									<span class="text-soft-blue/60">AC Wiring:</span>
									<span class="font-mono text-white">{(selectedLocationTechnical.plant.losses.wiring_ac * 100).toFixed(1)}%</span>
								</div>
								<div class="flex justify-between">
									<span class="text-soft-blue/60">Availability:</span>
									<span class="font-mono text-white">{(selectedLocationTechnical.plant.losses.availability * 100).toFixed(1)}%</span>
								</div>
							</div>
						</div>

						<!-- Output Configuration -->
						<div class="card-glass">
							<h3 class="text-lg font-semibold text-white mb-4">Output Configuration</h3>
							<div class="space-y-3 text-sm">
								<div>
									<span class="text-soft-blue/60 block mb-2">Output Formats:</span>
									<div class="flex flex-wrap gap-2">
										{#each selectedLocationTechnical.output.formats as format}
											<span class="bg-cyan/20 text-cyan px-2 py-1 rounded-full text-xs">{format}</span>
										{/each}
									</div>
								</div>
								<div class="flex justify-between">
									<span class="text-soft-blue/60">Email Reports:</span>
									<span class="text-white">{selectedLocationTechnical.output.email_reports ? 'Enabled' : 'Disabled'}</span>
								</div>
								{#if selectedLocationTechnical.output.email_reports}
									<div class="flex justify-between">
										<span class="text-soft-blue/60">Schedule:</span>
										<span class="text-white capitalize">{selectedLocationTechnical.output.email_schedule}</span>
									</div>
									<div class="flex justify-between">
										<span class="text-soft-blue/60">Time:</span>
										<span class="font-mono text-white">{selectedLocationTechnical.output.email_time}</span>
									</div>
								{/if}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}

</div>

<style>
	.btn-sm {
		@apply px-3 py-1.5 text-sm;
	}
	
	.animate-slide-down {
		animation: slideDown 0.3s ease-out;
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	
	/* Enhanced form styling */
	.input:focus {
		@apply ring-2 ring-cyan/50 border-cyan;
	}
	
	.select:focus {
		@apply ring-2 ring-cyan/50 border-cyan;
	}
</style>