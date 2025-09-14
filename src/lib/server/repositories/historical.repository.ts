import { db } from '../database';
import type { Prisma } from '@prisma/client';
import type { 
  HistoricalDataRequest, 
  HistoricalDataPoint, 
  HistoricalDataMetadata,
  HistoricalStatistics,
  DataQualityLevel,
  LocationMetadata,
  LocationComparison,
  SeasonalPattern,
  AccuracyByHorizon,
  DataIssue
} from '$lib/types/historical';
import { AggregationType, aggregationTypeToSQLInterval, calculateDataQualityLevel } from '$lib/types/historical';

// Repository for TimescaleDB-optimized historical data queries
export class HistoricalRepository {

  // Main method to get historical data with all optimization
  async getHistoricalData(request: HistoricalDataRequest): Promise<{
    data: HistoricalDataPoint[];
    metadata: HistoricalDataMetadata;
  }> {
    const startTime = Date.now();
    
    // Validate and prepare parameters
    const locationIds = request.locationIds || (request.locationId ? [request.locationId] : []);
    if (locationIds.length === 0) {
      throw new Error('At least one location ID must be provided');
    }
    
    const startDate = new Date(request.startDate);
    const endDate = new Date(request.endDate);
    
    // Get locations metadata
    const locationsMetadata = await this.getLocationsMetadata(locationIds, startDate, endDate);
    
    // Get aggregated data based on aggregation type
    const data = await this.getAggregatedData(request, startDate, endDate);
    
    // Calculate processing time
    const queryTimeMs = Date.now() - startTime;
    
    // Build metadata
    const metadata: HistoricalDataMetadata = {
      request: {
        locationIds,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        aggregation: request.aggregation,
        timezone: request.timezone || 'UTC'
      },
      response: {
        totalRecords: data.length,
        locations: locationsMetadata,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          dayCount: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        },
        processing: {
          queryTimeMs,
          generatedAt: new Date().toISOString()
        }
      }
    };
    
