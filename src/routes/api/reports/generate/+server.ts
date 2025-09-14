import { json, type RequestHandler } from '@sveltejs/kit';
import { reportService } from '$lib/server/services/report.service';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    const {
      reportType,
      startDate,
      endDate,
      locationIds,
      dataAggregation,
      timezone
    } = data;

    // Validate required fields
    if (!reportType || !startDate || !endDate || !locationIds || !dataAggregation || !timezone) {
      return json(
        { success: false, error: 'Missing required fields: reportType, startDate, endDate, locationIds, dataAggregation, timezone' },
        { status: 400 }
      );
    }

    // Validate timezone format
    const validTimezones = ['UTC-2', 'UTC-1', 'UTC+0', 'UTC+1', 'UTC+2', 'UTC+3', 'UTC+4'];
    if (!validTimezones.includes(timezone)) {
      return json(
        { success: false, error: 'Invalid timezone. Must be between UTC-2 and UTC+4' },
        { status: 400 }
      );
    }

    // Validate locationIds is array
    if (!Array.isArray(locationIds) || locationIds.length === 0) {
      return json(
        { success: false, error: 'locationIds must be a non-empty array' },
        { status: 400 }
      );
    }

    // Validate date range
    if (new Date(startDate) > new Date(endDate)) {
      return json(
        { success: false, error: 'Start date must be before end date' },
        { status: 400 }
      );
    }

    // Generate report in Excel format
    const excelBuffer = await reportService.exportReport({
      reportType,
      startDate,
      endDate,
      locationIds,
      dataAggregation,
      timezone,
      format: 'excel'
    });

    return new Response(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${reportType}_${startDate}_to_${endDate}.xlsx"`
      }
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return json(
      { success: false, error: 'Failed to generate report' },
      { status: 500 }
    );
  }
};