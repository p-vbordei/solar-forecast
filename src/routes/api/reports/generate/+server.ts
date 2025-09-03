import { json, type RequestHandler } from '@sveltejs/kit';
import { reportService } from '$lib/server/services/report.service';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    const {
      reportType,
      startDate,
      endDate,
      format,
      locationId,
      plantId,
      filters
    } = data;

    // Validate required fields
    if (!reportType || !startDate || !endDate || !format) {
      return json(
        { success: false, error: 'Missing required fields' },
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

    // Generate report based on format
    if (format === 'pdf') {
      const pdfBuffer = await reportService.generatePDFReport({
        reportType,
        startDate,
        endDate,
        locationId,
        plantId,
        filters
      });

      return new Response(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${reportType}_${startDate}_to_${endDate}.pdf"`
        }
      });
    } else {
      const reportData = await reportService.generateReport({
        reportType,
        startDate,
        endDate,
        format,
        locationId,
        plantId,
        filters
      });

      return json({
        success: true,
        data: reportData
      });
    }
  } catch (error) {
    console.error('Error generating report:', error);
    return json(
      { success: false, error: 'Failed to generate report' },
      { status: 500 }
    );
  }
};