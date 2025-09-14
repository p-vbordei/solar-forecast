import type { RequestHandler } from './$types';
import { ForecastController } from '$lib/features/forecasts/controllers/ForecastController';

const controller = new ForecastController();

/**
 * GET /api/forecasts/dashboard
 * Get comprehensive dashboard data for forecasts
 *
 * Query parameters:
 * - locationId: Filter dashboard for specific location (optional)
 *
 * Returns aggregated data including:
 * - Statistics summary
 * - Recent forecasts
 * - Accuracy summary
 * - 7-day trends
 * - Best performing model
 * - System status
 */
export const GET: RequestHandler = async (event) => {
  console.log('GET /api/forecasts/dashboard - Dashboard data request received');

  try {
    const result = await controller.getForecastDashboard(event);
    console.log('GET /api/forecasts/dashboard - Dashboard data retrieved successfully');
    return result;
  } catch (error) {
    console.error('GET /api/forecasts/dashboard - Error retrieving dashboard data:', error);
    throw error;
  }
};