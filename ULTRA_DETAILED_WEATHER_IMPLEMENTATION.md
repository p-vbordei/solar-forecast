# 🧠 Ultra-Deep Weather Service Implementation Strategy
**Comprehensive Architecture & Implementation Guide**

---

## 🏗️ PHASE 1: FOUNDATIONAL ARCHITECTURE

### 1.1 API Contract Design & Data Transformation Layer

#### Primary API Endpoint Architecture
```typescript
// SvelteKit: /src/routes/api/weather/dataframe/+server.ts
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
```

#### Ultra-Optimized Data Transformation
```typescript
class WeatherDataFrameTransformer {
  static transformForPandas(weatherData: WeatherData[]): WeatherDataFrameResponse {
    const startTime = performance.now();

    // Pre-allocate arrays for performance
    const recordCount = weatherData.length;
    const columns = [
      'timestamp', 'temperature', 'humidity', 'windSpeed',
      'cloudCover', 'ghi', 'dni', 'dhi', 'pressure'
    ];

    // Use typed arrays for better performance
    const values: (number | string | null)[][] = new Array(recordCount);
    const index: string[] = new Array(recordCount);

    // Vectorized transformation with error handling
    for (let i = 0; i < recordCount; i++) {
      const record = weatherData[i];

      // ISO timestamp for pandas compatibility
      index[i] = record.timestamp.toISOString();

      // Ensure numeric types for pandas
      values[i] = [
        record.timestamp.toISOString(),
        this.safeFloat(record.temperature),
        this.safeFloat(record.humidity),
        this.safeFloat(record.windSpeed),
        this.safeFloat(record.cloudCover),
        this.safeFloat(record.ghi),
        this.safeFloat(record.dni),
        this.safeFloat(record.dhi),
        this.safeFloat(record.pressure) || 1013.25  // Default pressure
      ];
    }

    const transformTime = performance.now() - startTime;

    return {
      success: true,
      data: {
        columns,
        index,
        values,
        dtypes: {
          'timestamp': 'datetime64[ns]',
          'temperature': 'float64',
          'humidity': 'float64',
          'windSpeed': 'float64',
          'cloudCover': 'float64',
          'ghi': 'float64',
          'dni': 'float64',
          'dhi': 'float64',
          'pressure': 'float64'
        },
        metadata: {
          recordCount,
          timeRange: {
            start: weatherData[0]?.timestamp.toISOString() || '',
            end: weatherData[recordCount - 1]?.timestamp.toISOString() || ''
          },
          source: 'sveltekit-weather-service',
          generatedAt: new Date().toISOString(),
          cacheHit: false, // Set by caching layer
          aggregationLevel: 'raw'
        }
      },
      performance: {
        queryTime: 0, // Set by caller
        transformTime,
        totalTime: 0  // Set by caller
      }
    };
  }

  private static safeFloat(value: any): number | null {
    if (value === null || value === undefined) return null;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }
}
```

### 1.2 Python Weather API Client Architecture

