import { forecastRepository } from '../repositories/forecast.repository';

export interface ForecastParameters {
  locationId: string;
  interval: '15min' | 'hourly' | 'daily' | 'weekly';
  startDate?: string;
  endDate?: string;
}

export interface AccuracyParameters {
  locationId: string;
  startDate?: string;
  endDate?: string;
}

export interface ExportParameters extends ForecastParameters {
  format: 'csv' | 'excel' | 'pdf';
}

class ForecastService {
  async getForecast(params: ForecastParameters) {
    const { locationId, interval, startDate, endDate } = params;
    
    // Get forecast data from repository
    const rawData = await forecastRepository.getForecastData(
      locationId,
      interval,
      startDate,
      endDate
    );
    
    // Process and format data based on interval
    const processedData = this.processForecastData(rawData, interval);
    
    // Check if actual and measured data are available
    const hasActual = processedData.some(d => d.actual !== null && d.actual !== undefined);
    const hasMeasured = processedData.some(d => d.measured !== null && d.measured !== undefined);
    
    return {
      data: processedData,
      hasActual,
      hasMeasured,
      metadata: {
        locationId,
        interval,
        startDate,
        endDate,
        dataPoints: processedData.length,
        generatedAt: new Date().toISOString()
      }
    };
  }
  
  async getAccuracyMetrics(params: AccuracyParameters) {
    const { locationId, startDate, endDate } = params;
    
    // Get accuracy data from repository
    const accuracyData = await forecastRepository.getAccuracyData(
      locationId,
      startDate,
      endDate
    );
    
    // Calculate metrics
    const metrics = this.calculateAccuracyMetrics(accuracyData);
    
    return metrics;
  }
  
  async exportForecast(params: ExportParameters): Promise<Buffer> {
    const { format, ...forecastParams } = params;
    
    // Get forecast data
    const forecastData = await this.getForecast(forecastParams);
    
    // Export based on format
    switch (format) {
      case 'csv':
        return this.exportToCSV(forecastData);
      case 'excel':
        return this.exportToExcel(forecastData);
      case 'pdf':
        return this.exportToPDF(forecastData);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }
  
  private processForecastData(rawData: any[], interval: string) {
    // Process raw data based on interval type
    return rawData.map(point => {
      const processed: any = {
        timestamp: point.timestamp,
        forecast: point.forecast,
        confidence_upper: point.forecast * 1.1, // 10% upper bound
        confidence_lower: point.forecast * 0.9  // 10% lower bound
      };
      
      if (point.actual !== undefined) {
        processed.actual = point.actual;
      }
      
      if (point.measured !== undefined) {
        processed.measured = point.measured;
      }
      
      return processed;
    });
  }
  
  private calculateAccuracyMetrics(data: any) {
    if (!data || data.length === 0) {
      return {
        accuracy: 0,
        mape: 0,
        rmse: 0,
        mae: 0
      };
    }
    
    let sumAPE = 0;
    let sumSquaredError = 0;
    let sumAbsoluteError = 0;
    let validPoints = 0;
    
    data.forEach((point: any) => {
      if (point.actual && point.forecast) {
        const error = point.actual - point.forecast;
        const ape = Math.abs(error / point.actual) * 100;
        
        sumAPE += ape;
        sumSquaredError += error * error;
        sumAbsoluteError += Math.abs(error);
        validPoints++;
      }
    });
    
    if (validPoints === 0) {
      return {
        accuracy: 100,
        mape: 0,
        rmse: 0,
        mae: 0
      };
    }
    
    const mape = sumAPE / validPoints;
    const rmse = Math.sqrt(sumSquaredError / validPoints);
    const mae = sumAbsoluteError / validPoints;
    const accuracy = 100 - mape; // Simple accuracy calculation
    
    return {
      accuracy: Math.max(0, Math.min(100, accuracy)),
      mape,
      rmse,
      mae
    };
  }
  
  private exportToCSV(data: any): Buffer {
    const rows: string[] = [];
    
    // Header
    rows.push('Timestamp,Forecast,Upper Bound,Lower Bound,Actual');
    
    // Data rows
    data.data.forEach((point: any) => {
      rows.push([
        point.timestamp,
        point.forecast,
        point.confidence_upper,
        point.confidence_lower,
        point.actual || ''
      ].join(','));
    });
    
    return Buffer.from(rows.join('\n'));
  }
  
  private exportToExcel(data: any): Buffer {
    // For now, return JSON as buffer
    // In production, use a library like exceljs
    return Buffer.from(JSON.stringify(data, null, 2));
  }
  
  private exportToPDF(data: any): Buffer {
    // For now, return JSON as buffer
    // In production, use a library like pdfkit
    return Buffer.from(JSON.stringify(data, null, 2));
  }
}

export const forecastService = new ForecastService();