import { db, TimescaleQueries } from '../../../server/database';
import type { WeatherData } from '../models/dto/weather';
import type { DataQuality } from '@prisma/client';

/**
 * Repository layer for weather data access
 * Handles all database operations for weather data using TimescaleDB optimizations
 */
export class WeatherRepository {

  /**
   * Bulk insert weather data using TimescaleDB optimizations
   */
  async bulkInsert(
    weatherData: WeatherData[],
    options: { upsert?: boolean; validateData?: boolean } = {}
  ): Promise<{
    inserted: number;
    updated: number;
    skipped: number;
    batches: number;
  }> {
    if (weatherData.length === 0) {
      throw new Error('Weather data array cannot be empty');
    }

    // Validate data if requested
    if (options.validateData !== false) {
      this.validateWeatherDataBatch(weatherData);
    }

    // Transform data for Prisma
    const prismaData = weatherData.map(this.transformToPrismaFormat);

    // Use TimescaleDB bulk insert helper
    const result = await TimescaleQueries.bulkInsert('weather_data', prismaData, {
      batchSize: 1000,
      onConflict: options.upsert ? 'update' : 'ignore',
      validateTimestamps: true
    });

    return {
      inserted: result.inserted,
      updated: result.updated || 0,
      skipped: result.skipped || 0,
      batches: result.batches
    };
  }

  /**
   * Find weather data by location within date range
   */
  async findByLocation(
    locationId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 1000
  ): Promise<WeatherData[]> {
    // Validate GUID format
    this.validateGuidFormat(locationId);

    // Validate date range
    if (startDate >= endDate) {
      throw new Error('Start date must be before end date');
    }

    // Use Prisma with automatic middleware optimizations
    const records = await db.weatherData.findMany({
      where: {
        locationId,
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: limit
    });

    return records.map(this.transformFromPrismaFormat);
  }

  /**
   * Aggregate weather data by time interval using TimescaleDB
   */
  async aggregateByInterval(
    locationId: string,
    interval: '15min' | '1hour' | '6hour' | '1day',
    hours: number
  ): Promise<Array<{
    timestamp: Date;
    avgTemperature: number;
    maxTemperature: number;
    minTemperature: number;
    avgHumidity: number;
    avgPressure: number;
    avgWindSpeed: number;
    maxWindSpeed: number;
    avgCloudCover: number;
    avgGhi?: number;
    maxGhi?: number;
    avgDni?: number;
    maxDni?: number;
    recordCount: number;
  }>> {
    // Validate parameters
    this.validateGuidFormat(locationId);

    if (!['15min', '1hour', '6hour', '1day'].includes(interval)) {
      throw new Error('Invalid interval. Must be one of: 15min, 1hour, 6hour, 1day');
    }

    if (hours <= 0 || hours > 720) { // Max 30 days
      throw new Error('Hours must be positive and less than 720 (30 days)');
    }

    // Convert interval to TimescaleDB format
    const intervalMap = {
      '15min': '15 minutes',
      '1hour': '1 hour',
      '6hour': '6 hours',
      '1day': '1 day'
    };

    const result = await TimescaleQueries.timeBucket({
      interval: intervalMap[interval] as any,
      table: 'weather_data',
      aggregations: {
        avg: ['temperature', 'humidity', 'pressure', 'windSpeed', 'cloudCover', 'ghi', 'dni'],
        max: ['temperature', 'windSpeed', 'ghi', 'dni'],
        min: ['temperature'],
        count: ['*']
      },
      where: `location_id = '${locationId}' AND timestamp >= NOW() - INTERVAL '${hours} hours'`,
      groupBy: ['location_id'],
      orderBy: 'bucket DESC',
      limit: Math.ceil(hours / (interval === '1day' ? 24 : interval === '6hour' ? 6 : 1))
    });

    return result.map((row: any) => ({
      timestamp: new Date(row.bucket),
      avgTemperature: parseFloat(row.avg_temperature) || 0,
      maxTemperature: parseFloat(row.max_temperature) || 0,
      minTemperature: parseFloat(row.min_temperature) || 0,
      avgHumidity: parseFloat(row.avg_humidity) || 0,
      avgPressure: parseFloat(row.avg_pressure) || 0,
      avgWindSpeed: parseFloat(row.avg_wind_speed) || 0,
      maxWindSpeed: parseFloat(row.max_wind_speed) || 0,
      avgCloudCover: parseFloat(row.avg_cloud_cover) || 0,
      avgGhi: row.avg_ghi ? parseFloat(row.avg_ghi) : undefined,
      maxGhi: row.max_ghi ? parseFloat(row.max_ghi) : undefined,
      avgDni: row.avg_dni ? parseFloat(row.avg_dni) : undefined,
      maxDni: row.max_dni ? parseFloat(row.max_dni) : undefined,
      recordCount: parseInt(row.count) || 0
    }));
  }

  /**
   * Find weather record by ID
   */
  async findById(id: string): Promise<WeatherData | null> {
    this.validateGuidFormat(id);

    const record = await db.weatherData.findUnique({
      where: { id }
    });

    return record ? this.transformFromPrismaFormat(record) : null;
  }

  /**
   * Delete weather data older than specified date
   */
  async deleteOlderThan(date: Date): Promise<number> {
    const result = await db.weatherData.deleteMany({
      where: {
        timestamp: {
          lt: date
        }
      }
    });

    return result.count;
  }

  /**
   * Get latest weather record for a location
   */
  async getLatest(locationId: string): Promise<WeatherData | null> {
    this.validateGuidFormat(locationId);

    const record = await db.weatherData.findFirst({
      where: { locationId },
      orderBy: {
        timestamp: 'desc'
      }
    });

    return record ? this.transformFromPrismaFormat(record) : null;
  }

  /**
   * Count weather records for a location
   */
  async count(locationId: string, startDate?: Date, endDate?: Date): Promise<number> {
    this.validateGuidFormat(locationId);

    const whereClause: any = { locationId };

    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) whereClause.timestamp.gte = startDate;
      if (endDate) whereClause.timestamp.lte = endDate;
    }

