import { reportRepository } from '../repositories/report.repository';
import ExcelJS from 'exceljs';

export interface ReportParameters {
  reportType: 'forecast_d1_plus_5';
  startDate: string;
  endDate: string;
  locationIds: string[];
  dataAggregation: '15min' | '1hour' | '1week' | '1month';
  timezone: string; // UTC-2 to UTC+4
  format?: string;
}

class ReportService {
  async generateReport(params: ReportParameters) {
    const { reportType, startDate, endDate, locationIds, dataAggregation, timezone, format } = params;

    // Generate forecast D+1 to D+5 report
    if (reportType === 'forecast_d1_plus_5') {
      const reportData = await this.generateForecastD1Plus5(
        startDate,
        endDate,
        locationIds,
        dataAggregation,
        timezone
      );

      // Save report metadata
      await reportRepository.saveReportMetadata({
        reportType,
        startDate,
        endDate,
        format: format || 'excel',
        locationId: locationIds[0], // Use first location for compatibility
        plantId: undefined,
        generatedAt: new Date(),
        status: 'completed'
      });

      return reportData;
    }

    throw new Error(`Unknown report type: ${reportType}`);
  }

  async generatePDFReport(params: ReportParameters): Promise<Buffer> {
    const reportData = await this.generateReport(params);
    
    // For now, return a mock PDF buffer
    // In production, you would use a PDF generation library
    const pdfContent = Buffer.from(JSON.stringify(reportData, null, 2));
    return pdfContent;
  }

  async exportReport(params: {
    reportType: string;
    startDate: string;
    endDate: string;
    format: string;
  }): Promise<Buffer> {
    const reportData = await this.generateReport({
      ...params,
      format: params.format
    });

    if (params.format === 'csv') {
      return this.convertToCSV(reportData);
    } else if (params.format === 'excel') {
      return await this.convertToExcel(reportData);
    } else {
      return this.generatePDFReport(params);
    }
  }

  async getRecentReports(limit: number = 10) {
    const reports = await reportRepository.getRecentReports(limit);
    
    return reports.map(report => ({
      id: report.id,
      name: this.getReportDisplayName(report.reportType),
      reportType: report.reportType,
      displayDate: new Date(report.generatedAt).toLocaleDateString(),
      status: report.status,
      displayFileSize: this.formatFileSize(report.fileSize || 0),
      format: report.format,
      period: {
        startDate: report.startDate,
        endDate: report.endDate
      }
    }));
  }

  private async generateForecastD1Plus5(
    startDate: string,
    endDate: string,
    locationIds: string[],
    dataAggregation: '15min' | '1hour' | '1week' | '1month',
    timezone: string
  ) {
    // Mock data generation following the Maghebo Solar FC structure
    const location = await this.getMockLocationData(locationIds[0]);

    return {
      reportType: 'forecast_d1_plus_5',
      generatedAt: new Date().toISOString(),
      summary: {
        reportTitle: `${location.name} Solar Forecast Report`,
        generatedAt: new Date().toLocaleString('en-US', { timeZone: this.mapTimezoneToStandard(timezone) }),
        locationInfo: {
          plantName: location.name,
          capacity: location.capacity,
          location: {
            latitude: location.coordinates.latitude,
            longitude: location.coordinates.longitude
          },
          timezone: timezone
        },
        period: { startDate, endDate },
        dataAggregation,
        locationIds
      },
      hourlyForecast: this.generateMockHourlyForecast(startDate, endDate, dataAggregation, timezone),
      detailedForecast: this.generateMockDetailedForecast(startDate, endDate, dataAggregation, timezone)
    };
  }

  private async getMockLocationData(locationId: string) {
    // Mock location data - replace with real data in next phase
    return {
      id: locationId,
      name: 'SC Maghebo SRL',
      capacity: '870 kW (0.87 MW)',
      coordinates: {
        latitude: 47.5291042,
        longitude: 25.5794844
      }
    };
  }

