import type { RequestHandler } from './$types';
import { ForecastController } from '$lib/features/forecasts/controllers/ForecastController';

const controller = new ForecastController();

/**
 * GET /api/forecasts/statistics
 * Get forecast statistics for dashboard
 *
 * Query parameters:
 * - locationId: Filter statistics for specific location (optional)
 *
 * Returns:
 * - Total forecasts count
 * - Active forecasts count
 * - Average accuracy
 * - Best performing model
 * - Today's forecast count
 */
export const GET: RequestHandler = async (event) => {
  console.log('GET /api/forecasts/statistics - Statistics request received');

  try {
    const result = await controller.getForecastStatistics(event);
    console.log('GET /api/forecasts/statistics - Statistics retrieved successfully');
    return result;
  } catch (error) {
    console.error('GET /api/forecasts/statistics - Error retrieving statistics:', error);
    throw error;
  }
};