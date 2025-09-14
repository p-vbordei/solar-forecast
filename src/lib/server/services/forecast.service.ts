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

  async generateForecast(params: {
    locationId: string;
    horizonHours: number;
    modelType: string;
    resolution?: string;
    includeWeather?: boolean;
  }) {
    // Prepare for Python worker integration
    try {
      // TODO: Replace with actual Python worker API call
      // const pythonWorkerResponse = await fetch('http://localhost:8001/api/forecasts/generate', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(params)
      // });

      // For now, generate enhanced mock forecast
      const mockForecastData = await this.generateEnhancedMockForecast(params);

      // Store forecast in database using repository bulk insert
      await forecastRepository.bulkInsertForecasts(mockForecastData);

      return {
        success: true,
        forecastId: `forecast_${Date.now()}`,
        data: mockForecastData,
        metadata: {
          generatedAt: new Date().toISOString(),
          modelType: params.modelType,
          horizonHours: params.horizonHours,
          dataPoints: mockForecastData.length
        }
      };
    } catch (error) {
      console.error('Forecast generation failed:', error);
      throw new Error(`Failed to generate forecast: ${error.message}`);
    }
  }

  private async generateEnhancedMockForecast(params: {
    locationId: string;
    horizonHours: number;
    modelType: string;
    resolution?: string;
  }) {
    const { locationId, horizonHours, modelType, resolution = 'hourly' } = params;
    const forecasts = [];

    // Calculate time step based on resolution
    const timeStepMs = resolution === '15min' ? 15 * 60 * 1000 : 60 * 60 * 1000;
    const steps = resolution === '15min' ? horizonHours * 4 : horizonHours;

    const startTime = new Date();

    for (let i = 0; i < steps; i++) {
      const timestamp = new Date(startTime.getTime() + i * timeStepMs);
      const hour = timestamp.getHours();

      // Enhanced solar pattern based on model type
      let baseForecast = 0;
      let confidence = 0.85;

      if (hour >= 6 && hour <= 18) {
        const peakHour = 12;
        const hourDiff = Math.abs(hour - peakHour);
        const maxPower = modelType === 'lstm' ? 52 :
                        modelType === 'xgboost' ? 48 : 45;

        baseForecast = maxPower * Math.exp(-(hourDiff * hourDiff) / 20);

        // Model-specific confidence patterns
        confidence = modelType === 'lstm' ? 0.90 + Math.random() * 0.08 :
                    modelType === 'xgboost' ? 0.88 + Math.random() * 0.10 :
                    0.85 + Math.random() * 0.12;

        // Add weather-based variation
        baseForecast += (Math.random() - 0.5) * 8;
        baseForecast = Math.max(0, baseForecast);
      }

      forecasts.push({
        locationId: parseInt(locationId),
        timestamp,
        powerForecastMw: parseFloat(baseForecast.toFixed(2)),
        confidenceScore: parseFloat(confidence.toFixed(3)),
        modelType,
        horizonHours: horizonHours
      });
    }

    return forecasts;
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
        mae: 0,
        r2: 0,
        nrmse: 0,
        validPoints: 0
      };
    }

    let sumAPE = 0;
    let sumSquaredError = 0;
    let sumAbsoluteError = 0;
    let sumActual = 0;
    let sumForecast = 0;
    let sumActualSquared = 0;
    let sumForecastSquared = 0;
    let sumActualForecast = 0;
    let validPoints = 0;

    data.forEach((point: any) => {
      if (point.actual !== null && point.actual !== undefined &&
          point.forecast !== null && point.forecast !== undefined &&
          point.actual > 0) { // Avoid division by zero

        const actual = parseFloat(point.actual);
        const forecast = parseFloat(point.forecast);
        const error = actual - forecast;
        const ape = Math.abs(error / actual) * 100;

        sumAPE += ape;
        sumSquaredError += error * error;
        sumAbsoluteError += Math.abs(error);
        sumActual += actual;
        sumForecast += forecast;
        sumActualSquared += actual * actual;
        sumForecastSquared += forecast * forecast;
        sumActualForecast += actual * forecast;
        validPoints++;
      }
    });

    if (validPoints === 0) {
      return {
        accuracy: 100,
        mape: 0,
        rmse: 0,
        mae: 0,
        r2: 0,
        nrmse: 0,
        validPoints: 0
      };
    }

    const mape = sumAPE / validPoints;
    const rmse = Math.sqrt(sumSquaredError / validPoints);
    const mae = sumAbsoluteError / validPoints;
    const meanActual = sumActual / validPoints;

    // Calculate R² (coefficient of determination)
    const numerator = validPoints * sumActualForecast - sumActual * sumForecast;
    const denominator = Math.sqrt(
      (validPoints * sumActualSquared - sumActual * sumActual) *
      (validPoints * sumForecastSquared - sumForecast * sumForecast)
    );
    const r2 = denominator !== 0 ? Math.pow(numerator / denominator, 2) : 0;

    // Calculate NRMSE (Normalized RMSE)
    const nrmse = meanActual !== 0 ? (rmse / meanActual) * 100 : 0;

    // Enhanced accuracy calculation based on multiple metrics
    const accuracyFromMAPE = Math.max(0, 100 - mape);
    const accuracyFromR2 = r2 * 100;
    const accuracyFromNRMSE = Math.max(0, 100 - nrmse);

    // Weighted average of different accuracy measures
    const accuracy = (accuracyFromMAPE * 0.4 + accuracyFromR2 * 0.3 + accuracyFromNRMSE * 0.3);

    return {
      accuracy: Math.max(0, Math.min(100, accuracy)),
      mape: parseFloat(mape.toFixed(2)),
      rmse: parseFloat(rmse.toFixed(2)),
      mae: parseFloat(mae.toFixed(2)),
      r2: parseFloat(r2.toFixed(4)),
      nrmse: parseFloat(nrmse.toFixed(2)),
      validPoints
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