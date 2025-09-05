import { AnalysisRepository } from '../repositories/analysis.repository';

export class AnalysisService {
  private repository = new AnalysisRepository();

  /**
   * Get comprehensive forecast data with actuals and measured data
   */
  async getForecastAnalysis(locationId: string, interval: string, startDate: string, endDate: string) {
    // Validate location
    const location = await this.repository.validateLocation(locationId);
    if (!location) {
      throw new Error('Location not found or inactive');
    }

    // Get forecast and actual data in parallel
    const [forecastData, actualData] = await Promise.all([
      this.repository.getForecastData(locationId, interval, startDate, endDate),
      this.repository.getActualData(locationId, interval, startDate, endDate)
    ]);

    // Merge forecast and actual data by timestamp
    const mergedData = this.mergeTimeSeriesData(forecastData, actualData);

    return {
      data: mergedData,
      hasActual: actualData.length > 0,
      hasMeasured: actualData.length > 0, // Using same data for measured
      location: location,
      interval,
      startDate,
      endDate,
      totalPoints: mergedData.length
    };
  }

  /**
   * Get weather data for analysis
   */
  async getWeatherAnalysis(locationId: string, interval: string, startDate: string, endDate: string) {
    // Validate location
    const location = await this.repository.validateLocation(locationId);
    if (!location) {
      throw new Error('Location not found or inactive');
    }

    const weatherData = await this.repository.getWeatherData(locationId, interval, startDate, endDate);

    return {
      data: weatherData,
      location: location,
      interval,
      startDate,
      endDate,
      totalPoints: weatherData.length
    };
  }

  /**
   * Get historical data for comparison
   */
  async getHistoricalAnalysis(locationId: string, interval: string, startDate: string, endDate: string) {
    // Validate location
    const location = await this.repository.validateLocation(locationId);
    if (!location) {
      throw new Error('Location not found or inactive');
    }

    const historicalData = await this.repository.getHistoricalData(locationId, interval, startDate, endDate);

    return {
      data: historicalData,
      location: location,
      interval,
      startDate,
      endDate,
      totalPoints: historicalData.length
    };
  }

  /**
   * Get accuracy metrics
   */
  async getAccuracyMetrics(locationId: string, startDate: string, endDate: string) {
    // Validate location
    const location = await this.repository.validateLocation(locationId);
    if (!location) {
      throw new Error('Location not found or inactive');
    }

    const metrics = await this.repository.getAccuracyMetrics(locationId, startDate, endDate);

    return {
      ...metrics,
      location: location,
      dateRange: { startDate, endDate }
    };
  }

  /**
   * Generate export data in specified format
   */
  async generateExportData(
    locationId: string, 
    interval: string, 
    startDate: string, 
    endDate: string, 
    format: 'csv' | 'excel' | 'pdf'
  ) {
    // Get comprehensive data
    const [forecastData, weatherData, accuracyData] = await Promise.all([
      this.getForecastAnalysis(locationId, interval, startDate, endDate),
      this.getWeatherAnalysis(locationId, interval, startDate, endDate),
      this.getAccuracyMetrics(locationId, startDate, endDate)
    ]);

    // Combine all data for export
    const exportData = {
      metadata: {
        location: forecastData.location,
        interval,
        startDate,
        endDate,
        generatedAt: new Date().toISOString(),
        accuracy: accuracyData
      },
      forecast: forecastData.data,
      weather: weatherData.data
    };

    // Convert to requested format
    switch (format) {
      case 'csv':
        return this.generateCSV(exportData);
      case 'excel':
        return this.generateExcel(exportData);
      case 'pdf':
        return this.generatePDF(exportData);
      default:
        throw new Error('Unsupported export format');
    }
  }

