import type { RequestHandler } from './$types';
import { ForecastController } from '$lib/features/forecasts/controllers/ForecastController';

const controller = new ForecastController();

/**
 * POST /api/forecasts/generate
 * Generate new forecast with full configuration options
 *
 * This is the main forecast generation endpoint with advanced options:
 * - Custom model parameters
 * - Force regeneration
 * - Future start times
 * - Detailed configuration
 */
export const POST: RequestHandler = async (event) => {
  console.log('POST /api/forecasts/generate - Forecast generation request received');

  try {
    const result = await controller.generateForecast(event);
    console.log('POST /api/forecasts/generate - Forecast generation initiated successfully');
    return result;
  } catch (error) {
    console.error('POST /api/forecasts/generate - Forecast generation failed:', error);
    throw error;
  }
};