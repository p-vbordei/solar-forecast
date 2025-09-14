import { LocationsService } from '$lib/features/locations/services/LocationsService';

export interface DashboardStats {
    activeLocations: number;
    totalCapacityMW: number;
    currentSolarPowerWM2: number;
    currentTemperatureC: number;
    lastUpdated: string;
}

export class DashboardService {
    private locationsService = new LocationsService();

    /**
     * Get real-time dashboard statistics
     * This service aggregates data from multiple sources to provide dashboard metrics
     */
    async getDashboardStats(): Promise<DashboardStats> {
        // Get actual count of active locations from LocationsService
        const activeLocations = await this.locationsService.getTotalNumberOfLocations();

        // TODO: In a real implementation, get these from:
        // - Plants/Locations table for total capacity
        // - Latest weather data for solar irradiance and temperature
        return {
            activeLocations,
            totalCapacityMW: 125.4,
            currentSolarPowerWM2: 850,
            currentTemperatureC: 22,
            lastUpdated: new Date().toISOString()
        };
    }
}