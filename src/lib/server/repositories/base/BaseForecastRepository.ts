import { db, TimescaleQueries } from '$lib/server/database';
import type { TimeInterval } from '$lib/server/database';

/**
 * Base Repository for Forecast Data Access
 *
 * This class provides core database operations that are shared across
 * different forecast-related repositories. It handles:
 * - Direct database queries using Prisma
 * - TimescaleDB optimized operations
 * - Basic CRUD operations
 *
 * Extended by feature-specific repositories for business logic.
 */
export abstract class BaseForecastRepository {
    /**
     * Get raw forecast data from database using TimescaleDB optimization
     * This is the core data access method used by all forecast repositories
     */
    protected async getRawForecastData(
        locationId: string,
        interval: TimeInterval,
        startDate: Date,
        endDate: Date
    ) {
        return await TimescaleQueries.timeBucket({
            interval,
            table: 'forecasts',
            aggregations: {
                avg: ['"powerMW"', 'confidence', '"qualityScore"'],
                max: ['"powerMW"'],
                min: ['"powerMW"'],
                count: ['id']
            },
            where: `"locationId" = '${locationId}' AND timestamp >= '${startDate.toISOString()}' AND timestamp <= '${endDate.toISOString()}'`,
            groupBy: ['locationId'],
            orderBy: 'bucket ASC'
        });
    }

    /**
     * Get accuracy data by comparing forecasts with production
     * Core method for accuracy calculations
     */
    protected async getRawAccuracyData(
        locationId: string,
        startDate: Date,
        endDate: Date
    ) {
        return await db.$queryRaw`
            SELECT
                f.timestamp,
                f."powerMW" as forecast,
                p."powerMW" as actual,
                f.confidence,
                f."modelType"
            FROM forecasts f
            INNER JOIN production p ON f."locationId" = p."locationId"
                AND f.timestamp = p.timestamp
            WHERE f."locationId" = ${locationId}
                AND f.timestamp >= ${startDate}
                AND f.timestamp <= ${endDate}
            ORDER BY f.timestamp DESC
            LIMIT 1000
        `;
    }

    /**
     * Get latest forecast for a location
     * Core method for current forecast status
     */
    protected async getLatestForecastRecord(locationId: string) {
        return await db.forecast.findFirst({
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
                        code: true,
                        capacityMW: true
                    }
                }
            }
        });
    }

    /**
     * Get forecast statistics using raw SQL
     * Core method for aggregate metrics
     */
    protected async getRawForecastStatistics(locationId: string, days: number) {
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        return await db.$queryRaw<Array<{
            total_forecasts: bigint;
            avg_confidence: number | null;
            min_forecast: number | null;
            max_forecast: number | null;
            avg_forecast: number | null;
        }>>`
            SELECT
                COUNT(*) as total_forecasts,
                AVG(confidence) as avg_confidence,
                MIN("powerMW") as min_forecast,
                MAX("powerMW") as max_forecast,
                AVG("powerMW") as avg_forecast
            FROM forecasts
            WHERE "locationId" = ${locationId}
                AND timestamp >= ${startDate}
        `;
    }

    /**
     * Delete old forecasts for data retention
     * Core method for data lifecycle management
     */
    protected async deleteOldForecastRecords(retentionDays: number) {
        const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

        return await db.forecast.deleteMany({
            where: {
                timestamp: {
                    lt: cutoffDate
                }
            }
        });
    }

    /**
     * Bulk insert forecasts using optimized TimescaleDB operations
     * Core method for high-performance inserts
     */
    protected async bulkInsertForecastRecords(
        tableName: string,
        records: any[],
        options: {
            batchSize?: number;
            onConflict?: 'ignore' | 'update';
            validateTimestamps?: boolean;
        } = {}
    ) {
        return await TimescaleQueries.bulkInsert(tableName, records, {
            batchSize: options.batchSize || 1000,
            onConflict: options.onConflict || 'ignore',
            validateTimestamps: options.validateTimestamps !== false
        });
    }

    /**
     * Check if forecast data exists for a location
     * Utility method for data validation
     */
    protected async hasForecastData(locationId: string): Promise<boolean> {
        const count = await db.forecast.count({
            where: {
                locationId: locationId
            }
        });
        return count > 0;
    }

    /**
     * Get forecast count by model type
     * Utility method for model usage analytics
     */
    protected async getForecastCountByModel(locationId: string, days: number = 30) {
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        return await db.$queryRaw<Array<{
            model_type: string;
            count: bigint;
        }>>`
            SELECT
                "modelType" as model_type,
                COUNT(*) as count
            FROM forecasts
            WHERE "locationId" = ${locationId}
                AND timestamp >= ${startDate}
            GROUP BY "modelType"
            ORDER BY count DESC
        `;
    }

    /**
     * Convert interval string to TimescaleDB interval
     * Utility method for interval conversion
     */
    protected convertToTimescaleInterval(interval: string): TimeInterval {
        const intervalMap: Record<string, TimeInterval> = {
            '15min': '15 minutes',
            'hourly': '1 hour',
            'daily': '1 day',
            'weekly': '1 week'
        };
        return intervalMap[interval] || '1 hour';
    }

    /**
     * Validate GUID format
     * Utility method for ID validation
     */
    protected validateGuid(guid: string): void {
        const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!guidRegex.test(guid)) {
            throw new Error(`Invalid GUID format: ${guid}`);
        }
    }

    /**
     * Normalize model type to match database enum
     * Utility method for data consistency
     */
    protected normalizeModelType(modelType: string): string {
        const typeMap: Record<string, string> = {
            'ML_ENSEMBLE': 'ENSEMBLE',
            'PHYSICS': 'PHYSICAL',
            'PHYSICAL': 'PHYSICAL',
            'HYBRID': 'HYBRID',
            'CATBOOST': 'ENSEMBLE',
            'ENSEMBLE': 'ENSEMBLE'
        };
        return typeMap[modelType] || 'ENSEMBLE';
    }
}