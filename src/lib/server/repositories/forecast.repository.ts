import { prisma } from '$lib/server/prisma';

class ForecastRepository {
  async getForecastData(
    locationId: string,
    interval: '15min' | 'hourly' | 'daily' | 'weekly',
    startDate?: string,
    endDate?: string
  ) {
    // Generate mock forecast data based on interval
    const data = this.generateMockForecastData(locationId, interval, startDate, endDate);
    return data;
  }
  
  async getAccuracyData(
    locationId: string,
    startDate?: string,
    endDate?: string
  ) {
    // Generate mock accuracy data
    const data = this.generateMockAccuracyData(locationId, startDate, endDate);
    return data;
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