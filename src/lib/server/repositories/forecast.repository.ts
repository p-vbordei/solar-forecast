import { db, TimescaleQueries } from '$lib/server/database';
import type { TimeInterval } from '$lib/server/database';

class ForecastRepository {
  async getForecastData(
    locationId: string,
    interval: '15min' | 'hourly' | 'daily' | 'weekly',
    startDate?: string,
    endDate?: string
  ) {
    try {
      // Try to get real forecast data from database first
      const realData = await this.getRealForecastData(locationId, interval, startDate, endDate);

      // If no real data exists, fall back to mock data
      if (realData.length === 0) {
        console.log(`No forecast data found for location ${locationId}, generating mock data`);
        return this.generateMockForecastData(locationId, interval, startDate, endDate);
      }

      return realData;
    } catch (error) {
      console.warn('Database query failed, falling back to mock data:', error);
      return this.generateMockForecastData(locationId, interval, startDate, endDate);
    }
  }

  private async getRealForecastData(
    locationId: string,
    interval: '15min' | 'hourly' | 'daily' | 'weekly',
    startDate?: string,
    endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Convert interval to TimescaleDB interval
    const tsInterval: TimeInterval = interval === '15min' ? '15 minutes' :
                                   interval === 'hourly' ? '1 hour' :
                                   interval === 'daily' ? '1 day' : '1 week';

    // Use TimescaleDB time_bucket for optimal performance
    return await TimescaleQueries.timeBucket({
      interval: tsInterval,
      table: 'forecasts',
      aggregations: {
        avg: ['power_forecast_mw', 'confidence_score'],
        count: ['*']
      },
      where: `location_id = ${parseInt(locationId)} AND timestamp >= '${start.toISOString()}' AND timestamp <= '${end.toISOString()}'`,
      groupBy: ['location_id'],
      orderBy: 'bucket ASC'
    });
  }
  
  async getAccuracyData(
    locationId: string,
    startDate?: string,
    endDate?: string
  ) {
    try {
      // Try to get real accuracy data from database first
      const realData = await this.getRealAccuracyData(locationId, startDate, endDate);

      // If no real data exists, fall back to mock data
      if (realData.length === 0) {
        console.log(`No accuracy data found for location ${locationId}, generating mock data`);
        return this.generateMockAccuracyData(locationId, startDate, endDate);
      }

      return realData;
    } catch (error) {
      console.warn('Database accuracy query failed, falling back to mock data:', error);
      return this.generateMockAccuracyData(locationId, startDate, endDate);
    }
  }

  private async getRealAccuracyData(
    locationId: string,
    startDate?: string,
    endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Query forecast vs production data for accuracy analysis
    return await db.$queryRaw`
      SELECT
        f.timestamp,
        f.power_forecast_mw as forecast,
        p.power_mw as actual,
        f.confidence_score
      FROM forecasts f
      INNER JOIN production p ON f.location_id = p.location_id
        AND f.timestamp = p.timestamp
      WHERE f.location_id = ${parseInt(locationId)}
        AND f.timestamp >= ${start}
        AND f.timestamp <= ${end}
      ORDER BY f.timestamp DESC
      LIMIT 1000
    `;
  }

  // New method for bulk forecast insertion with TimescaleDB optimization
  async bulkInsertForecasts(forecasts: Array<{
    locationId: number;
    timestamp: Date;
    powerForecastMw: number;
    confidenceScore?: number;
    modelType?: string;
    horizonHours?: number;
  }>) {
    try {
      return await TimescaleQueries.bulkInsert('forecasts', forecasts, {
        batchSize: 1000,
        onConflict: 'update',
        validateTimestamps: true
      });
    } catch (error) {
      console.error('Bulk forecast insert failed:', error);
      throw error;
    }
  }
  
  private generateMockForecastData(
    locationId: string,
    interval: string,
    startDate?: string,
    endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    const data = [];
    const current = new Date(start);
    
    // Determine interval duration in milliseconds
    let intervalMs: number;
    switch (interval) {
      case '15min':
        intervalMs = 15 * 60 * 1000;
        break;
      case 'hourly':
        intervalMs = 60 * 60 * 1000;
        break;
      case 'daily':
        intervalMs = 24 * 60 * 60 * 1000;
        break;
      case 'weekly':
        intervalMs = 7 * 24 * 60 * 60 * 1000;
        break;
      default:
        intervalMs = 60 * 60 * 1000;
    }
    
    while (current <= end) {
      const hour = current.getHours();
      const dayOfYear = this.getDayOfYear(current);
      
      // Simulate solar production pattern
      let baseProduction = 0;
      if (hour >= 6 && hour <= 18) {
        // Daylight hours - bell curve pattern
        const peakHour = 12;
        const hourDiff = Math.abs(hour - peakHour);
        const maxProduction = 45; // MW at peak
        baseProduction = maxProduction * Math.exp(-(hourDiff * hourDiff) / 18);
        
        // Add seasonal variation
        const seasonalFactor = 0.7 + 0.3 * Math.sin(((dayOfYear - 80) / 365) * 2 * Math.PI);
        baseProduction *= seasonalFactor;
        
        // Add some randomness
        baseProduction += (Math.random() - 0.5) * 5;
        baseProduction = Math.max(0, baseProduction);
      }
      
      // For daily and weekly, aggregate the values
      if (interval === 'daily') {
        baseProduction *= 10; // Approximate daily total
      } else if (interval === 'weekly') {
        baseProduction *= 70; // Approximate weekly total
      }
      
      // Generate measured data (from physical sensors) with different accuracy than actual
      const measuredData = Math.random() > 0.2 ? parseFloat((baseProduction * (0.85 + Math.random() * 0.3)).toFixed(2)) : null;
      const actualData = Math.random() > 0.3 ? parseFloat((baseProduction * (0.9 + Math.random() * 0.2)).toFixed(2)) : null;
      
      data.push({
        timestamp: current.toISOString(),
        forecast: parseFloat(baseProduction.toFixed(2)),
        actual: actualData,
        measured: measuredData
      });
      
      current.setTime(current.getTime() + intervalMs);
    }
    
    return data;
  }
  
  private generateMockAccuracyData(
    locationId: string,
    startDate?: string,
    endDate?: string
  ) {
    // Generate mock historical data with forecast and actual values
    const data = [];
    const numPoints = 100;
    
    for (let i = 0; i < numPoints; i++) {
      const forecast = 20 + Math.random() * 30;
      const actual = forecast * (0.9 + Math.random() * 0.2); // ±10% variation
      
      data.push({
        timestamp: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
        forecast,
        actual
      });
    }
    
    return data;
  }
  
  private getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  }
}

export const forecastRepository = new ForecastRepository();