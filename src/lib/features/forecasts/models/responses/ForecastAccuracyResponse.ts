import type { ModelType } from '@prisma/client';

/**
 * Accuracy metrics for a specific time horizon
 */
export interface HorizonAccuracy {
  /** Forecast horizon in hours */
  horizonHours: number;
  /** Mean Absolute Percentage Error for this horizon */
  mape: number;
  /** Root Mean Square Error for this horizon */
  rmse: number;
  /** Mean Absolute Error for this horizon */
  mae: number;
  /** Number of samples for this horizon */
  sampleCount: number;
}

/**
 * Model performance comparison
 */
export interface ModelPerformance {
  /** Model type */
  modelType: ModelType;
  /** Model version */
  modelVersion?: string;
  /** Overall accuracy metrics */
  overall: {
    mape: number;
    rmse: number;
    mae: number;
    r2?: number;
    skillScore?: number;
  };
  /** Accuracy by forecast horizon */
  byHorizon: HorizonAccuracy[];
  /** Number of forecasts analyzed */
  forecastCount: number;
  /** Date range of analysis */
  dateRange: {
    start: string;
    end: string;
  };
}

/**
 * Location-specific accuracy metrics
 */
export interface LocationAccuracy {
  /** Location information */
  location: {
    id: string;
    name: string;
    city?: string;
    capacityMW: number;
  };
  /** Accuracy metrics for this location */
  accuracy: {
    mape: number;
    rmse: number;
    mae: number;
    confidence: number;
  };
  /** Best performing model for this location */
  bestModel: ModelType;
  /** Number of forecasts for this location */
  forecastCount: number;
  /** Last forecast accuracy */
  lastForecastAccuracy?: number;
}

/**
 * Time-based accuracy trends
 */
export interface AccuracyTrend {
  /** Date/time period */
  period: string;
  /** Average accuracy for this period */
  accuracy: number;
  /** MAPE for this period */
  mape: number;
  /** Number of forecasts in this period */
  forecastCount: number;
  /** Weather conditions impact */
  weatherImpact?: 'low' | 'medium' | 'high';
}

/**
 * Response interface for forecast accuracy operations
 */
export interface ForecastAccuracyResponse {
  /** Summary statistics */
  summary: {
    /** Overall system accuracy */
    overallAccuracy: number;
    /** Best performing model */
    bestModel: ModelType;
    /** Total forecasts analyzed */
    totalForecasts: number;
    /** Analysis time period */
    period: {
      start: string;
      end: string;
    };
  };
  /** Performance by model type */
  modelPerformance: ModelPerformance[];
  /** Accuracy by location */
  locationAccuracy: LocationAccuracy[];
  /** Accuracy trends over time */
  trends: AccuracyTrend[];
  /** Recommendations for improvement */
  recommendations?: {
    /** Suggested model improvements */
    modelSuggestions: string[];
    /** Data quality issues identified */
    dataQualityIssues: string[];
    /** Calibration recommendations */
    calibrationNeeds: string[];
  };
}

/**
 * Real-time accuracy dashboard response
 */
export interface AccuracyDashboardResponse {
  /** Current system status */
  status: {
    /** Overall health */
    health: 'excellent' | 'good' | 'fair' | 'poor';
    /** Active forecasts count */
    activeForecasts: number;
    /** Last update timestamp */
    lastUpdate: string;
  };
  /** Key performance indicators */
  kpis: {
    /** Current accuracy percentage */
    currentAccuracy: number;
    /** 24h average accuracy */
    accuracy24h: number;
    /** 7-day average accuracy */
    accuracy7d: number;
    /** Month-to-date accuracy */
    accuracyMTD: number;
  };
  /** Recent forecast performance */
  recentPerformance: {
    /** Last 10 forecasts average accuracy */
    recent10: number;
    /** Accuracy trend (improving/declining/stable) */
    trend: 'improving' | 'declining' | 'stable';
    /** Percentage change from previous period */
    changePercent: number;
  };
  /** Alerts and notifications */
  alerts?: {
    /** Alert level */
    level: 'info' | 'warning' | 'error';
    /** Alert message */
    message: string;
    /** Timestamp */
    timestamp: string;
  }[];
}