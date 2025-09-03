import { json, type RequestHandler } from '@sveltejs/kit';
import { forecastService } from '$lib/server/services/forecast.service';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const location = url.searchParams.get('location');
    const interval = url.searchParams.get('interval') || 'hourly';
    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end');

    if (!location) {
      return json(
        { success: false, error: 'Location is required' },
        { status: 400 }
      );
    }

    const forecastData = await forecastService.getForecast({
      locationId: location,
      interval: interval as '15min' | 'hourly' | 'daily' | 'weekly',
      startDate: start || undefined,
      endDate: end || undefined
    });

    return json({
      success: true,
      data: forecastData.data,
      hasActual: forecastData.hasActual
    });
  } catch (error) {
    console.error('Error fetching forecast data:', error);
    return json(
      { success: false, error: 'Failed to fetch forecast data' },
      { status: 500 }
    );
  }
};