import type { ModelType, ResolutionType } from '@prisma/client';

/**
 * Request interface for generating new solar forecasts
 */
export interface GenerateForecastRequest {
  /** Location ID (GUID) for which to generate forecast */
  locationId: string;

  /** Forecast horizon in hours (24, 48, 72) */
  horizonHours: number;

  /** Machine learning model type to use */
  modelType: ModelType;

  /** Time resolution for forecast data points */
  resolution: ResolutionType;

  /** Start time for forecast (defaults to current time) */
  startTime?: string;

  /** Optional forecast run description */
  description?: string;

  /** Override default model parameters */
  modelParameters?: {
    /** Learning rate for ML models */
    learningRate?: number;
    /** Feature selection criteria */
    features?: string[];
    /** Weather data inclusion */
    includeWeather?: boolean;
  };

  /** Force regeneration even if recent forecast exists */
  forceRegenerate?: boolean;
}

/**
 * Validation constraints for forecast generation
 */
export const FORECAST_CONSTRAINTS = {
  /** Minimum horizon in hours */
  MIN_HORIZON_HOURS: 1,
  /** Maximum horizon in hours */
  MAX_HORIZON_HOURS: 168, // 7 days
  /** Standard horizon options */
  STANDARD_HORIZONS: [24, 48, 72],
  /** Maximum description length */
  MAX_DESCRIPTION_LENGTH: 500
} as const;