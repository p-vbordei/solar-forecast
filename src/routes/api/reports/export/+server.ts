import { json, type RequestHandler } from '@sveltejs/kit';
import { reportService } from '$lib/server/services/report.service';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    const { reportType, startDate, endDate, locationIds, dataAggregation, timezone, format } = data;

    // Validate required fields
    if (!reportType || !startDate || !endDate || !locationIds || !dataAggregation || !timezone || !format) {
      return json(
        { success: false, error: 'Missing required fields: reportType, startDate, endDate, locationIds, dataAggregation, timezone, format' },
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

    const exportData = await reportService.exportReport({
      reportType,
      startDate,
      endDate,
      locationIds,
      dataAggregation,
      timezone,
      format
    });

    if (format === 'pdf') {
      return new Response(exportData, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${reportType}_${new Date().toISOString().split('T')[0]}.pdf"`
        }
      });
    } else if (format === 'excel') {
      return new Response(exportData, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${reportType}_${new Date().toISOString().split('T')[0]}.xlsx"`
        }
      });
    } else {
      return new Response(exportData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${reportType}_${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }
  } catch (error) {
    console.error('Error exporting report:', error);
    return json(
      { success: false, error: 'Failed to export report' },
      { status: 500 }
    );
  }
};