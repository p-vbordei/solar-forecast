import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { forecastService } from '$lib/server/services/forecast.service';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const params = await request.json();

    // Validate required parameters
    if (!params.locationId || !params.horizonHours || !params.modelType) {
      return json({
        error: 'Missing required parameters: locationId, horizonHours, modelType'
      }, { status: 400 });
    }

    // Validate horizonHours
    if (![24, 48, 72].includes(parseInt(params.horizonHours))) {
      return json({
        error: 'horizonHours must be 24, 48, or 72'
      }, { status: 400 });
    }

    // Generate forecast using enhanced service
    const result = await forecastService.generateForecast({
      locationId: params.locationId,
      horizonHours: parseInt(params.horizonHours),
      modelType: params.modelType,
      resolution: params.resolution || 'hourly',
      includeWeather: params.includeWeather || true
    });

    return json(result);
  } catch (error) {
    console.error('Forecast generation API error:', error);
    return json({
      error: 'Failed to generate forecast',
      details: error.message
    }, { status: 500 });
  }
};