    return { data, metadata };
  }

  // TimescaleDB-optimized aggregated data retrieval
  private async getAggregatedData(
    request: HistoricalDataRequest,
    startDate: Date,
    endDate: Date
  ): Promise<HistoricalDataPoint[]> {
    const locationIds = request.locationIds || (request.locationId ? [request.locationId] : []);
    
    // Build the aggregation query based on type
    if (request.aggregation === AggregationType.RAW) {
      return this.getRawData(request, startDate, endDate);
    }
    
    // For aggregated data, use TimescaleDB's time_bucket function
    const timeInterval = aggregationTypeToSQLInterval(request.aggregation);
    
    // Base production query with aggregation
    const productionQuery = `
      SELECT 
        time_bucket('${timeInterval}', timestamp) as bucket_time,
        location_id,
        AVG(power_mw) as avg_power_mw,
        SUM(energy_mwh) as total_energy_mwh,
        AVG(capacity_factor) as avg_capacity_factor,
        AVG(performance_ratio) as avg_performance_ratio,
        AVG(efficiency) as avg_efficiency,
        AVG(availability) as avg_availability,
        COUNT(*) as sample_count,
        MIN(data_quality::text) as min_data_quality
      FROM production 
      WHERE location_id = ANY($1)
        AND timestamp >= $2 
        AND timestamp <= $3
        AND data_quality IN ('GOOD', 'ESTIMATED', 'INTERPOLATED')
      GROUP BY bucket_time, location_id
      ORDER BY bucket_time ASC, location_id ASC
    `;

    try {
      // Execute the aggregation query using raw SQL for TimescaleDB optimization
      const productionResults = await db.$queryRaw`
        SELECT 
          time_bucket(${timeInterval}::interval, timestamp) as bucket_time,
          location_id,
          AVG(power_mw) as avg_power_mw,
          SUM(energy_mwh) as total_energy_mwh,
          AVG(NULLIF(capacity_factor, 0)) as avg_capacity_factor,
          AVG(NULLIF(performance_ratio, 0)) as avg_performance_ratio,
          AVG(NULLIF(efficiency, 0)) as avg_efficiency,
          AVG(NULLIF(availability, 0)) as avg_availability,
          COUNT(*) as sample_count
        FROM production 
        WHERE location_id = ANY(${locationIds})
          AND timestamp >= ${startDate}
          AND timestamp <= ${endDate}
          AND data_quality IN ('GOOD', 'ESTIMATED', 'INTERPOLATED')
        GROUP BY bucket_time, location_id
        ORDER BY bucket_time ASC, location_id ASC
      ` as any[];

      // Get weather data if requested
      let weatherResults: any[] = [];
      if (request.includeWeather) {
        weatherResults = await db.$queryRaw`
          SELECT 
            time_bucket(${timeInterval}::interval, timestamp) as bucket_time,
            location_id,
            AVG(ghi) as avg_ghi,
            AVG(dni) as avg_dni,
            AVG(dhi) as avg_dhi,
            AVG(gti) as avg_gti,
            AVG(temperature) as avg_temperature,
            AVG(wind_speed) as avg_wind_speed,
            AVG(humidity) as avg_humidity,
            AVG(cloud_cover) as avg_cloud_cover
          FROM weather_data 
          WHERE location_id = ANY(${locationIds})
            AND timestamp >= ${startDate}
            AND timestamp <= ${endDate}
            AND data_quality IN ('GOOD', 'ESTIMATED')
          GROUP BY bucket_time, location_id
          ORDER BY bucket_time ASC, location_id ASC
        ` as any[];
      }

      // Get forecast data if requested
      let forecastResults: any[] = [];
      if (request.includeForecast) {
        forecastResults = await db.$queryRaw`
          SELECT 
            time_bucket(${timeInterval}::interval, timestamp) as bucket_time,
            location_id,
            AVG(power_mw) as avg_forecast_mw,
            AVG(power_mwq10) as avg_q10,
            AVG(power_mwq90) as avg_q90,
            AVG(confidence_level) as avg_confidence,
            model_type
          FROM forecasts 
          WHERE location_id = ANY(${locationIds})
            AND timestamp >= ${startDate}
            AND timestamp <= ${endDate}
            AND data_quality = 'GOOD'
          GROUP BY bucket_time, location_id, model_type
          ORDER BY bucket_time ASC, location_id ASC
        ` as any[];
      }

      // Get location names for metadata
      const locations = await db.location.findMany({
        where: { id: { in: locationIds } },
        select: { id: true, name: true }
      });
      
      const locationMap = new Map(locations.map(l => [l.id, l.name]));

      // Combine and format the results
      return this.combineAggregatedResults(
        productionResults,
        weatherResults,
        forecastResults,
        locationMap,
        request.aggregation
      );

    } catch (error) {
      console.error('TimescaleDB aggregation query failed:', error);
      // Fallback to Prisma aggregation if raw SQL fails
      return this.fallbackAggregation(request, startDate, endDate);
    }
  }

  // Raw data retrieval (no aggregation)
  private async getRawData(
    request: HistoricalDataRequest,
    startDate: Date,
    endDate: Date
  ): Promise<HistoricalDataPoint[]> {
    const locationIds = request.locationIds || (request.locationId ? [request.locationId] : []);
    
    // For raw data, limit the time range to prevent performance issues
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 30) {
      throw new Error('Raw data queries are limited to 30 days maximum');
    }

    const productionData = await db.production.findMany({
      where: {
        locationId: { in: locationIds },
        timestamp: { gte: startDate, lte: endDate },
        dataQuality: { in: ['GOOD', 'ESTIMATED', 'INTERPOLATED'] }
      },
      select: {
        timestamp: true,
        locationId: true,
        powerMW: true,
        energyMWh: true,
        capacityFactor: true,
        performanceRatio: true,
        efficiency: true,
        availability: true,
        dataQuality: true,
        location: {
          select: { name: true }
        }
      },
      orderBy: [
        { timestamp: 'asc' },
        { locationId: 'asc' }
      ]
    });

    // Convert to HistoricalDataPoint format
    return productionData.map(prod => ({
      timestamp: prod.timestamp.toISOString(),
      locationId: prod.locationId,
      locationName: prod.location?.name,
      production: {
        powerMW: prod.powerMW,
        energyMWh: prod.energyMWh || 0,
        capacityFactor: prod.capacityFactor || 0,
        performanceRatio: prod.performanceRatio || 0,
        efficiency: prod.efficiency || 0,
        availability: prod.availability || 0
      },
      dataQuality: {
        production: prod.dataQuality as DataQualityLevel,
        overall: prod.dataQuality as DataQualityLevel
      }
    }));
  }

  // Combine aggregated results from multiple queries
  private combineAggregatedResults(
    productionResults: any[],
    weatherResults: any[],
    forecastResults: any[],
    locationMap: Map<number, string>,
    aggregationType: AggregationType
  ): HistoricalDataPoint[] {
    // Create maps for efficient lookup
    const weatherMap = new Map<string, any>();
    weatherResults.forEach(w => {
      const key = `${w.bucket_time.toISOString()}_${w.location_id}`;
      weatherMap.set(key, w);
    });

    const forecastMap = new Map<string, any>();
    forecastResults.forEach(f => {
      const key = `${f.bucket_time.toISOString()}_${f.location_id}`;
      forecastMap.set(key, f);
    });

    // Combine all data
    return productionResults.map(prod => {
      const timestamp = prod.bucket_time.toISOString();
      const locationId = Number(prod.location_id);
      const key = `${timestamp}_${locationId}`;
      
      const weather = weatherMap.get(key);
      const forecast = forecastMap.get(key);

      const dataPoint: HistoricalDataPoint = {
        timestamp,
        locationId,
        locationName: locationMap.get(locationId),
        production: {
          powerMW: Number(prod.avg_power_mw) || 0,
          energyMWh: Number(prod.total_energy_mwh) || 0,
          capacityFactor: Number(prod.avg_capacity_factor) || 0,
          performanceRatio: Number(prod.avg_performance_ratio) || 0,
          efficiency: Number(prod.avg_efficiency) || 0,
          availability: Number(prod.avg_availability) || 0
        },
        dataQuality: {
          production: DataQualityLevel.GOOD,
          overall: DataQualityLevel.GOOD
        },
        aggregationInfo: {
          sampleCount: Number(prod.sample_count) || 0,
          aggregationType,
          timeWindow: aggregationTypeToSQLInterval(aggregationType)
        }
      };

      // Add weather data if available
      if (weather) {
        dataPoint.weather = {
          ghi: Number(weather.avg_ghi) || 0,
          dni: Number(weather.avg_dni) || 0,
          dhi: Number(weather.avg_dhi) || 0,
          gti: Number(weather.avg_gti) || 0,
          temperature: Number(weather.avg_temperature) || 0,
          windSpeed: Number(weather.avg_wind_speed) || 0,
          humidity: Number(weather.avg_humidity) || 0,
          cloudCover: Number(weather.avg_cloud_cover) || 0
        };
        dataPoint.dataQuality.weather = DataQualityLevel.GOOD;
      }

      // Add forecast data if available
      if (forecast) {
        dataPoint.forecast = {
          powerMW: Number(forecast.avg_forecast_mw) || 0,
          powerMWQ10: Number(forecast.avg_q10) || 0,
          powerMWQ90: Number(forecast.avg_q90) || 0,
          confidenceLevel: Number(forecast.avg_confidence) || 0,
          modelType: forecast.model_type
        };
        dataPoint.dataQuality.forecast = DataQualityLevel.GOOD;
      }

      return dataPoint;
    });
  }

  // Fallback aggregation using Prisma (if raw SQL fails)
  private async fallbackAggregation(
    request: HistoricalDataRequest,
    startDate: Date,
    endDate: Date
  ): Promise<HistoricalDataPoint[]> {
    console.warn('Using fallback aggregation method');
    
    const locationIds = request.locationIds || (request.locationId ? [request.locationId] : []);
    
    // Simple Prisma-based aggregation (less efficient but more compatible)
    const productionData = await db.production.findMany({
      where: {
        locationId: { in: locationIds },
        timestamp: { gte: startDate, lte: endDate },
        dataQuality: { in: ['GOOD', 'ESTIMATED', 'INTERPOLATED'] }
      },
      select: {
        timestamp: true,
        locationId: true,
        powerMW: true,
        energyMWh: true,
        capacityFactor: true,
        performanceRatio: true,
        efficiency: true,
        availability: true,
        dataQuality: true,
        location: {
          select: { name: true }
        }
      },
      orderBy: [
        { timestamp: 'asc' },
        { locationId: 'asc' }
      ]
    });

    // Apply aggregation in memory (simplified)
    return this.applyInMemoryAggregation(productionData, request.aggregation);
  }

  // Simple in-memory aggregation for fallback
  private applyInMemoryAggregation(data: any[], aggregationType: AggregationType): HistoricalDataPoint[] {
    if (aggregationType === AggregationType.RAW) {
      return data.map(d => ({
        timestamp: d.timestamp.toISOString(),
        locationId: d.locationId,
        locationName: d.location?.name,
        production: {
          powerMW: d.powerMW,
          energyMWh: d.energyMWh || 0,
          capacityFactor: d.capacityFactor || 0,
          performanceRatio: d.performanceRatio || 0,
          efficiency: d.efficiency || 0,
          availability: d.availability || 0
        },
        dataQuality: {
          production: d.dataQuality as DataQualityLevel,
          overall: d.dataQuality as DataQualityLevel
        }
      }));
    }

    // Group by time buckets and location
    const buckets = new Map<string, any[]>();
    const intervalMinutes = this.getAggregationMinutes(aggregationType);

    data.forEach(d => {
      const timestamp = new Date(d.timestamp);
      const bucketTime = this.roundToInterval(timestamp, intervalMinutes);
      const key = `${bucketTime.toISOString()}_${d.locationId}`;
      
      if (!buckets.has(key)) {
        buckets.set(key, []);
      }
      buckets.get(key)!.push(d);
    });

    // Aggregate each bucket
    return Array.from(buckets.entries()).map(([key, records]) => {
      const [timestampStr, locationIdStr] = key.split('_');
      const timestamp = timestampStr;
      const locationId = locationIdStr;
      const locationName = records[0]?.location?.name;

      // Calculate averages
      const avgPower = records.reduce((sum, r) => sum + r.powerMW, 0) / records.length;
      const totalEnergy = records.reduce((sum, r) => sum + (r.energyMWh || 0), 0);
      const avgCapacityFactor = records.reduce((sum, r) => sum + (r.capacityFactor || 0), 0) / records.length;
      const avgPerformanceRatio = records.reduce((sum, r) => sum + (r.performanceRatio || 0), 0) / records.length;
      const avgEfficiency = records.reduce((sum, r) => sum + (r.efficiency || 0), 0) / records.length;
      const avgAvailability = records.reduce((sum, r) => sum + (r.availability || 0), 0) / records.length;

      return {
        timestamp,
        locationId,
        locationName,
        production: {
          powerMW: avgPower,
          energyMWh: totalEnergy,
          capacityFactor: avgCapacityFactor,
          performanceRatio: avgPerformanceRatio,
          efficiency: avgEfficiency,
          availability: avgAvailability
        },
        dataQuality: {
          production: DataQualityLevel.GOOD,
          overall: DataQualityLevel.GOOD
        },
        aggregationInfo: {
          sampleCount: records.length,
          aggregationType,
          timeWindow: `${intervalMinutes} minutes`
        }
      };
    }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  // Get locations metadata for response
  async getLocationsMetadata(
    locationIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<LocationMetadata[]> {
    const locations = await db.location.findMany({
      where: { id: { in: locationIds } },
      select: {
        id: true,
        name: true,
        capacityMW: true,
        _count: {
          select: {
            production: {
              where: {
                timestamp: { gte: startDate, lte: endDate }
              }
            }
          }
        }
      }
    });

    // Calculate expected data points
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const expectedPoints = Math.ceil(daysDiff * 24 * 4); // 15-minute intervals

    return locations.map(loc => {
      const actualPoints = loc._count.production;
      const availability = expectedPoints > 0 ? (actualPoints / expectedPoints) * 100 : 0;
      
      return {
        id: loc.id,
        name: loc.name,
        capacityMW: loc.capacityMW || 0,
        recordCount: actualPoints,
        dataAvailability: {
          production: availability,
          weather: availability * 0.9, // Estimate
          forecast: availability * 0.8  // Estimate
        },
        qualityScore: Math.min(100, availability)
      };
    });
  }

  // Calculate detailed statistics
  async calculateStatistics(
    request: HistoricalDataRequest,
    data: HistoricalDataPoint[]
  ): Promise<HistoricalStatistics> {
    if (data.length === 0) {
      throw new Error('No data available for statistics calculation');
    }

    const startDate = new Date(request.startDate);
    const endDate = new Date(request.endDate);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Production statistics
    const productionStats = this.calculateProductionStatistics(data);
    
    // Weather correlation (if weather data included)
    const weatherStats = request.includeWeather ? this.calculateWeatherStatistics(data) : undefined;
    
    // Forecast accuracy (if forecast data included)
    const forecastStats = request.includeForecast ? await this.calculateForecastAccuracy(data) : undefined;
    
    // Data quality summary
    const dataQuality = this.calculateDataQualitySummary(data);
    
    return {
      production: productionStats,
      weather: weatherStats,
      forecastAccuracy: forecastStats,
      dataQuality,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalDays,
        operationalDays: Math.floor(totalDays * 0.95), // Estimate
        maintenanceDays: Math.ceil(totalDays * 0.05),   // Estimate
        aggregationType: request.aggregation
      }
    };
  }

  // Helper methods for statistics calculation
  private calculateProductionStatistics(data: HistoricalDataPoint[]) {
    const validProduction = data.filter(d => d.production && d.production.powerMW > 0);
    
    const totalEnergy = validProduction.reduce((sum, d) => sum + (d.production?.energyMWh || 0), 0);
    const peakPower = Math.max(...validProduction.map(d => d.production?.powerMW || 0));
    const averagePower = validProduction.reduce((sum, d) => sum + (d.production?.powerMW || 0), 0) / validProduction.length;
    
    const averageCapacityFactor = validProduction.reduce((sum, d) => sum + (d.production?.capacityFactor || 0), 0) / validProduction.length;
    const averagePerformanceRatio = validProduction.reduce((sum, d) => sum + (d.production?.performanceRatio || 0), 0) / validProduction.length;
    const averageEfficiency = validProduction.reduce((sum, d) => sum + (d.production?.efficiency || 0), 0) / validProduction.length;
    const averageAvailability = validProduction.reduce((sum, d) => sum + (d.production?.availability || 0), 0) / validProduction.length;

    // Calculate seasonal patterns (simplified)
    const seasonalPatterns = this.calculateSeasonalPatterns(data);

    return {
      total: {
        energyMWh: totalEnergy,
        peakPowerMW: peakPower,
        averagePowerMW: averagePower,
        hours: validProduction.length * 0.25 // Assuming 15-min intervals
      },
      performance: {
        averageCapacityFactor,
        averagePerformanceRatio,
        averageEfficiency,
        averageAvailability
      },
      trends: {
        dailyAveragesMW: [], // Would need daily aggregation
        monthlyEnergyMWh: [], // Would need monthly aggregation
        seasonalPatterns
      }
    };
  }

  private calculateWeatherStatistics(data: HistoricalDataPoint[]) {
    const weatherData = data.filter(d => d.weather);
    
    if (weatherData.length === 0) {
      return undefined;
    }

    const avgGHI = weatherData.reduce((sum, d) => sum + (d.weather?.ghi || 0), 0) / weatherData.length;
    const avgTemp = weatherData.reduce((sum, d) => sum + (d.weather?.temperature || 0), 0) / weatherData.length;
    const avgWind = weatherData.reduce((sum, d) => sum + (d.weather?.windSpeed || 0), 0) / weatherData.length;

    // Calculate correlations (simplified)
    const irradianceProductionCorr = this.calculateCorrelation(
      weatherData.map(d => d.weather?.ghi || 0),
      weatherData.map(d => d.production?.powerMW || 0)
    );

    const temperatureEfficiencyCorr = this.calculateCorrelation(
      weatherData.map(d => d.weather?.temperature || 0),
      weatherData.map(d => d.production?.efficiency || 0)
    );

    return {
      averageGHI: avgGHI,
      averageTemperature: avgTemp,
      averageWindSpeed: avgWind,
      irradianceProductionCorrelation: irradianceProductionCorr,
      temperatureEfficiencyCorrelation: temperatureEfficiencyCorr
    };
  }

  private async calculateForecastAccuracy(data: HistoricalDataPoint[]) {
    const forecastData = data.filter(d => d.forecast && d.production);
    
    if (forecastData.length === 0) {
      return undefined;
    }

    // Calculate MAPE, RMSE, MAE
    const mape = this.calculateMAPE(
      forecastData.map(d => d.production!.powerMW),
      forecastData.map(d => d.forecast!.powerMW)
    );

    const rmse = this.calculateRMSE(
      forecastData.map(d => d.production!.powerMW),
      forecastData.map(d => d.forecast!.powerMW)
    );

    const mae = this.calculateMAE(
      forecastData.map(d => d.production!.powerMW),
      forecastData.map(d => d.forecast!.powerMW)
    );

    const r2 = this.calculateR2(
      forecastData.map(d => d.production!.powerMW),
      forecastData.map(d => d.forecast!.powerMW)
    );

    return {
      mape,
      rmse,
      mae,
      r2,
      accuracyByHorizon: [] // Would need horizon-specific analysis
    };
  }

  private calculateDataQualitySummary(data: HistoricalDataPoint[]) {
    const totalPoints = data.length;
    const goodQualityPoints = data.filter(d => 
      d.dataQuality.overall === DataQualityLevel.GOOD || 
      d.dataQuality.overall === DataQualityLevel.EXCELLENT
    ).length;

    const completeness = totalPoints > 0 ? (goodQualityPoints / totalPoints) * 100 : 0;
    const reliability = completeness; // Simplified
    const overallScore = (completeness + reliability) / 2;

    return {
      overallScore,
      completeness,
      reliability,
      issuesSummary: [] // Would analyze specific issues
    };
  }

  // Utility methods
  private calculateSeasonalPatterns(data: HistoricalDataPoint[]): SeasonalPattern[] {
    // Simplified seasonal pattern calculation
    return [
      {
        season: 'spring' as const,
        averageEnergyMWh: 0,
        averageCapacityFactor: 0,
        peakProductionMW: 0,
        characteristicCurve: new Array(24).fill(0)
      }
    ];
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const n = x.length;
    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.reduce((sum, val) => sum + val, 0) / n;
    
    let numerator = 0;
    let denomX = 0;
    let denomY = 0;
    
    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      numerator += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }
    
    const denominator = Math.sqrt(denomX * denomY);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateMAPE(actual: number[], forecast: number[]): number {
    const n = actual.length;
    let sum = 0;
    
    for (let i = 0; i < n; i++) {
      if (actual[i] !== 0) {
        sum += Math.abs((actual[i] - forecast[i]) / actual[i]);
      }
    }
    
    return (sum / n) * 100;
  }

  private calculateRMSE(actual: number[], forecast: number[]): number {
    const n = actual.length;
    let sum = 0;
    
    for (let i = 0; i < n; i++) {
      sum += Math.pow(actual[i] - forecast[i], 2);
    }
    
    return Math.sqrt(sum / n);
  }

  private calculateMAE(actual: number[], forecast: number[]): number {
    const n = actual.length;
    let sum = 0;
    
    for (let i = 0; i < n; i++) {
      sum += Math.abs(actual[i] - forecast[i]);
    }
    
    return sum / n;
  }

  private calculateR2(actual: number[], forecast: number[]): number {
    const actualMean = actual.reduce((sum, val) => sum + val, 0) / actual.length;
    
    let ssRes = 0;
    let ssTot = 0;
    
    for (let i = 0; i < actual.length; i++) {
      ssRes += Math.pow(actual[i] - forecast[i], 2);
      ssTot += Math.pow(actual[i] - actualMean, 2);
    }
    
    return ssTot === 0 ? 0 : 1 - (ssRes / ssTot);
  }

  private getAggregationMinutes(aggregationType: AggregationType): number {
    switch (aggregationType) {
      case AggregationType.FIFTEEN_MINUTES: return 15;
      case AggregationType.THIRTY_MINUTES: return 30;
      case AggregationType.HOURLY: return 60;
      case AggregationType.DAILY: return 1440;
      case AggregationType.WEEKLY: return 10080;
      case AggregationType.MONTHLY: return 43200;
      default: return 15;
    }
  }

  private roundToInterval(date: Date, intervalMinutes: number): Date {
    const ms = intervalMinutes * 60 * 1000;
    return new Date(Math.floor(date.getTime() / ms) * ms);
  }

  // Multi-location comparison queries
  async getLocationComparison(
    locationIds: number[],
    startDate: Date,
    endDate: Date,
    aggregationType: AggregationType
  ): Promise<LocationComparison> {
    // Implementation for location comparison would go here
    // This would include ranking, correlation analysis, etc.
    throw new Error('Location comparison not yet implemented');
  }

  // Export support methods
  async getDataForExport(
    request: HistoricalDataRequest,
    format: string
  ): Promise<any[]> {
    const { data } = await this.getHistoricalData(request);
    
    switch (format) {
      case 'csv':
        return this.formatForCSV(data);
      case 'xlsx':
        return this.formatForExcel(data);
      default:
        return data;
    }
  }

  private formatForCSV(data: HistoricalDataPoint[]): any[] {
    return data.map(point => ({
      timestamp: point.timestamp,
      location_id: point.locationId,
      location_name: point.locationName,
      power_mw: point.production?.powerMW || 0,
      energy_mwh: point.production?.energyMWh || 0,
      capacity_factor: point.production?.capacityFactor || 0,
      performance_ratio: point.production?.performanceRatio || 0,
      efficiency: point.production?.efficiency || 0,
      availability: point.production?.availability || 0,
      ghi: point.weather?.ghi || null,
      temperature: point.weather?.temperature || null,
      wind_speed: point.weather?.windSpeed || null,
      forecast_mw: point.forecast?.powerMW || null,
      data_quality: point.dataQuality.overall
    }));
  }

  private formatForExcel(data: HistoricalDataPoint[]): any[] {
    // Similar to CSV but with additional formatting for Excel
    return this.formatForCSV(data);
  }
}