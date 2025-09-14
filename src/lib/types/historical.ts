// Historical Data Types for TimescaleDB-powered solar analytics
export interface HistoricalDataRequest {
  // Location filtering
  locationIds?: number[];
  locationId?: number;  // Single location support
  
  // Time range
  startDate: string;    // ISO date string
  endDate: string;      // ISO date string
  timezone?: string;    // Default: UTC
  
  // Aggregation settings
  aggregation: AggregationType;
  
  // Data types to include
  includeProduction?: boolean;
  includeWeather?: boolean;
  includeForecast?: boolean;
  includeAccuracy?: boolean;
  
  // Filtering options
  dataQualityFilter?: DataQualityFilter[];
  minCapacityFactor?: number;
  maxCapacityFactor?: number;
  
  // Export settings
  format?: ExportFormat;
  includeMetadata?: boolean;
}

export interface HistoricalDataResponse {
  success: boolean;
  data: HistoricalDataPoint[];
  metadata: HistoricalDataMetadata;
  statistics?: HistoricalStatistics;
  error?: string;
}

export interface HistoricalDataPoint {
  timestamp: string;
  locationId: number;
  locationName?: string;
  
  // Production data
  production?: {
    powerMW: number;
    energyMWh?: number;
    capacityFactor?: number;
    performanceRatio?: number;
    efficiency?: number;
    availability?: number;
  };
  
  // Weather data
  weather?: {
    ghi?: number;          // Global Horizontal Irradiance W/m²
    dni?: number;          // Direct Normal Irradiance W/m²
    dhi?: number;          // Diffuse Horizontal Irradiance W/m²
    gti?: number;          // Global Tilted Irradiance W/m²
    temperature?: number;   // Celsius
    windSpeed?: number;     // m/s
    humidity?: number;      // Percentage
    cloudCover?: number;    // Percentage
  };
  
  // Forecast data
  forecast?: {
    powerMW: number;
    powerMWQ10?: number;   // 10th percentile
    powerMWQ90?: number;   // 90th percentile
    confidenceLevel?: number;
    modelType?: string;
  };
  
  // Aggregation info (for non-raw data)
  aggregationInfo?: {
    sampleCount: number;
    aggregationType: AggregationType;
    timeWindow: string;
  };
}

export interface HistoricalDataMetadata {
  request: {
    locationIds: number[];
    startDate: string;
    endDate: string;
    aggregation: AggregationType;
    timezone: string;
  };
  response: {
    totalRecords: number;
    locations: LocationMetadata[];
    dateRange: {
      start: string;
      end: string;
      dayCount: number;
    };
    processing: {
      queryTimeMs: number;
      generatedAt: string;
      cacheUsed?: boolean;
    };
  };
}

export interface LocationMetadata {
  id: number;
  name: string;
  capacityMW: number;
  recordCount: number;
  dataAvailability: {
    production: number;     // Percentage of expected data points
    weather: number;
    forecast: number;
  };
  qualityScore: number;     // Overall data quality 0-100
}

export interface HistoricalStatistics {
  locationId?: number;      // Null for multi-location aggregated stats
  
  // Production statistics
  production: {
    total: {
      energyMWh: number;
      peakPowerMW: number;
      averagePowerMW: number;
      hours: number;
    };
    performance: {
      averageCapacityFactor: number;
      averagePerformanceRatio: number;
      averageEfficiency: number;
      averageAvailability: number;
    };
    trends: {
      dailyAveragesMW: number[];
      monthlyEnergyMWh: number[];
      seasonalPatterns: SeasonalPattern[];
    };
  };
  
  // Weather correlation
  weather?: {
    averageGHI: number;
    averageTemperature: number;
    averageWindSpeed: number;
    irradianceProductionCorrelation: number;
    temperatureEfficiencyCorrelation: number;
  };
  
  // Forecast accuracy (if forecast data included)
  forecastAccuracy?: {
    mape: number;           // Mean Absolute Percentage Error
    rmse: number;           // Root Mean Square Error  
    mae: number;            // Mean Absolute Error
    r2: number;             // R-squared
    skillScore?: number;    // vs persistence
    accuracyByHorizon: AccuracyByHorizon[];
  };
  
  // Data quality summary
  dataQuality: {
    overallScore: number;   // 0-100
    completeness: number;   // Percentage
    reliability: number;    // Percentage
    issuesSummary: DataIssue[];
  };
  
  // Time period summary
  period: {
    startDate: string;
    endDate: string;
    totalDays: number;
    operationalDays: number;
    maintenanceDays: number;
    aggregationType: AggregationType;
  };
}

export interface SeasonalPattern {
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  averageEnergyMWh: number;
  averageCapacityFactor: number;
  peakProductionMW: number;
  characteristicCurve: number[];  // Hourly profile
}

export interface AccuracyByHorizon {
  horizonHours: number;
  mape: number;
  rmse: number;
  mae: number;
  sampleCount: number;
}

export interface DataIssue {
  type: 'missing_data' | 'data_quality' | 'outliers' | 'maintenance' | 'sensor_error';
  severity: 'low' | 'medium' | 'high';
  description: string;
  affectedPeriods: string[];  // ISO date strings
  impact: string;             // Description of impact on analysis
}

// Aggregation configuration
export interface AggregationConfig {
  type: AggregationType;
  timezone: string;
  method: AggregationMethod;
  fillGaps?: boolean;
  gapFillMethod?: 'linear' | 'previous' | 'next' | 'zero';
  outlierDetection?: boolean;
  outlierThreshold?: number;  // Standard deviations
}

// Enums and utility types
export enum AggregationType {
  RAW = 'raw',               // No aggregation (15-minute data)
  FIFTEEN_MINUTES = '15min',
  THIRTY_MINUTES = '30min', 
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly'
}

