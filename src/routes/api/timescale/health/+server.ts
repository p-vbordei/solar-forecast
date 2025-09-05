import { json } from '@sveltejs/kit';
import { checkTimescaleDBHealth, TimescaleQueries } from '$lib/server/database.js';
import type { RequestHandler } from './$types';

/**
 * TimescaleDB Health Check API
 * GET /api/timescale/health
 * 
 * Provides comprehensive health status for TimescaleDB installation
 * including extension status, hypertables, continuous aggregates, and performance metrics
 */
export const GET: RequestHandler = async () => {
  try {
    // Basic TimescaleDB health check
    const health = await checkTimescaleDBHealth();
    
    if (!health.connected) {
      return json({
        status: 'error',
        message: 'Database connection failed',
        error: health.error,
        timestamp: new Date().toISOString()
      }, { status: 503 });
    }

    if (!health.timescaleEnabled) {
      return json({
        status: 'warning',
        message: 'TimescaleDB extension not enabled',
        details: {
          connected: health.connected,
          timescaleEnabled: false,
          hypertables: 0,
          recommendation: 'Run: CREATE EXTENSION IF NOT EXISTS timescaledb;'
        },
        timestamp: new Date().toISOString()
      }, { status: 200 });
    }

    // Get detailed hypertable statistics
    const hypertableStats = await TimescaleQueries.getHypertableStats();
    
    // Get chunk information for monitoring
    const chunkInfo = await TimescaleQueries.getChunkInfo();
    
    // Calculate compression statistics
    const compressionStats = hypertableStats.reduce((acc, table) => {
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
    });

    // Calculate compression ratio
    const compressionRatio = compressionStats.uncompressedSize > 0 
      ? Math.round((1 - compressionStats.compressedSize / compressionStats.uncompressedSize) * 100)
      : 0;

    // Check for continuous aggregates
    const continuousAggregates = await db.$queryRaw`
      SELECT 
        view_name,
        materialization_hypertable_name,
        materialization_hypertable_schema
      FROM timescaledb_information.continuous_aggregates
      WHERE view_schema = 'public';
    `;

    return json({
      status: 'healthy',
      message: 'TimescaleDB is running optimally',
      details: {
        database: {
          connected: health.connected,
          timescaleEnabled: health.timescaleEnabled,
          version: await getTimescaleVersion()
        },
        hypertables: {
          count: health.hypertables,
          tables: hypertableStats.map(table => ({
            name: table.hypertable_name,
            chunks: table.num_chunks,
            compressionEnabled: table.compression_enabled,
            compressedChunks: table.compressed_chunks,
            compressionRatio: table.uncompressed_size > 0 
              ? Math.round((1 - table.compressed_size / table.uncompressed_size) * 100)
              : 0
          }))
        },
        compression: {
          totalChunks: compressionStats.totalChunks,
          compressedChunks: compressionStats.compressedChunks,
          compressionRatio: `${compressionRatio}%`,
          spaceSavings: formatBytes(compressionStats.uncompressedSize - compressionStats.compressedSize)
        },
        continuousAggregates: {
          count: continuousAggregates.length,
          views: continuousAggregates.map(ca => ca.view_name)
        },
        chunks: {
          totalCount: chunkInfo.length,
          byHypertable: chunkInfo.reduce((acc, chunk) => {
            acc[chunk.hypertable_name] = (acc[chunk.hypertable_name] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        }
      },
      recommendations: generateRecommendations(health, hypertableStats, compressionStats),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('TimescaleDB health check failed:', error);
    
    return json({
      status: 'error',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};

// Helper function to get TimescaleDB version
async function getTimescaleVersion(): Promise<string> {
  try {
    const result = await db.$queryRaw<Array<{ version: string }>>`
      SELECT extversion as version 
      FROM pg_extension 
      WHERE extname = 'timescaledb';
    `;
    return result[0]?.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Helper function to generate recommendations
function generateRecommendations(
  health: any, 
  hypertableStats: any[], 
  compressionStats: any
): string[] {
  const recommendations: string[] = [];

  // Check if hypertables exist but none are created
  if (health.hypertables === 0) {
    recommendations.push(
      'No hypertables detected. Run the migration script to convert time-series tables: npm run db:migrate-timescale'
    );
  }

  // Check compression efficiency
  const compressionRatio = compressionStats.uncompressedSize > 0 
    ? (1 - compressionStats.compressedSize / compressionStats.uncompressedSize) * 100
    : 0;

  if (compressionRatio < 50 && compressionStats.totalChunks > 10) {
    recommendations.push(
      'Low compression ratio detected. Consider adjusting compression policies or chunk intervals.'
    );
  }

  // Check for tables without compression
  const uncompressedTables = hypertableStats.filter(table => !table.compression_enabled);
  if (uncompressedTables.length > 0) {
    recommendations.push(
      `Enable compression for tables: ${uncompressedTables.map(t => t.hypertable_name).join(', ')}`
    );
  }

  // Performance recommendations
  if (compressionStats.totalChunks > 1000) {
    recommendations.push(
      'High chunk count detected. Consider increasing chunk time intervals for better performance.'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('All systems optimal. No immediate actions required.');
  }

  return recommendations;
}