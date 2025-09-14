import { db, TimescaleQueries } from '../database';
import type { WeatherData } from '$lib/types/dashboard';

export class DashboardRepository {
  
  /**
   * Get current production data for a location
   */
  async getCurrentProduction(locationId: string) {
    const result = await db.$queryRaw<Array<{
      current_power_mw: number;
      timestamp: Date;
    }>>`
      SELECT 
        "powerMW" as current_power_mw,
        timestamp
      FROM production 
      WHERE "locationId" = ${locationId}
        AND timestamp >= NOW() - INTERVAL '1 hour'
      ORDER BY timestamp DESC 
      LIMIT 1
    `;

    return result[0] || null;
  }

  /**
   * Get yesterday's production for comparison
   */
  async getYesterdayProduction(locationId: string) {
    const result = await db.$queryRaw<Array<{
      avg_power_mw: number;
    }>>`
      SELECT AVG("powerMW") as avg_power_mw
      FROM production 
      WHERE "locationId" = ${locationId}
        AND timestamp >= NOW() - INTERVAL '2 days'
        AND timestamp < NOW() - INTERVAL '1 day'
    `;

    return result[0]?.avg_power_mw || 0;
  }

  /**
   * Get today's total energy production
   */
  async getTodayEnergyProduction(locationId: string) {
    const result = await db.$queryRaw<Array<{
      total_energy_mwh: number;
    }>>`
      SELECT 
        COALESCE(SUM("energyMWh"), 0) as total_energy_mwh
      FROM production 
      WHERE "locationId" = ${locationId}
        AND DATE(timestamp) = CURRENT_DATE
    `;

    return result[0]?.total_energy_mwh || 0;
  }

  /**
   * Get yesterday's total energy production for comparison
   */
  async getYesterdayEnergyProduction(locationId: string) {
    const result = await db.$queryRaw<Array<{
      total_energy_mwh: number;
    }>>`
      SELECT 
        COALESCE(SUM("energyMWh"), 0) as total_energy_mwh
      FROM production 
      WHERE "locationId" = ${locationId}
        AND DATE(timestamp) = CURRENT_DATE - INTERVAL '1 day'
    `;

    return result[0]?.total_energy_mwh || 0;
  }

  /**
   * Get recent forecast accuracy for a location
   */
  async getForecastAccuracy(locationId: string) {
    const result = await db.$queryRaw<Array<{
      avg_accuracy: number;
    }>>`
      SELECT 
        AVG((100 - mape)) as avg_accuracy
      FROM forecast_accuracy 
      WHERE "locationId" = ${locationId}
        AND date >= CURRENT_DATE - INTERVAL '7 days'
    `;

    return result[0]?.avg_accuracy || 0;
  }

  /**
   * Get yesterday's forecast accuracy for comparison
   */
  async getYesterdayForecastAccuracy(locationId: string) {
    const result = await db.$queryRaw<Array<{
      avg_accuracy: number;
    }>>`
      SELECT 
        AVG((100 - mape)) as avg_accuracy
      FROM forecast_accuracy 
      WHERE "locationId" = ${locationId}
        AND date >= CURRENT_DATE - INTERVAL '14 days'
        AND date < CURRENT_DATE - INTERVAL '7 days'
    `;

    return result[0]?.avg_accuracy || 0;
  }

  /**
   * Get weather data for time series visualization
   */
  async getWeatherTimeSeries(locationId: string, timeRange: 'today' | 'tomorrow' | '7days') {
    let interval: string;
    let timeFilter: string;

    switch (timeRange) {
      case 'today':
        interval = '1 hour';
        timeFilter = "DATE(timestamp) = CURRENT_DATE";
        break;
      case 'tomorrow':
        interval = '1 hour';
        timeFilter = "DATE(timestamp) = CURRENT_DATE + INTERVAL '1 day'";
        break;
      case '7days':
        interval = '6 hours';
        timeFilter = "timestamp >= CURRENT_DATE AND timestamp < CURRENT_DATE + INTERVAL '7 days'";
        break;
      default:
        interval = '1 hour';
        timeFilter = "DATE(timestamp) = CURRENT_DATE";
    }

    return await TimescaleQueries.timeBucket({
      interval: interval as any,
      table: 'weather_data',
      aggregations: {
        avg: ['temperature', 'humidity', 'ghi', 'windSpeed', 'cloudCover']
      },
      where: `"locationId" = ${locationId} AND ${timeFilter}`,
      groupBy: ['locationId'],
      limit: timeRange === '7days' ? 28 : 24 // 7 days * 4 intervals or 24 hours
    });
  }

  /**
   * Get current weather conditions
   */
  async getCurrentWeather(locationId: string) {
    const result = await db.$queryRaw<Array<{
      temperature: number;
      humidity: number;
      ghi: number;
      windSpeed: number;
      cloudCover: number;
      timestamp: Date;
    }>>`
      SELECT 
        temperature,
        humidity,
        ghi,
        "windSpeed",
        "cloudCover",
        timestamp
      FROM weather_data 
      WHERE "locationId" = ${locationId}
        AND timestamp >= NOW() - INTERVAL '2 hours'
      ORDER BY timestamp DESC 
      LIMIT 1
    `;

    return result[0] || null;
  }

  /**
   * Get all active locations for dropdown selection
   */
  async getActiveLocations() {
    return await db.location.findMany({
      where: {
        status: 'ACTIVE'
      },
      select: {
        id: true,
        name: true,
        city: true,
        status: true
      },
      orderBy: {
        name: 'asc'
      }
    });
  }

  /**
   * Get location details by ID
   */
  async getLocationById(locationId: string) {
    return await db.location.findUnique({
      where: {
        id: locationId
      },
      select: {
        id: true,
        name: true,
        city: true,
        status: true
      }
    });
  }
}