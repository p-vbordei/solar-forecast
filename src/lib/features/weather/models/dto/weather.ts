import type { DataQuality } from '@prisma/client';

/**
 * Optimized Weather Data Interface - Essential fields for solar forecasting
 */
export interface WeatherData {
  id: string;                    // GUID
  timestamp: Date;
  locationId: string;            // GUID reference

  // Essential weather metrics for solar forecasting
  temperature: number;           // Celsius - affects panel efficiency
  humidity: number;              // Percentage - affects atmospheric transparency
  windSpeed: number;             // m/s - affects panel cooling
  cloudCover: number;            // Percentage (0-100) - primary solar impact factor

  // Solar radiation components (essential for forecasting)
  ghi?: number;                  // Global Horizontal Irradiance W/m²
  dni?: number;                  // Direct Normal Irradiance W/m²
  dhi?: number;                  // Diffuse Horizontal Irradiance W/m²

  // Source and quality
  source: string;                // 'open-meteo'
  dataQuality: DataQuality;      // GOOD, ESTIMATED, etc.
}

/**
 * Weather Data Summary for List Views
 */
export interface WeatherSummary {
  id: string;
  locationId: string;
  timestamp: Date;
  temperature: number;
  humidity: number;
  cloudCover: number;
  ghi?: number;
  source: string;
  dataQuality: DataQuality;
}

/**
 * Weather Forecast Data
 */
export interface WeatherForecast {
  locationId: string;
  forecastData: WeatherData[];
  generatedAt: Date;
  validUntil: Date;
  source: 'open-meteo';
}

/**
 * Weather API Response wrapper
 */
export interface WeatherResponse {
  success: boolean;
  data: WeatherData | WeatherData[];
  message?: string;
  pagination?: {
    total: number;
    size: number;
    current: number;
  };
}

/**
 * Weather Filter Options
 */
export interface WeatherFilter {
  locationId?: string;
  startDate?: Date;
  endDate?: Date;
  source?: string;
  dataQuality?: DataQuality[];
  minTemperature?: number;
  maxTemperature?: number;
  minGhi?: number;
  maxGhi?: number;
}

/**
 * Weather Aggregation Options
 */
export interface WeatherAggregation {
  interval: '15min' | '1hour' | '1day' | '1week';
  metrics: Array<'avg' | 'max' | 'min' | 'sum'>;
  fields: Array<keyof WeatherData>;
}

/**
 * Default values for weather data creation
 */
export const WEATHER_DEFAULTS = {
  source: 'open-meteo',
  dataQuality: 'GOOD' as DataQuality,
} as const;