import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { WeatherService } from '$lib/features/weather/services/WeatherService';
import { weatherSyncTriggers } from '$lib/server/jobs/weather-sync';

/**
 * On-demand weather data synchronization endpoint
 * Allows manual triggering of weather data fetch
 */
export const POST: RequestHandler = async ({ request, url }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const locationIds = body.locationIds || [];
    const forecastDays = parseInt(url.searchParams.get('forecast_days') ?? '7');
    const includeForecasts = url.searchParams.get('include_forecasts') !== 'false';
    const forceRefresh = url.searchParams.get('force_refresh') === 'true';

    console.log('Manual weather sync triggered:', {
      locationIds: locationIds.length > 0 ? locationIds : 'all locations',
      forecastDays,
      includeForecasts,
      forceRefresh
    });

    const weatherService = new WeatherService();

    // If specific locations requested
    if (locationIds.length > 0) {
      const result = await weatherService.syncAllLocations({
        locationIds,
        includeForecasts,
        forecastDays,
        forceRefresh,
        validateData: true,
        batchSize: 1000
      });

      return json({
        success: result.success,
        message: result.message,
        data: {
          locationsProcessed: result.stats.locationsProcessed,
          recordsInserted: result.stats.recordsInserted,
          recordsUpdated: result.stats.recordsUpdated,
          recordsDeleted: result.stats.recordsSkipped, // Using skipped as proxy for deleted
          processingTimeMs: result.stats.processingTimeMs,
          errors: result.errors || []
        }
      });
    }

    // Otherwise sync all locations
    let result;
    if (includeForecasts) {
      console.log('Triggering full weather sync (with forecasts)');
      result = await weatherService.syncAllLocations({
        includeForecasts: true,
        forecastDays,
        forceRefresh: true,
        validateData: true,
        batchSize: 1000
      });
    } else {
      console.log('Triggering current weather sync only');
      result = await weatherService.syncAllLocations({
        includeForecasts: false,
        forceRefresh,
        validateData: true,
        batchSize: 500
      });
    }

    return json({
      success: result.success,
      message: result.message,
      data: {
        locationsProcessed: result.stats.locationsProcessed,
        recordsInserted: result.stats.recordsInserted,
        recordsUpdated: result.stats.recordsUpdated,
        recordsDeleted: result.stats.recordsSkipped, // Using skipped as proxy for deleted
        processingTimeMs: result.stats.processingTimeMs,
        errors: result.errors || []
      }
    });

  } catch (error) {
    console.error('Weather sync API error:', error);

    return json({
      success: false,
      message: `Weather sync failed: ${error.message}`,
      data: null
    }, { status: 500 });
  }
};

/**
 * Get weather sync status
 */
export const GET: RequestHandler = async () => {
  try {
    // Import scheduler status
    const { weatherSyncScheduler } = await import('$lib/server/jobs/weather-sync');

    const status = weatherSyncScheduler.getStatus();

    return json({
      success: true,
      data: {
        schedulerRunning: status.isRunning,
        activeIntervals: status.activeIntervals,
        jobCurrentlyRunning: status.jobRunning,
        nextScheduledRun: 'Daily at UTC 08:00',
        lastManualSync: 'Available via logs'
      }
    });
  } catch (error) {
    console.error('Weather sync status error:', error);

    return json({
      success: false,
      message: `Failed to get sync status: ${error.message}`,
      data: null
    }, { status: 500 });
  }
};