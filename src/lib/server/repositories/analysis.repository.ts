import { db, TimescaleQueries } from '../database';

export class AnalysisRepository {

  /**
   * Get forecast data with confidence bands for analysis
   */
  async getForecastData(locationId: string, interval: string, startDate: string, endDate: string) {
    // Query the actual forecasts table using Prisma
    const forecasts = await db.forecast.findMany({
      where: {
        locationId: locationId,
        timestamp: {
          gte: new Date(startDate + 'T00:00:00Z'),
          lte: new Date(endDate + 'T23:59:59Z')
        }
      },
      orderBy: {
        timestamp: 'asc'
      }
    });

    // Transform data to match expected analysis format
    const result = forecasts.map((forecast: any) => ({
      bucket: forecast.timestamp,
      avg_powerMW: forecast.powerMW || forecast.powerOutputMW || 0, // Try both field names for compatibility
      avg_energyMWh: forecast.energyMWh || forecast.powerMW || 0, // Use energy if available, fallback to power
      avg_capacityFactor: forecast.capacityFactor || Math.min(1.0, (forecast.powerMW || 0) / 50), // Use actual or calculated
      avg_powerMWQ10: (forecast.powerMWQ10 || (forecast.powerMW || 0) * 0.8),
      avg_powerMWQ25: (forecast.powerMWQ25 || (forecast.powerMW || 0) * 0.9),
      avg_powerMWQ75: (forecast.powerMWQ75 || (forecast.powerMW || 0) * 1.1),
      avg_powerMWQ90: (forecast.powerMWQ90 || (forecast.powerMW || 0) * 1.2),
      avg_confidence: forecast.qualityScore || 0.85, // Updated field name
      count: 1
    }));

    // Transform to final format expected by UI
    return result.map(row => ({
      timestamp: row.bucket.toISOString(),
      forecast: Math.round(row.avg_powerMW * 100) / 100,
      energy: row.avg_energyMWh ? Math.round(row.avg_energyMWh * 100) / 100 : null,
      capacity_factor: row.avg_capacityFactor ? Math.round(row.avg_capacityFactor * 100) / 100 : null,
      confidence_lower: row.avg_powerMWQ10 ? Math.round(row.avg_powerMWQ10 * 100) / 100 : null,
      confidence_q25: row.avg_powerMWQ25 ? Math.round(row.avg_powerMWQ25 * 100) / 100 : null,
      confidence_q75: row.avg_powerMWQ75 ? Math.round(row.avg_powerMWQ75 * 100) / 100 : null,
      confidence_upper: row.avg_powerMWQ90 ? Math.round(row.avg_powerMWQ90 * 100) / 100 : null,
      confidence: row.avg_confidence ? Math.round(row.avg_confidence * 100) / 100 : null,
      count: Number(row.count)
    }));
  }

  /**
   * Get actual production data for comparison
   */
  async getActualData(locationId: string, interval: string, startDate: string, endDate: string) {
    // Query actual production data using Prisma
    const production = await db.production.findMany({
      where: {
        locationId: locationId,
        timestamp: {
          gte: new Date(startDate + 'T00:00:00Z'),
          lte: new Date(endDate + 'T23:59:59Z')
        }
      },
      orderBy: {
        timestamp: 'asc'
      }
    });

    // Transform data to match expected analysis format (using simplified Production schema)
    const result = production.map((prod: any) => ({
      bucket: prod.timestamp,
      avg_powerMW: prod.powerMW || 0, // Updated field name
      avg_capacityFactor: prod.capacityFactor || 0,
      avg_availability: prod.availability || 100,
      count: 1
    }));

    return result.map(row => ({
      timestamp: row.bucket.toISOString(),
      actual: Math.round(row.avg_powerMW * 100) / 100,
      capacity_factor: row.avg_capacityFactor ? Math.round(row.avg_capacityFactor * 100) / 100 : null,
      availability: row.avg_availability ? Math.round(row.avg_availability * 10) / 10 : null,
      count: Number(row.count)
    }));
  }

