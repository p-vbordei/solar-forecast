-- TimescaleDB Initialization Script
-- This script enables TimescaleDB extension and converts time-series tables to hypertables

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Convert time-series tables to hypertables
-- Run this after Prisma migrations have created the tables

-- Convert Forecast table to hypertable (partitioned by timestamp)
SELECT create_hypertable('forecasts', 'timestamp', if_not_exists => TRUE);

-- Convert Production table to hypertable (partitioned by timestamp)
SELECT create_hypertable('production', 'timestamp', if_not_exists => TRUE);

-- Convert WeatherData table to hypertable (partitioned by timestamp)
SELECT create_hypertable('weather_data', 'timestamp', if_not_exists => TRUE);

-- Create continuous aggregates for common queries
-- These pre-compute aggregations for better performance

-- Hourly production aggregates
CREATE MATERIALIZED VIEW IF NOT EXISTS production_hourly
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', timestamp) AS bucket,
    "locationId",
    AVG("powerMW") as avg_power_mw,
    MAX("powerMW") as max_power_mw,
    MIN("powerMW") as min_power_mw,
    AVG("capacityFactor") as avg_capacity_factor,
    AVG("performanceRatio") as avg_performance_ratio,
    COUNT(*) as sample_count
FROM production
GROUP BY bucket, "locationId";

-- Daily production aggregates  
CREATE MATERIALIZED VIEW IF NOT EXISTS production_daily
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 day', timestamp) AS bucket,
    "locationId",
    AVG("powerMW") as avg_power_mw,
    MAX("powerMW") as max_power_mw,
    SUM("energyMWh") as total_energy_mwh,
    AVG("capacityFactor") as avg_capacity_factor,
    AVG("performanceRatio") as avg_performance_ratio,
    COUNT(*) as sample_count
FROM production
GROUP BY bucket, "locationId";

-- Hourly forecast aggregates
CREATE MATERIALIZED VIEW IF NOT EXISTS forecasts_hourly
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', timestamp) AS bucket,
    "locationId",
    "modelType",
    AVG("powerMW") as avg_power_mw,
    AVG("powerMWQ10") as avg_power_q10,
    AVG("powerMWQ90") as avg_power_q90,
    AVG("confidence") as avg_confidence,
    COUNT(*) as forecast_count
FROM forecasts
GROUP BY bucket, "locationId", "modelType";

-- Set retention policies for automatic data cleanup
-- Keep raw data for 2 years, then delete automatically
SELECT add_retention_policy('forecasts', INTERVAL '2 years', if_not_exists => true);
SELECT add_retention_policy('production', INTERVAL '2 years', if_not_exists => true);
SELECT add_retention_policy('weather_data', INTERVAL '2 years', if_not_exists => true);

-- Create compression policies for better storage efficiency
-- Compress data older than 7 days
SELECT add_compression_policy('forecasts', INTERVAL '7 days', if_not_exists => true);
SELECT add_compression_policy('production', INTERVAL '7 days', if_not_exists => true);
SELECT add_compression_policy('weather_data', INTERVAL '7 days', if_not_exists => true);

-- Create indexes for better query performance
-- These indexes are optimized for TimescaleDB hypertables

-- Location + timestamp indexes (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_forecasts_location_time ON forecasts ("locationId", timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_production_location_time ON production ("locationId", timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_weather_location_time ON weather_data ("locationId", timestamp DESC);

-- Model type index for forecasts
CREATE INDEX IF NOT EXISTS idx_forecasts_model_type ON forecasts ("modelType", timestamp DESC);

-- Data quality index for monitoring
CREATE INDEX IF NOT EXISTS idx_production_quality ON production ("dataQuality", timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_weather_quality ON weather_data ("dataQuality", timestamp DESC);

-- Forecast horizon index for analysis
CREATE INDEX IF NOT EXISTS idx_forecasts_horizon ON forecasts ("horizonMinutes", timestamp DESC);

-- Performance monitoring queries
-- These can be used to monitor TimescaleDB performance

-- Check hypertable information
-- SELECT * FROM timescaledb_information.hypertables;

-- Check chunk information  
-- SELECT * FROM timescaledb_information.chunks;

-- Check continuous aggregates
-- SELECT * FROM timescaledb_information.continuous_aggregates;

-- Check compression status
-- SELECT * FROM timescaledb_information.compressed_hypertable_stats;