import type { RequestHandler } from './$types';
import { WeatherController } from '$lib/features/weather/controllers/WeatherController';

const controller = new WeatherController();

/**
 * GET /api/weather?location_id={guid}&...
 * Get current weather data for a location
 */
export const GET: RequestHandler = (event) => {
  const { url } = event;

  // Route to appropriate method based on query parameters
  if (url.searchParams.has('start_date') && url.searchParams.has('end_date')) {
    // Historical weather endpoint
    return controller.getHistoricalWeather(event);
  } else if (url.searchParams.get('interval')) {
    // Aggregated weather endpoint
    return controller.getAggregatedWeather(event);
  } else if (url.searchParams.get('days')) {
    // Forecast endpoint
    return controller.getForecast(event);
  } else {
    // Current weather endpoint
    return controller.getWeather(event);
  }
};

/**
 * POST /api/weather/sync
 * Synchronize weather data for all or specific locations
 */
export const POST: RequestHandler = async (event) => {
  console.log('POST /api/weather - Weather sync request received');
  try {
    const result = await controller.syncWeather(event);
    console.log('POST /api/weather - Weather sync completed');
    return result;
  } catch (error) {
    console.error('POST /api/weather - Weather sync error:', error);
    throw error;
  }
};