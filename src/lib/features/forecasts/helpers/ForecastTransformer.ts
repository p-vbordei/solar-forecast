import type { Forecast, Location, ForecastAccuracy } from '@prisma/client';
import type { ForecastResponse, ForecastDataPoint, ForecastAccuracyMetrics } from '../models/responses/ForecastResponse';
import type { ForecastListResponse } from '../models/responses/ForecastResponse';
import type { GenerateForecastRequest } from '../models/requests/GenerateForecastRequest';

/**
 * Data transformation utility for forecast service
 */
export class ForecastTransformer {
  /**
   * Transform Prisma Forecast model to ForecastResponse
   */
  static toForecastResponse(
    forecast: Forecast & {
      location: Location;
      forecastAccuracy?: ForecastAccuracy[];
    },
    includeData: boolean = false
  ): ForecastResponse {
    // Calculate accuracy from forecast accuracy records
    const accuracy = forecast.forecastAccuracy && forecast.forecastAccuracy.length > 0
      ? this.calculateOverallAccuracy(forecast.forecastAccuracy)
      : undefined;

    // Calculate confidence level from accuracy
    const confidence = accuracy ? Math.min(100, Math.max(0, accuracy)) : forecast.confidenceLevel;

    return {
      id: forecast.id,
      location: {
        id: forecast.location.id,
        name: forecast.location.name,
        city: forecast.location.city || undefined,
        capacityMW: forecast.location.capacityMW
      },
      metadata: {
        modelType: forecast.modelType,
        modelVersion: forecast.modelVersion || undefined,
        forecastType: forecast.forecastType,
        resolution: forecast.resolution,
        horizonHours: forecast.horizonMinutes / 60,
        runId: forecast.runId || undefined
      },
      timing: {
        createdAt: forecast.createdAt.toISOString(),
        forecastStart: forecast.timestamp.toISOString(),
        forecastEnd: new Date(forecast.timestamp.getTime() + forecast.horizonMinutes * 60 * 1000).toISOString()
      },
      quality: {
        accuracy: accuracy,
        confidence: confidence || undefined,
        metrics: forecast.forecastAccuracy && forecast.forecastAccuracy.length > 0
          ? this.transformAccuracyMetrics(forecast.forecastAccuracy[0])
          : undefined
      },
      data: includeData ? this.transformForecastData(forecast) : undefined,
      status: this.determineForecastStatus(forecast),
      message: forecast.notes || undefined
    };
  }

  /**
   * Transform individual forecast to data points
   */
  private static transformForecastData(forecast: Forecast): ForecastDataPoint[] {
    // For now, create a single data point from the forecast record
    // In a full implementation, this would come from a related ForecastData table
    const dataPoint: ForecastDataPoint = {
      timestamp: forecast.timestamp.toISOString(),
      powerMW: forecast.powerMW,
      energyMWh: forecast.energyMWh || undefined,
      capacityFactor: forecast.capacityFactor || undefined,
      confidence: {
        q10: forecast.powerMWQ10 || undefined,
        q25: forecast.powerMWQ25 || undefined,
        q75: forecast.powerMWQ75 || undefined,
        q90: forecast.powerMWQ90 || undefined
      }
    };

    return [dataPoint];
  }

  /**
   * Transform ForecastAccuracy to metrics
   */
  private static transformAccuracyMetrics(accuracy: ForecastAccuracy): ForecastAccuracyMetrics {
    return {
      mape: accuracy.mape,
      rmse: accuracy.rmse,
      mae: accuracy.mae,
      mbe: accuracy.mbe || undefined,
      r2: accuracy.r2 || undefined,
      skillScore: accuracy.skillScore || undefined
    };
  }

  /**
   * Calculate overall accuracy from multiple accuracy records
   */
  private static calculateOverallAccuracy(accuracyRecords: ForecastAccuracy[]): number {
    if (accuracyRecords.length === 0) return 0;

    // Use inverse of MAPE as accuracy percentage (100 - MAPE)
    const avgMape = accuracyRecords.reduce((sum, acc) => sum + acc.mape, 0) / accuracyRecords.length;
    return Math.max(0, Math.min(100, 100 - avgMape));
  }

  /**
   * Determine forecast status based on timing and data
   */
  private static determineForecastStatus(forecast: Forecast): 'generating' | 'completed' | 'failed' {
    const now = new Date();
    const forecastTime = forecast.timestamp;
    const createdTime = forecast.createdAt;

    // If forecast was created very recently (< 5 minutes) and no data, might still be generating
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    if (createdTime > fiveMinutesAgo && !forecast.powerMW) {
      return 'generating';
    }

    // If we have power data, it's completed
    if (forecast.powerMW > 0) {
      return 'completed';
    }

    // If it's been more than 5 minutes and no data, consider failed
    if (createdTime < fiveMinutesAgo && !forecast.powerMW) {
      return 'failed';
    }

    return 'completed';
  }

