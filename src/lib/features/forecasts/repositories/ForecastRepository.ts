import { BaseForecastRepository } from '$lib/server/repositories/base/BaseForecastRepository';
import { db } from '$lib/server/database';
import type { BulkForecastInsert } from '../models/dto/forecast';

/**
 * Feature-specific Forecast Repository
 *
 * Extends BaseForecastRepository to provide:
 * - Business logic for forecast operations
 * - Data transformation and validation
 * - Feature-specific queries and operations
 * - Mock data generation for testing
 *
 * This repository is used by the ForecastService for all forecast-related operations.
 */
export class ForecastRepository extends BaseForecastRepository {

    /**
     * Get forecast data with business logic and fallback handling
     */
    async getForecastData(
        locationId: string,
        interval: '15min' | 'hourly' | 'daily' | 'weekly',
        startDate?: string,
        endDate?: string
    ) {
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();

        try {
            // Validate GUID format
            this.validateGuid(locationId);

            // Convert interval to TimescaleDB format
            const tsInterval = this.convertToTimescaleInterval(interval);

            // Get raw data from base repository
            const rawData = await this.getRawForecastData(locationId, tsInterval, start, end);

            // If no data exists and we're in development, optionally generate mock data
            if (rawData.length === 0 && process.env.NODE_ENV === 'development') {
                console.log(`No forecast data found for location ${locationId}`);
                // Could optionally generate mock data here for development
                // return this.generateMockForecastData(locationId, interval, start, end);
            }

            // Transform raw data to feature format
            return this.transformForecastData(rawData);
        } catch (error) {
            console.warn('Database query failed for forecast data:', error);
            return [];
        }
    }

    /**
     * Get accuracy data with enhanced business logic
     */
    async getAccuracyData(
        locationId: string,
        startDate?: string,
        endDate?: string
    ) {
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();

        try {
            // Validate GUID format
            this.validateGuid(locationId);

            // Get raw accuracy data from base repository
            const rawData = await this.getRawAccuracyData(locationId, start, end);

            // Transform and enhance data
            return this.transformAccuracyData(rawData as any[]);
        } catch (error) {
            console.warn('Database accuracy query failed:', error);
            return [];
        }
    }

