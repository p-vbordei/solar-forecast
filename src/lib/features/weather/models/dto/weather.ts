import type { DataQuality } from '@prisma/client';

/**
 * Weather Data Interface - matches Prisma WeatherData model
 */
export interface WeatherData {
  id: string;                    // GUID
  timestamp: Date;
  time: Date;                    // Legacy compatibility
  locationId: string;            // GUID reference

  // Basic weather metrics
  temperature: number;           // Celsius
  humidity: number;              // Percentage
  pressure: number;              // hPa
  windSpeed: number;             // m/s
  windDirection: number;         // Degrees
  cloudCover: number;            // Percentage (0-100)
  visibility?: number;           // km
  precipitation?: number;        // mm
  precipitationType?: string;    // rain, snow, etc.

  // Solar radiation components (industry standard)
  ghi?: number;                  // Global Horizontal Irradiance W/m²
  dni?: number;                  // Direct Normal Irradiance W/m²
  dhi?: number;                  // Diffuse Horizontal Irradiance W/m²
  gti?: number;                  // Global Tilted Irradiance W/m² (POA)
  extraterrestrial?: number;     // Extraterrestrial radiation W/m²

  // Solar position
  solarZenith?: number;          // Degrees
  solarAzimuth?: number;         // Degrees
  solarElevation?: number;       // Degrees
  airMass?: number;              // Air mass coefficient

  // Additional metrics
  albedo?: number;               // Surface reflectivity (0-1)
  soilingLoss?: number;          // Soiling loss percentage
  snowDepth?: number;            // cm
  moduleTemp?: number;           // Estimated module temperature

  // Source and quality
  source: string;                // 'open-meteo'
  stationId?: string;            // Weather station identifier
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
  visibility: 10.0,         // km
  precipitation: 0.0,       // mm
  precipitationType: null,
  albedo: 0.2,             // Typical ground reflectivity
  soilingLoss: 0.0,        // Percentage
  snowDepth: 0.0,          // cm
} as const;