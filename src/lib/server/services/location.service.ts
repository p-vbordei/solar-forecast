import type { LocationRepository } from '../repositories/location.repository';
import type { Location, LocationCreateInput, LocationUpdateInput, LocationFilter, LocationSummary, LocationTechnicalDetails } from '$lib/types/location';
import { LOCATION_DEFAULTS, getOptimalTilt, detectTimezone } from '$lib/types/location';

// Configuration for Python microservice
const PYTHON_WORKER_URL = process.env.PYTHON_WORKER_URL || 'http://localhost:8001';

// Service - contains business logic and orchestrates between repository and external services
export class LocationService {
	constructor(private repository: LocationRepository) {}
	
	// Get locations with different view modes
	async getLocations(filter?: LocationFilter): Promise<Location[]> {
		// Business logic: validate filter parameters
		if (filter?.clientId && !filter.clientId.trim()) {
			throw new Error('Invalid client ID');
		}
		
		// Get locations from repository
		const locations = await this.repository.findAll(filter);
		
		// Business logic: enrich with calculated fields and real-time data
		return Promise.all(locations.map(async (location) => ({
			...location,
			efficiency: this.calculateEfficiency(location),
			healthScore: this.calculateHealthScore(location),
			currentOutput: await this.getCurrentProduction(location.id),
			todayEnergy: await this.getTodayEnergy(location.id)
		})));
	}

	// Get locations summary view (optimized for list display)
	async getLocationsSummary(filter?: LocationFilter): Promise<LocationSummary[]> {
		const locations = await this.repository.findAll(filter);
		
		return Promise.all(locations.map(async (location) => ({
			id: location.id,
			name: location.name,
			city: location.location.city,
			capacity_mw: location.plant.capacity_mw,
			latitude: location.location.latitude,
			longitude: location.location.longitude,
			status: location.status,
			currentOutput: await this.getCurrentProduction(location.id),
			todayEnergy: await this.getTodayEnergy(location.id),
			efficiency: this.calculateEfficiency(location),
			healthScore: this.calculateHealthScore(location),
			alertCount: await this.getAlertCount(location.id),
			lastUpdate: location.updatedAt
		})));
	}

	// Get technical details view
	async getLocationsTechnicalDetails(filter?: LocationFilter): Promise<LocationTechnicalDetails[]> {
		const locations = await this.repository.findAll(filter);
		
		return locations.map(location => ({
			id: location.id,
			plant: location.plant,
			performance: location.performance,
			calibration: location.calibration,
			output: location.output,
			monitoring: location.monitoring,
			installation_date: location.installation_date,
			version: location.version,
			lastCalibrated: location.calibration.last_calibrated ? new Date(location.calibration.last_calibrated) : undefined,
			notes: location.notes
		}));
	}

	async getLocationById(id: string): Promise<Location | null> {
		if (!id?.trim()) {
			throw new Error('Location ID is required');
		}
		
		const location = await this.repository.findById(id);
		if (!location) {
			return null;
		}
		
		// Enrich with calculated fields
		return {
			...location,
			efficiency: this.calculateEfficiency(location),
			healthScore: this.calculateHealthScore(location),
			currentOutput: await this.getCurrentProduction(location.id),
			todayEnergy: await this.getTodayEnergy(location.id)
		};
	}

	async getLocationSummary(id: string): Promise<LocationSummary | null> {
		const location = await this.repository.findById(id);
		if (!location) return null;

		return {
			id: location.id,
			name: location.name,
			city: location.location.city,
			capacity_mw: location.plant.capacity_mw,
			latitude: location.location.latitude,
			longitude: location.location.longitude,
			status: location.status,
			currentOutput: await this.getCurrentProduction(location.id),
			todayEnergy: await this.getTodayEnergy(location.id),
			efficiency: this.calculateEfficiency(location),
			healthScore: this.calculateHealthScore(location),
			alertCount: await this.getAlertCount(location.id),
			lastUpdate: location.updatedAt
		};
	}

