import type { LocationRepository } from '../repositories/location.repository';
import type { Location, LocationCreateInput, LocationFilter } from '$lib/types/location';

// Service - contains business logic
export class LocationService {
	constructor(private repository: LocationRepository) {}
	
	async getLocations(filter?: LocationFilter): Promise<Location[]> {
		// Business logic: validate filter parameters
		if (filter?.clientId && filter.clientId < 0) {
			throw new Error('Invalid client ID');
		}
		
		// Get locations from repository
		const locations = await this.repository.findAll(filter);
		
		// Business logic: enrich with calculated fields
		return locations.map(location => ({
			...location,
			efficiency: this.calculateEfficiency(location),
			healthScore: this.calculateHealthScore(location)
		}));
	}
	
	async getLocationById(id: number): Promise<Location | null> {
		if (id < 0) {
			throw new Error('Invalid location ID');
		}
		
		const location = await this.repository.findById(id);
		
		if (!location) {
			return null;
		}
		
		// Enrich with calculated fields
		return {
			...location,
			efficiency: this.calculateEfficiency(location),
			healthScore: this.calculateHealthScore(location)
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
	
	// Private helper methods
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
	
	private calculateEfficiency(location: Location): number {
		// Mock calculation - would be based on real production data
		const baseEfficiency = 85;
		const ageFactor = location.installationDate 
			? Math.max(0, 100 - (Date.now() - location.installationDate.getTime()) / (365 * 24 * 60 * 60 * 1000) * 2)
			: 100;
		
		return Math.round((baseEfficiency + ageFactor) / 2);
	}
	
	private calculateHealthScore(location: Location): number {
		// Mock calculation - would be based on maintenance history and alerts
		if (location.status === 'offline') return 0;
		if (location.status === 'maintenance') return 50;
		
		const lastMaintenanceDays = location.lastMaintenance
			? (Date.now() - location.lastMaintenance.getTime()) / (24 * 60 * 60 * 1000)
			: 0;
		
		if (lastMaintenanceDays > 180) return 70;
		if (lastMaintenanceDays > 90) return 85;
		
		return 100;
	}
	
	private async checkActiveForecasts(locationId: number): Promise<boolean> {
		// This would check if there are active forecasts for the location
		// Mock implementation
		return false;
	}
}