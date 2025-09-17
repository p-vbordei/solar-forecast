import { db, TimescaleQueries } from '$lib/server/database';
import type { TimeInterval } from '$lib/server/database';
import type { BulkForecastInsert } from '../models/dto/forecast';

/**
 * Repository layer for forecast data access
 * Handles all database operations for forecasts
 */
export class ForecastRepository {

    /**
     * Get forecast data with TimescaleDB optimization
     */
    async getForecastData(
        locationId: string,
        interval: '15min' | 'hourly' | 'daily' | 'weekly',
        startDate?: string,
        endDate?: string
    ) {
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();

        // Convert interval to TimescaleDB interval
        const tsInterval: TimeInterval = interval === '15min' ? '15 minutes' :
                                       interval === 'hourly' ? '1 hour' :
                                       interval === 'daily' ? '1 day' : '1 week';

        try {
            // Use TimescaleDB time_bucket for optimal performance
            const data = await TimescaleQueries.timeBucket({
                interval: tsInterval,
                table: 'forecasts',
                aggregations: {
                    avg: ['power_forecast_mw', 'confidence_score'],
                    max: ['power_forecast_mw'],
                    min: ['power_forecast_mw'],
                    count: ['*']
                },
                where: `location_id = '${locationId}' AND timestamp >= '${start.toISOString()}' AND timestamp <= '${end.toISOString()}'`,
                groupBy: ['location_id']
            });

            return data;
        } catch (error) {
            console.warn('Database query failed for forecast data:', error);
            return [];
        }
    }

    /**
     * Get accuracy data by comparing forecasts with production
     */
    async getAccuracyData(
        locationId: string,
        startDate?: string,
        endDate?: string
    ) {
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();

        try {
            // Query forecast vs production data for accuracy analysis
            const data = await db.$queryRaw`
                SELECT
                    f.timestamp,
                    f.power_forecast_mw as forecast,
                    p.power_mw as actual,
                    f.confidence_score,
                    f.model_type
                FROM forecasts f
                INNER JOIN production p ON f.location_id = p.location_id
                    AND f.timestamp = p.timestamp
                WHERE f.location_id = ${locationId}
                    AND f.timestamp >= ${start}
                    AND f.timestamp <= ${end}
                ORDER BY f.timestamp DESC
                LIMIT 1000
            `;

            return data as any[];
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
                return `(
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
                    "timestamp", "locationId", "powerMW", "powerOutputMW",
                    "energyMWh", "capacityFactor", "confidence", "confidenceLevel",
                    "modelType", "modelVersion", "horizonMinutes", "horizonDays",
                    "resolution", "forecastType", "dataQuality",
                    "temperature", "ghi", "dni", "cloudCover", "windSpeed",
                    "qualityScore", "isValidated"
                ) VALUES ${values}
                ON CONFLICT ("locationId", "timestamp", "modelType") DO NOTHING
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
     * Normalize model type to match Prisma enum
     */
    private normalizeModelType(modelType: string): string {
        const typeMap: Record<string, string> = {
            'ML_ENSEMBLE': 'ENSEMBLE',
            'PHYSICS': 'PHYSICAL',
            'PHYSICAL': 'PHYSICAL',
            'HYBRID': 'HYBRID',
            'CATBOOST': 'ENSEMBLE',  // CatBoost is our ensemble model
            'ENSEMBLE': 'ENSEMBLE'
        };
        return typeMap[modelType] || 'ENSEMBLE';
    }

    /**
     * Get latest forecast for a location
     */
    async getLatestForecast(locationId: string) {
        try {
            const forecast = await db.forecast.findFirst({
                where: {
                    locationId: locationId
                },
                orderBy: {
                    timestamp: 'desc'
                },
                include: {
                    location: {
                        select: {
                            id: true,
                            name: true,
                            code: true
                        }
                    }
                }
            });

            return forecast;
        } catch (error) {
            console.error('Failed to get latest forecast:', error);
            return null;
        }
    }

    /**
     * Get forecast statistics for a location
     */
    async getForecastStatistics(locationId: string, days: number = 30) {
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        try {
            const stats = await db.$queryRaw<Array<{
                total_forecasts: bigint;
                avg_confidence: number | null;
                min_forecast: number | null;
                max_forecast: number | null;
                avg_forecast: number | null;
            }>>`
                SELECT
                    COUNT(*) as total_forecasts,
                    AVG(confidence_score) as avg_confidence,
                    MIN(power_forecast_mw) as min_forecast,
                    MAX(power_forecast_mw) as max_forecast,
                    AVG(power_forecast_mw) as avg_forecast
                FROM forecasts
                WHERE location_id = ${locationId}
                    AND timestamp >= ${startDate}
            `;

            return stats[0] || null;
        } catch (error) {
            console.error('Failed to get forecast statistics:', error);
            return null;
        }
    }

    /**
     * Delete old forecasts (data retention)
     */
    async deleteOldForecasts(retentionDays: number = 730) {
        const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

        try {
            const result = await db.forecast.deleteMany({
                where: {
                    timestamp: {
                        lt: cutoffDate
                    }
                }
            });

            return result;
        } catch (error) {
            console.error('Failed to delete old forecasts:', error);
            throw error;
        }
    }
}