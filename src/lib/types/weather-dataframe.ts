/**
 * TypeScript interfaces for weather DataFrame API
 */

export interface WeatherDataFrameRequest {
  locationId: string;
  startTime?: string;
  endTime?: string;
  hours?: number;
  format: 'pandas' | 'json' | 'csv';
  aggregation?: 'raw' | '15min' | 'hourly';
  includeForecasts?: boolean;
  cacheMaxAge?: number;
}

export interface WeatherDataFrameResponse {
  success: boolean;
  data: {
    columns: string[];
    index: (string | number)[];
    values: (number | string | null)[][];
    dtypes: Record<string, string>;
    metadata: {
      recordCount: number;
      timeRange: { start: string; end: string };
      source: string;
      generatedAt: string;
      cacheHit: boolean;
      aggregationLevel: string;
    };
  };
  performance: {
    queryTime: number;
    transformTime: number;
    totalTime: number;
  };
  warnings?: string[];
  error?: string;
}

export interface WeatherDataFrameMetrics {
  requestsTotal: number;
  requestsSuccessful: number;
  requestsFailed: number;
  requestsCached: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  cacheHitRate: number;
  errorsByType: Record<string, number>;
}

export interface WeatherCacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  size: number;
  locationId: string;
}

export interface WeatherCacheStats {
  hits: number;
  misses: number;
  evictions: number;
  memoryUsage: number;
  hitRate: number;
  totalEntries: number;
}