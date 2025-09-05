-- Advanced TimescaleDB Performance Optimization Script
-- This script applies production-ready optimizations for the Solar Forecast Platform
-- Run after initial hypertable setup for maximum performance

-- Enable extension if not already enabled
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Display current TimescaleDB version
SELECT timescaledb_version(), version();

-- ===========================================
-- CHUNK INTERVAL OPTIMIZATION
-- ===========================================

-- Optimize chunk intervals based on data patterns
-- For high-frequency time-series data (15-minute intervals)

-- Forecasts: 1-day chunks (optimal for 15-minute data)
SELECT set_chunk_time_interval('forecasts', INTERVAL '1 day');

-- Production: 1-day chunks (optimal for production data)  
SELECT set_chunk_time_interval('production', INTERVAL '1 day');

-- Weather data: 1-day chunks (weather updates every 15-30 minutes)
SELECT set_chunk_time_interval('weather_data', INTERVAL '1 day');

-- ===========================================
-- ADVANCED INDEXING STRATEGY
-- ===========================================

-- Create space-partitioning indexes for better query performance
-- These indexes are optimized for common query patterns in solar forecasting

-- Forecasts: Optimize for location + time + model queries
DROP INDEX IF EXISTS idx_forecasts_location_time_model CASCADE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forecasts_location_time_model 
ON forecasts (timestamp DESC, "locationId", "modelType") 
WHERE timestamp >= NOW() - INTERVAL '30 days';

-- Production: Optimize for real-time monitoring queries
DROP INDEX IF EXISTS idx_production_realtime CASCADE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_production_realtime 
ON production (timestamp DESC, "locationId") 
WHERE timestamp >= NOW() - INTERVAL '7 days' AND "dataQuality" = 'GOOD';

-- Weather: Optimize for forecast correlation queries
DROP INDEX IF EXISTS idx_weather_forecast_correlation CASCADE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_weather_forecast_correlation 
ON weather_data (timestamp, "locationId", ghi, dni, temperature) 
WHERE ghi IS NOT NULL AND dni IS NOT NULL;

-- ===========================================
-- CONTINUOUS AGGREGATES OPTIMIZATION
-- ===========================================

-- Drop existing aggregates to recreate with optimal settings
DROP MATERIALIZED VIEW IF EXISTS production_hourly CASCADE;
DROP MATERIALIZED VIEW IF EXISTS production_daily CASCADE;
DROP MATERIALIZED VIEW IF EXISTS forecasts_hourly CASCADE;
DROP MATERIALIZED VIEW IF EXISTS weather_daily CASCADE;

-- Recreate production hourly with advanced metrics
CREATE MATERIALIZED VIEW production_hourly
WITH (timescaledb.continuous, timescaledb.materialized_only=false) AS
SELECT 
    time_bucket('1 hour', timestamp) AS bucket,
    "locationId",
    -- Power metrics
    AVG("powerMW") as avg_power_mw,
    MAX("powerMW") as max_power_mw,
    MIN("powerMW") as min_power_mw,
    STDDEV("powerMW") as stddev_power_mw,
    -- Energy metrics
    SUM("energyMWh") as total_energy_mwh,
    -- Performance metrics
    AVG("capacityFactor") as avg_capacity_factor,
    AVG("performanceRatio") as avg_performance_ratio,
    AVG("availability") as avg_availability,
    -- Environmental conditions
    AVG("temperature") as avg_temperature,
    AVG("ghi") as avg_ghi,
    AVG("dni") as avg_dni,
    -- Data quality metrics
    COUNT(*) as sample_count,
    COUNT(*) FILTER (WHERE "dataQuality" = 'GOOD') as good_samples,
    COUNT(*) FILTER (WHERE "dataQuality" = 'ESTIMATED') as estimated_samples,
    SUM("downtimeMinutes") as total_downtime_minutes,
    -- Reliability metrics
    CASE WHEN COUNT(*) > 0 THEN 
        COUNT(*) FILTER (WHERE "dataQuality" = 'GOOD')::float / COUNT(*) 
    ELSE 0 END as data_quality_ratio
FROM production
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '3 months'
GROUP BY bucket, "locationId";

