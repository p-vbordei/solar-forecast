import { json, type RequestHandler } from '@sveltejs/kit';
import { scheduledReportService } from '$lib/server/services/scheduled-report.service';

/**
 * GET /api/reports/scheduled
 * Get list of scheduled reports
 */
export const GET: RequestHandler = async ({ url }) => {
  try {
    // For now, using hardcoded user ID until auth is implemented
    const userId = 1;

    // Get scheduled reports for the user
    const scheduledReports = await scheduledReportService.getUserScheduledReports(userId);

    // Map the data for frontend display
    const formattedReports = scheduledReports.map(report => {
      // Format the next run date
      let nextRunDisplay = 'Not scheduled';
      if (report.nextRunAt) {
        const nextRun = new Date(report.nextRunAt);
        nextRunDisplay = nextRun.toLocaleString();
      }

      // Map report type back to frontend format
      const reportTypeMap: Record<string, string> = {
        'PRODUCTION_SUMMARY': 'Production Summary',
        'FORECAST_ACCURACY': 'Forecast Accuracy',
        'FORECAST_D1_D5': 'Forecast: D+1/+5',
        'FORECAST_MONTHLY_CONTINUED': 'Forecast: Monthly Continued',
        'EFFICIENCY_ANALYSIS': 'Efficiency Analysis',
        'FINANCIAL_SUMMARY': 'Financial Summary',
        'MAINTENANCE_REPORT': 'Maintenance Report',
        'COMPLIANCE_REPORT': 'Compliance Report',
        'WEATHER_IMPACT': 'Weather Impact',
        'LOCATION_COMPARISON': 'Location Comparison',
        'CUSTOM': 'Custom Report'
      };

      const reportName = reportTypeMap[report.reportType as string] || report.name;

      return {
        id: report.id,
        name: reportName,
        reportType: report.reportType,
        frequency: report.frequency,
        time: report.scheduleTime,
        startDate: report.startDate,
        scheduleDescription: report.scheduleDescription || `${report.frequency} at ${report.scheduleTime}`,
        nextRun: nextRunDisplay,
        nextRunAt: report.nextRunAt,
        lastRunAt: report.lastRunAt,
        recipientCount: report.emailRecipients?.length || 0,
        isActive: report.isActive,
        lastStatus: report.lastStatus,
        errorCount: report.errorCount || 0,
        totalRuns: report.totalRuns || 0,
        successfulRuns: report.successfulRuns || 0
      };
    });

    return json({
      success: true,
      data: formattedReports
    });
  } catch (error: any) {
    console.error('Error fetching scheduled reports:', error);
    return json(
      { success: false, error: error.message || 'Failed to fetch scheduled reports' },
      { status: 500 }
    );
  }
};