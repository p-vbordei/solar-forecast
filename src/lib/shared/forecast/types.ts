/**
 * Comprehensive TypeScript types for forecast system
 * Single source of truth for all forecast-related types
 */

export interface ForecastData {
    timestamp: string;
    forecast: number;
    actual?: number | null;
    measured?: number | null;
    energy?: number | null;
    capacity_factor?: number | null;
    confidence?: number | null;
    confidence_lower?: number | null;
    confidence_upper?: number | null;
    confidence_q25?: number | null;
    confidence_q75?: number | null;
    temperature?: number | null;
    ghi?: number | null;
    dni?: number | null;
    cloud_cover?: number | null;
    wind_speed?: number | null;
}

export interface AccuracyMetrics {
    accuracy: number;          // Overall accuracy percentage (0-100)
    mape: number;             // Mean Absolute Percentage Error
    rmse: number;             // Root Mean Square Error
    mae: number;              // Mean Absolute Error
    r2: number;               // R-squared coefficient
    nrmse?: number;           // Normalized RMSE
    skill_score?: number;     // Forecast skill score
    sample_count: number;     // Number of data points
    confidence_score: number; // Overall confidence (0-1)
}

export interface ConfidenceBounds {
    value: number;
    lower?: number;
    upper?: number;
    q25?: number;
    q75?: number;
    q10?: number;
    q90?: number;
}

export interface ModelValidationResult {
    isValid: boolean;
    normalizedType: ModelType;
    errors: string[];
}

export type ModelType =
    | 'ML_ENSEMBLE'
    | 'PHYSICS'
    | 'HYBRID'
    | 'CATBOOST'
    | 'XGBOOST'
    | 'LSTM'
    | 'TRANSFORMER'
    | 'STATISTICAL';

export type ExportFormat = 'csv' | 'excel' | 'pdf';

export type ForecastInterval = '15min' | 'hourly' | 'daily' | 'weekly';

export interface ExportData {
    metadata: {
        locationId: string;
        locationName: string;
        interval: ForecastInterval;
        startDate: string;
        endDate: string;
        generatedAt: string;
        accuracy?: AccuracyMetrics;
    };
    forecast: ForecastData[];
    weather?: any[];
}

export interface ForecastStatistics {
    totalForecasts: number;
    averageAccuracy: number;
    averageConfidence: number;
    modelPerformance: Record<ModelType, {
        count: number;
        avgAccuracy: number;
        avgConfidence: number;
    }>;
    timeRangeStats: {
        startDate: string;
        endDate: string;
        daysSpanned: number;
    };
}

export interface ValidationConfig {
    required: {
        minDataPoints: number;
        requiredFields: (keyof ForecastData)[];
    };
    accuracy: {
        minAcceptableAccuracy: number;
        maxAcceptableMAPE: number;
        confidenceThreshold: number;
    };
    temporal: {
        maxGapHours: number;
        minForecastHorizon: number;
        maxForecastHorizon: number;
    };
}