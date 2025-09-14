import type { RequestHandler } from './$types';
import { ForecastController } from '$lib/features/forecasts/controllers/ForecastController';

const controller = new ForecastController();

/**
 * GET /api/forecasts
 * List forecasts with filtering and pagination
 */
export const GET: RequestHandler = (event) => controller.getAllForecasts(event);

/**
 * POST /api/forecasts
 * Create a new forecast (quick generation)
 *
 * This endpoint is for simple forecast creation.
 * For advanced options, use /api/forecasts/generate
 */
export const POST: RequestHandler = async (event) => {
  console.log('POST /api/forecasts - Request received');
  try {
    const result = await controller.generateForecast(event);
    console.log('POST /api/forecasts - Success');
    return result;
  } catch (error) {
    console.error('POST /api/forecasts - Error:', error);
    throw error;
  }
};