import type { HistoricalRepository } from '../repositories/historical.repository';
import type { 
  HistoricalDataRequest, 
  HistoricalDataResponse,
  HistoricalStatistics,
  ExportConfig,
  LocationComparison,
  HistoricalDataPoint
} from '$lib/types/historical';
import { 
  AggregationType, 
  DataQualityFilter, 
  ExportFormat,
  validateDateRange, 
  aggregationTypeToMinutes 
} from '$lib/types/historical';

// Configuration for Python microservice
const PYTHON_WORKER_URL = process.env.PYTHON_WORKER_URL || 'http://localhost:8001';

// Service - contains business logic for historical data analysis
export class HistoricalService {
  constructor(private repository: HistoricalRepository) {}

  // Main method to get historical data with business logic
  async getHistoricalData(request: HistoricalDataRequest): Promise<HistoricalDataResponse> {
    try {
      // Validate request parameters
      this.validateRequest(request);

      // Apply business rules and optimizations
      const optimizedRequest = await this.optimizeRequest(request);

      // Get data from repository
      const { data, metadata } = await this.repository.getHistoricalData(optimizedRequest);

      // Apply post-processing filters and transformations
      const processedData = await this.postProcessData(data, optimizedRequest);

      // Calculate statistics if requested
      let statistics: HistoricalStatistics | undefined;
      if (optimizedRequest.includeMetadata) {
        statistics = await this.repository.calculateStatistics(optimizedRequest, processedData);
      }

      // Apply data quality filters
      const filteredData = this.applyDataQualityFilters(processedData, optimizedRequest.dataQualityFilter);

      return {
        success: true,
        data: filteredData,
        metadata,
        statistics
      };

    } catch (error) {
      console.error('Historical data service error:', error);
      return {
        success: false,
        data: [],
        metadata: {
          request: {
            locationIds: request.locationIds || [],
            startDate: request.startDate,
            endDate: request.endDate,
            aggregation: request.aggregation,
            timezone: request.timezone || 'UTC'
          },
          response: {
            totalRecords: 0,
            locations: [],
            dateRange: {
              start: request.startDate,
              end: request.endDate,
              dayCount: 0
            },
            processing: {
              queryTimeMs: 0,
              generatedAt: new Date().toISOString()
            }
          }
        },
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Get historical statistics with advanced analytics
  async getHistoricalStatistics(request: HistoricalDataRequest): Promise<HistoricalStatistics> {
    this.validateRequest(request);
    
    const { data } = await this.repository.getHistoricalData(request);
    
    if (data.length === 0) {
      throw new Error('No data available for the requested period and locations');
    }

    const statistics = await this.repository.calculateStatistics(request, data);
    
    // Enhance with Python worker analytics if available
    try {
      const enhancedStats = await this.enhanceWithMLInsights(statistics, request);
      return enhancedStats || statistics;
    } catch (error) {
      console.warn('Failed to enhance statistics with ML insights:', error);
      return statistics;
    }
  }

  // Export historical data in various formats
  async exportHistoricalData(
    request: HistoricalDataRequest,
    exportConfig: ExportConfig
  ): Promise<{
    success: boolean;
    data?: any;
    filename?: string;
    contentType?: string;
    error?: string;
  }> {
    try {
      this.validateRequest(request);
      this.validateExportConfig(exportConfig);

      // Get data optimized for export
      const exportData = await this.repository.getDataForExport(request, exportConfig.format);
      
      // Apply export-specific processing
      const processedExportData = await this.processDataForExport(exportData, exportConfig);

      // Generate filename
      const filename = this.generateFilename(request, exportConfig);
      
      // Get content type
      const contentType = this.getContentType(exportConfig.format);

      return {
        success: true,
        data: processedExportData,
        filename,
        contentType
      };

    } catch (error) {
      console.error('Export service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  // Compare multiple locations
  async compareLocations(
    locationIds: number[],
    startDate: string,
    endDate: string,
    aggregationType: AggregationType = AggregationType.DAILY
  ): Promise<LocationComparison> {
    if (locationIds.length < 2) {
      throw new Error('At least 2 locations are required for comparison');
    }

    if (locationIds.length > 20) {
      throw new Error('Maximum 20 locations allowed for comparison');
    }

    this.validateDateRange(startDate, endDate);

    return await this.repository.getLocationComparison(
      locationIds,
      new Date(startDate),
      new Date(endDate),
      aggregationType
    );
  }

  // Get data quality report
  async getDataQualityReport(request: HistoricalDataRequest): Promise<{
    overallScore: number;
    locationReports: Array<{
      locationId: number;
      locationName: string;
      qualityScore: number;
      issues: string[];
      recommendations: string[];
    }>;
    periodAnalysis: {
      totalDays: number;
      goodDataDays: number;
      issuesDays: number;
      gapsDetected: Array<{
        start: string;
        end: string;
        type: string;
      }>;
    };
  }> {
    this.validateRequest(request);

    // Get basic data for quality analysis
    const { data, metadata } = await this.repository.getHistoricalData({
      ...request,
      includeMetadata: true
    });

    // Analyze data quality
    const qualityAnalysis = this.analyzeDataQuality(data, metadata);
    
    // Generate recommendations
    const recommendations = this.generateQualityRecommendations(qualityAnalysis);

    return {
      overallScore: qualityAnalysis.overallScore,
      locationReports: qualityAnalysis.locationReports.map(report => ({
        ...report,
        recommendations: recommendations.filter(rec => rec.locationId === report.locationId || rec.locationId === null)
          .map(rec => rec.recommendation)
      })),
      periodAnalysis: qualityAnalysis.periodAnalysis
    };
  }

  // Business logic validation
  private validateRequest(request: HistoricalDataRequest): void {
    // Validate date range
    if (!validateDateRange(request.startDate, request.endDate)) {
      throw new Error('Invalid date range. Start date must be before end date and within 5-year limit.');
    }

    // Validate locations
    const locationIds = request.locationIds || (request.locationId ? [request.locationId] : []);
    if (locationIds.length === 0) {
      throw new Error('At least one location ID must be provided');
    }

    if (locationIds.length > 100) {
      throw new Error('Maximum 100 locations allowed per request');
    }

    // Validate aggregation vs date range
    const daysDiff = (new Date(request.endDate).getTime() - new Date(request.startDate).getTime()) / (1000 * 60 * 60 * 24);
    
    if (request.aggregation === AggregationType.RAW && daysDiff > 30) {
      throw new Error('Raw data requests are limited to 30 days maximum');
    }

    if (request.aggregation === AggregationType.FIFTEEN_MINUTES && daysDiff > 90) {
      throw new Error('15-minute aggregation is limited to 90 days maximum');
    }

    // Validate capacity factor range
    if (request.minCapacityFactor !== undefined && (request.minCapacityFactor < 0 || request.minCapacityFactor > 2)) {
      throw new Error('Minimum capacity factor must be between 0 and 2');
    }

    if (request.maxCapacityFactor !== undefined && (request.maxCapacityFactor < 0 || request.maxCapacityFactor > 2)) {
      throw new Error('Maximum capacity factor must be between 0 and 2');
    }

    if (request.minCapacityFactor !== undefined && request.maxCapacityFactor !== undefined && 
        request.minCapacityFactor >= request.maxCapacityFactor) {
      throw new Error('Minimum capacity factor must be less than maximum capacity factor');
    }
  }

  private validateExportConfig(exportConfig: ExportConfig): void {
    if (!Object.values(ExportFormat).includes(exportConfig.format)) {
      throw new Error(`Unsupported export format: ${exportConfig.format}`);
    }

    if (exportConfig.customColumns && exportConfig.customColumns.length === 0) {
      throw new Error('Custom columns array cannot be empty if provided');
    }

    if (exportConfig.filename && !/^[a-zA-Z0-9_\-\.]+$/.test(exportConfig.filename)) {
      throw new Error('Filename contains invalid characters');
    }
  }

  private validateDateRange(startDate: string, endDate: string): void {
    if (!validateDateRange(startDate, endDate)) {
      throw new Error('Invalid date range');
    }
  }

  // Request optimization based on business rules
  private async optimizeRequest(request: HistoricalDataRequest): Promise<HistoricalDataRequest> {
    const optimized = { ...request };

    // Auto-select optimal aggregation based on date range
    if (!request.aggregation) {
      const daysDiff = (new Date(request.endDate).getTime() - new Date(request.startDate).getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff <= 7) {
        optimized.aggregation = AggregationType.FIFTEEN_MINUTES;
      } else if (daysDiff <= 30) {
        optimized.aggregation = AggregationType.HOURLY;
      } else if (daysDiff <= 365) {
        optimized.aggregation = AggregationType.DAILY;
      } else {
        optimized.aggregation = AggregationType.WEEKLY;
      }
    }

    // Default timezone to UTC if not specified
    if (!optimized.timezone) {
      optimized.timezone = 'UTC';
    }

    // Enable weather data by default for energy analysis
    if (optimized.includeWeather === undefined) {
      optimized.includeWeather = true;
    }

    // Enable forecast data for accuracy analysis if the period is recent
    if (optimized.includeForecast === undefined) {
      const endDate = new Date(request.endDate);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      optimized.includeForecast = endDate >= thirtyDaysAgo;
    }

    // Default data quality filter to exclude poor quality data
    if (!optimized.dataQualityFilter) {
      optimized.dataQualityFilter = [DataQualityFilter.EXCLUDE_POOR];
    }

    return optimized;
  }

  // Post-processing filters and transformations
  private async postProcessData(
    data: HistoricalDataPoint[], 
    request: HistoricalDataRequest
  ): Promise<HistoricalDataPoint[]> {
    let processedData = [...data];

    // Apply capacity factor filters
    if (request.minCapacityFactor !== undefined || request.maxCapacityFactor !== undefined) {
      processedData = processedData.filter(point => {
        const cf = point.production?.capacityFactor || 0;
        const min = request.minCapacityFactor || 0;
        const max = request.maxCapacityFactor || 2;
        return cf >= min && cf <= max;
      });
    }

    // Apply outlier detection and removal (business rule: remove points > 3 standard deviations)
    if (request.aggregation !== AggregationType.RAW) {
      processedData = this.removeOutliers(processedData);
    }

    // Fill gaps for visualization (business rule: interpolate small gaps)
    if (processedData.length > 0 && request.aggregation !== AggregationType.RAW) {
      processedData = this.fillDataGaps(processedData, request.aggregation);
    }

    // Sort by timestamp and location for consistent output
    processedData.sort((a, b) => {
      const timeDiff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      if (timeDiff !== 0) return timeDiff;
      return a.locationId - b.locationId;
    });

    return processedData;
  }

  // Apply data quality filters
  private applyDataQualityFilters(
    data: HistoricalDataPoint[], 
    filters?: DataQualityFilter[]
  ): HistoricalDataPoint[] {
    if (!filters || filters.length === 0) {
      return data;
    }

    if (filters.includes(DataQualityFilter.INCLUDE_ALL)) {
      return data;
    }

    if (filters.includes(DataQualityFilter.GOOD_ONLY)) {
      return data.filter(point => 
        point.dataQuality.overall === 'excellent' || 
        point.dataQuality.overall === 'good'
      );
    }

    if (filters.includes(DataQualityFilter.EXCLUDE_POOR)) {
      return data.filter(point => 
        point.dataQuality.overall !== 'poor' && 
        point.dataQuality.overall !== 'unreliable'
      );
    }

    return data;
  }

  // Remove statistical outliers
  private removeOutliers(data: HistoricalDataPoint[]): HistoricalDataPoint[] {
    if (data.length < 10) return data; // Need sufficient data points

    // Calculate mean and standard deviation for power output
    const powers = data.map(d => d.production?.powerMW || 0).filter(p => p > 0);
    if (powers.length === 0) return data;

    const mean = powers.reduce((sum, p) => sum + p, 0) / powers.length;
    const variance = powers.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / powers.length;
    const stdDev = Math.sqrt(variance);

    const threshold = 3; // 3 standard deviations
    const lowerBound = mean - (threshold * stdDev);
    const upperBound = mean + (threshold * stdDev);

    return data.filter(point => {
      const power = point.production?.powerMW || 0;
      return power === 0 || (power >= lowerBound && power <= upperBound);
    });
  }

  // Fill data gaps with interpolation
  private fillDataGaps(data: HistoricalDataPoint[], aggregationType: AggregationType): HistoricalDataPoint[] {
    if (data.length < 2) return data;

    const intervalMinutes = aggregationTypeToMinutes(aggregationType);
    const intervalMs = intervalMinutes * 60 * 1000;
    const maxGapFill = 3; // Maximum gaps to fill

    const filled: HistoricalDataPoint[] = [];
    
    for (let i = 0; i < data.length - 1; i++) {
      filled.push(data[i]);

      const currentTime = new Date(data[i].timestamp).getTime();
      const nextTime = new Date(data[i + 1].timestamp).getTime();
      const timeDiff = nextTime - currentTime;
      const expectedInterval = intervalMs;

      // If there's a gap that's not too large, fill it
      if (timeDiff > expectedInterval && timeDiff <= (maxGapFill * expectedInterval)) {
        const gapCount = Math.floor(timeDiff / expectedInterval) - 1;
        
        for (let j = 1; j <= gapCount; j++) {
          const gapTime = new Date(currentTime + (j * expectedInterval));
          const interpolatedPoint = this.interpolateDataPoint(data[i], data[i + 1], j / (gapCount + 1));
          interpolatedPoint.timestamp = gapTime.toISOString();
          filled.push(interpolatedPoint);
        }
      }
    }

    filled.push(data[data.length - 1]);
    return filled;
  }

  // Linear interpolation between two data points
  private interpolateDataPoint(
    point1: HistoricalDataPoint, 
    point2: HistoricalDataPoint, 
    ratio: number
  ): HistoricalDataPoint {
    const interpolated: HistoricalDataPoint = {
      timestamp: '', // Will be set by caller
      locationId: point1.locationId,
      locationName: point1.locationName,
      dataQuality: {
        overall: 'estimated' as any,
        production: 'estimated' as any
      }
    };

    // Interpolate production data
    if (point1.production && point2.production) {
      interpolated.production = {
        powerMW: this.lerp(point1.production.powerMW, point2.production.powerMW, ratio),
        energyMWh: this.lerp(point1.production.energyMWh || 0, point2.production.energyMWh || 0, ratio),
        capacityFactor: this.lerp(point1.production.capacityFactor || 0, point2.production.capacityFactor || 0, ratio),
        performanceRatio: this.lerp(point1.production.performanceRatio || 0, point2.production.performanceRatio || 0, ratio),
        efficiency: this.lerp(point1.production.efficiency || 0, point2.production.efficiency || 0, ratio),
        availability: this.lerp(point1.production.availability || 0, point2.production.availability || 0, ratio)
      };
    }

    // Interpolate weather data
    if (point1.weather && point2.weather) {
      interpolated.weather = {
        ghi: this.lerp(point1.weather.ghi || 0, point2.weather.ghi || 0, ratio),
        dni: this.lerp(point1.weather.dni || 0, point2.weather.dni || 0, ratio),
        dhi: this.lerp(point1.weather.dhi || 0, point2.weather.dhi || 0, ratio),
        gti: this.lerp(point1.weather.gti || 0, point2.weather.gti || 0, ratio),
        temperature: this.lerp(point1.weather.temperature || 0, point2.weather.temperature || 0, ratio),
        windSpeed: this.lerp(point1.weather.windSpeed || 0, point2.weather.windSpeed || 0, ratio),
        humidity: this.lerp(point1.weather.humidity || 0, point2.weather.humidity || 0, ratio),
        cloudCover: this.lerp(point1.weather.cloudCover || 0, point2.weather.cloudCover || 0, ratio)
      };
      interpolated.dataQuality.weather = 'estimated' as any;
    }

    return interpolated;
  }

  // Linear interpolation helper
  private lerp(a: number, b: number, ratio: number): number {
    return a + (b - a) * ratio;
  }

  // Python worker integration for ML insights
  private async enhanceWithMLInsights(
    statistics: HistoricalStatistics,
    request: HistoricalDataRequest
  ): Promise<HistoricalStatistics | null> {
    try {
      const response = await fetch(`${PYTHON_WORKER_URL}/analytics/historical/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statistics,
          request_params: {
            location_ids: request.locationIds,
            start_date: request.startDate,
            end_date: request.endDate,
            aggregation: request.aggregation
          }
        }),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      if (!response.ok) {
        throw new Error(`Python worker responded with ${response.status}`);
      }

      const enhancedStats = await response.json();
      return enhancedStats.success ? enhancedStats.data : null;

    } catch (error) {
      console.warn('Python worker enhancement failed:', error);
      return null;
    }
  }

  // Data processing for export
  private async processDataForExport(
    data: any[],
    exportConfig: ExportConfig
  ): Promise<any> {
    let processedData = data;

    // Apply column filtering
    if (exportConfig.customColumns && exportConfig.customColumns.length > 0) {
      processedData = data.map(row => {
        const filteredRow: any = {};
        exportConfig.customColumns!.forEach(col => {
          if (col in row) {
            filteredRow[col] = row[col];
          }
        });
        return filteredRow;
      });
    }

    // Format based on export type
    switch (exportConfig.format) {
      case ExportFormat.CSV:
        return this.formatForCSVExport(processedData);
      
      case ExportFormat.EXCEL:
        return this.formatForExcelExport(processedData, exportConfig);
      
      case ExportFormat.JSON:
        return JSON.stringify(processedData, null, 2);
      
      case ExportFormat.PDF:
        return this.formatForPDFExport(processedData, exportConfig);
      
      default:
        return processedData;
    }
  }

  // Export formatting methods
  private formatForCSVExport(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return String(value);
      });
      csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
  }

  private formatForExcelExport(data: any[], config: ExportConfig): any {
    // Would integrate with a library like ExcelJS
    return {
      sheets: [{
        name: 'Historical Data',
        data: data
      }],
      includeCharts: config.includeCharts || false
    };
  }

  private formatForPDFExport(data: any[], config: ExportConfig): any {
    // Would integrate with a library like jsPDF
    return {
      title: 'Historical Data Report',
      data: data,
      includeCharts: config.includeCharts || false
    };
  }

  // Utility methods
  private generateFilename(request: HistoricalDataRequest, config: ExportConfig): string {
    if (config.filename) {
      return config.filename;
    }

    const startDate = new Date(request.startDate).toISOString().split('T')[0];
    const endDate = new Date(request.endDate).toISOString().split('T')[0];
    const locationCount = (request.locationIds?.length || 1);
    const extension = this.getFileExtension(config.format);

    return `historical_data_${startDate}_${endDate}_${locationCount}locations.${extension}`;
  }

  private getContentType(format: ExportFormat): string {
    switch (format) {
      case ExportFormat.CSV:
        return 'text/csv';
      case ExportFormat.EXCEL:
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case ExportFormat.JSON:
        return 'application/json';
      case ExportFormat.PDF:
        return 'application/pdf';
      default:
        return 'application/octet-stream';
    }
  }

  private getFileExtension(format: ExportFormat): string {
    switch (format) {
      case ExportFormat.CSV: return 'csv';
      case ExportFormat.EXCEL: return 'xlsx';
      case ExportFormat.JSON: return 'json';
      case ExportFormat.PDF: return 'pdf';
      default: return 'txt';
    }
  }

  // Data quality analysis
  private analyzeDataQuality(data: HistoricalDataPoint[], metadata: any): any {
    const locationGroups = new Map<number, HistoricalDataPoint[]>();
    
    // Group data by location
    data.forEach(point => {
      if (!locationGroups.has(point.locationId)) {
        locationGroups.set(point.locationId, []);
      }
      locationGroups.get(point.locationId)!.push(point);
    });

    const locationReports = Array.from(locationGroups.entries()).map(([locationId, points]) => {
      const goodPoints = points.filter(p => 
        p.dataQuality.overall === 'excellent' || p.dataQuality.overall === 'good'
      ).length;
      
      const qualityScore = points.length > 0 ? (goodPoints / points.length) * 100 : 0;
      const locationMeta = metadata.response.locations.find((l: any) => l.id === locationId);
      
      const issues: string[] = [];
      if (qualityScore < 80) issues.push('Low data quality detected');
      if (points.length < metadata.response.dateRange.dayCount * 24) issues.push('Missing data points');

      return {
        locationId,
        locationName: locationMeta?.name || `Location ${locationId}`,
        qualityScore,
        issues
      };
    });

    const overallScore = locationReports.length > 0 
      ? locationReports.reduce((sum, report) => sum + report.qualityScore, 0) / locationReports.length
      : 0;

    return {
      overallScore,
      locationReports,
      periodAnalysis: {
        totalDays: metadata.response.dateRange.dayCount,
        goodDataDays: Math.floor(metadata.response.dateRange.dayCount * (overallScore / 100)),
        issuesDays: Math.ceil(metadata.response.dateRange.dayCount * ((100 - overallScore) / 100)),
        gapsDetected: [] // Would implement gap detection
      }
    };
  }

  private generateQualityRecommendations(analysis: any): Array<{locationId: number | null, recommendation: string}> {
    const recommendations: Array<{locationId: number | null, recommendation: string}> = [];

    if (analysis.overallScore < 70) {
      recommendations.push({
        locationId: null,
        recommendation: 'Consider implementing data validation and cleansing procedures'
      });
    }

    analysis.locationReports.forEach((report: any) => {
      if (report.qualityScore < 80) {
        recommendations.push({
          locationId: report.locationId,
          recommendation: 'Review data collection sensors and transmission systems'
        });
      }
    });

    return recommendations;
  }
}