  private generateMockHourlyForecast(startDate: string, endDate: string, aggregation: string, timezone: string) {
    const data = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Generate hourly intervals (similar to "Hourly Forecast" sheet)
    let current = new Date(start);
    let interval = 1;

    while (current <= end) {
      const hour = current.getHours();
      const powerMw = hour >= 6 && hour <= 18 ? Math.random() * 0.87 : 0; // Solar production during daylight

      data.push({
        timestamp: current.toISOString(),
        year: current.getFullYear(),
        month: current.getMonth() + 1,
        day: current.getDate(),
        hourStart: hour,
        hourEnd: (hour + 1) % 24,
        dayEnd: hour === 23 ? current.getDate() + 1 : current.getDate(),
        interval: interval++,
        powerMw: Number(powerMw.toFixed(3)),
        energyMwh: Number((powerMw * 1).toFixed(3)), // 1 hour * powerMw
        q10: Number((powerMw * 0.8).toFixed(3)),
        q25: Number((powerMw * 0.9).toFixed(3)),
        q50: Number(powerMw.toFixed(3)),
        q75: Number((powerMw * 1.1).toFixed(3)),
        q90: Number((powerMw * 1.2).toFixed(3))
      });

      current.setHours(current.getHours() + 1);
    }

    return data;
  }

  private generateMockDetailedForecast(startDate: string, endDate: string, aggregation: string, timezone: string) {
    const data = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Generate 15-minute intervals (similar to "15 Minutes" sheet)
    let current = new Date(start);

    while (current <= end) {
      const hour = current.getHours();
      const productionMw = hour >= 6 && hour <= 18 ? Math.random() * 0.87 : 0;

      data.push({
        timestamp: current.toISOString(),
        productionMw: Number(productionMw.toFixed(3)),
        energyMwh: Number((productionMw * 0.25).toFixed(3)), // 15 min = 0.25 hour
        q10: Number((productionMw * 0.8).toFixed(3)),
        q25: Number((productionMw * 0.9).toFixed(3)),
        q50: Number(productionMw.toFixed(3)),
        q75: Number((productionMw * 1.1).toFixed(3)),
        q90: Number((productionMw * 1.2).toFixed(3))
      });

      current.setMinutes(current.getMinutes() + 15);
    }

    return data;
  }

  private mapTimezoneToStandard(timezone: string): string {
    // Map timezone offset to standard timezone names
    const timezoneMap: Record<string, string> = {
      'UTC-2': 'Atlantic/Azores',
      'UTC-1': 'Atlantic/Cape_Verde',
      'UTC+0': 'UTC',
      'UTC+1': 'Europe/London',
      'UTC+2': 'Europe/Berlin',
      'UTC+3': 'Europe/Moscow',
      'UTC+4': 'Asia/Dubai'
    };
    return timezoneMap[timezone] || 'UTC';
  }

  private convertToCSV(data: any): Buffer {
    // Simple CSV conversion - in production use a proper CSV library
    const rows: string[] = [];
    
    if (data.summary) {
      rows.push('Summary');
      rows.push(Object.keys(data.summary).join(','));
      rows.push(Object.values(data.summary).join(','));
      rows.push('');
    }
    
    if (data.details && data.details.length > 0) {
      rows.push('Details');
      rows.push(Object.keys(data.details[0]).join(','));
      data.details.forEach((row: any) => {
        rows.push(Object.values(row).join(','));
      });
    }
    
    return Buffer.from(rows.join('\n'));
  }

  private async convertToExcel(data: any): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    // Set workbook properties
    workbook.creator = 'Solar Forecast Platform';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Create Summary sheet (matching original structure)
    const summarySheet = workbook.addWorksheet('Summary', {
      properties: { tabColor: { argb: '0FA4AF' } }
    });

