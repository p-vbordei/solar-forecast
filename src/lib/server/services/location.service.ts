import type { LocationRepository } from '../repositories/location.repository';
import type { Location, LocationCreateInput, LocationFilter } from '$lib/types/location';

// Configuration for Python microservice
const PYTHON_WORKER_URL = process.env.PYTHON_WORKER_URL || 'http://localhost:8001';

// Service - contains business logic and orchestrates between repository and external services
export class LocationService {
	constructor(private repository: LocationRepository) {}
	
	async getLocations(filter?: LocationFilter): Promise<Location[]> {
		// Business logic: validate filter parameters
		if (filter?.clientId && filter.clientId < 0) {
			throw new Error('Invalid client ID');
		}
		
		// Get locations from repository
		const locations = await this.repository.findAll(filter);
		
		// Business logic: enrich with calculated fields and real-time data
		return Promise.all(locations.map(async (location) => ({
			...location,
			efficiency: this.calculateEfficiency(location),
			healthScore: this.calculateHealthScore(location),
			currentProduction: await this.getCurrentProduction(location.id)
		})));
	}
	
	async getLocationById(id: number): Promise<Location | null> {
		if (id < 0) {
			throw new Error('Invalid location ID');
		}
		
		const location = await this.repository.findById(id);
		
		if (!location) {
			return null;
		}
		
		// Enrich with calculated fields and forecast
		const [currentProduction, forecast] = await Promise.all([
			this.getCurrentProduction(id),
			this.getForecast(id)
		]);
		
		return {
			...location,
			efficiency: this.calculateEfficiency(location),
			healthScore: this.calculateHealthScore(location),
			currentProduction,
			forecast
		};
	}
	
	async createLocation(data: LocationCreateInput): Promise<Location> {
		// Business validation
		this.validateLocationData(data);
		
		// Check for duplicates
		const existing = await this.repository.findByCoordinates(
			data.latitude,
			data.longitude
		);
		
		if (existing) {
			throw new Error('Location already exists at these coordinates');
		}
		
		// Create location
		const location = await this.repository.create(data);
		
		// Initialize ML model for this location in Python worker
		await this.initializeLocationInPythonWorker(location);
		
		// Return enriched location
		return {
			...location,
			efficiency: 100, // New locations start at 100% efficiency
			healthScore: 100
		};
	}
	
	async updateLocation(id: number, data: Partial<LocationCreateInput>): Promise<Location> {
		// Validate ID
		if (id < 0) {
			throw new Error('Invalid location ID');
		}
		
		// Check if location exists
		const existing = await this.repository.findById(id);
		if (!existing) {
			throw new Error('Location not found');
		}
		
		// Validate update data
		if (data.latitude !== undefined || data.longitude !== undefined) {
			this.validateCoordinates(
				data.latitude ?? existing.latitude,
				data.longitude ?? existing.longitude
			);
		}
		
		// Update location
		const updated = await this.repository.update(id, data);
		
		// If technical specs changed, retrain model
		if (data.capacity !== undefined || data.panelType !== undefined) {
			await this.requestModelRetrain(id);
		}
		
		return {
			...updated,
			efficiency: this.calculateEfficiency(updated),
			healthScore: this.calculateHealthScore(updated)
		};
	}
	
	async deleteLocation(id: number): Promise<boolean> {
		// Validate ID
		if (id < 0) {
			throw new Error('Invalid location ID');
		}
		
		// Check if location has active forecasts
		const hasActiveForecasts = await this.checkActiveForecasts(id);
		if (hasActiveForecasts) {
			throw new Error('Cannot delete location with active forecasts');
		}
		
		return await this.repository.delete(id);
	}
	