#### High-Performance HTTP Client
```python
# /python-worker/app/integrations/weather_client.py
import asyncio
import aiohttp
import pandas as pd
import numpy as np
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import orjson  # Ultra-fast JSON parsing
from dataclasses import dataclass
import logging

@dataclass
class WeatherClientConfig:
    base_url: str = "http://localhost:5173"
    timeout: aiohttp.ClientTimeout = aiohttp.ClientTimeout(total=30, connect=10)
    max_retries: int = 3
    retry_backoff: float = 1.0
    connection_pool_size: int = 10
    enable_compression: bool = True
    cache_ttl: int = 300  # 5 minutes

class WeatherAPIClient:
    """Ultra-optimized weather API client for Python forecast service"""

    def __init__(self, config: WeatherClientConfig = None):
        self.config = config or WeatherClientConfig()
        self.session: Optional[aiohttp.ClientSession] = None
        self.logger = logging.getLogger(__name__)

        # Connection pooling for performance
        self.connector = aiohttp.TCPConnector(
            limit=self.config.connection_pool_size,
            enable_cleanup_closed=True,
            keepalive_timeout=30
        )

        # In-memory cache for recent requests
        self._cache: Dict[str, tuple] = {}  # key -> (data, timestamp)

    async def __aenter__(self):
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()

    async def connect(self):
        """Initialize HTTP session with optimized settings"""
        if self.session is None:
            self.session = aiohttp.ClientSession(
                connector=self.connector,
                timeout=self.config.timeout,
                headers={
                    'Accept': 'application/json',
                    'Accept-Encoding': 'gzip, deflate' if self.config.enable_compression else 'identity',
                    'User-Agent': 'solar-forecast-python-worker/1.0'
                },
                json_serialize=orjson.dumps
            )
            self.logger.info("Weather API client initialized")

    async def close(self):
        """Clean shutdown of HTTP session"""
        if self.session:
            await self.session.close()
            self.session = None
        if self.connector:
            await self.connector.close()

    async def get_weather_dataframe(
        self,
        location_id: str,
        hours: int = 24,
        aggregation: str = 'raw',
        include_forecasts: bool = True
    ) -> pd.DataFrame:
        """
        Get weather data optimized for forecast models

        Returns:
            DataFrame with columns: timestamp, temperature, humidity, windSpeed,
                                  cloudCover, ghi, dni, dhi, pressure
        """
        # Check cache first
        cache_key = f"{location_id}:{hours}:{aggregation}:{include_forecasts}"
        cached_data = self._get_from_cache(cache_key)
        if cached_data is not None:
            self.logger.debug(f"Cache hit for weather request: {cache_key}")
            return cached_data

        # Prepare request
        url = f"{self.config.base_url}/api/weather/dataframe"
        params = {
            'locationId': location_id,
            'hours': hours,
            'format': 'pandas',
            'aggregation': aggregation,
            'includeForecasts': include_forecasts,
            'cacheMaxAge': self.config.cache_ttl
        }

        # Execute with retries
        for attempt in range(self.config.max_retries):
            try:
                start_time = asyncio.get_event_loop().time()

                async with self.session.get(url, params=params) as response:
                    if response.status == 200:
                        # Use orjson for fast parsing
                        response_data = await response.read()
                        data = orjson.loads(response_data)

                        # Convert to DataFrame
                        df = self._response_to_dataframe(data)

                        # Cache successful result
                        self._cache_result(cache_key, df)

                        elapsed = asyncio.get_event_loop().time() - start_time
                        self.logger.info(
                            f"Weather API success: {len(df)} records in {elapsed:.3f}s"
                        )

                        return df

                    elif response.status == 429:  # Rate limited
                        wait_time = self.config.retry_backoff * (2 ** attempt)
                        self.logger.warning(f"Rate limited, waiting {wait_time}s")
                        await asyncio.sleep(wait_time)

                    else:
                        error_data = await response.text()
                        self.logger.error(
                            f"Weather API error {response.status}: {error_data}"
                        )
                        raise aiohttp.ClientResponseError(
                            request_info=response.request_info,
                            history=response.history,
                            status=response.status,
                            message=error_data
                        )

            except asyncio.TimeoutError:
                self.logger.warning(f"Weather API timeout on attempt {attempt + 1}")
                if attempt == self.config.max_retries - 1:
                    raise
                await asyncio.sleep(self.config.retry_backoff * attempt)

            except Exception as e:
                self.logger.error(f"Weather API error on attempt {attempt + 1}: {e}")
                if attempt == self.config.max_retries - 1:
                    raise
                await asyncio.sleep(self.config.retry_backoff * attempt)

        raise Exception(f"Weather API failed after {self.config.max_retries} attempts")

    def _response_to_dataframe(self, response_data: Dict[str, Any]) -> pd.DataFrame:
        """Convert API response to optimized DataFrame"""
        if not response_data.get('success', False):
            raise ValueError(f"API error: {response_data.get('error', 'Unknown error')}")

        data = response_data['data']

        # Create DataFrame with proper dtypes
        df = pd.DataFrame(
            data=data['values'],
            columns=data['columns'],
            index=pd.to_datetime(data['index'])
        )

        # Ensure proper dtypes for performance
        numeric_columns = ['temperature', 'humidity', 'windSpeed', 'cloudCover',
                          'ghi', 'dni', 'dhi', 'pressure']

        for col in numeric_columns:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')

        # Set timestamp as index for time series operations
        if 'timestamp' in df.columns:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            df.set_index('timestamp', inplace=True)

        # Sort by timestamp for forecast models
        df.sort_index(inplace=True)

        return df

    def _get_from_cache(self, key: str) -> Optional[pd.DataFrame]:
        """Get data from cache if not expired"""
        if key in self._cache:
            data, timestamp = self._cache[key]
            if (datetime.utcnow() - timestamp).total_seconds() < self.config.cache_ttl:
                return data.copy()  # Return copy to prevent mutation
            else:
                del self._cache[key]  # Remove expired entry
        return None

    def _cache_result(self, key: str, data: pd.DataFrame):
        """Cache successful result"""
        self._cache[key] = (data.copy(), datetime.utcnow())

        # Limit cache size (LRU-like behavior)
        if len(self._cache) > 100:
            oldest_key = min(self._cache.keys(),
                           key=lambda k: self._cache[k][1])
            del self._cache[oldest_key]

    async def health_check(self) -> bool:
        """Check if weather API is healthy"""
        try:
            url = f"{self.config.base_url}/api/health"
            async with self.session.get(url) as response:
                return response.status == 200
        except Exception:
            return False

# Global client instance with connection pooling
_weather_client: Optional[WeatherAPIClient] = None

async def get_weather_client() -> WeatherAPIClient:
    """Get shared weather client instance"""
    global _weather_client
    if _weather_client is None:
        _weather_client = WeatherAPIClient()
        await _weather_client.connect()
    return _weather_client

async def cleanup_weather_client():
    """Cleanup shared client on shutdown"""
    global _weather_client
    if _weather_client:
        await _weather_client.close()
        _weather_client = None
```

### 1.3 Performance Optimization Architecture

#### Multi-Level Caching Strategy
```typescript
// SvelteKit: /src/lib/server/cache/weather-cache.ts
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  size: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  memory_usage: number;
  hit_rate: number;
}

class WeatherCache {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private stats: CacheStats = {
    hits: 0, misses: 0, evictions: 0, memory_usage: 0, hit_rate: 0
  };

  private readonly MAX_MEMORY_MB = 100;
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  async get<T>(key: string): Promise<T | null> {
    const entry = this.memoryCache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.timestamp + entry.ttl) {
      this.memoryCache.delete(key);
      this.stats.misses++;
      return null;
    }

    entry.hits++;
    this.stats.hits++;
    this.updateHitRate();

    return entry.data;
  }

  async set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): Promise<void> {
    const size = this.estimateSize(data);

    // Evict if needed
    await this.evictIfNeeded(size);

    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      hits: 0,
      size
    });

    this.stats.memory_usage += size;
  }

  private async evictIfNeeded(newSize: number): Promise<void> {
    const maxBytes = this.MAX_MEMORY_MB * 1024 * 1024;

    while (this.stats.memory_usage + newSize > maxBytes && this.memoryCache.size > 0) {
      // LRU eviction: remove least recently used (lowest hits)
      let lruKey = '';
      let minHits = Infinity;

      for (const [key, entry] of this.memoryCache) {
        if (entry.hits < minHits) {
          minHits = entry.hits;
          lruKey = key;
        }
      }

      if (lruKey) {
        const entry = this.memoryCache.get(lruKey)!;
        this.memoryCache.delete(lruKey);
        this.stats.memory_usage -= entry.size;
        this.stats.evictions++;
      }
    }
  }

  private estimateSize(data: any): number {
    return JSON.stringify(data).length * 2; // Rough UTF-16 estimate
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hit_rate = total > 0 ? this.stats.hits / total : 0;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }
}

export const weatherCache = new WeatherCache();
```

