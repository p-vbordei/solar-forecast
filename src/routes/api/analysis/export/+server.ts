import { json, type RequestHandler } from '@sveltejs/kit';
import { forecastService } from '$lib/server/services/forecast.service';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    const { location, interval, start, end, format } = data;

    if (!location || !format) {
      return json(
        { success: false, error: 'Location and format are required' },
        { status: 400 }
      );
    }

    const exportData = await forecastService.exportForecast({
      locationId: location,
      interval: interval || 'hourly',
      startDate: start,
      endDate: end,
      format
    });

    const contentType = format === 'pdf' 
      ? 'application/pdf'
      : format === 'excel'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'text/csv';

    const filename = `forecast_${location}_${interval}_${new Date().toISOString().split('T')[0]}.${format}`;

    return new Response(exportData, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error('Error exporting forecast:', error);
    return json(
      { success: false, error: 'Failed to export forecast' },
      { status: 500 }
    );
  }
};