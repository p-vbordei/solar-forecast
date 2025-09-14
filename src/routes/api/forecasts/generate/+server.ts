import type { RequestHandler } from './$types';
import { ForecastController } from '$lib/features/forecasts/controllers/ForecastController';

const controller = new ForecastController();

// POST /api/forecasts/generate - Generate new forecast
export const POST: RequestHandler = (event) => controller.generateForecast(event);