import type { RequestHandler } from './$types';
import { ApiResponse } from '$lib/utils/ApiResponse';
import { WeatherService } from '$lib/features/weather/services/WeatherService';
import { OpenMeteoClient } from '$lib/integrations/open-meteo/OpenMeteoClient';
import { weatherSyncScheduler } from '$lib/server/jobs/weather-sync';
import { db } from '$lib/server/database';

/**
 * GET /api/weather/health
 * Weather system health check endpoint
 */
export const GET: RequestHandler = async () => {
  try {
    const healthCheck = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {
        database: { status: 'unknown' },
        openMeteoApi: { status: 'unknown' },
        scheduler: { status: 'unknown' },
        recentData: { status: 'unknown' }
      },
      stats: {
        totalWeatherRecords: 0,
        recordsLast24h: 0,
        locationsWithData: 0,
        lastSyncTime: null,
        schedulerStatus: null
      }
    };

    // Check database connectivity
    try {
      const dbTest = await db.weatherData.count();
      healthCheck.checks.database = {
        status: 'healthy',
        recordCount: dbTest
      };
      healthCheck.stats.totalWeatherRecords = dbTest;
    } catch (error) {
      healthCheck.checks.database = {
        status: 'unhealthy',
        error: error.message
      };
      healthCheck.status = 'degraded';
    }

    // Check Open-Meteo API connectivity
    try {
      const testClient = new OpenMeteoClient({ timeoutMs: 5000 });
      // Test with Montreal coordinates
      await testClient.getCurrentWeather(45.5017, -73.5673);
      healthCheck.checks.openMeteoApi = {
        status: 'healthy',
        provider: 'open-meteo.com'
      };
    } catch (error) {
      healthCheck.checks.openMeteoApi = {
        status: 'unhealthy',
        error: error.message,
        provider: 'open-meteo.com'
      };
      healthCheck.status = 'degraded';
    }

    // Check scheduler status
    try {
      const schedulerStatus = weatherSyncScheduler.getStatus();
      healthCheck.checks.scheduler = {
        status: schedulerStatus.isRunning ? 'healthy' : 'unhealthy',
        ...schedulerStatus
      };
      healthCheck.stats.schedulerStatus = schedulerStatus;

      if (!schedulerStatus.isRunning) {
        healthCheck.status = 'degraded';
      }
    } catch (error) {
      healthCheck.checks.scheduler = {
        status: 'unhealthy',
        error: error.message
      };
      healthCheck.status = 'degraded';
    }

    // Check recent data availability
    try {
      const last24h = new Date();
      last24h.setHours(last24h.getHours() - 24);

      const recentCount = await db.weatherData.count({
        where: {
          timestamp: {
            gte: last24h
          }
        }
      });

      const locationsWithData = await db.weatherData.groupBy({
        by: ['locationId'],
        where: {
          timestamp: {
            gte: last24h
          }
        },
        _count: {
          locationId: true
        }
      });

      const latestRecord = await db.weatherData.findFirst({
        orderBy: {
          timestamp: 'desc'
        },
        select: {
          timestamp: true
        }
      });

      healthCheck.checks.recentData = {
        status: recentCount > 0 ? 'healthy' : 'unhealthy',
        recordsLast24h: recentCount,
        locationsWithData: locationsWithData.length,
        lastRecordTime: latestRecord?.timestamp?.toISOString()
      };

      healthCheck.stats.recordsLast24h = recentCount;
      healthCheck.stats.locationsWithData = locationsWithData.length;
      healthCheck.stats.lastSyncTime = latestRecord?.timestamp?.toISOString();

      if (recentCount === 0) {
        healthCheck.status = 'degraded';
      }

    } catch (error) {
      healthCheck.checks.recentData = {
        status: 'unhealthy',
        error: error.message
      };
      healthCheck.status = 'degraded';
    }

    // Determine overall status
    const hasUnhealthy = Object.values(healthCheck.checks).some(
      check => check.status === 'unhealthy'
    );

    if (hasUnhealthy) {
      healthCheck.status = healthCheck.status === 'healthy' ? 'degraded' : 'unhealthy';
    }

    // Return appropriate HTTP status
    const httpStatus = healthCheck.status === 'healthy' ? 200 :
                       healthCheck.status === 'degraded' ? 200 : 503;

    return new Response(JSON.stringify(healthCheck, null, 2), {
      status: httpStatus,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    console.error('Weather health check failed:', error);

    return ApiResponse.internalError(
      'Weather health check failed',
      error.message
    );
  }
};