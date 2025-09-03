import { reportRepository } from '../repositories/report.repository';

export interface ReportParameters {
  reportType: string;
  startDate: string;
  endDate: string;
  format?: string;
  locationId?: string;
  plantId?: string;
  filters?: any;
}

class ReportService {
  async generateReport(params: ReportParameters) {
    const { reportType, startDate, endDate, format, locationId, plantId, filters } = params;

    // Fetch data based on report type
    let reportData: any = {};
    
    switch (reportType) {
      case 'production-summary':
        reportData = await this.generateProductionSummary(startDate, endDate, locationId);
        break;
      case 'efficiency-analysis':
        reportData = await this.generateEfficiencyAnalysis(startDate, endDate, locationId, plantId);
        break;
      case 'forecast-accuracy':
        reportData = await this.generateForecastAccuracy(startDate, endDate, locationId);
        break;
      case 'maintenance-report':
        reportData = await this.generateMaintenanceReport(startDate, endDate, locationId, plantId);
        break;
      case 'financial-summary':
        reportData = await this.generateFinancialSummary(startDate, endDate, locationId);
        break;
      case 'compliance-report':
        reportData = await this.generateComplianceReport(startDate, endDate, locationId);
        break;
      case 'weather-impact':
        reportData = await this.generateWeatherImpactAnalysis(startDate, endDate, locationId);
        break;
      case 'location-comparison':
        reportData = await this.generateLocationComparison(startDate, endDate);
        break;
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }

    // Save report metadata
    await reportRepository.saveReportMetadata({
      reportType,
      startDate,
      endDate,
      format: format || 'json',
      locationId,
      plantId,
      generatedAt: new Date(),
      status: 'completed'
    });

    return reportData;
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
      return this.convertToExcel(reportData);
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

  private async generateProductionSummary(startDate: string, endDate: string, locationId?: string) {
    const data = await reportRepository.getProductionData(startDate, endDate, locationId);
    
    return {
      reportType: 'production-summary',
      period: { startDate, endDate },
      locationId,
      summary: {
        totalProduction: data.totalProduction || 0,
        averageDailyProduction: data.averageDailyProduction || 0,
        peakProduction: data.peakProduction || 0,
        capacityFactor: data.capacityFactor || 0,
        totalRecords: data.totalRecords || 0
      },
      details: data.details || []
    };
  }

  private async generateEfficiencyAnalysis(startDate: string, endDate: string, locationId?: string, plantId?: string) {
    const data = await reportRepository.getEfficiencyData(startDate, endDate, locationId, plantId);
    
    return {
      reportType: 'efficiency-analysis',
      period: { startDate, endDate },
      locationId,
      plantId,
      summary: {
        averageEfficiency: data.averageEfficiency || 0,
        peakEfficiency: data.peakEfficiency || 0,
        performanceRatio: data.performanceRatio || 0,
        degradationRate: data.degradationRate || 0,
        totalRecords: data.totalRecords || 0
      },
      details: data.details || []
    };
  }

  private async generateForecastAccuracy(startDate: string, endDate: string, locationId?: string) {
    const data = await reportRepository.getForecastAccuracyData(startDate, endDate, locationId);
    
    return {
      reportType: 'forecast-accuracy',
      period: { startDate, endDate },
      locationId,
      summary: {
        mape: data.mape || 0, // Mean Absolute Percentage Error
        rmse: data.rmse || 0, // Root Mean Square Error
        accuracyPercentage: data.accuracyPercentage || 0,
        totalForecasts: data.totalForecasts || 0,
        totalRecords: data.totalRecords || 0
      },
      details: data.details || []
    };
  }

  private async generateMaintenanceReport(startDate: string, endDate: string, locationId?: string, plantId?: string) {
    const data = await reportRepository.getMaintenanceData(startDate, endDate, locationId, plantId);
    
    return {
      reportType: 'maintenance-report',
      period: { startDate, endDate },
      locationId,
      plantId,
      summary: {
        totalMaintenanceEvents: data.totalMaintenanceEvents || 0,
        totalDowntime: data.totalDowntime || 0,
        averageRepairTime: data.averageRepairTime || 0,
        availability: data.availability || 0,
        totalRecords: data.totalRecords || 0
      },
      details: data.details || []
    };
  }

  private async generateFinancialSummary(startDate: string, endDate: string, locationId?: string) {
    const data = await reportRepository.getFinancialData(startDate, endDate, locationId);
    
    return {
      reportType: 'financial-summary',
      period: { startDate, endDate },
      locationId,
      summary: {
        totalRevenue: data.totalRevenue || 0,
        totalCosts: data.totalCosts || 0,
        netProfit: data.netProfit || 0,
        roi: data.roi || 0,
        paybackPeriod: data.paybackPeriod || 0,
        totalRecords: data.totalRecords || 0
      },
      details: data.details || []
    };
  }

  private async generateComplianceReport(startDate: string, endDate: string, locationId?: string) {
    const data = await reportRepository.getComplianceData(startDate, endDate, locationId);
    
    return {
      reportType: 'compliance-report',
      period: { startDate, endDate },
      locationId,
      summary: {
        complianceScore: data.complianceScore || 0,
        totalAudits: data.totalAudits || 0,
        passedAudits: data.passedAudits || 0,
        pendingIssues: data.pendingIssues || 0,
        totalRecords: data.totalRecords || 0
      },
      certifications: data.certifications || [],
      details: data.details || []
    };
  }

  private async generateWeatherImpactAnalysis(startDate: string, endDate: string, locationId?: string) {
    const data = await reportRepository.getWeatherImpactData(startDate, endDate, locationId);
    
    return {
      reportType: 'weather-impact',
      period: { startDate, endDate },
      locationId,
      summary: {
        averageIrradiance: data.averageIrradiance || 0,
        totalSunshineHours: data.totalSunshineHours || 0,
        weatherDowntime: data.weatherDowntime || 0,
        performanceImpact: data.performanceImpact || 0,
        totalRecords: data.totalRecords || 0
      },
      weatherPatterns: data.weatherPatterns || [],
      details: data.details || []
    };
  }

  private async generateLocationComparison(startDate: string, endDate: string) {
    const data = await reportRepository.getLocationComparisonData(startDate, endDate);
    
    return {
      reportType: 'location-comparison',
      period: { startDate, endDate },
      summary: {
        totalLocations: data.totalLocations || 0,
        bestPerformer: data.bestPerformer || '',
        worstPerformer: data.worstPerformer || '',
        averagePerformance: data.averagePerformance || 0,
        totalRecords: data.totalRecords || 0
      },
      locationMetrics: data.locationMetrics || [],
      rankings: data.rankings || []
    };
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

  private convertToExcel(data: any): Buffer {
    // For now, return JSON as buffer - in production use a proper Excel library
    return Buffer.from(JSON.stringify(data, null, 2));
  }

  private getReportDisplayName(reportType: string): string {
    const names: Record<string, string> = {
      'production-summary': 'Production Summary',
      'efficiency-analysis': 'Efficiency Analysis',
      'forecast-accuracy': 'Forecast Accuracy',
      'maintenance-report': 'Maintenance Report',
      'financial-summary': 'Financial Summary',
      'compliance-report': 'Compliance Report',
      'weather-impact': 'Weather Impact Analysis',
      'location-comparison': 'Location Comparison'
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