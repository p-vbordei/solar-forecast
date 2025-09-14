import { json, type RequestHandler } from '@sveltejs/kit';
import { scheduledReportService } from '$lib/server/services/scheduled-report.service';

/**
 * POST /api/reports/schedule
 * Create a scheduled report
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();

    // For now, using hardcoded user ID until auth is implemented
    const userId = 1;

    // Validate required fields
    if (!data.reportType) {
      return json(
        { success: false, error: 'Report type is required' },
        { status: 400 }
      );
    }

    if (!data.frequency || !data.time || !data.startDate) {
      return json(
        { success: false, error: 'Schedule configuration (frequency, time, startDate) is required' },
        { status: 400 }
      );
    }

    // Map the frontend report type to the enum value
    const reportTypeMap: Record<string, string> = {
      'production-summary': 'PRODUCTION_SUMMARY',
      'forecast-accuracy': 'FORECAST_ACCURACY',
      'forecast-d1-d5': 'FORECAST_D1_D5',
      'forecast-monthly-continued': 'FORECAST_MONTHLY_CONTINUED'
    };

    const mappedReportType = reportTypeMap[data.reportType] || data.reportType;

    // Create the scheduled report
    const scheduledReport = await scheduledReportService.createScheduledReport({
      userId,
      reportType: mappedReportType,
      name: data.reportType,
      description: data.scheduleDescription,
      parameters: {
        reportType: data.reportType,
        format: data.format,
        aggregation: data.aggregation,
        timezone: data.timezone
      },
      filters: {
        locationIds: data.locationIds,
        locationDisplay: data.locationDisplay,
        plantId: data.plantId
      },
      frequency: data.frequency.toUpperCase() as any,
      scheduleTime: data.time,
      startDate: new Date(data.startDate),
      timezone: data.timezone || 'UTC',
      scheduleDescription: data.scheduleDescription,
      format: data.format || 'excel',
      aggregationLevel: data.aggregation,
      selectedTimezone: data.timezone,
      emailRecipients: data.emails || [],
      emailEnabled: data.emails && data.emails.length > 0,
      locationIds: data.locationIds || [],
      locationDisplay: data.locationDisplay || 'individual',
      plantIds: data.plantId ? [data.plantId] : []
    });

    return json({
      success: true,
      data: {
        id: scheduledReport.id,
        name: scheduledReport.name,
        nextRunAt: scheduledReport.nextRunAt,
        message: 'Report scheduled successfully'
      }
    });
  } catch (error: any) {
    console.error('Error scheduling report:', error);
    return json(
      { success: false, error: error.message || 'Failed to schedule report' },
      { status: 500 }
    );
  }
};