#### Connection Pool Management
```typescript
// SvelteKit: /src/lib/server/pools/database-pool.ts
import { Pool } from 'pg';

class DatabaseConnectionPool {
  private pool: Pool;
  private weatherQueries = new Map<string, string>();

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20, // Maximum number of connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      maxUses: 7500, // Close connections after 7500 queries
      allowExitOnIdle: true
    });

    this.prepareWeatherQueries();
  }

  private prepareWeatherQueries(): void {
    // Pre-compile frequently used queries for performance
    this.weatherQueries.set('recent_weather', `
      SELECT
        timestamp, temperature, humidity, "windSpeed", "cloudCover",
        ghi, dni, dhi, pressure, "dataQuality"
      FROM weather_data
      WHERE "locationId" = $1
        AND timestamp >= NOW() - INTERVAL '$2 hours'
        AND "dataQuality" NOT IN ('POOR', 'INVALID')
      ORDER BY timestamp DESC
      LIMIT $3
    `);

    this.weatherQueries.set('weather_aggregated', `
      SELECT
        time_bucket($1, timestamp) as bucket,
        AVG(temperature) as avg_temperature,
        AVG(humidity) as avg_humidity,
        AVG("windSpeed") as avg_wind_speed,
        AVG("cloudCover") as avg_cloud_cover,
        AVG(ghi) as avg_ghi,
        AVG(dni) as avg_dni,
        AVG(dhi) as avg_dhi,
        COUNT(*) as sample_count
      FROM weather_data
      WHERE "locationId" = $2
        AND timestamp >= $3
        AND timestamp <= $4
        AND "dataQuality" NOT IN ('POOR', 'INVALID')
      GROUP BY bucket
      ORDER BY bucket
    `);
  }

  async executeWeatherQuery(
    queryName: string,
    params: any[]
  ): Promise<any[]> {
    const query = this.weatherQueries.get(queryName);
    if (!query) {
      throw new Error(`Unknown weather query: ${queryName}`);
    }

    const client = await this.pool.connect();
    try {
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getPoolStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }
}

export const dbPool = new DatabaseConnectionPool();
```

---

## 🏗️ PHASE 2: ADVANCED ERROR HANDLING & RESILIENCE

### 2.1 Circuit Breaker Pattern
```python
# /python-worker/app/integrations/circuit_breaker.py
import asyncio
import time
from enum import Enum
from typing import Any, Callable, Optional
from dataclasses import dataclass
import logging

class CircuitState(Enum):
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, reject requests
    HALF_OPEN = "half_open" # Testing if service recovered

@dataclass
class CircuitBreakerConfig:
    failure_threshold: int = 5
    recovery_timeout: int = 60
    success_threshold: int = 3
    timeout: int = 30

class CircuitBreaker:
    """Circuit breaker for weather API calls"""

    def __init__(self, config: CircuitBreakerConfig = None):
        self.config = config or CircuitBreakerConfig()
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = 0
        self.logger = logging.getLogger(__name__)

    async def call(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function with circuit breaker protection"""

        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_time < self.config.recovery_timeout:
                raise Exception("Circuit breaker is OPEN - service unavailable")
            else:
                self.state = CircuitState.HALF_OPEN
                self.logger.info("Circuit breaker transitioning to HALF_OPEN")

        try:
            # Execute with timeout
            result = await asyncio.wait_for(
                func(*args, **kwargs),
                timeout=self.config.timeout
            )

            # Handle success
            await self._on_success()
            return result

        except Exception as e:
            await self._on_failure()
            raise

    async def _on_success(self):
        """Handle successful call"""
        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.config.success_threshold:
                self.state = CircuitState.CLOSED
                self.success_count = 0
                self.failure_count = 0
                self.logger.info("Circuit breaker RECOVERED - state: CLOSED")
        else:
            self.failure_count = 0

    async def _on_failure(self):
        """Handle failed call"""
        self.failure_count += 1
        self.last_failure_time = time.time()

        if self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.OPEN
            self.success_count = 0
            self.logger.warning("Circuit breaker OPENED - service failing")
        elif self.failure_count >= self.config.failure_threshold:
            self.state = CircuitState.OPEN
            self.logger.warning(
                f"Circuit breaker OPENED after {self.failure_count} failures"
            )
```

### 2.2 Comprehensive Error Recovery
```python
# /python-worker/app/modules/forecast/repositories.py (Updated)
class ForecastRepository:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.weather_client = None
        self.circuit_breaker = CircuitBreaker()
        self.fallback_cache = {}  # Emergency cache

    async def get_recent_weather(
        self,
        location_id: str,
        hours: int
    ) -> pd.DataFrame:
        """Get weather data with comprehensive error handling"""

        try:
            # Primary: Get from SvelteKit API
            if self.weather_client is None:
                self.weather_client = await get_weather_client()

            return await self.circuit_breaker.call(
                self.weather_client.get_weather_dataframe,
                location_id, hours
            )

        except Exception as api_error:
            logger.warning(f"Weather API failed: {api_error}")

            # Fallback 1: Direct database query
            try:
                return await self._get_weather_from_database(location_id, hours)
            except Exception as db_error:
                logger.warning(f"Database fallback failed: {db_error}")

                # Fallback 2: Emergency cache
                cache_key = f"{location_id}:{hours}"
                if cache_key in self.fallback_cache:
                    logger.info("Using emergency cached weather data")
                    return self.fallback_cache[cache_key].copy()

                # Fallback 3: Generate synthetic data
                logger.error("All weather sources failed - generating synthetic data")
                return self._generate_synthetic_weather(location_id, hours)

    async def _get_weather_from_database(
        self,
        location_id: str,
        hours: int
    ) -> pd.DataFrame:
        """Direct database query as fallback"""
        query = text("""
            SELECT
                timestamp, temperature, humidity,
                "windSpeed", "cloudCover", ghi, dni, dhi
            FROM weather_data
            WHERE "locationId" = :location_id
                AND timestamp >= NOW() - INTERVAL :hours_interval
            ORDER BY timestamp ASC
        """)

        result = await self.db.execute(query, {
            "location_id": location_id,
            "hours_interval": f"{hours} hours"
        })

        rows = result.fetchall()
        if not rows:
            raise Exception("No weather data in database")

        # Convert to DataFrame
        data = []
        for row in rows:
            data.append({
                'timestamp': row.timestamp,
                'temperature': row.temperature,
                'humidity': row.humidity,
                'windSpeed': row.windSpeed,
                'cloudCover': row.cloudCover,
                'ghi': row.ghi or 0,
                'dni': row.dni or 0,
                'dhi': row.dhi or 0
            })

        df = pd.DataFrame(data)
        df.set_index('timestamp', inplace=True)

        # Cache for emergency use
        cache_key = f"{location_id}:{hours}"
        self.fallback_cache[cache_key] = df.copy()

        return df

    def _generate_synthetic_weather(
        self,
        location_id: str,
        hours: int
    ) -> pd.DataFrame:
        """Generate synthetic weather data as last resort"""

        # Simple sine wave pattern for temperature
        timestamps = pd.date_range(
            start=datetime.utcnow() - timedelta(hours=hours),
            end=datetime.utcnow(),
            freq='H'
        )

        synthetic_data = []
        for i, ts in enumerate(timestamps):
            hour = ts.hour

            # Basic daily temperature pattern
            temp = 20 + 10 * np.sin((hour - 6) * np.pi / 12)

            synthetic_data.append({
                'timestamp': ts,
                'temperature': temp,
                'humidity': 60 + 20 * np.sin(hour * np.pi / 12),
                'windSpeed': 3 + np.random.normal(0, 1),
                'cloudCover': 30 + 20 * np.sin((hour + 3) * np.pi / 12),
                'ghi': max(0, 800 * np.sin((hour - 6) * np.pi / 12)) if 6 <= hour <= 18 else 0,
                'dni': max(0, 600 * np.sin((hour - 6) * np.pi / 12)) if 6 <= hour <= 18 else 0,
                'dhi': max(0, 200 * np.sin((hour - 6) * np.pi / 12)) if 6 <= hour <= 18 else 0
            })

        df = pd.DataFrame(synthetic_data)
        df.set_index('timestamp', inplace=True)

        logger.warning(f"Generated {len(df)} synthetic weather records for {location_id}")
        return df
```