    /**
     * Bulk insert forecasts with TimescaleDB optimization
     */
    async bulkInsertForecasts(forecasts: BulkForecastInsert[]) {
        try {
            if (!forecasts || forecasts.length === 0) {
                return { count: 0 };
            }

            console.log(`Inserting ${forecasts.length} forecasts for location ${forecasts[0]?.locationId}`);

            // Prepare data for Prisma bulk insert - map to correct field names
            const forecastData = forecasts.map(f => {
                const cleanData = {
                    timestamp: f.timestamp,
                    locationId: f.locationId,
                    powerMW: f.powerForecastMw || 0,  // Primary power field
                    powerOutputMW: f.powerForecastMw || 0,  // Legacy compatibility
                    energyMWh: f.energyMwh || 0,
                    capacityFactor: f.capacityFactor || 0,
                    confidence: f.confidenceScore || 0.95,  // Legacy confidence field
                    confidenceLevel: (f.confidenceScore || 0.95) * 100,  // As percentage
                    modelType: this.normalizeModelType(f.modelType),
                    modelVersion: f.modelVersion || '1.0',
                    horizonMinutes: (f.horizonHours || 24) * 60,  // Convert to minutes
                    horizonDays: Math.ceil((f.horizonHours || 24) / 24),  // Convert to days
                    resolution: 'HOURLY',  // Default resolution
                    forecastType: 'OPERATIONAL',  // Default type
                    dataQuality: 'GOOD',  // Default quality
                    // Weather parameters
                    temperature: f.temperature,
                    ghi: f.ghi,
                    dni: f.dni,
                    cloudCover: f.cloudCover,
                    windSpeed: f.windSpeed,
                    // Add quality score
                    qualityScore: f.confidenceScore || 0.95,
                    isValidated: false
                };

                // EXPLICITLY remove any 'time' field that might have been added
                if ('time' in cleanData) {
                    console.warn('WARNING: Removing mysterious "time" field from forecast data');
                    delete (cleanData as any).time;
                }

                return cleanData;
            });

            // Debug: Check if any object has a 'time' field
            const hasTimeField = forecastData.some((f: any) => 'time' in f);
            if (hasTimeField) {
                console.error('ERROR: forecastData contains "time" field!', Object.keys(forecastData[0]));
            }

            // Double-check the data structure before sending to database
            console.log('Sample forecast data being sent to database:', JSON.stringify(forecastData[0], null, 2));

            // Use raw SQL to bypass Prisma's mysterious 'time' field issue
            // Build VALUES clause for raw SQL insert
            const values = forecastData.map((f: any) => {
                // Generate a UUID for each forecast
                const id = crypto.randomUUID();
                return `(
                    '${id}',
                    '${f.timestamp.toISOString()}',
                    '${f.locationId}',
                    ${f.powerMW},
                    ${f.powerOutputMW},
                    ${f.energyMWh || 'NULL'},
                    ${f.capacityFactor || 'NULL'},
                    ${f.confidence || 'NULL'},
                    ${f.confidenceLevel || 'NULL'},
                    '${f.modelType}',
                    '${f.modelVersion || '1.0'}',
                    ${f.horizonMinutes},
                    ${f.horizonDays || 'NULL'},
                    '${f.resolution}',
                    '${f.forecastType}',
                    '${f.dataQuality}',
                    ${f.temperature || 'NULL'},
                    ${f.ghi || 'NULL'},
                    ${f.dni || 'NULL'},
                    ${f.cloudCover || 'NULL'},
                    ${f.windSpeed || 'NULL'},
                    ${f.qualityScore || 'NULL'},
                    ${f.isValidated}
                )`;
            }).join(',\n');

            // Execute raw SQL insert
            const insertQuery = `
                INSERT INTO forecasts (
                    id, "timestamp", "locationId", "powerMW", "powerOutputMW",
                    "energyMWh", "capacityFactor", "confidence", "confidenceLevel",
                    "modelType", "modelVersion", "horizonMinutes", "horizonDays",
                    "resolution", "forecastType", "dataQuality",
                    "temperature", "ghi", "dni", "cloudCover", "windSpeed",
                    "qualityScore", "isValidated"
                ) VALUES ${values}
                RETURNING id
            `;

            const insertedRows = await db.$queryRawUnsafe(insertQuery) as any[];
            const result = { count: insertedRows.length };

            console.log(`Successfully inserted ${result.count} forecasts`);

            return {
                count: result.count
            };
        } catch (error) {
            console.error('Bulk forecast insert failed:', error);
            // Provide more details about the error
            if (error.code === 'P2002') {
                throw new Error('Duplicate forecast timestamps detected');
            }
            throw new Error(`Failed to insert forecasts: ${error.message}`);
        }
    }

    /**
     * Transform raw forecast data to feature format
     */
    private transformForecastData(rawData: any[]): any[] {
        return rawData.map(row => ({
            timestamp: row.bucket || row.timestamp,
            power_forecast_mw: row.avg_powermw || row.powerMW || 0,
            confidence_score: row.avg_confidence || row.confidence || 0.95,
            max_power: row.max_powermw || row.powerMW || 0,
            min_power: row.min_powermw || row.powerMW || 0,
            count: row.count || 1
        }));
    }

    /**
     * Transform raw accuracy data with additional metrics
     */
    private transformAccuracyData(rawData: any[]): any[] {
        return rawData.map(row => ({
            timestamp: row.timestamp,
            forecast: row.forecast || 0,
            actual: row.actual || 0,
            confidence: row.confidence || 0.95,
            model_type: row.modelType || row.model_type || 'ENSEMBLE',
            error: Math.abs((row.forecast || 0) - (row.actual || 0)),
            error_percentage: row.actual > 0 ?
                Math.abs(((row.forecast || 0) - row.actual) / row.actual * 100) : 0
        }));
    }

    /**
     * Get latest forecast with enhanced location data
     */
    async getLatestForecast(locationId: string) {
        try {
            // Validate GUID format
            this.validateGuid(locationId);

            // Get latest forecast from base repository
            const forecast = await this.getLatestForecastRecord(locationId);

            // Enhance with additional business logic if needed
            if (forecast) {
                return {
                    ...forecast,
                    isStale: this.isForecastStale(forecast.timestamp),
                    age_hours: this.getForecastAge(forecast.timestamp)
                };
            }

            return null;
        } catch (error) {
            console.error('Failed to get latest forecast:', error);
            return null;
        }
    }

