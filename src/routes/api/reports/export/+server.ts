import { json, type RequestHandler } from '@sveltejs/kit';
import { reportService } from '$lib/server/services/report.service';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    const { reportType, startDate, endDate, format } = data;

    // Validate required fields
    if (!reportType || !startDate || !endDate || !format) {
      return json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const exportData = await reportService.exportReport({
      reportType,
      startDate,
      endDate,
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