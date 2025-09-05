import { PrismaClient, Prisma } from '@prisma/client';

// TimescaleDB optimized database configuration
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Enhanced Prisma Client configuration for TimescaleDB
// Handle build-time initialization gracefully
const createPrismaClient = () => {
  // During build, return a minimal client if DATABASE_URL is not set
  if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
    console.warn('DATABASE_URL not set during build, using placeholder');
    return new PrismaClient({
      datasources: {
        db: {
          url: 'postgresql://user:pass@localhost:5432/db?schema=public'
        }
      }
    });
  }
  
  return new PrismaClient({
    // Enhanced logging configuration for TimescaleDB monitoring
    log: [
      {
        emit: 'event',
        level: 'query',
      },
      {
        emit: 'event', 
        level: 'error',
      },
      {
        emit: 'event',
        level: 'info',
      },
      {
        emit: 'event',
        level: 'warn',
      },
    ],
    
    // TimescaleDB specific optimizations
    errorFormat: 'pretty',
    
    // Database connection configuration optimized for time-series workloads
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/db?schema=public',
      },
    },

    // Transaction configuration for TimescaleDB
    transactionOptions: {
      maxWait: 5000,      // 5 seconds max wait for transaction
      timeout: 30000,     // 30 seconds transaction timeout (good for bulk inserts)
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, // Optimal for time-series
    },
  });
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

// Prisma Client event listeners for TimescaleDB monitoring
// Only add listeners if we have a real database connection
if (process.env.DATABASE_URL) {
  db.$on('query', (e) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Query: ' + e.query);
      console.log('Params: ' + e.params);
      console.log('Duration: ' + e.duration + 'ms');
    }
    
    // Log slow queries in production (>1000ms)
    if (process.env.NODE_ENV === 'production' && e.duration > 1000) {
      console.warn(`Slow TimescaleDB query (${e.duration}ms):`, {
        query: e.query,
        duration: e.duration,
        timestamp: new Date().toISOString()
      });
    }
  });

  db.$on('error', (e) => {
    console.error('TimescaleDB Prisma Error:', e);
  });

  db.$on('info', (e) => {
    if (process.env.NODE_ENV === 'development') {
      console.info('TimescaleDB Prisma Info:', e.message);
    }
  });

  db.$on('warn', (e) => {
    console.warn('TimescaleDB Prisma Warning:', e.message);
  });
}

