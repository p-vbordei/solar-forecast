import type { RequestHandler } from './$types';
import { ForecastController } from '$lib/features/forecasts/controllers/ForecastController';

const controller = new ForecastController();

// POST /api/forecast/generate - Generate new forecast (legacy endpoint)
export const POST: RequestHandler = (event) => controller.generateForecast(event);