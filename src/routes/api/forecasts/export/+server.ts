import type { RequestHandler } from './$types';
import { ForecastController } from '$lib/features/forecasts/controllers/ForecastController';

const controller = new ForecastController();

// GET /api/forecasts/export - Export forecast data
export const GET: RequestHandler = (event) => controller.exportForecast(event);