    return await db.weatherData.count({
      where: whereClause
    });
  }

  /**
   * Validate weather data batch before insert
   */
  private validateWeatherDataBatch(weatherData: WeatherData[]): void {
    for (const record of weatherData) {
      // Validate GUID formats
      this.validateGuidFormat(record.id);
      this.validateGuidFormat(record.locationId);

      // Validate temperature range (-100°C to +70°C)
      if (record.temperature < -100 || record.temperature > 70) {
        throw new Error(`Invalid temperature value: ${record.temperature}. Must be between -100°C and +70°C`);
      }

      // Validate humidity range (0% to 100%)
      if (record.humidity < 0 || record.humidity > 100) {
        throw new Error(`Invalid humidity value: ${record.humidity}. Must be between 0% and 100%`);
      }

      // Validate pressure range (800 hPa to 1200 hPa)
      if (record.pressure < 800 || record.pressure > 1200) {
        throw new Error(`Invalid pressure value: ${record.pressure}. Must be between 800 and 1200 hPa`);
      }

      // Validate wind speed (0 to 200 m/s)
      if (record.windSpeed < 0 || record.windSpeed > 200) {
        throw new Error(`Invalid wind speed value: ${record.windSpeed}. Must be between 0 and 200 m/s`);
      }

      // Validate cloud cover (0% to 100%)
      if (record.cloudCover < 0 || record.cloudCover > 100) {
        throw new Error(`Invalid cloud cover value: ${record.cloudCover}. Must be between 0% and 100%`);
      }

      // Validate solar radiation values (if present)
      if (record.ghi !== null && record.ghi !== undefined && (record.ghi < 0 || record.ghi > 1500)) {
        throw new Error(`Invalid solar radiation value (GHI): ${record.ghi}. Must be between 0 and 1500 W/m²`);
      }

      if (record.dni !== null && record.dni !== undefined && (record.dni < 0 || record.dni > 1200)) {
        throw new Error(`Invalid solar radiation value (DNI): ${record.dni}. Must be between 0 and 1200 W/m²`);
      }

      if (record.dhi !== null && record.dhi !== undefined && (record.dhi < 0 || record.dhi > 800)) {
        throw new Error(`Invalid solar radiation value (DHI): ${record.dhi}. Must be between 0 and 800 W/m²`);
      }
    }
  }

  /**
   * Validate GUID format
   */
  private validateGuidFormat(guid: string): void {
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!guidRegex.test(guid)) {
      throw new Error(`Invalid GUID format: ${guid}`);
    }
  }

  /**
   * Transform WeatherData to Prisma format
   */
  private transformToPrismaFormat(weatherData: WeatherData): any {
    return {
      id: weatherData.id,
      timestamp: weatherData.timestamp,
      time: weatherData.time,
      locationId: weatherData.locationId,

      // Basic weather metrics
      temperature: weatherData.temperature,
      humidity: weatherData.humidity,
      pressure: weatherData.pressure,
      windSpeed: weatherData.windSpeed,
      windDirection: weatherData.windDirection,
      cloudCover: weatherData.cloudCover,
      visibility: weatherData.visibility || null,
      precipitation: weatherData.precipitation || null,
      precipitationType: weatherData.precipitationType || null,

      // Solar radiation components
      ghi: weatherData.ghi || null,
      dni: weatherData.dni || null,
      dhi: weatherData.dhi || null,
      gti: weatherData.gti || null,
      extraterrestrial: weatherData.extraterrestrial || null,

      // Solar position
      solarZenith: weatherData.solarZenith || null,
      solarAzimuth: weatherData.solarAzimuth || null,
      solarElevation: weatherData.solarElevation || null,
      airMass: weatherData.airMass || null,

      // Additional metrics
      albedo: weatherData.albedo || null,
      soilingLoss: weatherData.soilingLoss || null,
      snowDepth: weatherData.snowDepth || null,
      moduleTemp: weatherData.moduleTemp || null,

      // Source and quality
      source: weatherData.source,
      stationId: weatherData.stationId || null,
      dataQuality: weatherData.dataQuality
    };
  }

  /**
   * Transform from Prisma format to WeatherData
   */
  private transformFromPrismaFormat(record: any): WeatherData {
    return {
      id: record.id,
      timestamp: record.timestamp,
      time: record.time,
      locationId: record.locationId,

      // Basic weather metrics
      temperature: record.temperature,
      humidity: record.humidity,
      pressure: record.pressure,
      windSpeed: record.windSpeed,
      windDirection: record.windDirection,
      cloudCover: record.cloudCover,
      visibility: record.visibility,
      precipitation: record.precipitation,
      precipitationType: record.precipitationType,

      // Solar radiation components
      ghi: record.ghi,
      dni: record.dni,
      dhi: record.dhi,
      gti: record.gti,
      extraterrestrial: record.extraterrestrial,

      // Solar position
      solarZenith: record.solarZenith,
      solarAzimuth: record.solarAzimuth,
      solarElevation: record.solarElevation,
      airMass: record.airMass,

      // Additional metrics
      albedo: record.albedo,
      soilingLoss: record.soilingLoss,
      snowDepth: record.snowDepth,
      moduleTemp: record.moduleTemp,

      // Source and quality
      source: record.source,
      stationId: record.stationId,
      dataQuality: record.dataQuality as DataQuality
    };
  }
}