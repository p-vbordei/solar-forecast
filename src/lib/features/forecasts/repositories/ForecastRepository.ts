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
                where: `location_id = ${parseInt(locationId)} AND timestamp >= '${start.toISOString()}' AND timestamp <= '${end.toISOString()}'`,
                groupBy: ['location_id'],
                orderBy: 'bucket ASC'
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
                WHERE f.location_id = ${parseInt(locationId)}
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
            const result = await TimescaleQueries.bulkInsert('forecasts', forecasts, {
                batchSize: 1000,
                onConflict: 'update',
                validateTimestamps: true
            });

            return result;
        } catch (error) {
            console.error('Bulk forecast insert failed:', error);
            throw new Error(`Failed to insert forecasts: ${error.message}`);
        }
    }

    /**
     * Get latest forecast for a location
     */
    async getLatestForecast(locationId: string) {
        try {
            const forecast = await db.forecast.findFirst({
                where: {
                    locationId: parseInt(locationId)
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
            const stats = await db.$queryRaw`
                SELECT
                    COUNT(*) as total_forecasts,
                    AVG(confidence_score) as avg_confidence,
                    MIN(power_forecast_mw) as min_forecast,
                    MAX(power_forecast_mw) as max_forecast,
                    AVG(power_forecast_mw) as avg_forecast
                FROM forecasts
                WHERE location_id = ${parseInt(locationId)}
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