import { db, TimescaleQueries } from '../database';
import type { WeatherData } from '$lib/types/dashboard';

export class DashboardRepository {
  
  /**
   * Get current production data for a location
   */
  async getCurrentProduction(locationId: number) {
    const result = await db.$queryRaw<Array<{
      current_power_mw: number;
      timestamp: Date;
    }>>`
      SELECT 
        power_mw as current_power_mw,
        timestamp
      FROM production 
      WHERE location_id = ${locationId}
        AND timestamp >= NOW() - INTERVAL '1 hour'
      ORDER BY timestamp DESC 
      LIMIT 1
    `;

    return result[0] || null;
  }

  /**
   * Get yesterday's production for comparison
   */
  async getYesterdayProduction(locationId: number) {
    const result = await db.$queryRaw<Array<{
      avg_power_mw: number;
    }>>`
      SELECT AVG(power_mw) as avg_power_mw
      FROM production 
      WHERE location_id = ${locationId}
        AND timestamp >= NOW() - INTERVAL '2 days'
        AND timestamp < NOW() - INTERVAL '1 day'
    `;

    return result[0]?.avg_power_mw || 0;
  }

  /**
   * Get today's total energy production
   */
  async getTodayEnergyProduction(locationId: number) {
    const result = await db.$queryRaw<Array<{
      total_energy_mwh: number;
    }>>`
      SELECT 
        COALESCE(SUM(energy_mwh), 0) as total_energy_mwh
      FROM production 
      WHERE location_id = ${locationId}
        AND DATE(timestamp) = CURRENT_DATE
    `;

    return result[0]?.total_energy_mwh || 0;
  }

  /**
   * Get yesterday's total energy production for comparison
   */
  async getYesterdayEnergyProduction(locationId: number) {
    const result = await db.$queryRaw<Array<{
      total_energy_mwh: number;
    }>>`
      SELECT 
        COALESCE(SUM(energy_mwh), 0) as total_energy_mwh
      FROM production 
      WHERE location_id = ${locationId}
        AND DATE(timestamp) = CURRENT_DATE - INTERVAL '1 day'
    `;

    return result[0]?.total_energy_mwh || 0;
  }

  /**
   * Get recent forecast accuracy for a location
   */
  async getForecastAccuracy(locationId: number) {
    const result = await db.$queryRaw<Array<{
      avg_accuracy: number;
    }>>`
      SELECT 
        AVG(accuracy_score * 100) as avg_accuracy
      FROM forecast_accuracy 
      WHERE location_id = ${locationId}
        AND timestamp >= NOW() - INTERVAL '24 hours'
    `;

    return result[0]?.avg_accuracy || 0;
  }

  /**
   * Get yesterday's forecast accuracy for comparison
   */
  async getYesterdayForecastAccuracy(locationId: number) {
    const result = await db.$queryRaw<Array<{
      avg_accuracy: number;
    }>>`
      SELECT 
        AVG(accuracy_score * 100) as avg_accuracy
      FROM forecast_accuracy 
      WHERE location_id = ${locationId}
        AND timestamp >= NOW() - INTERVAL '2 days'
        AND timestamp < NOW() - INTERVAL '1 day'
    `;

    return result[0]?.avg_accuracy || 0;
  }

  /**
   * Get weather data for time series visualization
   */
  async getWeatherTimeSeries(locationId: number, timeRange: 'today' | 'tomorrow' | '7days') {
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
        avg: ['temperature_c', 'humidity_percent', 'ghi_w_m2', 'wind_speed_ms', 'cloud_coverage_percent']
      },
      where: `location_id = ${locationId} AND ${timeFilter}`,
      groupBy: ['location_id'],
      limit: timeRange === '7days' ? 28 : 24 // 7 days * 4 intervals or 24 hours
    });
  }

  /**
   * Get current weather conditions
   */
  async getCurrentWeather(locationId: number) {
    const result = await db.$queryRaw<Array<{
      temperature_c: number;
      humidity_percent: number;
      ghi_w_m2: number;
      wind_speed_ms: number;
      cloud_coverage_percent: number;
      timestamp: Date;
    }>>`
      SELECT 
        temperature_c,
        humidity_percent,
        ghi_w_m2,
        wind_speed_ms,
        cloud_coverage_percent,
        timestamp
      FROM weather_data 
      WHERE location_id = ${locationId}
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
        isActive: true
      },
      select: {
        id: true,
        name: true,
        city: true,
        isActive: true
      },
      orderBy: {
        name: 'asc'
      }
    });
  }

  /**
   * Get location details by ID
   */
  async getLocationById(locationId: number) {
    return await db.location.findUnique({
      where: {
        id: locationId
      },
      select: {
        id: true,
        name: true,
        city: true,
        isActive: true
      }
    });
  }
}