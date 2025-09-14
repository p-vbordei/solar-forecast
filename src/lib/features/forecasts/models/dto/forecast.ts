import type { LocationStatus } from '@prisma/client';

export interface ForecastParameters {
  locationId: string;
  interval: '15min' | 'hourly' | 'daily' | 'weekly';
  startDate?: string;
  endDate?: string;
}

export interface AccuracyParameters {
  locationId: string;
  startDate?: string;
  endDate?: string;
}

export interface ExportParameters extends ForecastParameters {
  format: 'csv' | 'excel' | 'pdf';
}

export interface GenerateForecastRequest {
  locationId: string;
  horizonHours: number;
  modelType: string;
  resolution?: string;
  includeWeather?: boolean;
}

export interface ForecastData {
  timestamp: string;
  forecast: number;
  confidence_upper: number;
  confidence_lower: number;
  actual?: number;
  measured?: number;
}

export interface AccuracyMetrics {
  accuracy: number;
  mape: number;
  rmse: number;
  mae: number;
  r2: number;
  nrmse: number;
  validPoints: number;
}

export interface ForecastResponse {
  data: ForecastData[];
  hasActual: boolean;
  hasMeasured: boolean;
  metadata: {
    locationId: string;
    interval: string;
    startDate?: string;
    endDate?: string;
    dataPoints: number;
    generatedAt: string;
  };
}

export interface BulkForecastInsert {
  locationId: string;
  timestamp: Date;
  powerForecastMw: number;
  confidenceScore?: number;
  modelType?: string;
  horizonHours?: number;
}