    /**
     * Get comprehensive forecast statistics with business insights
     */
    async getForecastStatistics(locationId: string, days: number = 30) {
        try {
            // Validate GUID format
            this.validateGuid(locationId);

            // Get raw statistics from base repository
            const stats = await this.getRawForecastStatistics(locationId, days);

            if (stats && stats[0]) {
                const rawStats = stats[0];

                // Get model usage statistics
                const modelUsage = await this.getForecastCountByModel(locationId, days);

                // Enhance with business metrics
                return {
                    total_forecasts: Number(rawStats.total_forecasts),
                    avg_confidence: rawStats.avg_confidence,
                    min_forecast: rawStats.min_forecast,
                    max_forecast: rawStats.max_forecast,
                    avg_forecast: rawStats.avg_forecast,
                    model_usage: modelUsage,
                    days_analyzed: days,
                    data_quality: this.assessDataQuality(rawStats)
                };
            }

            return null;
        } catch (error) {
            console.error('Failed to get forecast statistics:', error);
            return null;
        }
    }

    /**
     * Delete old forecasts with audit logging
     */
    async deleteOldForecasts(retentionDays: number = 730) {
        try {
            const result = await this.deleteOldForecastRecords(retentionDays);

            // Log deletion for audit purposes
            console.log(`Deleted ${result.count} forecasts older than ${retentionDays} days`);

            return result;
        } catch (error) {
            console.error('Failed to delete old forecasts:', error);
            throw error;
        }
    }

    /**
     * Check if forecast data exists for a location
     */
    async hasData(locationId: string): Promise<boolean> {
        this.validateGuid(locationId);
        return await this.hasForecastData(locationId);
    }

    // Business Logic Helper Methods

    /**
     * Check if a forecast is stale (older than 6 hours)
     */
    private isForecastStale(timestamp: Date): boolean {
        const ageHours = this.getForecastAge(timestamp);
        return ageHours > 6;
    }

    /**
     * Calculate forecast age in hours
     */
    private getForecastAge(timestamp: Date): number {
        const now = new Date();
        const ageMs = now.getTime() - new Date(timestamp).getTime();
        return ageMs / (1000 * 60 * 60);
    }

    /**
     * Assess data quality based on statistics
     */
    private assessDataQuality(stats: any): string {
        if (!stats.avg_confidence) return 'UNKNOWN';
        if (stats.avg_confidence > 0.9) return 'EXCELLENT';
        if (stats.avg_confidence > 0.8) return 'GOOD';
        if (stats.avg_confidence > 0.7) return 'FAIR';
        return 'POOR';
    }

    /**
     * Generate mock forecast data for testing (development only)
     */
    private generateMockForecastData(
        locationId: string,
        interval: string,
        start: Date,
        end: Date
    ): any[] {
        // Only available in development mode
        if (process.env.NODE_ENV !== 'development') {
            return [];
        }

        const data = [];
        const current = new Date(start);
        const intervalMs = this.getIntervalMilliseconds(interval);

        while (current <= end) {
            const hour = current.getHours();
            const dayOfYear = this.getDayOfYear(current);

            // Simulate solar production pattern
            let baseProduction = 0;
            if (hour >= 6 && hour <= 18) {
                const peakHour = 12;
                const hourDiff = Math.abs(hour - peakHour);
                const maxProduction = 45; // MW at peak
                baseProduction = maxProduction * Math.exp(-(hourDiff * hourDiff) / 18);

                // Add seasonal variation
                const seasonalFactor = 0.7 + 0.3 * Math.sin(((dayOfYear - 80) / 365) * 2 * Math.PI);
                baseProduction *= seasonalFactor;

                // Add some randomness
                baseProduction += (Math.random() - 0.5) * 5;
                baseProduction = Math.max(0, baseProduction);
            }

            data.push({
                timestamp: current.toISOString(),
                power_forecast_mw: parseFloat(baseProduction.toFixed(2)),
                confidence_score: 0.85 + Math.random() * 0.1,
                model_type: 'MOCK'
            });

            current.setTime(current.getTime() + intervalMs);
        }

        return data;
    }

    private getIntervalMilliseconds(interval: string): number {
        const intervals: Record<string, number> = {
            '15min': 15 * 60 * 1000,
            'hourly': 60 * 60 * 1000,
            'daily': 24 * 60 * 60 * 1000,
            'weekly': 7 * 24 * 60 * 60 * 1000
        };
        return intervals[interval] || 60 * 60 * 1000;
    }

    private getDayOfYear(date: Date): number {
        const start = new Date(date.getFullYear(), 0, 0);
        const diff = date.getTime() - start.getTime();
        const oneDay = 1000 * 60 * 60 * 24;
        return Math.floor(diff / oneDay);
    }
}