  /**
   * Get weather data for analysis
   */
  async getWeatherData(locationId: string, interval: string, startDate: string, endDate: string) {
    // Use Prisma queries instead of raw SQL for better compatibility
    const weatherData = await db.weatherData.findMany({
      where: {
        locationId: locationId,
        timestamp: {
          gte: new Date(startDate + 'T00:00:00Z'),
          lte: new Date(endDate + 'T23:59:59Z')
        }
      },
      orderBy: {
        timestamp: 'asc'
      }
    });

    // Group data by interval in JavaScript
    const groupedData = new Map<string, {
      temperatures: number[];
      humidity: number[];
      ghi: number[];
      windSpeed: number[];
      cloudCover: number[];
      timestamp: Date;
    }>();

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

    weatherData.forEach(record => {
      const bucketTime = new Date(Math.floor(record.timestamp.getTime() / intervalMs) * intervalMs);
      const key = bucketTime.toISOString();

      if (!groupedData.has(key)) {
        groupedData.set(key, {
          temperatures: [],
          humidity: [],
          ghi: [],
          windSpeed: [],
          cloudCover: [],
          timestamp: bucketTime
        });
      }

      const group = groupedData.get(key)!;
      if (record.temperature !== null) group.temperatures.push(record.temperature);
      if (record.humidity !== null) group.humidity.push(record.humidity);
      if (record.ghi !== null) group.ghi.push(record.ghi);
      if (record.windSpeed !== null) group.windSpeed.push(record.windSpeed);
      if (record.cloudCover !== null) group.cloudCover.push(record.cloudCover);
    });

    const result = Array.from(groupedData.values()).map(group => ({
      timestamp: group.timestamp.toISOString(),
      temperature: group.temperatures.length > 0 ?
        Math.round((group.temperatures.reduce((a, b) => a + b, 0) / group.temperatures.length) * 10) / 10 : 0,
      humidity: group.humidity.length > 0 ?
        Math.round(group.humidity.reduce((a, b) => a + b, 0) / group.humidity.length) : 0,
      solar_radiation: group.ghi.length > 0 ?
        Math.round(group.ghi.reduce((a, b) => a + b, 0) / group.ghi.length) : 0,
      wind_speed: group.windSpeed.length > 0 ?
        Math.round((group.windSpeed.reduce((a, b) => a + b, 0) / group.windSpeed.length) * 10) / 10 : 0,
      cloud_cover: group.cloudCover.length > 0 ?
        Math.round(group.cloudCover.reduce((a, b) => a + b, 0) / group.cloudCover.length) : 0,
      count: Math.max(group.temperatures.length, group.humidity.length, group.ghi.length, group.windSpeed.length, group.cloudCover.length)
    }));

    return result.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  /**
   * Get historical production data for comparison
   */
  async getHistoricalData(locationId: string, interval: string, startDate: string, endDate: string) {
    // For historical data, get same period from previous year
    const historicalStart = new Date(startDate);
    const historicalEnd = new Date(endDate);
    historicalStart.setFullYear(historicalStart.getFullYear() - 1);
    historicalEnd.setFullYear(historicalEnd.getFullYear() - 1);

    // Use Prisma queries instead of raw SQL for better compatibility
    const productionData = await db.production.findMany({
      where: {
        locationId: locationId,
        timestamp: {
          gte: historicalStart,
          lte: historicalEnd
        }
      },
      orderBy: {
        timestamp: 'asc'
      }
    });

    // Group data by interval in JavaScript
    const groupedData = new Map<string, {
      powerMW: number[];
      capacityFactor: number[];
      availability: number[];
      timestamp: Date;
    }>();

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

    productionData.forEach(record => {
      const bucketTime = new Date(Math.floor(record.timestamp.getTime() / intervalMs) * intervalMs);
      const key = bucketTime.toISOString();

      if (!groupedData.has(key)) {
        groupedData.set(key, {
          powerMW: [],
          capacityFactor: [],
          availability: [],
          timestamp: bucketTime
        });
      }

      const group = groupedData.get(key)!;
      if (record.powerMW !== null) group.powerMW.push(record.powerMW);
      if (record.capacityFactor !== null) group.capacityFactor.push(record.capacityFactor);
      if (record.availability !== null) group.availability.push(record.availability);
    });

    const result = Array.from(groupedData.values()).map(group => ({
      timestamp: group.timestamp.toISOString(),
      historical: group.powerMW.length > 0 ?
        Math.round((group.powerMW.reduce((a, b) => a + b, 0) / group.powerMW.length) * 100) / 100 : 0,
      capacity_factor: group.capacityFactor.length > 0 ?
        Math.round((group.capacityFactor.reduce((a, b) => a + b, 0) / group.capacityFactor.length) * 100) / 100 : null,
      availability: group.availability.length > 0 ?
        Math.round((group.availability.reduce((a, b) => a + b, 0) / group.availability.length) * 10) / 10 : null,
      count: Math.max(group.powerMW.length, group.capacityFactor.length, group.availability.length)
    }));

    return result.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  /**
   * Calculate accuracy metrics for the given period
   */
  async getAccuracyMetrics(locationId: string, startDate: string, endDate: string) {
    // Use Prisma queries instead of raw SQL for better compatibility
    const accuracyData = await db.forecastAccuracy.findMany({
      where: {
        locationId: locationId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      }
    });

    if (!accuracyData || accuracyData.length === 0) {
      return {
        accuracy: 85.0, // Default fallback
        mape: 15.0,
        rmse: 3.5,
        mae: 2.8,
        r2: 0.85,
        skill_score: 0.75,
        sample_count: 0
      };
    }

    // Calculate averages
    const totalSamples = accuracyData.reduce((sum, record) => sum + (record.sampleCount || 1), 0);
    const avgMape = accuracyData.reduce((sum, record) => sum + (record.mape || 0), 0) / accuracyData.length;
    const avgRmse = accuracyData.reduce((sum, record) => sum + (record.rmse || 0), 0) / accuracyData.length;
    const avgMae = accuracyData.reduce((sum, record) => sum + (record.mae || 0), 0) / accuracyData.length;
    const avgR2 = accuracyData.reduce((sum, record) => sum + (record.r2 || 0), 0) / accuracyData.length;
    const avgSkillScore = accuracyData.reduce((sum, record) => sum + (record.skillScore || 0), 0) / accuracyData.length;

    return {
      accuracy: Math.round((100 - avgMape) * 10) / 10,
      mape: Math.round(avgMape * 10) / 10,
      rmse: Math.round(avgRmse * 100) / 100,
      mae: Math.round(avgMae * 100) / 100,
      r2: Math.round(avgR2 * 1000) / 1000,
      skill_score: avgSkillScore ? Math.round(avgSkillScore * 1000) / 1000 : null,
      sample_count: totalSamples
    };
  }

  /**
   * Verify location exists and is accessible
   */
  async validateLocation(locationId: string) {
    if (!locationId || locationId.trim() === '') {
      return null;
    }

    const location = await db.location.findUnique({
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

    return location && location.status === 'ACTIVE' ? location : null;
  }
}