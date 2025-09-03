import { json, type RequestHandler } from '@sveltejs/kit';
import { forecastService } from '$lib/server/services/forecast.service';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const location = url.searchParams.get('location');
    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end');

    if (!location) {
      return json(
        { success: false, error: 'Location is required' },
        { status: 400 }
      );
    }

    const accuracyData = await forecastService.getAccuracyMetrics({
      locationId: location,
      startDate: start || undefined,
      endDate: end || undefined
    });

    return json({
      success: true,
      data: accuracyData
    });
  } catch (error) {
    console.error('Error fetching accuracy metrics:', error);
    return json(
      { success: false, error: 'Failed to fetch accuracy metrics' },
      { status: 500 }
    );
  }
};