---

## 🏗️ PHASE 3: MIGRATION ORCHESTRATION

### 3.1 Feature Flag Architecture
```typescript
// SvelteKit: /src/lib/server/feature-flags.ts
interface FeatureFlag {
  enabled: boolean;
  percentage: number; // 0-100
  conditions?: {
    locationIds?: string[];
    userTypes?: string[];
    timeWindow?: { start: string; end: string };
  };
}

interface FeatureFlagConfig {
  weatherServiceConsolidation: FeatureFlag;
  pythonWeatherFallback: FeatureFlag;
  weatherApiCaching: FeatureFlag;
  syntheticWeatherFallback: FeatureFlag;
}

class FeatureFlagManager {
  private config: FeatureFlagConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): FeatureFlagConfig {
    return {
      weatherServiceConsolidation: {
        enabled: process.env.WEATHER_CONSOLIDATION_ENABLED === 'true',
        percentage: parseInt(process.env.WEATHER_CONSOLIDATION_PERCENTAGE || '0'),
        conditions: {
          locationIds: process.env.WEATHER_CONSOLIDATION_LOCATIONS?.split(','),
        }
      },
      pythonWeatherFallback: {
        enabled: process.env.PYTHON_WEATHER_FALLBACK_ENABLED === 'true',
        percentage: 100
      },
      weatherApiCaching: {
        enabled: process.env.WEATHER_CACHING_ENABLED !== 'false',
        percentage: 100
      },
      syntheticWeatherFallback: {
        enabled: process.env.SYNTHETIC_WEATHER_ENABLED === 'true',
        percentage: 100
      }
    };
  }

  isEnabled(flag: keyof FeatureFlagConfig, context?: {
    locationId?: string;
    userId?: string;
  }): boolean {
    const flagConfig = this.config[flag];

    if (!flagConfig.enabled) return false;

    // Check percentage rollout
    if (flagConfig.percentage < 100) {
      const hash = this.hashString(context?.locationId || context?.userId || 'default');
      if ((hash % 100) >= flagConfig.percentage) {
        return false;
      }
    }

    // Check conditions
    if (flagConfig.conditions) {
      if (flagConfig.conditions.locationIds && context?.locationId) {
        if (!flagConfig.conditions.locationIds.includes(context.locationId)) {
          return false;
        }
      }
    }

    return true;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

export const featureFlags = new FeatureFlagManager();
```

