export interface AnalysisForecastData {
  forecasts: ForecastTimePoint[];
  actuals: ProductionTimePoint[];
  confidenceBands: ConfidenceBand[];
  metadata: ForecastMetadata;
}

export interface ForecastTimePoint {
  timestamp: string;
  powerMW: number;
  energyMWh: number | null;
  capacityFactor: number | null;
  modelType: string;
  confidence: number | null;
  qualityScore: number | null;
}

export interface ProductionTimePoint {
  timestamp: string;
  powerMW: number;
  energyMWh: number | null;
  capacityFactor: number | null;
  dataQuality: string;
}

export interface ConfidenceBand {
  timestamp: string;
  lower: number; // Q10 or lower bound
  upperQ25: number; // Q25
  upperQ75: number; // Q75  
  upper: number; // Q90 or upper bound
}

export interface ForecastMetadata {
  locationId: number;
  locationName: string;
  startDate: string;
  endDate: string;
  resolution: TimeAggregation;
  modelTypes: string[];
  totalForecasts: number;
  totalActuals: number;
  dataQualityScore: number;
}

export interface AccuracyMetrics {
  overall: OverallAccuracy;
  byHorizon: HorizonAccuracy[];
  byModel: ModelAccuracy[];
  byTimeOfDay: TimeAccuracy[];
  metadata: AccuracyMetadata;
}

export interface OverallAccuracy {
  mape: number; // Mean Absolute Percentage Error
  rmse: number; // Root Mean Square Error  
  mae: number;  // Mean Absolute Error
  mbe: number;  // Mean Bias Error
  r2: number;   // R-squared
  skillScore: number | null; // vs persistence model
  sampleCount: number;
  validSamples: number;
}

export interface HorizonAccuracy {
  horizon: number; // Minutes ahead
  mape: number;
  rmse: number;
  mae: number;
  sampleCount: number;
}

export interface ModelAccuracy {
  modelType: string;
  modelVersion: string | null;
  mape: number;
  rmse: number;
  mae: number;
  r2: number;
  sampleCount: number;
}

export interface TimeAccuracy {
  hour: number; // 0-23
  mape: number;
  rmse: number;
  mae: number;
  sampleCount: number;
}

export interface AccuracyMetadata {
  locationId: number;
  locationName: string;
  startDate: string;
  endDate: string;
  totalComparisons: number;
  averageAccuracy: number;
  bestModel: string;
  worstHorizon: number;
}

export interface AnalysisFilters {
  locationId: number;
  startDate: string;
  endDate: string;
  resolution: TimeAggregation;
  modelTypes?: string[];
  includeConfidence?: boolean;
  includeActuals?: boolean;
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'excel';
  includeMetadata: boolean;
  includeConfidence: boolean;
  includeActuals: boolean;
  timezone?: string;
}

export interface AnalysisResponse {
  success: boolean;
  data: AnalysisForecastData;
  filters: AnalysisFilters;
  processingTime: number;
  timestamp: string;
}

export interface AccuracyResponse {
  success: boolean;
  data: AccuracyMetrics;
  filters: Pick<AnalysisFilters, 'locationId' | 'startDate' | 'endDate'>;
  processingTime: number;
  timestamp: string;
}

export interface ExportResponse {
  success: boolean;
  downloadUrl: string;
  filename: string;
  fileSize: number;
  expiresAt: string;
  format: string;
}

export type TimeAggregation = '15min' | '1hour' | '1day' | '1week';

export type ModelType = 
  | 'ML_LSTM'
  | 'ML_GRU' 
  | 'ML_XGBOOST'
  | 'ML_RANDOMFOREST'
  | 'ML_PROPHET'
  | 'PHYSICAL'
  | 'HYBRID'
  | 'ENSEMBLE'
  | 'PERSISTENCE'
  | 'STATISTICAL';

export type DataQuality = 
  | 'GOOD'
  | 'ESTIMATED' 
  | 'INTERPOLATED'
  | 'POOR'
  | 'MISSING'
  | 'INVALID';

// Chart visualization data structures
export interface ChartConfiguration {
  showConfidenceBands: boolean;
  showActuals: boolean;
  selectedModels: string[];
  yAxisScale: 'linear' | 'log';
  smoothing: boolean;
}

export interface ChartData {
  series: ChartSeries[];
  xAxis: ChartAxis;
  yAxis: ChartAxis;
  bands?: ChartBands;
}

export interface ChartSeries {
  name: string;
  type: 'line' | 'area' | 'scatter';
  data: Array<[string, number]>; // [timestamp, value]
  color: string;
  opacity?: number;
  lineWidth?: number;
}

export interface ChartAxis {
  type: 'time' | 'value';
  min?: number;
  max?: number;
  interval?: string;
  formatter?: string;
}

export interface ChartBands {
  upper: Array<[string, number]>;
  lower: Array<[string, number]>;
  fillOpacity: number;
  color: string;
}