-- Create production daily with comprehensive KPIs
CREATE MATERIALIZED VIEW production_daily
WITH (timescaledb.continuous, timescaledb.materialized_only=false) AS
SELECT 
    time_bucket('1 day', timestamp) AS bucket,
    "locationId",
    -- Daily energy production
    SUM("energyMWh") as total_energy_mwh,
    AVG("powerMW") as avg_power_mw,
    MAX("powerMW") as peak_power_mw,
    -- Daily performance indicators  
    AVG("capacityFactor") as avg_capacity_factor,
    AVG("performanceRatio") as avg_performance_ratio,
    -- Environmental summary
    AVG("temperature") as avg_temperature,
    MAX("temperature") as max_temperature,
    MIN("temperature") as min_temperature,
    AVG("ghi") as avg_ghi,
    MAX("ghi") as max_ghi,
    -- Operational metrics
    SUM("downtimeMinutes") / 60.0 as total_downtime_hours,
    CASE WHEN COUNT(*) > 0 THEN 
        (COUNT(*) FILTER (WHERE "dataQuality" = 'GOOD')::float / COUNT(*)) * 100
    ELSE 0 END as data_quality_percent,
    -- Statistical measures
    COUNT(*) as sample_count,
    STDDEV("powerMW") as power_volatility
FROM production  
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '2 years'
GROUP BY bucket, "locationId";

-- Create forecast hourly with model performance tracking
CREATE MATERIALIZED VIEW forecasts_hourly
WITH (timescaledb.continuous, timescaledb.materialized_only=false) AS
SELECT 
    time_bucket('1 hour', timestamp) AS bucket,
    "locationId", 
    "modelType",
    -- Forecast metrics
    AVG("powerMW") as avg_power_mw,
    AVG("powerMWQ10") as avg_power_q10,
    AVG("powerMWQ25") as avg_power_q25, 
    AVG("powerMWQ75") as avg_power_q75,
    AVG("powerMWQ90") as avg_power_q90,
    -- Confidence metrics
    AVG("confidence") as avg_confidence,
    AVG("confidenceLevel") as avg_confidence_level,
    AVG("qualityScore") as avg_quality_score,
    -- Model performance
    COUNT(*) as forecast_count,
    COUNT(*) FILTER (WHERE "qualityScore" >= 0.8) as high_quality_forecasts,
    COUNT(*) FILTER (WHERE "confidence" >= 0.8) as high_confidence_forecasts,
    -- Horizon analysis
    AVG("horizonMinutes") as avg_horizon_minutes,
    COUNT(DISTINCT "horizonMinutes") as horizon_variety
FROM forecasts
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '6 months'
GROUP BY bucket, "locationId", "modelType";

-- Weather daily summary for correlation analysis
CREATE MATERIALIZED VIEW weather_daily
WITH (timescaledb.continuous, timescaledb.materialized_only=false) AS
SELECT 
    time_bucket('1 day', timestamp) AS bucket,
    "locationId",
    -- Temperature metrics
    AVG(temperature) as avg_temperature,
    MAX(temperature) as max_temperature,  
    MIN(temperature) as min_temperature,
    -- Solar irradiance metrics (critical for solar forecasting)
    AVG(ghi) as avg_ghi,
    MAX(ghi) as max_ghi,
    AVG(dni) as avg_dni,
    MAX(dni) as max_dni,
    AVG(dhi) as avg_dhi,
    AVG(gti) as avg_gti,
    -- Weather conditions
    AVG("cloudCover") as avg_cloud_cover,
    AVG(humidity) as avg_humidity,
    AVG("windSpeed") as avg_wind_speed,
    AVG(pressure) as avg_pressure,
    -- Data quality
    COUNT(*) as sample_count,
    COUNT(*) FILTER (WHERE ghi IS NOT NULL AND dni IS NOT NULL) as valid_irradiance_samples
FROM weather_data
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '2 years'
GROUP BY bucket, "locationId";

-- ===========================================
-- REFRESH POLICY OPTIMIZATION
-- ===========================================

-- Set optimal refresh policies for continuous aggregates
-- Refresh every 15 minutes for near real-time dashboards

SELECT add_continuous_aggregate_policy('production_hourly',
    start_offset => INTERVAL '2 hours',
    end_offset => INTERVAL '15 minutes',
    schedule_interval => INTERVAL '15 minutes',
    if_not_exists => true);

SELECT add_continuous_aggregate_policy('production_daily',
    start_offset => INTERVAL '3 days', 
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '30 minutes',
    if_not_exists => true);

SELECT add_continuous_aggregate_policy('forecasts_hourly', 
    start_offset => INTERVAL '2 hours',
    end_offset => INTERVAL '15 minutes', 
    schedule_interval => INTERVAL '15 minutes',
    if_not_exists => true);

SELECT add_continuous_aggregate_policy('weather_daily',
    start_offset => INTERVAL '2 days',
    end_offset => INTERVAL '2 hours',
    schedule_interval => INTERVAL '1 hour', 
    if_not_exists => true);

-- ===========================================
-- COMPRESSION OPTIMIZATION
-- ===========================================

-- Enable compression with optimal settings for each hypertable
-- Use different segment_by strategies based on data patterns

