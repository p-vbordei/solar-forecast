// Forecast data types matching updated Prisma schema
export interface Forecast {
  id: string;
  timestamp: Date | string;
  locationId: number;
  
  // Primary forecast values (matching linear forecast CSV structure)
  powerMW: number;              // production_mw
  energyMWh?: number;
  capacityFactor?: number;      // production_mw / nominal_capacity
  
  // Confidence intervals (matching CSV format)
  powerMWQ10?: number;          // 10th percentile (lower bound)
  powerMWQ25?: number;          // 25th percentile
  powerMWQ75?: number;          // 75th percentile
  powerMWQ90?: number;          // 90th percentile (upper bound)
  powerMWLower?: number;        // Legacy support
  powerMWUpper?: number;        // Legacy support
  confidenceLevel?: number;     // 0-100
  
  // Forecast metadata
  modelType: ModelType;
  modelVersion?: string;
  modelId?: string;
  horizonMinutes: number;       // Forecast horizon in minutes
  horizonDays?: number;         // D+1, D+5, etc.
  resolution: ResolutionType;
  runId?: string;
  forecastType: ForecastType;
  
  // Weather inputs used
  temperature?: number;
  ghi?: number;                 // Global Horizontal Irradiance W/m²
  dni?: number;                 // Direct Normal Irradiance W/m²
  dhi?: number;                 // Diffuse Horizontal Irradiance W/m²
  gti?: number;                 // Global Tilted Irradiance W/m²
  cloudCover?: number;          // Percentage
  windSpeed?: number;           // m/s
  humidity?: number;            // Percentage
  pressure?: number;            // hPa
  weatherData?: any;            // Full weather context
  
  // Quality and validation
  qualityScore?: number;        // 0-1 quality indicator
  isValidated: boolean;
  validationNotes?: string;
  dataQuality: DataQuality;
  
  // Processing metadata
  processingTime?: number;      // Processing time in seconds
  inputFeatures?: any;          // Features used in forecast
  modelParameters?: any;        // Model parameters used
  
  // Timestamps
  createdAt: Date | string;
  createdBy?: number;
}

export enum ModelType {
  ML_LSTM = 'ML_LSTM',
  ML_GRU = 'ML_GRU',
  ML_XGBOOST = 'ML_XGBOOST',
  ML_RANDOMFOREST = 'ML_RANDOMFOREST',
  ML_PROPHET = 'ML_PROPHET',
  PHYSICAL = 'PHYSICAL',
  HYBRID = 'HYBRID',
  ENSEMBLE = 'ENSEMBLE',
  PERSISTENCE = 'PERSISTENCE',
  STATISTICAL = 'STATISTICAL'
}

export enum ResolutionType {
  FIFTEEN_MINUTES = 'FIFTEEN_MINUTES',    // 15min
  THIRTY_MINUTES = 'THIRTY_MINUTES',      // 30min
  HOURLY = 'HOURLY',                      // 1h
  DAILY = 'DAILY',                        // 1d
  WEEKLY = 'WEEKLY',                      // 1w
  MONTHLY = 'MONTHLY'                     // 1m
}

export enum ForecastType {
  OPERATIONAL = 'OPERATIONAL',            // Regular operational forecasts
  D_PLUS_1_5 = 'D_PLUS_1_5',            // D+1 to D+5 forecasts
  MONTHLY_CONTINUED = 'MONTHLY_CONTINUED', // Monthly continued forecasts
  HISTORICAL = 'HISTORICAL',              // Historical forecast recreation
  VALIDATION = 'VALIDATION'               // Validation/backtesting forecasts
}

export enum DataQuality {
  GOOD = 'GOOD',
  ESTIMATED = 'ESTIMATED',
  INTERPOLATED = 'INTERPOLATED',
  POOR = 'POOR',
  MISSING = 'MISSING',
  INVALID = 'INVALID'
}

// Forecast request types for API
export interface ForecastRequest {
  locationId: number;
  horizonHours?: number;
  horizonDays?: number;
  modelType?: ModelType;
  resolution?: ResolutionType;
  forecastType?: ForecastType;
  includeConfidenceBands?: boolean;
  includeWeatherData?: boolean;
}

// Forecast response with metadata
export interface ForecastResponse {
  success: boolean;
  data: Forecast[];
  metadata: {
    locationId: number;
    horizonHours?: number;
    horizonDays?: number;
    generatedAt: string;
    modelType: ModelType;
    accuracy?: number;
    totalRecords: number;
  };
  error?: string;
}

// Forecast task for async processing
export interface ForecastTask {
  taskId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  locationId: number;
  estimatedTimeSeconds: number;
  progress?: number;
  result?: Forecast[];
  error?: string;
}

// Forecast accuracy metrics
export interface ForecastAccuracy {
  id: string;
  locationId: number;
  date: Date | string;
  modelType: ModelType;
  modelVersion?: string;
  
  // Industry standard metrics
  mape: number;                 // Mean Absolute Percentage Error
  rmse: number;                 // Root Mean Square Error
  mae: number;                  // Mean Absolute Error
  mbe?: number;                 // Mean Bias Error
  r2?: number;                  // R-squared
  skillScore?: number;          // Forecast skill vs persistence
  
  // Horizon-based accuracy (JSON array)
  accuracyByHorizon?: Array<{
    horizon: number;
    mape: number;
    rmse: number;
    mae: number;
  }>;
  
  // Sample statistics
  sampleCount: number;
  validSamples: number;
  
  createdAt: Date | string;
}

// Linear forecast CSV output format (for compatibility)
export interface LinearForecastRow {
  datetime: string;                    // ISO timestamp with timezone
  production_mw: number;
  capacity_factor: number;
  production_mw_q10: number;           // 10th percentile
  production_mw_q25: number;           // 25th percentile
  production_mw_q75: number;           // 75th percentile
  production_mw_q90: number;           // 90th percentile
}

// Utility functions for forecast data
export function formatForecastForCSV(forecast: Forecast): LinearForecastRow {
  return {
    datetime: typeof forecast.timestamp === 'string' ? forecast.timestamp : forecast.timestamp.toISOString(),
    production_mw: forecast.powerMW,
    capacity_factor: forecast.capacityFactor || 0,
    production_mw_q10: forecast.powerMWQ10 || 0,
    production_mw_q25: forecast.powerMWQ25 || 0,
    production_mw_q75: forecast.powerMWQ75 || 0,
    production_mw_q90: forecast.powerMWQ90 || 0
  };
}

export function resolutionToMinutes(resolution: ResolutionType): number {
  switch (resolution) {
    case ResolutionType.FIFTEEN_MINUTES: return 15;
    case ResolutionType.THIRTY_MINUTES: return 30;
    case ResolutionType.HOURLY: return 60;
    case ResolutionType.DAILY: return 1440;
    case ResolutionType.WEEKLY: return 10080;
    case ResolutionType.MONTHLY: return 43200;
    default: return 60;
  }
}

export function resolutionToString(resolution: ResolutionType): string {
  switch (resolution) {
    case ResolutionType.FIFTEEN_MINUTES: return '15min';
    case ResolutionType.THIRTY_MINUTES: return '30min';
    case ResolutionType.HOURLY: return '1h';
    case ResolutionType.DAILY: return '1d';
    case ResolutionType.WEEKLY: return '1w';
    case ResolutionType.MONTHLY: return '1m';
    default: return '1h';
  }
}