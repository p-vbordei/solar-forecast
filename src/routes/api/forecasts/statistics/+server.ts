import type { RequestHandler } from './$types';
import { ForecastController } from '$lib/features/forecasts/controllers/ForecastController';

const controller = new ForecastController();

// GET /api/forecasts/statistics - Get forecast statistics
export const GET: RequestHandler = (event) => controller.getForecastStatistics(event);