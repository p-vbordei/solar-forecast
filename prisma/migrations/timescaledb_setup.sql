-- TimescaleDB Migration Script
-- Run this after standard Prisma migrations to optimize for time-series data
-- This script converts regular PostgreSQL tables to TimescaleDB hypertables

-- Enable TimescaleDB extension (should already be enabled)
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Drop existing indexes that will be recreated optimally for TimescaleDB
DO $$
BEGIN
    -- Drop existing non-optimal indexes before creating hypertables
    DROP INDEX IF EXISTS "forecasts_locationId_timestamp_idx" CASCADE;
    DROP INDEX IF EXISTS "forecasts_timestamp_idx" CASCADE;
    DROP INDEX IF EXISTS "production_locationId_timestamp_idx" CASCADE; 
    DROP INDEX IF EXISTS "production_timestamp_idx" CASCADE;
    DROP INDEX IF EXISTS "weather_data_locationId_timestamp_idx" CASCADE;
    DROP INDEX IF EXISTS "weather_data_timestamp_idx" CASCADE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some indexes may not exist yet: %', SQLERRM;
END$$;

-- Convert time-series tables to hypertables
-- The timestamp column will be used as the time dimension for partitioning

-- 1. Convert Forecasts table to hypertable
SELECT create_hypertable(
    'forecasts', 
    'timestamp',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- 2. Convert Production table to hypertable  
SELECT create_hypertable(
    'production', 
    'timestamp',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- 3. Convert WeatherData table to hypertable
SELECT create_hypertable(
    'weather_data', 
    'timestamp', 
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Create TimescaleDB-optimized indexes
-- These indexes follow TimescaleDB best practices: time dimension first

-- Forecasts indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "forecasts_time_location_idx" 
    ON "forecasts" (timestamp, "locationId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "forecasts_location_time_desc_idx" 
    ON "forecasts" ("locationId", timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "forecasts_time_model_idx" 
    ON "forecasts" (timestamp, "modelType");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "forecasts_model_time_desc_idx" 
    ON "forecasts" ("modelType", timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "forecasts_horizon_time_idx" 
    ON "forecasts" ("horizonMinutes", timestamp);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "forecasts_run_time_idx" 
    ON "forecasts" ("runId", timestamp) WHERE "runId" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS "forecasts_resolution_time_idx" 
    ON "forecasts" ("resolution", timestamp);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "forecasts_type_time_idx" 
    ON "forecasts" ("forecastType", timestamp);

-- Production indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "production_time_location_idx" 
    ON "production" (timestamp, "locationId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "production_location_time_desc_idx" 
    ON "production" ("locationId", timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "production_time_quality_idx" 
    ON "production" (timestamp, "dataQuality");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "production_quality_time_idx" 
    ON "production" ("dataQuality", timestamp);

-- Weather data indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "weather_time_location_idx" 
    ON "weather_data" (timestamp, "locationId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "weather_location_time_desc_idx" 
    ON "weather_data" ("locationId", timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "weather_time_source_idx" 
    ON "weather_data" (timestamp, source);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "weather_source_time_idx" 
    ON "weather_data" (source, timestamp);

-- Create continuous aggregates for common queries
-- These pre-compute aggregations for better dashboard performance

-- Hourly production summary
DROP MATERIALIZED VIEW IF EXISTS production_hourly CASCADE;
CREATE MATERIALIZED VIEW production_hourly
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', timestamp) AS bucket,
    "locationId",
    AVG("powerMW") as avg_power_mw,
    MAX("powerMW") as max_power_mw,
    MIN("powerMW") as min_power_mw,
    CASE WHEN COUNT(*) > 0 THEN 
        AVG("energyMWh") 
    ELSE NULL END as avg_energy_mwh,
    CASE WHEN COUNT(*) > 0 THEN 
        AVG("capacityFactor") 
    ELSE NULL END as avg_capacity_factor,
    CASE WHEN COUNT(*) > 0 THEN 
        AVG("performanceRatio") 
    ELSE NULL END as avg_performance_ratio,
    COUNT(*) as sample_count,
    COUNT(*) FILTER (WHERE "dataQuality" = 'GOOD') as good_samples
FROM production
GROUP BY bucket, "locationId";

-- Daily production summary
DROP MATERIALIZED VIEW IF EXISTS production_daily CASCADE;
CREATE MATERIALIZED VIEW production_daily
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 day', timestamp) AS bucket,
    "locationId",
    AVG("powerMW") as avg_power_mw,
    MAX("powerMW") as max_power_mw,
    CASE WHEN COUNT(*) > 0 THEN 
        SUM("energyMWh") 
    ELSE NULL END as total_energy_mwh,
    CASE WHEN COUNT(*) > 0 THEN 
        AVG("capacityFactor") 
    ELSE NULL END as avg_capacity_factor,
    CASE WHEN COUNT(*) > 0 THEN 
        AVG("performanceRatio") 
    ELSE NULL END as avg_performance_ratio,
    COUNT(*) as sample_count,
    COUNT(*) FILTER (WHERE "dataQuality" = 'GOOD') as good_samples,
    SUM("downtimeMinutes") as total_downtime_minutes
FROM production
GROUP BY bucket, "locationId";

-- Hourly forecast summary
DROP MATERIALIZED VIEW IF EXISTS forecasts_hourly CASCADE;
CREATE MATERIALIZED VIEW forecasts_hourly
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', timestamp) AS bucket,
    "locationId",
    "modelType",
    AVG("powerMW") as avg_power_mw,
    CASE WHEN COUNT(*) > 0 THEN 
        AVG("powerMWQ10") 
    ELSE NULL END as avg_power_q10,
    CASE WHEN COUNT(*) > 0 THEN 
        AVG("powerMWQ90") 
    ELSE NULL END as avg_power_q90,
    CASE WHEN COUNT(*) > 0 THEN 
        AVG("confidence") 
    ELSE NULL END as avg_confidence,
    COUNT(*) as forecast_count,
    COUNT(*) FILTER (WHERE "qualityScore" >= 0.8) as high_quality_forecasts
FROM forecasts
GROUP BY bucket, "locationId", "modelType";

-- Set up data retention policies (keep data for 2 years)
SELECT add_retention_policy('forecasts', INTERVAL '2 years', if_not_exists => true);
SELECT add_retention_policy('production', INTERVAL '2 years', if_not_exists => true); 
SELECT add_retention_policy('weather_data', INTERVAL '2 years', if_not_exists => true);

-- Set up compression policies (compress data older than 7 days)
SELECT add_compression_policy('forecasts', INTERVAL '7 days', if_not_exists => true);
SELECT add_compression_policy('production', INTERVAL '7 days', if_not_exists => true);
SELECT add_compression_policy('weather_data', INTERVAL '7 days', if_not_exists => true);

-- Refresh policies for continuous aggregates (refresh every 30 minutes)
SELECT add_continuous_aggregate_policy('production_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '30 minutes', 
    schedule_interval => INTERVAL '30 minutes',
    if_not_exists => true);

SELECT add_continuous_aggregate_policy('production_daily',
    start_offset => INTERVAL '3 days',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 hour', 
    if_not_exists => true);

SELECT add_continuous_aggregate_policy('forecasts_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '30 minutes',
    schedule_interval => INTERVAL '30 minutes',
    if_not_exists => true);

-- Grant necessary permissions for application user
DO $$
BEGIN
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO railway;
    GRANT SELECT ON ALL MATERIALIZED VIEWS IN SCHEMA public TO railway;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Permission grants may have failed - user may not exist yet: %', SQLERRM;
END$$;

-- Display hypertable information
SELECT 
    hypertable_schema,
    hypertable_name,
    num_dimensions,
    num_chunks,
    compression_enabled
FROM timescaledb_information.hypertables
WHERE hypertable_schema = 'public';

RAISE NOTICE 'TimescaleDB setup completed successfully!';
RAISE NOTICE 'Hypertables created: forecasts, production, weather_data';
RAISE NOTICE 'Continuous aggregates created: production_hourly, production_daily, forecasts_hourly';
RAISE NOTICE 'Retention policies: 2 years for all hypertables';
RAISE NOTICE 'Compression policies: 7 days for all hypertables';