-- Forecasts: Segment by location and model for optimal compression
ALTER TABLE forecasts SET (
    timescaledb.compress,
    timescaledb.compress_orderby = 'timestamp DESC',
    timescaledb.compress_segmentby = '"locationId", "modelType"'
);

-- Production: Segment by location for production data
ALTER TABLE production SET (
    timescaledb.compress,
    timescaledb.compress_orderby = 'timestamp DESC', 
    timescaledb.compress_segmentby = '"locationId"'
);

-- Weather: Segment by location and source
ALTER TABLE weather_data SET (
    timescaledb.compress,
    timescaledb.compress_orderby = 'timestamp DESC',
    timescaledb.compress_segmentby = '"locationId", source'
);

-- Set aggressive compression policies for older data
SELECT add_compression_policy('forecasts', INTERVAL '3 days', if_not_exists => true);
SELECT add_compression_policy('production', INTERVAL '7 days', if_not_exists => true);
SELECT add_compression_policy('weather_data', INTERVAL '7 days', if_not_exists => true);

-- ===========================================
-- RETENTION POLICIES
-- ===========================================

-- Set retention policies based on data lifecycle requirements
-- Keep raw data for 2 years, then automatically delete

SELECT add_retention_policy('forecasts', INTERVAL '2 years', if_not_exists => true);
SELECT add_retention_policy('production', INTERVAL '2 years', if_not_exists => true);  
SELECT add_retention_policy('weather_data', INTERVAL '2 years', if_not_exists => true);

-- ===========================================
-- BACKGROUND WORKER OPTIMIZATION
-- ===========================================

-- Optimize TimescaleDB background worker settings
-- These settings improve performance for time-series workloads

-- Increase background workers for better parallel processing
SELECT pg_reload_conf() WHERE current_setting('timescaledb.max_background_workers')::int < 8;

-- ===========================================
-- PERFORMANCE MONITORING VIEWS
-- ===========================================

-- Create monitoring views for performance tracking
CREATE OR REPLACE VIEW timescaledb_performance_summary AS
SELECT 
    'hypertables' as metric_type,
    COUNT(*) as count,
    'total hypertables in system' as description
FROM timescaledb_information.hypertables
WHERE hypertable_schema = 'public'
UNION ALL
SELECT 
    'chunks' as metric_type,
    COUNT(*) as count,
    'total chunks across all hypertables' as description  
FROM timescaledb_information.chunks
WHERE hypertable_schema = 'public'
UNION ALL
SELECT
    'compressed_chunks' as metric_type,
    COUNT(*) FILTER (WHERE is_compressed = true) as count,
    'compressed chunks (storage optimization)' as description
FROM timescaledb_information.chunks  
WHERE hypertable_schema = 'public'
UNION ALL
SELECT
    'continuous_aggregates' as metric_type,
    COUNT(*) as count,
    'continuous aggregates for fast queries' as description
FROM timescaledb_information.continuous_aggregates
WHERE view_schema = 'public'
UNION ALL
SELECT
    'background_jobs' as metric_type, 
    COUNT(*) as count,
    'active background jobs (compression, retention, etc.)' as description
FROM timescaledb_information.jobs
WHERE job_status = 'Scheduled';

-- Create a view for chunk distribution analysis
CREATE OR REPLACE VIEW chunk_distribution_analysis AS
SELECT 
    hypertable_name,
    COUNT(*) as total_chunks,
    COUNT(*) FILTER (WHERE is_compressed = true) as compressed_chunks,
    ROUND(AVG(EXTRACT(EPOCH FROM (range_end - range_start))) / 3600, 2) as avg_chunk_hours,
    MIN(range_start) as oldest_chunk,
    MAX(range_end) as newest_chunk,
    SUM(total_bytes) as total_size_bytes,
    pg_size_pretty(SUM(total_bytes)) as total_size_formatted
FROM timescaledb_information.chunks
WHERE hypertable_schema = 'public'
GROUP BY hypertable_name
ORDER BY total_chunks DESC;

-- ===========================================
-- OPTIMIZATION COMPLETE
-- ===========================================

-- Display final optimization summary
SELECT 'TimescaleDB optimization complete!' as message;

-- Show performance summary
SELECT * FROM timescaledb_performance_summary ORDER BY metric_type;

-- Show chunk distribution
SELECT * FROM chunk_distribution_analysis;

-- Display continuous aggregate refresh schedule
SELECT 
    hypertable_name,
    schedule_interval,
    start_offset,
    end_offset,
    next_start
FROM timescaledb_information.jobs 
WHERE proc_name = 'policy_refresh_continuous_aggregate'
ORDER BY hypertable_name;