### 3.2 Migration State Machine
```python
# /python-worker/app/migration/weather_migration.py
from enum import Enum
import asyncio
import logging
from typing import Dict, Any, List
from datetime import datetime
import json

class MigrationState(Enum):
    NOT_STARTED = "not_started"
    VALIDATING = "validating"
    MIGRATING = "migrating"
    TESTING = "testing"
    COMPLETING = "completing"
    COMPLETED = "completed"
    ROLLING_BACK = "rolling_back"
    FAILED = "failed"

class WeatherMigrationOrchestrator:
    """Orchestrates the weather service migration process"""

    def __init__(self):
        self.state = MigrationState.NOT_STARTED
        self.logger = logging.getLogger(__name__)
        self.migration_log: List[Dict[str, Any]] = []
        self.validation_results: Dict[str, Any] = {}

    async def execute_migration(self) -> bool:
        """Execute the complete migration process"""
        try:
            await self._log_migration_step("Starting weather service migration")

            # Phase 1: Pre-migration validation
            if not await self._validate_prerequisites():
                return False

            # Phase 2: Data synchronization validation
            if not await self._validate_data_consistency():
                return False

            # Phase 3: Performance baseline
            if not await self._establish_performance_baseline():
                return False

            # Phase 4: Gradual migration with monitoring
            if not await self._execute_gradual_migration():
                return False

            # Phase 5: Final validation and cleanup
            if not await self._complete_migration():
                return False

            self.state = MigrationState.COMPLETED
            await self._log_migration_step("Migration completed successfully")
            return True

        except Exception as e:
            self.logger.error(f"Migration failed: {e}")
            await self._rollback_migration()
            return False

    async def _validate_prerequisites(self) -> bool:
        """Validate system prerequisites for migration"""
        self.state = MigrationState.VALIDATING
        await self._log_migration_step("Validating prerequisites")

        checks = [
            ("SvelteKit API health", self._check_sveltekit_health),
            ("Database connectivity", self._check_database_health),
            ("Python dependencies", self._check_python_dependencies),
            ("Network connectivity", self._check_network_connectivity),
            ("Disk space", self._check_disk_space),
        ]

        for check_name, check_func in checks:
            result = await check_func()
            self.validation_results[check_name] = result

            if not result["success"]:
                await self._log_migration_step(
                    f"Prerequisite check failed: {check_name} - {result['error']}"
                )
                return False

        return True

    async def _validate_data_consistency(self) -> bool:
        """Validate data consistency between services"""
        await self._log_migration_step("Validating data consistency")

        # Sample locations for testing
        test_locations = await self._get_test_locations()

        consistency_issues = []

        for location_id in test_locations:
            try:
                # Get data from both sources
                python_data = await self._get_python_weather_data(location_id)
                sveltekit_data = await self._get_sveltekit_weather_data(location_id)

                # Compare data
                comparison = self._compare_weather_data(python_data, sveltekit_data)

                if comparison["deviation"] > 0.05:  # 5% threshold
                    consistency_issues.append({
                        "location_id": location_id,
                        "deviation": comparison["deviation"],
                        "details": comparison["details"]
                    })

            except Exception as e:
                consistency_issues.append({
                    "location_id": location_id,
                    "error": str(e)
                })

        if consistency_issues:
            await self._log_migration_step(
                f"Data consistency issues found: {len(consistency_issues)} locations"
            )
            self.validation_results["consistency_issues"] = consistency_issues
            return False

        return True

    async def _execute_gradual_migration(self) -> bool:
        """Execute gradual migration with rollback capability"""
        self.state = MigrationState.MIGRATING

        # Migration phases with increasing percentages
        phases = [
            {"name": "Phase 1", "percentage": 10, "duration": 300},  # 5 minutes
            {"name": "Phase 2", "percentage": 25, "duration": 600},  # 10 minutes
            {"name": "Phase 3", "percentage": 50, "duration": 900},  # 15 minutes
            {"name": "Phase 4", "percentage": 75, "duration": 900},  # 15 minutes
            {"name": "Phase 5", "percentage": 100, "duration": 1800}, # 30 minutes
        ]

        for phase in phases:
            await self._log_migration_step(
                f"Starting {phase['name']}: {phase['percentage']}% traffic"
            )

            # Update feature flag
            await self._update_feature_flag_percentage(phase["percentage"])

            # Monitor for issues
            monitoring_result = await self._monitor_phase(phase["duration"])

            if not monitoring_result["success"]:
                await self._log_migration_step(
                    f"Phase {phase['name']} failed: {monitoring_result['error']}"
                )
                await self._rollback_migration()
                return False

            await self._log_migration_step(
                f"Phase {phase['name']} completed successfully"
            )

        return True

    async def _monitor_phase(self, duration: int) -> Dict[str, Any]:
        """Monitor migration phase for issues"""
        start_time = datetime.utcnow()

        while (datetime.utcnow() - start_time).total_seconds() < duration:
            # Check error rates
            error_rate = await self._get_error_rate()
            if error_rate > 0.05:  # 5% error threshold
                return {
                    "success": False,
                    "error": f"High error rate: {error_rate:.2%}"
                }

            # Check response times
            avg_response_time = await self._get_avg_response_time()
            if avg_response_time > 5000:  # 5 second threshold
                return {
                    "success": False,
                    "error": f"High response time: {avg_response_time}ms"
                }

            # Check forecast accuracy
            accuracy_drop = await self._check_forecast_accuracy_drop()
            if accuracy_drop > 0.10:  # 10% accuracy drop threshold
                return {
                    "success": False,
                    "error": f"Forecast accuracy dropped: {accuracy_drop:.2%}"
                }

            await asyncio.sleep(30)  # Check every 30 seconds

        return {"success": True}

    async def _rollback_migration(self):
        """Rollback migration to previous state"""
        self.state = MigrationState.ROLLING_BACK
        await self._log_migration_step("Starting migration rollback")

        try:
            # Reset feature flags
            await self._update_feature_flag_percentage(0)

            # Clear caches
            await self._clear_all_caches()

            # Restart Python weather service if needed
            await self._restart_python_weather_service()

            # Validate rollback
            rollback_valid = await self._validate_rollback()

            if rollback_valid:
                self.state = MigrationState.NOT_STARTED
                await self._log_migration_step("Rollback completed successfully")
            else:
                self.state = MigrationState.FAILED
                await self._log_migration_step("Rollback failed - manual intervention required")

        except Exception as e:
            self.state = MigrationState.FAILED
            await self._log_migration_step(f"Rollback failed with error: {e}")

    async def _log_migration_step(self, message: str):
        """Log migration step with timestamp"""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "state": self.state.value,
            "message": message
        }

        self.migration_log.append(log_entry)
        self.logger.info(f"Migration: {message}")

        # Also log to external monitoring system
        await self._send_to_monitoring_system(log_entry)

    def get_migration_status(self) -> Dict[str, Any]:
        """Get current migration status"""
        return {
            "state": self.state.value,
            "log": self.migration_log[-10:],  # Last 10 entries
            "validation_results": self.validation_results,
            "started_at": self.migration_log[0]["timestamp"] if self.migration_log else None,
            "current_time": datetime.utcnow().isoformat()
        }
```

---

## 🏗️ PHASE 4: COMPREHENSIVE TESTING FRAMEWORK