    // Add summary content
    summarySheet.addRow([data.summary.reportTitle, '']);
    summarySheet.addRow(['', '']);
    summarySheet.addRow([`Generated: ${data.summary.generatedAt}`, '']);
    summarySheet.addRow(['', '']);
    summarySheet.addRow(['Location Information', '']);
    summarySheet.addRow(['Plant Name:', data.summary.locationInfo.plantName]);
    summarySheet.addRow(['Plant Capacity:', data.summary.locationInfo.capacity]);
    summarySheet.addRow(['Latitude:', data.summary.locationInfo.location.latitude]);
    summarySheet.addRow(['Longitude:', data.summary.locationInfo.location.longitude]);
    summarySheet.addRow(['Timezone:', data.summary.locationInfo.timezone]);
    summarySheet.addRow(['', '']);
    summarySheet.addRow(['Forecast Period:', `${data.summary.period.startDate} to ${data.summary.period.endDate}`]);
    summarySheet.addRow(['Data Aggregation:', data.summary.dataAggregation]);
    summarySheet.addRow(['Location Count:', data.summary.locationIds.length]);

    // Style the summary sheet
    summarySheet.getRow(1).font = { bold: true, size: 16 };
    summarySheet.getRow(3).font = { italic: true };
    summarySheet.getRow(5).font = { bold: true, size: 12 };

    summarySheet.getColumn(1).width = 25;
    summarySheet.getColumn(2).width = 30;

    // Create Hourly Forecast sheet
    if (data.hourlyForecast && data.hourlyForecast.length > 0) {
      const hourlySheet = workbook.addWorksheet('Hourly Forecast', {
        properties: { tabColor: { argb: '0FA4AF' } }
      });

      // Add headers
      const hourlyHeaders = [
        'timestamp', 'YEAR', 'MONTH', 'DAY', 'HOUR_START', 'HOUR_END',
        'DAY_END', 'interval', 'power_mw', 'energy_mwh',
        'q10', 'q25', 'q50', 'q75', 'q90'
      ];

      const headerRow = hourlySheet.addRow(hourlyHeaders);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE5F7F9' }
      };

      // Add data rows
      data.hourlyForecast.forEach((row: any) => {
        hourlySheet.addRow([
          row.timestamp, row.year, row.month, row.day, row.hourStart,
          row.hourEnd, row.dayEnd, row.interval, row.powerMw, row.energyMwh,
          row.q10, row.q25, row.q50, row.q75, row.q90
        ]);
      });

      // Auto-fit columns
      hourlySheet.columns.forEach((column) => {
        let maxLength = 12;
        column.eachCell({ includeEmpty: true }, cell => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(maxLength + 2, 20);
      });
    }

    // Create 15 Minutes sheet (based on dataAggregation)
    if (data.detailedForecast && data.detailedForecast.length > 0) {
      const detailedSheet = workbook.addWorksheet('15 Minutes', {
        properties: { tabColor: { argb: '0FA4AF' } }
      });

      // Add headers
      const detailedHeaders = [
        'timestamp', 'production_mw', 'energy_mwh',
        'q10', 'q25', 'q50', 'q75', 'q90'
      ];

      const headerRow = detailedSheet.addRow(detailedHeaders);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE5F7F9' }
      };

      // Add data rows
      data.detailedForecast.forEach((row: any) => {
        detailedSheet.addRow([
          row.timestamp, row.productionMw, row.energyMwh,
          row.q10, row.q25, row.q50, row.q75, row.q90
        ]);
      });

      // Auto-fit columns
      detailedSheet.columns.forEach((column) => {
        let maxLength = 12;
        column.eachCell({ includeEmpty: true }, cell => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(maxLength + 2, 20);
      });
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private getReportDisplayName(reportType: string): string {
    const names: Record<string, string> = {
      'forecast_d1_plus_5': 'Solar Forecast D+1 to D+5'
    };
    return names[reportType] || reportType;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

export const reportService = new ReportService();