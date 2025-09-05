import { json } from '@sveltejs/kit';
import { checkTimescaleDBHealth, TimescaleQueries, db } from '$lib/server/database.js';
import type { RequestHandler } from './$types';

/**
 * TimescaleDB Health Check API
 * GET /api/timescale/health
 * 
 * Provides comprehensive health status for TimescaleDB installation
 * Gracefully handles various stages of initialization
 */
export const GET: RequestHandler = async () => {
  try {
    // Basic TimescaleDB health check with progressive enhancement
    const health = await checkTimescaleDBHealth();
    
    // Level 1: Database connection
    if (!health.connected) {
      return json({
        status: 'error',
        level: 'connection',
        message: 'Database connection failed',
        error: health.error,
        details: {
          connected: false,
          timescaleEnabled: false,
          tablesReady: false,
          hypertablesReady: false
        },
        timestamp: new Date().toISOString()
      }, { status: 503 });
    }

    // Level 2: TimescaleDB extension
    if (!health.timescaleEnabled) {
      return json({
        status: 'warning',
        level: 'extension',
        message: 'TimescaleDB extension not enabled',
        details: {
          connected: true,
          timescaleEnabled: false,
          tablesReady: false,
          hypertablesReady: false
        },
        recommendation: 'Run: CREATE EXTENSION IF NOT EXISTS timescaledb;',
        timestamp: new Date().toISOString()
      }, { status: 200 });
    }
    
    // Level 3: Prisma tables
    if (!health.tablesReady) {
      return json({
        status: 'warning',
        level: 'tables',
        message: 'Database tables not ready',
        details: {
          connected: true,
          timescaleEnabled: true,
          tablesReady: false,
          hypertablesReady: false
        },
        recommendation: 'Run: npx prisma db push',
        timestamp: new Date().toISOString()
      }, { status: 200 });
    }

    // Level 4: Hypertables (optional but recommended)
    const hypertableStats = await TimescaleQueries.getHypertableStats();
    const chunkInfo = await TimescaleQueries.getChunkInfo();
    
    if (health.hypertables === 0) {
      return json({
        status: 'warning',
        level: 'hypertables',
        message: 'TimescaleDB ready but hypertables not configured',
        details: {
          connected: true,
          timescaleEnabled: true,
          tablesReady: true,
          hypertablesReady: false,
          hypertableCount: 0
        },
        recommendation: 'Run: psql $DATABASE_URL -f scripts/init-timescaledb.sql',
        timestamp: new Date().toISOString()
      }, { status: 200 });
    }

    // Level 5: Fully operational
    // Try to get advanced stats (may fail gracefully)
    let continuousAggregates: any[] = [];
    let timescaleVersion = 'unknown';
    
    try {
      // Get TimescaleDB version
      const versionResult = await db.$queryRaw<Array<{ version: string }>>`
        SELECT extversion as version 
        FROM pg_extension 
        WHERE extname = 'timescaledb';
      `;
      timescaleVersion = versionResult[0]?.version || 'unknown';
    } catch {
      // Version check failed, not critical
    }
    
    try {
      // Check for continuous aggregates (may not exist)
      continuousAggregates = await db.$queryRaw<any[]>`
        SELECT 
          view_name,
          materialization_hypertable_name
        FROM timescaledb_information.continuous_aggregates
        WHERE view_schema = 'public';
      `;
    } catch {
      // Continuous aggregates not available yet
    }
    
    // Calculate compression statistics safely
    const compressionStats = hypertableStats.length > 0 
      ? hypertableStats.reduce((acc: any, table: any) => {
          acc.totalChunks += parseInt(table.num_chunks) || 0;
          acc.compressedChunks += parseInt(table.compressed_chunks) || 0;
          acc.uncompressedSize += parseInt(table.uncompressed_size) || 0;
          acc.compressedSize += parseInt(table.compressed_size) || 0;
          return acc;
        }, {
          totalChunks: 0,
          compressedChunks: 0,
          uncompressedSize: 0,
          compressedSize: 0
        })
      : {
          totalChunks: 0,
          compressedChunks: 0,
          uncompressedSize: 0,
          compressedSize: 0
        };

    const compressionRatio = compressionStats.uncompressedSize > 0 
      ? Math.round((1 - compressionStats.compressedSize / compressionStats.uncompressedSize) * 100)
      : 0;

    return json({
      status: 'healthy',
      level: 'operational',
      message: 'TimescaleDB is fully operational',
      details: {
        connected: true,
        timescaleEnabled: true,
        tablesReady: true,
        hypertablesReady: true,
        hypertableCount: health.hypertables,
        timescaleVersion,
        hypertables: hypertableStats.map((table: any) => ({
          name: table.hypertable_name,
          chunks: table.num_chunks,
          compressionEnabled: table.compression_enabled
        })),
        compression: {
          totalChunks: compressionStats.totalChunks,
          compressedChunks: compressionStats.compressedChunks,
          compressionRatio: `${compressionRatio}%`
        },
        continuousAggregates: {
          count: continuousAggregates.length,
          views: continuousAggregates.map((ca: any) => ca.view_name)
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('TimescaleDB health check error:', error);
    
    // Return graceful error with details
    return json({
      status: 'error',
      level: 'unknown',
      message: 'Health check encountered an error',
      error: error instanceof Error ? error.message : 'Unknown error',
      details: {
        connected: false,
        timescaleEnabled: false,
        tablesReady: false,
        hypertablesReady: false
      },
      recommendation: 'Check logs for details',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};