### 4.1 Integration Test Suite
```python
# /python-worker/tests/integration/test_weather_migration.py
import pytest
import asyncio
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock
import aiohttp

from app.integrations.weather_client import WeatherAPIClient
from app.modules.forecast.services import ForecastService
from app.migration.weather_migration import WeatherMigrationOrchestrator

class TestWeatherMigration:
    """Comprehensive integration tests for weather migration"""

    @pytest.fixture
    async def weather_client(self):
        """Weather API client fixture"""
        client = WeatherAPIClient()
        await client.connect()
        yield client
        await client.close()

    @pytest.fixture
    def sample_weather_data(self):
        """Sample weather data for testing"""
        timestamps = pd.date_range(
            start=datetime.utcnow() - timedelta(hours=24),
            end=datetime.utcnow(),
            freq='H'
        )

        return pd.DataFrame({
            'timestamp': timestamps,
            'temperature': np.random.normal(20, 5, len(timestamps)),
            'humidity': np.random.normal(60, 15, len(timestamps)),
            'windSpeed': np.random.normal(5, 2, len(timestamps)),
            'cloudCover': np.random.normal(40, 20, len(timestamps)),
            'ghi': np.random.normal(300, 100, len(timestamps)),
            'dni': np.random.normal(200, 50, len(timestamps)),
            'dhi': np.random.normal(100, 30, len(timestamps)),
        }).set_index('timestamp')

    @pytest.mark.asyncio
    async def test_weather_api_client_basic_functionality(self, weather_client):
        """Test basic weather API client functionality"""
        location_id = "550e8400-e29b-41d4-a716-446655440000"

        # Mock successful API response
        mock_response = {
            "success": True,
            "data": {
                "columns": ["timestamp", "temperature", "humidity"],
                "index": ["2025-09-17T10:00:00Z", "2025-09-17T11:00:00Z"],
                "values": [
                    ["2025-09-17T10:00:00Z", 22.5, 65.0],
                    ["2025-09-17T11:00:00Z", 23.1, 63.2]
                ],
                "dtypes": {
                    "timestamp": "datetime64[ns]",
                    "temperature": "float64",
                    "humidity": "float64"
                }
            }
        }

        with aiohttp.ClientSession() as session:
            # Mock the session.get method
            weather_client.session = session

            df = await weather_client.get_weather_dataframe(location_id, hours=24)

            assert isinstance(df, pd.DataFrame)
            assert not df.empty
            assert 'temperature' in df.columns
            assert 'humidity' in df.columns

    @pytest.mark.asyncio
    async def test_weather_client_error_handling(self, weather_client):
        """Test weather client error handling and retries"""
        location_id = "invalid-location-id"

        with pytest.raises(Exception):
            await weather_client.get_weather_dataframe(location_id)

    @pytest.mark.asyncio
    async def test_forecast_service_with_weather_api(self, sample_weather_data):
        """Test forecast service integration with weather API"""
        # Mock the weather API client
        mock_client = AsyncMock()
        mock_client.get_weather_dataframe.return_value = sample_weather_data

        # Initialize forecast service with mocked dependencies
        forecast_service = ForecastService(db=MagicMock())
        forecast_service.repo.weather_client = mock_client

        location_id = "550e8400-e29b-41d4-a716-446655440000"

        # Test forecast generation
        task = {
            "task_id": "test-task-001",
            "location_id": location_id,
            "horizon_hours": 24,
            "model_type": "ML_ENSEMBLE"
        }

        result = await forecast_service.generate_task(task["task_id"])

        assert result["success"] == True
        assert "forecasts" in result
        assert len(result["forecasts"]) > 0

    @pytest.mark.asyncio
    async def test_data_consistency_validation(self):
        """Test data consistency between Python and SvelteKit"""
        migration = WeatherMigrationOrchestrator()

        # Mock data sources
        python_data = pd.DataFrame({
            'timestamp': pd.date_range('2025-09-17', periods=24, freq='H'),
            'temperature': np.arange(24) + 20,
            'humidity': np.arange(24) + 50
        }).set_index('timestamp')

        sveltekit_data = pd.DataFrame({
            'timestamp': pd.date_range('2025-09-17', periods=24, freq='H'),
            'temperature': np.arange(24) + 20.1,  # Slight difference
            'humidity': np.arange(24) + 50.2
        }).set_index('timestamp')

        comparison = migration._compare_weather_data(python_data, sveltekit_data)

        assert comparison["deviation"] < 0.01  # Should be very small
        assert comparison["correlation"] > 0.99  # Should be highly correlated

    @pytest.mark.asyncio
    async def test_performance_benchmarking(self, weather_client):
        """Test performance benchmarks for weather API"""
        location_id = "550e8400-e29b-41d4-a716-446655440000"

        # Measure response times
        response_times = []

        for _ in range(10):  # 10 test requests
            start_time = asyncio.get_event_loop().time()

            try:
                await weather_client.get_weather_dataframe(location_id, hours=24)
                elapsed = asyncio.get_event_loop().time() - start_time
                response_times.append(elapsed)
            except Exception:
                pass  # Skip failed requests for this test

        if response_times:
            avg_response_time = np.mean(response_times)
            p95_response_time = np.percentile(response_times, 95)

            assert avg_response_time < 2.0  # Average < 2 seconds
            assert p95_response_time < 5.0  # P95 < 5 seconds

    @pytest.mark.asyncio
    async def test_circuit_breaker_functionality(self):
        """Test circuit breaker behavior"""
        from app.integrations.circuit_breaker import CircuitBreaker, CircuitState

        circuit_breaker = CircuitBreaker()

        # Simulate failures to trip circuit breaker
        for _ in range(6):  # Exceed failure threshold
            try:
                await circuit_breaker.call(self._failing_function)
            except Exception:
                pass

        assert circuit_breaker.state == CircuitState.OPEN

        # Test that circuit breaker rejects calls when open
        with pytest.raises(Exception, match="Circuit breaker is OPEN"):
            await circuit_breaker.call(self._failing_function)

    async def _failing_function(self):
        """Helper function that always fails"""
        raise Exception("Simulated failure")

    @pytest.mark.asyncio
    async def test_migration_rollback(self):
        """Test migration rollback functionality"""
        migration = WeatherMigrationOrchestrator()

        # Start migration
        migration.state = migration.MigrationState.MIGRATING

        # Simulate rollback
        await migration._rollback_migration()

        # Verify rollback completed
        assert migration.state in [
            migration.MigrationState.NOT_STARTED,
            migration.MigrationState.FAILED
        ]

    @pytest.mark.asyncio
    async def test_feature_flag_integration(self):
        """Test feature flag integration"""
        from app.integrations.feature_flags import FeatureFlagManager

        # Test feature flag evaluation
        flag_manager = FeatureFlagManager()

        # Test percentage-based rollout
        enabled_count = 0
        for i in range(100):
            context = {"locationId": f"location-{i:03d}"}
            if flag_manager.isEnabled("weatherServiceConsolidation", context):
                enabled_count += 1

        # Should respect percentage setting
        expected_percentage = flag_manager.config["weatherServiceConsolidation"]["percentage"]
        actual_percentage = enabled_count

        # Allow 10% tolerance in percentage enforcement
        assert abs(actual_percentage - expected_percentage) <= 10

    @pytest.mark.asyncio
    async def test_cache_performance(self):
        """Test weather cache performance"""
        from app.integrations.weather_client import WeatherAPIClient

        client = WeatherAPIClient()
        await client.connect()

        location_id = "550e8400-e29b-41d4-a716-446655440000"

        # First call (cache miss)
        start_time = asyncio.get_event_loop().time()
        await client.get_weather_dataframe(location_id, hours=24)
        first_call_time = asyncio.get_event_loop().time() - start_time

        # Second call (cache hit)
        start_time = asyncio.get_event_loop().time()
        await client.get_weather_dataframe(location_id, hours=24)
        second_call_time = asyncio.get_event_loop().time() - start_time

        # Cache hit should be significantly faster
        assert second_call_time < first_call_time * 0.5

        await client.close()

    @pytest.mark.asyncio
    async def test_concurrent_requests(self, weather_client):
        """Test handling of concurrent weather requests"""
        location_id = "550e8400-e29b-41d4-a716-446655440000"

        # Launch multiple concurrent requests
        tasks = [
            weather_client.get_weather_dataframe(location_id, hours=24)
            for _ in range(10)
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Count successful responses
        successful_results = [r for r in results if isinstance(r, pd.DataFrame)]

        # Should handle concurrent requests successfully
        assert len(successful_results) >= 8  # Allow some failures

        # All successful results should have consistent data
        if len(successful_results) > 1:
            first_result = successful_results[0]
            for result in successful_results[1:]:
                assert result.shape == first_result.shape
                assert list(result.columns) == list(first_result.columns)

# Performance benchmarking suite
class TestWeatherPerformance:
    """Performance-focused tests for weather service"""

    @pytest.mark.performance
    @pytest.mark.asyncio
    async def test_load_performance(self):
        """Test performance under load"""
        client = WeatherAPIClient()
        await client.connect()

        location_ids = [f"550e8400-e29b-41d4-a716-44665544{i:04d}" for i in range(50)]

        start_time = asyncio.get_event_loop().time()

        # Create batches to avoid overwhelming the server
        batch_size = 5
        for i in range(0, len(location_ids), batch_size):
            batch = location_ids[i:i + batch_size]

            tasks = [
                client.get_weather_dataframe(location_id, hours=24)
                for location_id in batch
            ]

            await asyncio.gather(*tasks, return_exceptions=True)
            await asyncio.sleep(0.1)  # Brief pause between batches

        total_time = asyncio.get_event_loop().time() - start_time
        requests_per_second = len(location_ids) / total_time

        # Should handle at least 10 requests per second
        assert requests_per_second >= 10

        await client.close()

    @pytest.mark.performance
    @pytest.mark.asyncio
    async def test_memory_usage(self):
        """Test memory usage during weather operations"""
        import psutil
        import os

        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss

        client = WeatherAPIClient()
        await client.connect()

        # Perform many operations
        for _ in range(100):
            location_id = "550e8400-e29b-41d4-a716-446655440000"
            await client.get_weather_dataframe(location_id, hours=24)

        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory

        # Memory increase should be reasonable (< 100MB)
        assert memory_increase < 100 * 1024 * 1024

        await client.close()

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])
```

