import type { RequestHandler } from './$types';
import { ForecastController } from '$lib/features/forecasts/controllers/ForecastController';

const controller = new ForecastController();

// POST /api/forecast/generate - Generate new forecast (legacy endpoint)
export const POST: RequestHandler = async (event) => {
    // DEPRECATED: This endpoint is deprecated. Use /api/forecasts/generate instead
    console.warn('DEPRECATED: /api/forecast/generate endpoint used. Migrate to /api/forecasts/generate');

    const response = await controller.generateForecast(event);

    // Add deprecation headers
    response.headers.set('X-Deprecated', 'Use /api/forecasts/generate instead');
    response.headers.set('X-Deprecation-Message', 'This endpoint will be removed. Use /api/forecasts/generate for the same functionality.');

    return response;
};