  /**
   * Transform array of forecasts to list response
   */
  static toForecastListResponse(
    forecasts: (Forecast & { location: Location; forecastAccuracy?: ForecastAccuracy[] })[],
    total: number,
    limit: number,
    offset: number,
    filters?: any
  ): ForecastListResponse {
    const current = Math.floor(offset / limit) + 1;
    const hasNext = offset + limit < total;
    const hasPrev = offset > 0;

    return {
      forecasts: forecasts.map(f => this.toForecastResponse(f, false)),
      pagination: {
        total,
        size: limit,
        current,
        hasNext,
        hasPrev
      },
      filters
    };
  }

  /**
   * Transform GenerateForecastRequest to Prisma create data
   */
  static toForecastCreateData(request: GenerateForecastRequest, locationId: string): any {
    const startTime = request.startTime ? new Date(request.startTime) : new Date();

    return {
      locationId: request.locationId,
      timestamp: startTime,
      modelType: request.modelType,
      modelVersion: '1.0', // Default version
      forecastType: 'OPERATIONAL',
      resolution: request.resolution,
      horizonMinutes: request.horizonHours * 60,
      horizonDays: Math.ceil(request.horizonHours / 24),
      runId: this.generateRunId(),

      // Initialize with placeholder values - will be updated by Python worker
      powerMW: 0,
      powerOutputMW: 0,
      energyMWh: 0,
      capacityFactor: 0,

      // Confidence intervals (will be set by ML model)
      powerMWQ10: null,
      powerMWQ25: null,
      powerMWQ75: null,
      powerMWQ90: null,
      powerMWLower: null,
      powerMWUpper: null,
      confidence: null,
      confidenceLevel: null,

      // Quality metrics
      qualityScore: null,
      dataQualityFlags: null,
      validationStatus: 'PENDING',

      // Metadata
      notes: request.description || null,
      processingTime: null,
      pythonWorkerVersion: null,

      // Timestamps
      forecastGeneratedAt: null,
      validatedAt: null,

      // Status
      isActive: true,
      version: 1
    };
  }

  /**
   * Generate unique run ID for forecast tracking
   */
  private static generateRunId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `run_${timestamp}_${random}`;
  }

  /**
   * Transform Python worker response to Prisma update data
   */
  static transformPythonWorkerResponse(pythonResponse: any): any {
    return {
      // Core forecast values
      powerMW: pythonResponse.power_mw || 0,
      powerOutputMW: pythonResponse.power_mw || 0,
      energyMWh: pythonResponse.energy_mwh || null,
      capacityFactor: pythonResponse.capacity_factor || null,

      // Confidence intervals
      powerMWQ10: pythonResponse.confidence_intervals?.q10 || null,
      powerMWQ25: pythonResponse.confidence_intervals?.q25 || null,
      powerMWQ75: pythonResponse.confidence_intervals?.q75 || null,
      powerMWQ90: pythonResponse.confidence_intervals?.q90 || null,

      // Quality metrics
      qualityScore: pythonResponse.quality_score || null,
      confidenceLevel: pythonResponse.confidence_level || null,

      // Processing metadata
      processingTime: pythonResponse.processing_time_ms || null,
      pythonWorkerVersion: pythonResponse.worker_version || null,

      // Status updates
      forecastGeneratedAt: new Date(),
      validationStatus: 'COMPLETED',

      // Update timestamp
      updatedAt: new Date()
    };
  }

  /**
   * Extract location IDs from forecast array for eager loading
   */
  static extractLocationIds(forecasts: Forecast[]): string[] {
    return [...new Set(forecasts.map(f => f.locationId))];
  }

  /**
   * Group forecasts by location for batch processing
   */
  static groupForecastsByLocation(forecasts: Forecast[]): Map<string, Forecast[]> {
    const grouped = new Map<string, Forecast[]>();

    for (const forecast of forecasts) {
      const locationId = forecast.locationId;
      if (!grouped.has(locationId)) {
        grouped.set(locationId, []);
      }
      grouped.get(locationId)!.push(forecast);
    }

    return grouped;
  }

  /**
   * Calculate pagination metadata
   */
  static calculatePagination(total: number, limit: number, offset: number) {
    const current = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(total / limit);

    return {
      total,
      size: limit,
      current,
      totalPages,
      hasNext: current < totalPages,
      hasPrev: current > 1,
      nextOffset: current < totalPages ? offset + limit : null,
      prevOffset: current > 1 ? Math.max(0, offset - limit) : null
    };
  }
}