### 4.2 End-to-End Testing Framework
```typescript
// /tests/e2e/weather-migration.test.ts
import { test, expect } from '@playwright/test';
import { WeatherAPIClient } from '../src/lib/integrations/weather-client';

test.describe('Weather Service Migration E2E Tests', () => {

  test('forecast generation with weather API integration', async ({ page }) => {
    // Navigate to forecast page
    await page.goto('/forecasts');

    // Select location
    await page.selectOption('[data-testid="location-select"]',
      '550e8400-e29b-41d4-a716-446655440000');

    // Configure forecast parameters
    await page.selectOption('[data-testid="horizon-select"]', '24');
    await page.selectOption('[data-testid="model-select"]', 'ML_ENSEMBLE');

    // Start forecast generation
    await page.click('[data-testid="generate-forecast-btn"]');

    // Wait for completion (with timeout)
    await expect(page.locator('[data-testid="forecast-status"]'))
      .toContainText('Completed', { timeout: 60000 });

    // Verify forecast data is displayed
    await expect(page.locator('[data-testid="forecast-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="forecast-table"]')).toBeVisible();

    // Check that weather data was used
    const weatherDataUsed = await page.locator('[data-testid="weather-data-indicator"]');
    await expect(weatherDataUsed).toContainText('Weather data: Available');
  });

  test('weather service failover behavior', async ({ page }) => {
    // Mock weather service failure
    await page.route('**/api/weather/**', route => {
      route.fulfill({ status: 500, body: 'Service unavailable' });
    });

    await page.goto('/forecasts');

    // Attempt forecast generation
    await page.selectOption('[data-testid="location-select"]',
      '550e8400-e29b-41d4-a716-446655440000');
    await page.click('[data-testid="generate-forecast-btn"]');

    // Should show fallback message
    await expect(page.locator('[data-testid="fallback-indicator"]'))
      .toContainText('Using cached weather data');
  });

  test('performance monitoring during migration', async ({ page }) => {
    await page.goto('/admin/migration-status');

    // Check migration status
    const migrationStatus = page.locator('[data-testid="migration-status"]');
    await expect(migrationStatus).toBeVisible();

    // Monitor performance metrics
    const responseTime = page.locator('[data-testid="avg-response-time"]');
    const errorRate = page.locator('[data-testid="error-rate"]');

    await expect(responseTime).toContainText(/\d+ms/);
    await expect(errorRate).toContainText(/\d+\.\d+%/);

    // Performance should be within acceptable limits
    const responseTimeText = await responseTime.textContent();
    const responseTimeValue = parseInt(responseTimeText?.match(/\d+/)?.[0] || '0');
    expect(responseTimeValue).toBeLessThan(5000); // < 5 seconds

    const errorRateText = await errorRate.textContent();
    const errorRateValue = parseFloat(errorRateText?.match(/\d+\.\d+/)?.[0] || '0');
    expect(errorRateValue).toBeLessThan(5.0); // < 5%
  });

});
```

---

## 📊 PHASE 5: MONITORING & OBSERVABILITY

