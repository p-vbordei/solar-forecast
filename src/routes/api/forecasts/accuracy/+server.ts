import type { RequestHandler } from './$types';
import { ForecastController } from '$lib/features/forecasts/controllers/ForecastController';

const controller = new ForecastController();

// GET /api/forecasts/accuracy - Get forecast accuracy metrics
export const GET: RequestHandler = (event) => controller.getAccuracyMetrics(event);