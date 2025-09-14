import type { RequestHandler } from './$types';
import { ForecastController } from '$lib/features/forecasts/controllers/ForecastController';

const controller = new ForecastController();

/**
 * GET /api/forecasts/accuracy
 * Get forecast accuracy metrics and analysis
 *
 * Query parameters:
 * - locationId: Filter by specific location
 * - modelType: Filter by model type
 * - startDate: Start of date range (ISO string)
 * - endDate: End of date range (ISO string)
 *
 * Returns comprehensive accuracy analysis including:
 * - Overall system accuracy
 * - Model performance comparison
 * - Location-specific metrics
 * - Accuracy trends over time
 * - Recommendations for improvement
 */
export const GET: RequestHandler = async (event) => {
  console.log('GET /api/forecasts/accuracy - Accuracy metrics request received');

  try {
    const result = await controller.getAccuracyMetrics(event);
    console.log('GET /api/forecasts/accuracy - Accuracy metrics retrieved successfully');
    return result;
  } catch (error) {
    console.error('GET /api/forecasts/accuracy - Error retrieving accuracy metrics:', error);
    throw error;
  }
};