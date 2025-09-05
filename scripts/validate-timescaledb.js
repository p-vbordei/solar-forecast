#!/usr/bin/env node
/**
 * TimescaleDB Validation Script
 * 
 * Validates TimescaleDB installation, hypertables, continuous aggregates,
 * and performance optimizations for the Solar Forecast Platform.
 * 
 * Usage:
 *   node scripts/validate-timescaledb.js
 *   npm run db:validate-timescale
 */

import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new PrismaClient();

// ANSI color codes for output formatting
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
  reset: '\x1b[0m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.blue}${msg}${colors.reset}\n`)
};

async function validateTimescaleDB() {
  log.header('🔍 TimescaleDB Validation Report');
  
  let overallHealth = true;
  const issues = [];
  const recommendations = [];

  try {
    // 1. Check basic database connection
    log.info('Checking database connection...');
    await db.$queryRaw`SELECT 1`;
    log.success('Database connection established');

    // 2. Verify TimescaleDB extension
    log.info('Verifying TimescaleDB extension...');
    const extensions = await db.$queryRaw`
      SELECT extname, extversion 
      FROM pg_extension 
      WHERE extname = 'timescaledb';
    `;
    
    if (extensions.length === 0) {
      log.error('TimescaleDB extension not installed');
      issues.push('TimescaleDB extension missing');
      recommendations.push('Install TimescaleDB: CREATE EXTENSION IF NOT EXISTS timescaledb;');
      overallHealth = false;
    } else {
      log.success(`TimescaleDB extension installed (version: ${extensions[0].extversion})`);
    }

    // 3. Check hypertables
    log.info('Checking hypertables...');
    const hypertables = await db.$queryRaw`
      SELECT 
        hypertable_name,
        num_chunks,
        compression_enabled,
        num_dimensions
      FROM timescaledb_information.hypertables 
      WHERE hypertable_schema = 'public';
    `;

    const expectedHypertables = ['forecasts', 'production', 'weather_data'];
    const foundHypertables = hypertables.map(h => h.hypertable_name);
    
    for (const expected of expectedHypertables) {
      if (foundHypertables.includes(expected)) {
        log.success(`Hypertable '${expected}' configured correctly`);
      } else {
        log.error(`Hypertable '${expected}' not found`);
        issues.push(`Missing hypertable: ${expected}`);
        overallHealth = false;
      }
    }

    if (hypertables.length === 0) {
      log.error('No hypertables found');
      recommendations.push('Run hypertable conversion: npm run db:migrate-timescale');
      overallHealth = false;
    }

    // 4. Check compression status
    log.info('Checking compression policies...');
    const compressionPolicies = await db.$queryRaw`
      SELECT 
        hypertable_name,
        older_than,
        orderby
      FROM timescaledb_information.jobs 
      WHERE proc_name = 'policy_compression';
    `;

    for (const table of hypertables) {
      const hasCompression = compressionPolicies.some(p => p.hypertable_name === table.hypertable_name);
      if (hasCompression) {
        log.success(`Compression policy active for '${table.hypertable_name}'`);
      } else {
        log.warning(`No compression policy for '${table.hypertable_name}'`);
        recommendations.push(`Enable compression for ${table.hypertable_name}`);
      }
    }

    // 5. Check retention policies
    log.info('Checking retention policies...');
    const retentionPolicies = await db.$queryRaw`
      SELECT 
        hypertable_name,
        older_than
      FROM timescaledb_information.jobs 
      WHERE proc_name = 'policy_retention';
    `;

    for (const table of hypertables) {
      const hasRetention = retentionPolicies.some(p => p.hypertable_name === table.hypertable_name);
      if (hasRetention) {
        log.success(`Retention policy active for '${table.hypertable_name}'`);
      } else {
        log.warning(`No retention policy for '${table.hypertable_name}'`);
        recommendations.push(`Configure retention for ${table.hypertable_name} (suggested: 2 years)`);
      }
    }

    // 6. Check continuous aggregates
    log.info('Checking continuous aggregates...');
    const continuousAggregates = await db.$queryRaw`
      SELECT 
        view_name,
        materialization_hypertable_name
      FROM timescaledb_information.continuous_aggregates
      WHERE view_schema = 'public';
    `;

    const expectedAggregates = ['production_hourly', 'production_daily', 'forecasts_hourly'];
    const foundAggregates = continuousAggregates.map(ca => ca.view_name);

    for (const expected of expectedAggregates) {
      if (foundAggregates.includes(expected)) {
        log.success(`Continuous aggregate '${expected}' configured`);
      } else {
        log.warning(`Continuous aggregate '${expected}' not found`);
        recommendations.push(`Create continuous aggregate: ${expected}`);
      }
    }

    // 7. Check refresh policies
    log.info('Checking refresh policies...');
    const refreshPolicies = await db.$queryRaw`
      SELECT 
        hypertable_name,
        start_offset,
        end_offset,
        schedule_interval
      FROM timescaledb_information.jobs 
      WHERE proc_name = 'policy_refresh_continuous_aggregate';
    `;

    for (const aggregate of continuousAggregates) {
      const hasRefreshPolicy = refreshPolicies.some(p => 
        p.hypertable_name === aggregate.materialization_hypertable_name
      );
      if (hasRefreshPolicy) {
        log.success(`Refresh policy active for '${aggregate.view_name}'`);
      } else {
        log.warning(`No refresh policy for '${aggregate.view_name}'`);
        recommendations.push(`Configure refresh policy for ${aggregate.view_name}`);
      }
    }

    // 8. Check chunk statistics
    log.info('Analyzing chunk distribution...');
    const chunkStats = await db.$queryRaw`
      SELECT 
        hypertable_name,
        COUNT(*) as chunk_count,
        AVG(EXTRACT(EPOCH FROM (range_end - range_start))) / 3600 as avg_chunk_hours,
        COUNT(*) FILTER (WHERE is_compressed = true) as compressed_chunks
      FROM timescaledb_information.chunks
      WHERE hypertable_schema = 'public'
      GROUP BY hypertable_name;
    `;

    for (const stat of chunkStats) {
      log.info(`Table '${stat.hypertable_name}': ${stat.chunk_count} chunks, ${Math.round(stat.avg_chunk_hours)}h avg, ${stat.compressed_chunks} compressed`);
      
      if (parseInt(stat.chunk_count) > 1000) {
        log.warning(`High chunk count for '${stat.hypertable_name}' (${stat.chunk_count})`);
        recommendations.push(`Consider increasing chunk interval for ${stat.hypertable_name}`);
      }
      
      const compressionRatio = stat.chunk_count > 0 ? (stat.compressed_chunks / stat.chunk_count) * 100 : 0;
      if (compressionRatio < 50 && parseInt(stat.chunk_count) > 10) {
        log.warning(`Low compression ratio for '${stat.hypertable_name}' (${Math.round(compressionRatio)}%)`);
        recommendations.push(`Review compression settings for ${stat.hypertable_name}`);
      }
    }

    // 9. Performance validation
    log.info('Testing query performance...');
    const performanceStart = Date.now();
    
    // Test a typical dashboard query using continuous aggregates
    await db.$queryRaw`
      SELECT bucket, avg_power_mw 
      FROM production_hourly 
      WHERE bucket >= NOW() - INTERVAL '24 hours'
      LIMIT 1;
    `;
    
    const performanceTime = Date.now() - performanceStart;
    
    if (performanceTime < 100) {
      log.success(`Query performance excellent (${performanceTime}ms)`);
    } else if (performanceTime < 500) {
      log.success(`Query performance good (${performanceTime}ms)`);
    } else {
      log.warning(`Query performance could be improved (${performanceTime}ms)`);
      recommendations.push('Consider refreshing continuous aggregates or checking indexes');
    }

    // 10. Generate final report
    log.header('📊 Validation Summary');
    
    if (overallHealth && issues.length === 0) {
      log.success('🎉 TimescaleDB configuration is optimal!');
    } else if (issues.length > 0) {
      log.error(`❌ Found ${issues.length} critical issue(s):`);
      issues.forEach(issue => log.error(`   • ${issue}`));
    } else {
      log.warning('⚠️  TimescaleDB is functional but could be optimized');
    }

    if (recommendations.length > 0) {
      log.info('\n📋 Recommendations:');
      recommendations.forEach(rec => log.info(`   • ${rec}`));
    }

    // Performance summary
    log.info('\n📈 Performance Summary:');
    log.info(`   • Hypertables: ${hypertables.length}`);
    log.info(`   • Continuous Aggregates: ${continuousAggregates.length}`);
    log.info(`   • Total Chunks: ${chunkStats.reduce((sum, stat) => sum + parseInt(stat.chunk_count), 0)}`);
    log.info(`   • Query Response Time: ${performanceTime}ms`);

    return overallHealth;

  } catch (error) {
    log.error(`Validation failed: ${error.message}`);
    return false;
  } finally {
    await db.$disconnect();
  }
}

// Export validation function for use in other scripts
export { validateTimescaleDB };

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateTimescaleDB()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Validation script failed:', error);
      process.exit(1);
    });
}