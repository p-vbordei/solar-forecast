import type { ModelType, ForecastType, ResolutionType } from '@prisma/client';

/**
 * Individual forecast data point
 */
export interface ForecastDataPoint {
  /** Timestamp for this forecast point */
  timestamp: string;
  /** Forecasted power output in MW */
  powerMW: number;
  /** Forecasted energy in MWh */
  energyMWh?: number;
  /** Capacity factor (0-1) */
  capacityFactor?: number;
  /** Confidence intervals */
  confidence?: {
    /** 10th percentile (lower bound) */
    q10?: number;
    /** 25th percentile */
    q25?: number;
    /** 75th percentile */
    q75?: number;
    /** 90th percentile (upper bound) */
    q90?: number;
  };
}

/**
 * Forecast accuracy metrics
 */
export interface ForecastAccuracyMetrics {
  /** Mean Absolute Percentage Error */
  mape: number;
  /** Root Mean Square Error */
  rmse: number;
  /** Mean Absolute Error */
  mae: number;
  /** Mean Bias Error */
  mbe?: number;
  /** R-squared coefficient */
  r2?: number;
  /** Skill score vs persistence */
  skillScore?: number;
}

/**
 * Response interface for forecast operations
 */
export interface ForecastResponse {
  /** Unique forecast run ID */
  id: string;
  /** Location information */
  location: {
    id: string;
    name: string;
    city?: string;
    capacityMW: number;
  };
  /** Forecast metadata */
  metadata: {
    /** Model type used */
    modelType: ModelType;
    /** Model version */
    modelVersion?: string;
    /** Forecast type */
    forecastType: ForecastType;
    /** Time resolution */
    resolution: ResolutionType;
    /** Horizon in hours */
    horizonHours: number;
    /** Forecast run ID for tracking */
    runId?: string;
  };
  /** Timing information */
  timing: {
    /** When forecast was generated */
    createdAt: string;
    /** Start time of forecast period */
    forecastStart: string;
    /** End time of forecast period */
    forecastEnd: string;
  };
  /** Quality metrics */
  quality: {
    /** Overall accuracy percentage */
    accuracy?: number;
    /** Confidence level (0-100) */
    confidence?: number;
    /** Detailed accuracy metrics */
    metrics?: ForecastAccuracyMetrics;
  };
  /** Forecast data points (optional - depends on request) */
  data?: ForecastDataPoint[];
  /** Generation status */
  status: 'generating' | 'completed' | 'failed';
  /** Description or error message */
  message?: string;
}

/**
 * Response for forecast list operations
 */
export interface ForecastListResponse {
  /** Array of forecast summaries */
  forecasts: Omit<ForecastResponse, 'data'>[];
  /** Pagination information */
  pagination: {
    total: number;
    size: number;
    current: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  /** Applied filters */
  filters?: {
    locationId?: string;
    modelType?: ModelType;
    startDate?: string;
    endDate?: string;
    search?: string;
  };
}