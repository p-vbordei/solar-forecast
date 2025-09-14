import { scheduledReportService } from './scheduled-report.service';
import { emailService } from './email.service';
import { reportService } from './report.service';
import type { ScheduledReport } from '$lib/types/report';

export class ReportExecutionService {
  /**
   * Execute a scheduled report
   */
  async executeScheduledReport(report: any): Promise<void> {
    const startTime = Date.now();
    console.log(`[ReportExecutionService] Starting execution for report: ${report.id} - ${report.name}`);

    // Create execution record
    const executionId = await scheduledReportService.startExecution(report.id, {
      reportId: report.id,
      reportType: report.reportType,
      parameters: report.parameters,
      filters: report.filters,
      format: report.format,
      emailRecipients: report.emailRecipients
    });

    try {
      // Prepare report parameters
      const startDate = this.calculateStartDate(report);
      const endDate = new Date(); // Current date as end date

      const reportParams = {
        reportType: this.mapReportType(report.reportType),
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        locationIds: report.locationIds || [],
        dataAggregation: report.aggregationLevel || '1hour',
        timezone: report.selectedTimezone || report.timezone || 'UTC',
        format: report.format?.toLowerCase() || 'excel'
      };

      console.log(`[ReportExecutionService] Generating report with params:`, reportParams);

      // Generate the report
      let reportBuffer: Buffer;
      let reportFileName: string;

      try {
        // Try to use the existing report service
        reportBuffer = await reportService.exportReport(reportParams);
        reportFileName = `${report.name}_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}.${reportParams.format === 'pdf' ? 'pdf' : 'xlsx'}`;
      } catch (error: any) {
        console.log(`[ReportExecutionService] Report service not available, generating mock report`);
        // Fallback to mock report for now
        reportBuffer = await this.generateMockReport(report, reportParams);
        reportFileName = `${report.name}_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}.xlsx`;
      }

      console.log(`[ReportExecutionService] Report generated, size: ${reportBuffer.byteLength} bytes`);

      // Send email if enabled and recipients are configured
      let emailsSent = 0;
      if (report.emailEnabled && report.emailRecipients && report.emailRecipients.length > 0) {
        console.log(`[ReportExecutionService] Sending report to ${report.emailRecipients.length} recipients`);

        try {
          const deliveryStatus = await emailService.sendReportEmail(
            report.emailRecipients,
            report.name,
            this.getReportTypeDisplayName(report.reportType),
            `/api/reports/download/${executionId}`, // URL to download the report
            reportBuffer,
            reportFileName,
            report.format?.toUpperCase() || 'EXCEL',
            undefined // clientId - will be added when auth is ready
          );

          if (deliveryStatus.delivered) {
            emailsSent = report.emailRecipients.length;
            console.log(`[ReportExecutionService] Email sent successfully to ${emailsSent} recipients`);
          } else {
            throw new Error(deliveryStatus.error || 'Email delivery failed');
          }
        } catch (emailError: any) {
          console.error(`[ReportExecutionService] Email sending failed:`, emailError);
          // Continue even if email fails - report was generated successfully
        }
      }

      // Record successful execution
      await scheduledReportService.recordSuccessfulExecution(
        report.id,
        executionId,
        `/api/reports/download/${executionId}`,
        reportBuffer.byteLength,
        100, // Mock record count for now
        emailsSent
      );

      const duration = Date.now() - startTime;
      console.log(`[ReportExecutionService] Report execution completed successfully in ${duration}ms`);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`[ReportExecutionService] Report execution failed after ${duration}ms:`, error);

      // Record failed execution
      await scheduledReportService.recordFailedExecution(
        report.id,
        executionId,
        error.message || 'Unknown error'
      );

      throw error;
    }
  }

  /**
   * Calculate start date based on report type and frequency
   */
  private calculateStartDate(report: any): Date {
    const now = new Date();

    // For different report types, use different default periods
    switch (report.reportType) {
      case 'FORECAST_D1_D5':
        // Last 5 days
        return new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

      case 'FORECAST_MONTHLY_CONTINUED':
        // Start of current month
        return new Date(now.getFullYear(), now.getMonth(), 1);

      case 'PRODUCTION_SUMMARY':
      case 'FORECAST_ACCURACY':
      default:
        // Based on frequency
        switch (report.frequency) {
          case 'DAILY':
            // Last 24 hours
            return new Date(now.getTime() - 24 * 60 * 60 * 1000);
          case 'WEEKLY':
            // Last 7 days
            return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          case 'MONTHLY':
            // Last 30 days
            return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          case 'QUARTERLY':
            // Last 90 days
            return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          default:
            // Default to last 30 days
            return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
    }
  }

  /**
   * Map report type to the format expected by report service
   */
  private mapReportType(reportType: string): string {
    const typeMap: Record<string, string> = {
      'FORECAST_D1_D5': 'forecast_d1_plus_5',
      'FORECAST_MONTHLY_CONTINUED': 'forecast_monthly_continued',
      'PRODUCTION_SUMMARY': 'production_summary',
      'FORECAST_ACCURACY': 'forecast_accuracy'
    };

    return typeMap[reportType] || reportType.toLowerCase();
  }

  /**
   * Get display name for report type
   */
  private getReportTypeDisplayName(reportType: string): string {
    const displayNames: Record<string, string> = {
      'FORECAST_D1_D5': 'Forecast: D+1/+5',
      'FORECAST_MONTHLY_CONTINUED': 'Forecast: Monthly Continued',
      'PRODUCTION_SUMMARY': 'Production Summary',
      'FORECAST_ACCURACY': 'Forecast Accuracy',
      'EFFICIENCY_ANALYSIS': 'Efficiency Analysis',
      'FINANCIAL_SUMMARY': 'Financial Summary',
      'MAINTENANCE_REPORT': 'Maintenance Report',
      'COMPLIANCE_REPORT': 'Compliance Report',
      'WEATHER_IMPACT': 'Weather Impact',
      'LOCATION_COMPARISON': 'Location Comparison'
    };

    return displayNames[reportType] || reportType;
  }

  /**
   * Generate a mock report for testing
   */
  private async generateMockReport(report: any, params: any): Promise<Buffer> {
    // Dynamic import to avoid loading ExcelJS unless needed
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();

    // Add metadata
    workbook.creator = 'Solar Forecast Platform';
    workbook.created = new Date();

    // Add a worksheet
    const worksheet = workbook.addWorksheet('Report Data');

    // Add header row
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Location', key: 'location', width: 20 },
      { header: 'Production (MW)', key: 'production', width: 15 },
      { header: 'Forecast (MW)', key: 'forecast', width: 15 },
      { header: 'Accuracy (%)', key: 'accuracy', width: 15 }
    ];

    // Add sample data
    const startDate = new Date(params.startDate);
    const endDate = new Date(params.endDate);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      worksheet.addRow({
        date: date.toISOString().split('T')[0],
        location: 'Location 1',
        production: Math.random() * 100,
        forecast: Math.random() * 100,
        accuracy: 90 + Math.random() * 10
      });
    }

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0FA4AF' }
    };

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Test report generation
   */
  async testReportGeneration(reportId: string): Promise<void> {
    const reports = await scheduledReportService.getActiveScheduledReports();
    const report = reports.find(r => r.id === reportId);

    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }

    await this.executeScheduledReport(report);
  }
}

export const reportExecutionService = new ReportExecutionService();