	async getLocationTechnicalDetails(id: string): Promise<LocationTechnicalDetails | null> {
		const location = await this.repository.findById(id);
		if (!location) return null;

		return {
			id: location.id,
			plant: location.plant,
			performance: location.performance,
			calibration: location.calibration,
			output: location.output,
			monitoring: location.monitoring,
			installation_date: location.installation_date,
			version: location.version,
			lastCalibrated: location.calibration.last_calibrated ? new Date(location.calibration.last_calibrated) : undefined,
			notes: location.notes
		};
	}
	
	// Create location with smart defaults
	async createLocationWithDefaults(input: LocationCreateInput): Promise<Location> {
		// Validate mandatory fields
		if (!input.name?.trim()) {
			throw new Error('Location name is required');
		}
		
		if (typeof input.latitude !== 'number' || input.latitude < -90 || input.latitude > 90) {
			throw new Error('Valid latitude is required (-90 to 90)');
		}
		
		if (typeof input.longitude !== 'number' || input.longitude < -180 || input.longitude > 180) {
			throw new Error('Valid longitude is required (-180 to 180)');
		}

		// Check for duplicate names
		const existing = await this.repository.findByName(input.name);
		if (existing) {
			throw new Error('A location with this name already exists');
		}

		// Apply intelligent defaults
		const locationWithDefaults = await this.applySmartDefaults(input);
		
		// Create location
		const createdLocation = await this.repository.create(locationWithDefaults);
		
		// Notify Python worker for ML model initialization (non-blocking)
		this.notifyPythonWorkerAsync(createdLocation).catch(console.error);
		
		return createdLocation;
	}

	// Update location with versioning
	async updateLocationWithVersioning(input: LocationUpdateInput): Promise<Location> {
		if (!input.id?.trim()) {
			throw new Error('Location ID is required');
		}

		const existing = await this.repository.findById(input.id);
		if (!existing) {
			throw new Error('Location not found');
		}

		// Version conflict check
		if (input.version && input.version !== existing.version) {
			throw new Error('Version conflict - location was modified by another user');
		}

		// Apply smart defaults to any new values
		const updatedData = await this.applySmartDefaults(input);
		
		// Update version
		updatedData.version = existing.version + 1;
		
		const updatedLocation = await this.repository.update(input.id, updatedData);
		
		// Notify Python worker (non-blocking)
		this.notifyPythonWorkerAsync(updatedLocation).catch(console.error);
		
		return updatedLocation;
	}

	// Apply intelligent defaults based on GPS and other inputs
	private async applySmartDefaults(input: LocationCreateInput | LocationUpdateInput): Promise<any> {
		const defaults = { ...LOCATION_DEFAULTS };
		
		// Create base location object
		const location = {
			name: input.name,
			latitude: input.latitude,
			longitude: input.longitude,
			
			// Client information with defaults
			client: {
				name: input.client?.name || input.name + ' Client',
				id: input.client?.id || this.generateClientId(input.name),
				contact_email: input.client?.contact_email || 'contact@' + this.generateClientId(input.name) + '.com',
				secondary_emails: input.client?.secondary_emails || []
			},
			
			// Location details with smart defaults
			location: {
				latitude: input.latitude,
				longitude: input.longitude,
				timezone: input.location?.timezone || detectTimezone(input.latitude, input.longitude),
				altitude: input.location?.altitude || 0,
				address: input.location?.address,
				city: input.location?.city,
				country: input.location?.country
			},
			
			// Plant specifications with intelligent defaults
			plant: {
				capacity_mw: input.plant?.capacity_mw || defaults.plant.capacity_mw,
				capacity_kw: (input.plant?.capacity_mw || defaults.plant.capacity_mw) * 1000,
				
				panels: {
					tilt: input.plant?.panels?.tilt || getOptimalTilt(input.latitude),
					azimuth: input.plant?.panels?.azimuth || defaults.plant.panels.azimuth,
					technology: input.plant?.panels?.technology || defaults.plant.panels.technology,
					temperature_coefficient: input.plant?.panels?.temperature_coefficient || defaults.plant.panels.temperature_coefficient,
					nominal_efficiency: input.plant?.panels?.nominal_efficiency || defaults.plant.panels.nominal_efficiency,
					bifacial: input.plant?.panels?.bifacial || defaults.plant.panels.bifacial,
					bifaciality_factor: input.plant?.panels?.bifaciality_factor || defaults.plant.panels.bifaciality_factor
				},
				
				inverter: {
					model: input.plant?.inverter?.model || defaults.plant.inverter.model,
					efficiency_curve: input.plant?.inverter?.efficiency_curve || defaults.plant.inverter.efficiency_curve,
					power_factor: input.plant?.inverter?.power_factor || defaults.plant.inverter.power_factor
				},
				
				mounting: {
					type: input.plant?.mounting?.type || defaults.plant.mounting.type,
					ground_coverage_ratio: input.plant?.mounting?.ground_coverage_ratio || defaults.plant.mounting.ground_coverage_ratio,
					row_spacing: input.plant?.mounting?.row_spacing || defaults.plant.mounting.row_spacing
				},
				
				losses: {
					...defaults.plant.losses,
					...input.plant?.losses,
					// Apply climate-specific adjustments
					snow: this.getClimateSpecificSnowLoss(input.latitude),
					soiling_monthly: this.getClimateSpecificSoiling(input.latitude, input.longitude)
				}
			},
			
			// Performance parameters
			performance: {
				...defaults.performance,
				...input.performance
			},
			
			// Output configuration
			output: {
				...defaults.output,
				...input.output
			},
			
			// Calibration settings
			calibration: {
				...defaults.calibration,
				...input.calibration
			},
			
			// System fields
			status: input.status || 'planned',
			installation_date: input.installation_date ? new Date(input.installation_date) : new Date(),
			notes: input.notes || [],
			tags: input.tags || [],
			version: 1,
			createdAt: new Date(),
			updatedAt: new Date()
		};
		
		return location;
	}