export enum AggregationMethod {
  AVERAGE = 'avg',
  SUM = 'sum',
  MIN = 'min',
  MAX = 'max',
  MEDIAN = 'median',
  WEIGHTED_AVERAGE = 'weighted_avg'
}

export enum DataQualityFilter {
  GOOD_ONLY = 'good_only',
  EXCLUDE_POOR = 'exclude_poor',
  INCLUDE_ALL = 'include_all'
}

export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  EXCEL = 'xlsx',
  PDF = 'pdf'
}

// Export configuration
export interface ExportConfig {
  format: ExportFormat;
  filename?: string;
  includeCharts?: boolean;    // For PDF/Excel exports
  includeMetadata?: boolean;
  includeStatistics?: boolean;
  customColumns?: string[];   // Column selection for CSV/Excel
  chartTypes?: ChartType[];   // Chart types for visual exports
  compression?: boolean;      // For large datasets
}

export enum ChartType {
  PRODUCTION_TIMELINE = 'production_timeline',
  CAPACITY_FACTOR = 'capacity_factor',
  WEATHER_CORRELATION = 'weather_correlation',
  FORECAST_ACCURACY = 'forecast_accuracy',
  SEASONAL_PATTERNS = 'seasonal_patterns',
  MULTI_LOCATION_COMPARISON = 'multi_location_comparison'
}

// Multi-location comparison types
export interface LocationComparison {
  locations: LocationComparisonItem[];
  aggregatedStats: HistoricalStatistics;
  rankingMetrics: LocationRanking[];
  correlationMatrix?: LocationCorrelation[];
}

export interface LocationComparisonItem {
  locationId: number;
  name: string;
  capacityMW: number;
  statistics: HistoricalStatistics;
  normalizedMetrics: {
    capacityFactorRank: number;
    efficiencyRank: number;
    availabilityRank: number;
    overallRank: number;
  };
}

export interface LocationRanking {
  metric: 'capacity_factor' | 'efficiency' | 'availability' | 'energy_yield';
  rankings: Array<{
    locationId: number;
    locationName: string;
    value: number;
    rank: number;
    percentile: number;
  }>;
}

export interface LocationCorrelation {
  locationId1: number;
  locationId2: number;
  correlationCoefficient: number;
  weatherCorrelation: number;
  distanceKm?: number;
}

// Utility functions for type conversion and validation
export function aggregationTypeToMinutes(type: AggregationType): number {
  switch (type) {
    case AggregationType.RAW:
    case AggregationType.FIFTEEN_MINUTES: return 15;
    case AggregationType.THIRTY_MINUTES: return 30;
    case AggregationType.HOURLY: return 60;
    case AggregationType.DAILY: return 1440;
    case AggregationType.WEEKLY: return 10080;
    case AggregationType.MONTHLY: return 43200;
    default: return 15;
  }
}

export function aggregationTypeToSQLInterval(type: AggregationType): string {
  switch (type) {
    case AggregationType.FIFTEEN_MINUTES: return '15 minutes';
    case AggregationType.THIRTY_MINUTES: return '30 minutes';
    case AggregationType.HOURLY: return '1 hour';
    case AggregationType.DAILY: return '1 day';
    case AggregationType.WEEKLY: return '1 week';
    case AggregationType.MONTHLY: return '1 month';
    default: return '15 minutes';
  }
}

export function validateDateRange(startDate: string, endDate: string): boolean {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return false;
  }
  
  if (start >= end) {
    return false;
  }
  
  // Maximum 5 years for performance
  const maxRange = 5 * 365 * 24 * 60 * 60 * 1000;
  if (end.getTime() - start.getTime() > maxRange) {
    return false;
  }
  
  return true;
}

// CSV template generation for historical data uploads
export interface HistoricalDataTemplate {
  headers: string[];
  sampleData: string[][];
  description: string;
  requiredColumns: string[];
  optionalColumns: string[];
}

export function generateHistoricalDataTemplate(
  aggregationType: AggregationType,
  includeWeather: boolean = true,
  includeForecast: boolean = false
): HistoricalDataTemplate {
  const baseHeaders = [
    'timestamp',           // ISO 8601 format
    'location_id',
    'location_name',
    'production_mw',
    'capacity_factor',
    'performance_ratio',
    'availability'
  ];
  
  const weatherHeaders = includeWeather ? [
    'ghi',                 // Global Horizontal Irradiance
    'temperature',
    'wind_speed',
    'humidity'
  ] : [];
  
  const forecastHeaders = includeForecast ? [
    'forecast_mw',
    'forecast_confidence'
  ] : [];
  
  const headers = [...baseHeaders, ...weatherHeaders, ...forecastHeaders];
  
  // Generate sample data
  const sampleData = [
    headers,
    [
      '2024-01-15T10:00:00Z',
      '1',
      'Solar Farm Alpha',
      '45.2',
      '0.85',
      '0.92',
      '1.0',
      ...(includeWeather ? ['650', '25.3', '3.2', '45'] : []),
      ...(includeForecast ? ['46.1', '0.85'] : [])
    ],
    [
      '2024-01-15T10:15:00Z',
      '1', 
      'Solar Farm Alpha',
      '47.8',
      '0.90',
      '0.91',
      '1.0',
      ...(includeWeather ? ['680', '25.8', '3.1', '44'] : []),
      ...(includeForecast ? ['48.2', '0.87'] : [])
    ]
  ];
  
  return {
    headers,
    sampleData,
    description: `Historical data template for ${aggregationType} aggregation`,
    requiredColumns: ['timestamp', 'location_id', 'production_mw'],
    optionalColumns: headers.filter(h => !['timestamp', 'location_id', 'production_mw'].includes(h))
  };
}