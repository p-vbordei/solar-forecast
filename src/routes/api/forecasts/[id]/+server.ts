import type { RequestHandler } from './$types';
import { ForecastController } from '$lib/features/forecasts/controllers/ForecastController';

const controller = new ForecastController();

/**
 * GET /api/forecasts/[id]
 * Get specific forecast by ID
 *
 * Query parameters:
 * - includeData: Include detailed forecast data points (default: false)
 * - includeAccuracy: Include accuracy metrics (default: false)
 */
export const GET: RequestHandler = async (event) => {
  console.log(`GET /api/forecasts/${event.params.id} - Forecast details request received`);

  try {
    const result = await controller.getForecastById(event);
    console.log(`GET /api/forecasts/${event.params.id} - Forecast details retrieved successfully`);
    return result;
  } catch (error) {
    console.error(`GET /api/forecasts/${event.params.id} - Error retrieving forecast:`, error);
    throw error;
  }
};

/**
 * DELETE /api/forecasts/[id]
 * Delete specific forecast (soft delete)
 *
 * Performs soft delete - forecast is marked as inactive but not removed from database.
 * Cannot delete forecasts that are currently being generated.
 */
export const DELETE: RequestHandler = async (event) => {
  console.log(`DELETE /api/forecasts/${event.params.id} - Forecast deletion request received`);

  try {
    const result = await controller.deleteForecast(event);
    console.log(`DELETE /api/forecasts/${event.params.id} - Forecast deleted successfully`);
    return result;
  } catch (error) {
    console.error(`DELETE /api/forecasts/${event.params.id} - Error deleting forecast:`, error);
    throw error;
  }
};