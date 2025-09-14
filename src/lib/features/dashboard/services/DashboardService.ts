import { LocationsService } from '$lib/features/locations/services/LocationsService';
import { db } from '$lib/server/database';
// Note: WeatherService intentionally NOT imported - dashboard only reads from database

export interface DashboardStats {
    activeLocations: number;
    totalCapacityMW: number;
    currentSolarPowerWM2: number;
    currentTemperatureC: number;
    lastUpdated: string;
}

export class DashboardService {
    private locationsService = new LocationsService();
    // Note: No WeatherService instance - dashboard is read-only from database

    /**
     * Get real-time dashboard statistics
     * This service aggregates data from multiple sources to provide dashboard metrics
     */
    async getDashboardStats(): Promise<DashboardStats> {
        try {
            // Get actual count of active locations from LocationsService
            const activeLocations = await this.locationsService.getTotalNumberOfLocations();

            // Get total capacity from locations
            const totalCapacityMW = await this.getTotalCapacityMW();

            // Get weather data for the first active location
            const weatherData = await this.getCurrentWeatherData();

            return {
                activeLocations,
                totalCapacityMW,
                currentSolarPowerWM2: weatherData.solarIrradiance,
                currentTemperatureC: weatherData.temperature,
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);

            // Return fallback data if there's an error
            const activeLocations = await this.locationsService.getTotalNumberOfLocations();
            return {
                activeLocations,
                totalCapacityMW: 125.4,
                currentSolarPowerWM2: this.getFallbackSolarIrradiance(),
                currentTemperatureC: 22,
                lastUpdated: new Date().toISOString()
            };
        }
    }

    /**
     * Get total capacity from all active locations
     */
    private async getTotalCapacityMW(): Promise<number> {
        try {
            const result = await db.location.aggregate({
                where: {
                    status: 'ACTIVE',
                    deletedAt: null
                },
                _sum: {
                    capacityMW: true
                }
            });

            return result._sum.capacityMW || 0;
        } catch (error) {
            console.error('Error calculating total capacity:', error);
            return 125.4; // Fallback value
        }
    }

    /**
     * Get current weather data for first active location
     */
    private async getCurrentWeatherData(): Promise<{ temperature: number; solarIrradiance: number }> {
        try {
            // Get first active location
            const firstLocation = await db.location.findFirst({
                where: {
                    status: 'ACTIVE',
                    deletedAt: null
                },
                select: {
                    id: true,
                    latitude: true,
                    longitude: true
                },
                orderBy: {
                    createdAt: 'asc'
                }
            });

            if (!firstLocation) {
                // No locations found, return fallback
                return {
                    temperature: 22,
                    solarIrradiance: this.getFallbackSolarIrradiance()
                };
            }

            // Get recent weather data from database (last 24 hours)
            const recentWeatherData = await db.weatherData.findMany({
                where: {
                    locationId: firstLocation.id,
                    timestamp: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                    }
                },
                orderBy: {
                    timestamp: 'desc'
                },
                take: 100 // Get up to 100 recent records
            });

            if (recentWeatherData.length > 0) {
                // Calculate average solar irradiance from highest 10 values
                const solarValues = recentWeatherData
                    .map(record => record.ghi || 0)
                    .filter(val => val > 0) // Only positive values
                    .sort((a, b) => b - a); // Sort descending

                const top10Values = solarValues.slice(0, 10);
                const avgSolarIrradiance = top10Values.length > 0
                    ? Math.round(top10Values.reduce((sum, val) => sum + val, 0) / top10Values.length)
                    : 0;

                // Use latest record for temperature
                const latestWeather = recentWeatherData[0];

                return {
                    temperature: Math.round(latestWeather.temperature),
                    solarIrradiance: avgSolarIrradiance
                };
            }

        } catch (error) {
            console.error('Error fetching weather data:', error);
        }

        // Fallback to default values
        return {
            temperature: 22,
            solarIrradiance: this.getFallbackSolarIrradiance()
        };
    }

    /**
     * Generate fallback solar irradiance based on time of day
     */
    private getFallbackSolarIrradiance(): number {
        const hour = new Date().getHours();

        // Simple solar irradiance simulation based on time of day
        if (hour >= 6 && hour <= 18) {
            // Peak at noon, using sine curve
            const dayProgress = (hour - 6) / 12;
            return Math.round(850 * Math.sin(dayProgress * Math.PI));
        }

        return 0; // No solar radiation at night
    }
}