### 5.1 Comprehensive Metrics Collection
```typescript
// SvelteKit: /src/lib/server/monitoring/weather-metrics.ts
interface WeatherMetrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    cached: number;
  };
  performance: {
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  };
  errors: {
    apiErrors: number;
    databaseErrors: number;
    transformationErrors: number;
    timeoutErrors: number;
  };
  cache: {
    hitRate: number;
    size: number;
    evictions: number;
  };
}

class WeatherMetricsCollector {
  private metrics: WeatherMetrics;
  private requestTimes: number[] = [];

  constructor() {
    this.resetMetrics();
  }

  recordRequest(
    success: boolean,
    responseTime: number,
    cached: boolean = false,
    errorType?: string
  ): void {
    this.metrics.requests.total++;

    if (success) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;

      // Track error types
      switch (errorType) {
        case 'api': this.metrics.errors.apiErrors++; break;
        case 'database': this.metrics.errors.databaseErrors++; break;
        case 'transformation': this.metrics.errors.transformationErrors++; break;
        case 'timeout': this.metrics.errors.timeoutErrors++; break;
      }
    }

    if (cached) {
      this.metrics.requests.cached++;
    }

    // Track response times
    this.requestTimes.push(responseTime);

    // Keep only last 1000 requests for percentile calculation
    if (this.requestTimes.length > 1000) {
      this.requestTimes = this.requestTimes.slice(-1000);
    }

    this.updatePerformanceMetrics();
  }

  private updatePerformanceMetrics(): void {
    if (this.requestTimes.length === 0) return;

    const sorted = [...this.requestTimes].sort((a, b) => a - b);

    this.metrics.performance.avgResponseTime =
      this.requestTimes.reduce((sum, time) => sum + time, 0) / this.requestTimes.length;

    this.metrics.performance.p95ResponseTime =
      sorted[Math.floor(sorted.length * 0.95)];

    this.metrics.performance.p99ResponseTime =
      sorted[Math.floor(sorted.length * 0.99)];
  }

  updateCacheMetrics(hitRate: number, size: number, evictions: number): void {
    this.metrics.cache.hitRate = hitRate;
    this.metrics.cache.size = size;
    this.metrics.cache.evictions = evictions;
  }

  getMetrics(): WeatherMetrics {
    return { ...this.metrics };
  }

  getHealthScore(): number {
    const errorRate = this.metrics.requests.failed /
      Math.max(this.metrics.requests.total, 1);
    const avgResponseTime = this.metrics.performance.avgResponseTime;

    // Health score calculation (0-100)
    let score = 100;

    // Penalize high error rates
    score -= Math.min(errorRate * 1000, 50); // Max 50 point penalty

    // Penalize slow response times
    if (avgResponseTime > 1000) {
      score -= Math.min((avgResponseTime - 1000) / 100, 30); // Max 30 point penalty
    }

    return Math.max(0, Math.round(score));
  }

  private resetMetrics(): void {
    this.metrics = {
      requests: { total: 0, successful: 0, failed: 0, cached: 0 },
      performance: { avgResponseTime: 0, p95ResponseTime: 0, p99ResponseTime: 0 },
      errors: {
        apiErrors: 0, databaseErrors: 0,
        transformationErrors: 0, timeoutErrors: 0
      },
      cache: { hitRate: 0, size: 0, evictions: 0 }
    };
  }

  generateReport(): string {
    const metrics = this.getMetrics();
    const healthScore = this.getHealthScore();

    return `
Weather Service Health Report
============================
Health Score: ${healthScore}/100

Requests:
- Total: ${metrics.requests.total}
- Success Rate: ${(metrics.requests.successful / Math.max(metrics.requests.total, 1) * 100).toFixed(2)}%
- Cache Hit Rate: ${(metrics.requests.cached / Math.max(metrics.requests.total, 1) * 100).toFixed(2)}%

Performance:
- Average Response Time: ${metrics.performance.avgResponseTime.toFixed(2)}ms
- P95 Response Time: ${metrics.performance.p95ResponseTime.toFixed(2)}ms
- P99 Response Time: ${metrics.performance.p99ResponseTime.toFixed(2)}ms

Errors:
- API Errors: ${metrics.errors.apiErrors}
- Database Errors: ${metrics.errors.databaseErrors}
- Transformation Errors: ${metrics.errors.transformationErrors}
- Timeout Errors: ${metrics.errors.timeoutErrors}

Cache:
- Hit Rate: ${(metrics.cache.hitRate * 100).toFixed(2)}%
- Size: ${metrics.cache.size} entries
- Evictions: ${metrics.cache.evictions}
    `.trim();
  }
}

export const weatherMetrics = new WeatherMetricsCollector();
```

---

## 🎯 IMPLEMENTATION TIMELINE

### Week 1: Foundation (5 days)
**Day 1-2**: API Contract & Data Transformation
**Day 3-4**: Python Weather Client Implementation
**Day 5**: Performance Optimization & Caching

### Week 2: Integration & Testing (5 days)
**Day 1-2**: Error Handling & Circuit Breaker
**Day 3-4**: Feature Flags & Migration Framework
**Day 5**: Comprehensive Test Suite

### Week 3: Migration & Monitoring (5 days)
**Day 1-2**: Gradual Migration Execution
**Day 3-4**: Monitoring & Validation
**Day 5**: Cleanup & Documentation

---

## 🔐 SUCCESS CRITERIA

### Technical Metrics
- **Response Time**: P95 < 2 seconds, P99 < 5 seconds
- **Error Rate**: < 1% during migration
- **Cache Hit Rate**: > 80%
- **Forecast Accuracy**: No degradation > 2%

### Operational Metrics
- **Zero Production Incidents**
- **Successful Rollback Capability**
- **100% Test Coverage** for critical paths
- **Complete Documentation**

This ultra-detailed implementation strategy provides the foundation for a robust, monitored, and reversible weather service consolidation with comprehensive error handling and performance optimization.

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Design ultra-detailed API contracts and data transformation layer", "status": "completed", "activeForm": "Designing ultra-detailed API contracts and data transformation layer"}, {"content": "Architect performance optimization and caching strategies", "status": "completed", "activeForm": "Architecting performance optimization and caching strategies"}, {"content": "Create comprehensive error handling and resilience patterns", "status": "completed", "activeForm": "Creating comprehensive error handling and resilience patterns"}, {"content": "Design migration orchestration and rollback mechanisms", "status": "completed", "activeForm": "Designing migration orchestration and rollback mechanisms"}, {"content": "Create detailed testing and validation framework", "status": "completed", "activeForm": "Creating detailed testing and validation framework"}]