// Prisma Middleware for TimescaleDB Optimizations
// Only add middleware if we have a real database connection
if (process.env.DATABASE_URL) {
  db.$use(async (params, next) => {
  const start = Date.now();
  
  // Time-series table optimizations
  if (['forecasts', 'production', 'weather_data'].includes(params.model || '')) {
    // For time-series tables, always order by timestamp DESC for better performance
    if (params.action === 'findMany' && !params.args?.orderBy) {
      params.args = {
        ...params.args,
        orderBy: { timestamp: 'desc' }
      };
    }
    
    // Automatically add recent data filter if no timestamp filter provided
    if (params.action === 'findMany' && !params.args?.where?.timestamp && !params.args?.take) {
      // Default to last 7 days for performance unless specifically requested
      params.args = {
        ...params.args,
        where: {
          ...params.args?.where,
          timestamp: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
          }
        }
      };
    }
    
    // Optimize bulk inserts for time-series data
    if (params.action === 'createMany' && params.args?.data) {
      // Sort data by timestamp for better chunk insertion performance
      if (Array.isArray(params.args.data)) {
        params.args.data.sort((a: any, b: any) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      }
    }
  }

  const result = await next(params);
  const end = Date.now();
  const duration = end - start;
  
  // Log performance metrics for time-series operations
  if (duration > 500 && ['forecasts', 'production', 'weather_data'].includes(params.model || '')) {
    console.warn(`TimescaleDB slow operation on ${params.model}:`, {
      action: params.action,
      duration: `${duration}ms`,
      args: params.args
    });
  }
  
  return result;
  });
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

// Type definitions for TimescaleDB operations
export type TimeInterval = '15 minutes' | '30 minutes' | '1 hour' | '1 day' | '1 week' | '1 month';
export type HypertableName = 'forecasts' | 'production' | 'weather_data';

export interface TimeBucketOptions {
  interval: TimeInterval;
  table: HypertableName;
  timeColumn?: string;
  where?: string;
  groupBy?: string[];
  aggregations?: {
    avg?: string[];
    sum?: string[];
    max?: string[];
    min?: string[];
    count?: string[];
  };
  limit?: number;
}

export interface BulkInsertOptions {
  batchSize?: number;
  onConflict?: 'ignore' | 'update';
  validateTimestamps?: boolean;
}

// Enhanced TimescaleDB query helpers with type safety
export class TimescaleQueries {
  /**
   * Type-safe time_bucket query for time-series aggregation
   * Optimized for TimescaleDB hypertables with comprehensive aggregations
   */
  static async timeBucket(options: TimeBucketOptions) {
    const {
      interval,
      table, 
      timeColumn = 'timestamp',
      where,
      groupBy = [],
      aggregations = {},
      limit
    } = options;

    // Build aggregation columns
    const aggColumns: string[] = [];
    
    if (aggregations.avg) {
      aggColumns.push(...aggregations.avg.map(col => `AVG("${col}") as avg_${col}`));
    }
    if (aggregations.sum) {
      aggColumns.push(...aggregations.sum.map(col => `SUM("${col}") as sum_${col}`));
    }
    if (aggregations.max) {
      aggColumns.push(...aggregations.max.map(col => `MAX("${col}") as max_${col}`));
    }
    if (aggregations.min) {
      aggColumns.push(...aggregations.min.map(col => `MIN("${col}") as min_${col}`));
    }
    if (aggregations.count) {
      aggColumns.push(...aggregations.count.map(col => `COUNT("${col}") as count_${col}`));
    }
    
    // Default to count if no aggregations specified
    if (aggColumns.length === 0) {
      aggColumns.push('COUNT(*) as count');
    }

    const whereClause = where ? `WHERE ${where}` : '';
    const groupByClause = groupBy.length ? `, ${groupBy.map(col => `"${col}"`).join(', ')}` : '';
    const limitClause = limit ? `LIMIT ${limit}` : '';
    
    const query = `
      SELECT 
        time_bucket('${interval}', "${timeColumn}") as bucket${groupByClause},
        ${aggColumns.join(',\n        ')}
      FROM "${table}"
      ${whereClause}
      GROUP BY bucket${groupByClause}
      ORDER BY bucket DESC
      ${limitClause};
    `;
    
    return await db.$queryRawUnsafe(query);
  }

  /**
   * Optimized bulk insert for time-series data
   * Sorts data by timestamp for better chunk performance
   */
  static async bulkInsert<T extends { timestamp: Date }>(
    table: HypertableName,
    data: T[],
    options: BulkInsertOptions = {}
  ) {
    const { 
      batchSize = 1000, 
      onConflict = 'ignore',
      validateTimestamps = true 
    } = options;

    if (data.length === 0) return { inserted: 0, batches: 0 };

    // Validate timestamps if requested
    if (validateTimestamps) {
      const invalidTimestamps = data.filter(row => 
        !row.timestamp || isNaN(row.timestamp.getTime())
      );
      if (invalidTimestamps.length > 0) {
        throw new Error(`Invalid timestamps found: ${invalidTimestamps.length} records`);
      }
    }

    // Sort by timestamp for optimal chunk insertion
    const sortedData = [...data].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );

    let totalInserted = 0;
    let batchCount = 0;

    // Process in batches
    for (let i = 0; i < sortedData.length; i += batchSize) {
      const batch = sortedData.slice(i, i + batchSize);
      
      try {
        if (table === 'forecasts') {
          await db.forecast.createMany({
            data: batch as any,
            skipDuplicates: onConflict === 'ignore'
          });
        } else if (table === 'production') {
          await db.production.createMany({
            data: batch as any,
            skipDuplicates: onConflict === 'ignore'
          });
        } else if (table === 'weather_data') {
          await db.weatherData.createMany({
            data: batch as any,
            skipDuplicates: onConflict === 'ignore'
          });
        }
        
        totalInserted += batch.length;
        batchCount++;
      } catch (error) {
        console.error(`Batch insert failed for ${table}, batch ${batchCount + 1}:`, error);
        throw error;
      }
    }

    return { 
      inserted: totalInserted, 
      batches: batchCount,
      table 
    };
  }

  /**
   * Use continuous aggregates for fast dashboard queries
   */
  static async getProductionHourly(locationId: number, hours: number = 24) {
    const query = `
      SELECT 
        bucket,
        avg_power_mw,
        max_power_mw,
        avg_capacity_factor,
        sample_count,
        good_samples
      FROM production_hourly
      WHERE "locationId" = $1 
        AND bucket >= NOW() - INTERVAL '${hours} hours'
      ORDER BY bucket DESC;
    `;
    
    return await db.$queryRawUnsafe(query, locationId);
  }

  /**
   * Get production daily summary using continuous aggregates
   */
  static async getProductionDaily(locationId: number, days: number = 30) {
    const query = `
      SELECT 
        bucket,
        avg_power_mw,
        max_power_mw,
        total_energy_mwh,
        avg_capacity_factor,
        avg_performance_ratio,
        sample_count,
        total_downtime_minutes
      FROM production_daily
      WHERE "locationId" = $1 
        AND bucket >= NOW() - INTERVAL '${days} days'
      ORDER BY bucket DESC;
    `;
    
    return await db.$queryRawUnsafe(query, locationId);
  }

  /**
   * Get hypertable information for monitoring
   */
  static async getHypertableStats() {
    const query = `
      SELECT 
        h.hypertable_name,
        h.num_chunks,
        h.compression_enabled,
        COALESCE(cs.total_chunks, 0) as compressed_chunks,
        COALESCE(cs.compressed_heap_size, 0) as compressed_size,
        COALESCE(cs.uncompressed_heap_size, 0) as uncompressed_size
      FROM timescaledb_information.hypertables h
      LEFT JOIN timescaledb_information.compressed_hypertable_stats cs
        ON h.hypertable_name = cs.hypertable_name
      WHERE h.hypertable_schema = 'public';
    `;
    
    return await db.$queryRawUnsafe(query);
  }
}

// Connection health check specific to TimescaleDB
export async function checkTimescaleDBHealth(): Promise<{
  connected: boolean;
  timescaleEnabled: boolean;
  hypertables: number;
  error?: string;
}> {
  try {
    // Check basic connection
    await db.$queryRaw`SELECT 1`;
    
    // Check if TimescaleDB extension is enabled
    const timescaleCheck = await db.$queryRaw<Array<{ extname: string }>>`
      SELECT extname FROM pg_extension WHERE extname = 'timescaledb';
    `;
    
    const timescaleEnabled = timescaleCheck.length > 0;
    
    if (!timescaleEnabled) {
      return {
        connected: true,
        timescaleEnabled: false,
        hypertables: 0,
        error: 'TimescaleDB extension not enabled'
      };
    }
    
    // Count hypertables
    const hypertableCount = await db.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count 
      FROM timescaledb_information.hypertables 
      WHERE hypertable_schema = 'public';
    `;
    
    return {
      connected: true,
      timescaleEnabled: true,
      hypertables: Number(hypertableCount[0].count),
    };
    
  } catch (error) {
    return {
      connected: false,
      timescaleEnabled: false,
      hypertables: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export default db;