  /**
   * Merge forecast and actual data by timestamp
   */
  private mergeTimeSeriesData(forecastData: any[], actualData: any[]) {
    // Create a map for quick lookup of actual data
    const actualMap = new Map();
    actualData.forEach(item => {
      actualMap.set(item.timestamp, item);
    });

    // Merge data
    return forecastData.map(forecastItem => {
      const actualItem = actualMap.get(forecastItem.timestamp);
      
      return {
        timestamp: forecastItem.timestamp,
        forecast: forecastItem.forecast,
        actual: actualItem?.actual || null,
        measured: actualItem?.actual || null, // Use same as actual for now
        energy: forecastItem.energy,
        capacity_factor: forecastItem.capacity_factor,
        confidence_lower: forecastItem.confidence_lower,
        confidence_q25: forecastItem.confidence_q25,
        confidence_q75: forecastItem.confidence_q75,
        confidence_upper: forecastItem.confidence_upper,
        confidence: forecastItem.confidence
      };
    });
  }

  /**
   * Generate CSV format
   */
  private generateCSV(data: any): { content: string; filename: string; mimeType: string } {
    let csv = 'Timestamp,Forecast (MW),Actual (MW),Energy (MWh),Capacity Factor,Confidence Lower,Confidence Upper,Temperature,Solar Radiation\n';
    
    const forecastMap = new Map();
    data.forecast.forEach((item: any) => {
      forecastMap.set(item.timestamp, item);
    });

    const weatherMap = new Map();
    data.weather.forEach((item: any) => {
      weatherMap.set(item.timestamp, item);
    });

    // Get all unique timestamps
    const allTimestamps = new Set([
      ...data.forecast.map((item: any) => item.timestamp),
      ...data.weather.map((item: any) => item.timestamp)
    ]);

    Array.from(allTimestamps).sort().forEach(timestamp => {
      const forecast = forecastMap.get(timestamp);
      const weather = weatherMap.get(timestamp);

      csv += [
        timestamp,
        forecast?.forecast || '',
        forecast?.actual || '',
        forecast?.energy || '',
        forecast?.capacity_factor || '',
        forecast?.confidence_lower || '',
        forecast?.confidence_upper || '',
        weather?.temperature || '',
        weather?.solar_radiation || ''
      ].join(',') + '\n';
    });

    const filename = `forecast_analysis_${data.metadata.location.id}_${data.metadata.interval}_${Date.now()}.csv`;
    
    return {
      content: csv,
      filename,
      mimeType: 'text/csv'
    };
  }

  /**
   * Generate Excel format (simplified CSV for now)
   */
  private generateExcel(data: any): { content: string; filename: string; mimeType: string } {
    // For now, return CSV content with Excel mime type
    const csv = this.generateCSV(data);
    
    return {
      content: csv.content,
      filename: csv.filename.replace('.csv', '.xlsx'),
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
  }

  /**
   * Generate PDF format (simplified text for now)
   */
  private generatePDF(data: any): { content: string; filename: string; mimeType: string } {
    let content = `Solar Forecast Analysis Report\n\n`;
    content += `Location: ${data.metadata.location.name} - ${data.metadata.location.city}\n`;
    content += `Period: ${data.metadata.startDate} to ${data.metadata.endDate}\n`;
    content += `Interval: ${data.metadata.interval}\n`;
    content += `Generated: ${data.metadata.generatedAt}\n\n`;
    
    content += `Accuracy Metrics:\n`;
    content += `- MAPE: ${data.metadata.accuracy.mape}%\n`;
    content += `- RMSE: ${data.metadata.accuracy.rmse}\n`;
    content += `- MAE: ${data.metadata.accuracy.mae}\n`;
    content += `- Overall Accuracy: ${data.metadata.accuracy.accuracy}%\n\n`;
    
    content += `Data Points: ${data.forecast.length} forecast records, ${data.weather.length} weather records\n`;

    const filename = `forecast_analysis_${data.metadata.location.id}_${data.metadata.interval}_${Date.now()}.txt`;
    
    return {
      content,
      filename,
      mimeType: 'text/plain'
    };
  }
}