	// Methods that interact with Python microservice
	async getForecast(locationId: number, horizonHours: number = 24): Promise<any> {
		try {
			const response = await fetch(`${PYTHON_WORKER_URL}/api/v1/forecast/location/${locationId}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					horizon_hours: horizonHours,
					model_type: 'ensemble'
				})
			});
			
			if (!response.ok) {
				console.error('Failed to get forecast from Python worker');
				return null;
			}
			
			return await response.json();
		} catch (error) {
			console.error('Error calling Python forecast service:', error);
			return null;
		}
	}
	
	async getCurrentProduction(locationId: number): Promise<number> {
		try {
			// Get latest production data from database
			const stats = await this.repository.getLocationStatistics(locationId);
			return stats.production._avg?.powerOutputMW || 0;
		} catch (error) {
			console.error('Error getting current production:', error);
			return 0;
		}
	}
	
	async getWeatherData(latitude: number, longitude: number): Promise<any> {
		try {
			const response = await fetch(`${PYTHON_WORKER_URL}/api/v1/weather/current`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					latitude,
					longitude
				})
			});
			
			if (!response.ok) {
				console.error('Failed to get weather from Python worker');
				return null;
			}
			
			return await response.json();
		} catch (error) {
			console.error('Error calling Python weather service:', error);
			return null;
		}
	}
	
	async analyzePerformance(locationId: number, startDate: Date, endDate: Date): Promise<any> {
		try {
			const response = await fetch(`${PYTHON_WORKER_URL}/api/v1/analysis/performance`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					location_id: locationId,
					start_date: startDate.toISOString(),
					end_date: endDate.toISOString()
				})
			});
			
			if (!response.ok) {
				console.error('Failed to analyze performance from Python worker');
				return null;
			}
			
			return await response.json();
		} catch (error) {
			console.error('Error calling Python analysis service:', error);
			return null;
		}
	}
	
	// Private helper methods
	private async initializeLocationInPythonWorker(location: Location): Promise<void> {
		try {
			await fetch(`${PYTHON_WORKER_URL}/api/v1/pipeline/initialize-location`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					location_id: location.id,
					latitude: location.latitude,
					longitude: location.longitude,
					capacity_mw: location.capacityMW,
					panel_type: location.panelType
				})
			});
		} catch (error) {
			console.error('Failed to initialize location in Python worker:', error);
		}
	}
	
	private async requestModelRetrain(locationId: number): Promise<void> {
		try {
			await fetch(`${PYTHON_WORKER_URL}/api/v1/pipeline/retrain`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					location_id: locationId
				})
			});
		} catch (error) {
			console.error('Failed to request model retrain:', error);
		}
	}
	
	private validateLocationData(data: LocationCreateInput): void {
		if (!data.name || data.name.trim().length === 0) {
			throw new Error('Location name is required');
		}
		
		this.validateCoordinates(data.latitude, data.longitude);
		
		if (data.capacity <= 0) {
			throw new Error('Capacity must be greater than 0');
		}
		
		if (data.panelCount && data.panelCount <= 0) {
			throw new Error('Panel count must be greater than 0');
		}
	}
	
	private validateCoordinates(latitude: number, longitude: number): void {
		if (latitude < -90 || latitude > 90) {
			throw new Error('Latitude must be between -90 and 90');
		}
		
		if (longitude < -180 || longitude > 180) {
			throw new Error('Longitude must be between -180 and 180');
		}
	}
	
	private calculateEfficiency(location: any): number {
		// Calculate based on production vs capacity
		if (location.production && location.production.length > 0) {
			const latestProduction = location.production[0];
			const efficiency = (latestProduction.powerOutputMW / location.capacityMW) * 100;
			return Math.round(Math.min(100, efficiency));
		}
		
		// Fallback calculation based on age
		const baseEfficiency = 85;
		const ageFactor = location.installationDate 
			? Math.max(0, 100 - (Date.now() - location.installationDate.getTime()) / (365 * 24 * 60 * 60 * 1000) * 2)
			: 100;
		
		return Math.round((baseEfficiency + ageFactor) / 2);
	}
	
	private calculateHealthScore(location: any): number {
		// Calculate based on status, alerts, and maintenance
		if (location.status === 'OFFLINE') return 0;
		if (location.status === 'MAINTENANCE') return 50;
		
		let score = 100;
		
		// Deduct for active alerts
		if (location._count?.alerts > 0) {
			score -= location._count.alerts * 10;
		}
		
		// Deduct for overdue maintenance
		const lastMaintenanceDays = location.lastMaintenance
			? (Date.now() - location.lastMaintenance.getTime()) / (24 * 60 * 60 * 1000)
			: 0;
		
		if (lastMaintenanceDays > 180) score -= 30;
		else if (lastMaintenanceDays > 90) score -= 15;
		
		return Math.max(0, Math.round(score));
	}
	
	private async checkActiveForecasts(locationId: number): Promise<boolean> {
		const stats = await this.repository.getLocationStatistics(locationId);
		return stats.forecasts._count > 0;
	}
	
	// Dashboard aggregation methods
	async getDashboardMetrics(): Promise<any> {
		const locations = await this.repository.findAll({ status: 'active' });
		const totalCapacity = await this.repository.getTotalCapacity();
		const statusBreakdown = await this.repository.getLocationsByStatus();
		
		// Calculate current production from all active locations
		const productionPromises = locations.map(loc => this.getCurrentProduction(loc.id));
		const productions = await Promise.all(productionPromises);
		const totalProduction = productions.reduce((sum, prod) => sum + prod, 0);
		
		return {
			totalLocations: locations.length,
			totalCapacityMW: totalCapacity,
			currentProductionMW: totalProduction,
			averageEfficiency: totalCapacity > 0 ? (totalProduction / totalCapacity) * 100 : 0,
			locationsByStatus: statusBreakdown
		};
	}
}