	// Helper methods for smart defaults
	private generateClientId(name: string): string {
		return name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20);
	}

	private getClimateSpecificSnowLoss(latitude: number): number {
		// Higher latitudes have more snow
		const absLat = Math.abs(latitude);
		if (absLat > 60) return 0.05;
		if (absLat > 45) return 0.02;
		if (absLat > 30) return 0.01;
		return 0.00;
	}

	private getClimateSpecificSoiling(latitude: number, longitude: number): number[] {
		// Mediterranean/arid regions have higher soiling
		const isArid = (Math.abs(latitude) < 40) && (longitude > -10 && longitude < 50);
		const baseSoiling = [0.04, 0.04, 0.03, 0.03, 0.02, 0.02, 0.02, 0.02, 0.02, 0.03, 0.04, 0.04];
		
		if (isArid) {
			return baseSoiling.map(val => val * 1.5);
		}
		
		return baseSoiling;
	}

	// Business logic calculations
	private calculateEfficiency(location: Location): number {
		// Simplified efficiency calculation
		const baseEfficiency = location.plant.panels.nominal_efficiency * 100;
		const losses = Object.values(location.plant.losses).reduce((sum, loss) => {
			if (Array.isArray(loss)) {
				return sum + loss.reduce((a, b) => a + b, 0) / 12;
			}
			return sum + loss;
		}, 0);
		
		return Math.max(0, baseEfficiency * (1 - losses));
	}
	
	private calculateHealthScore(location: Location): number {
		// Simplified health score - in production this would use real sensor data
		let score = 100;
		
		// Deduct for system age
		if (location.installation_date) {
			const ageInYears = (Date.now() - location.installation_date.getTime()) / (1000 * 60 * 60 * 24 * 365);
			score -= Math.floor(ageInYears * 2);
		}
		
		// Status penalties
		switch (location.status) {
			case 'maintenance': score -= 15; break;
			case 'offline': score -= 50; break;
			case 'commissioning': score -= 5; break;
		}
		
		return Math.max(0, Math.min(100, score));
	}
	
	// Real-time data methods using TimescaleDB repository
	private async getCurrentProduction(locationId: string): Promise<number> {
		return await this.repository.getCurrentProduction(locationId);
	}

	private async getTodayEnergy(locationId: string): Promise<number> {
		return await this.repository.getTodayEnergy(locationId);
	}

	private async getAlertCount(locationId: string): Promise<number> {
		return await this.repository.getActiveAlertCount(locationId);
	}
	
	// Python worker integration
	private async notifyPythonWorkerAsync(location: Location): Promise<void> {
		try {
			await fetch(`${PYTHON_WORKER_URL}/locations`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'location_created',
					location_id: location.id,
					technical_params: {
						capacity_mw: location.plant.capacity_mw,
						panels: location.plant.panels,
						performance: location.performance
					}
				})
			});
		} catch (error) {
			console.warn('Failed to notify Python worker:', error);
			// Don't throw - this is non-critical
		}
	}

	// Additional service methods called by API
	async bulkUpdateStatus(locationIds: string[], status: string): Promise<any[]> {
		const results = [];
		for (const id of locationIds) {
			try {
				const updated = await this.repository.updateStatus(id, status);
				results.push({ id, status: 'success', data: updated });
			} catch (error) {
				results.push({ id, status: 'error', error: error.message });
			}
		}
		return results;
	}

	async bulkCalibrate(locationIds: string[]): Promise<any[]> {
		// Mock bulk calibration
		return locationIds.map(id => ({ id, status: 'calibrated', timestamp: new Date() }));
	}

	async bulkExportTechnicalSpecs(locationIds: string[]): Promise<any> {
		const locations = await Promise.all(
			locationIds.map(id => this.getLocationTechnicalDetails(id))
		);
		return { locations: locations.filter(Boolean), format: 'yaml', timestamp: new Date() };
	}

	async softDeleteLocation(id: string): Promise<boolean> {
		return this.repository.softDelete(id);
	}

	async hardDeleteLocation(id: string): Promise<boolean> {
		return this.repository.hardDelete(id);
	}

	async updateLocationStatus(id: string, status: string): Promise<any> {
		return this.repository.updateStatus(id, status);
	}

	async calibrateLocation(id: string, data: any): Promise<any> {
		// Mock calibration
		return { id, calibrated: true, timestamp: new Date(), ...data };
	}

	async updateTechnicalParameters(id: string, params: any): Promise<any> {
		return this.repository.updateTechnicalParams(id, params);
	}

	async addLocationNote(id: string, note: string, author: string): Promise<any> {
		return this.repository.addNote(id, { note, author, timestamp: new Date() });
	}

	async updateMonitoringSettings(id: string, settings: any): Promise<any> {
		return this.repository.updateMonitoring(id, settings);
	}

	async resetLocationToDefaults(id: string, sections: string[]): Promise<any> {
		const defaults = LOCATION_DEFAULTS;
		const updates: any = {};
		
		sections.forEach(section => {
			if (defaults[section]) {
				updates[section] = defaults[section];
			}
		});
		
		return this.repository.update(id, updates);
	}

	async exportLocationAsYAML(id: string): Promise<string> {
		const location = await this.getLocationTechnicalDetails(id);
		if (!location) throw new Error('Location not found');
		
		// Convert to YAML format (simplified)
		return `# Location: ${id}
client:
  name: "${location.plant.capacity_mw} MW Solar Plant"
  id: "${id}"
  
location:
  latitude: ${location.plant.capacity_mw}
  longitude: 0
  timezone: "UTC"
  
plant:
  capacity_mw: ${location.plant.capacity_mw}
  capacity_kw: ${location.plant.capacity_kw}
  panels:
    tilt: ${location.plant.panels.tilt}
    azimuth: ${location.plant.panels.azimuth}
    technology: "${location.plant.panels.technology}"
    
# ... (full YAML structure)`;
	}

	async validateLocationConfiguration(id: string): Promise<any> {
		const location = await this.getLocationById(id);
		if (!location) throw new Error('Location not found');
		
		const errors = [];
		const warnings = [];
		
		// Basic validation
		if (location.plant.capacity_mw <= 0) {
			errors.push('Invalid capacity');
		}
		
		if (location.plant.panels.tilt < 0 || location.plant.panels.tilt > 90) {
			errors.push('Invalid panel tilt');
		}
		
		return {
			valid: errors.length === 0,
			errors,
			warnings,
			timestamp: new Date()
		};
	}

	async getLocationVersionHistory(id: string): Promise<any[]> {
		// Mock version history
		return [
			{ version: 1, timestamp: new Date(), author: 'system', changes: 'Initial creation' }
		];
	}

	async getLocationWithHistory(id: string): Promise<any> {
		const location = await this.getLocationById(id);
		const history = await this.getLocationVersionHistory(id);
		return { ...location, history };
	}
}