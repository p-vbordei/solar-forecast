-- TimescaleDB Initialization Script (Simplified & Robust)
-- This script converts regular PostgreSQL tables to TimescaleDB hypertables
-- It's safe to run multiple times (idempotent)

-- Enable TimescaleDB extension (safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Function to safely create hypertables
CREATE OR REPLACE FUNCTION safe_create_hypertable(
    table_name TEXT,
    time_column TEXT DEFAULT 'timestamp'
) RETURNS VOID AS $$
BEGIN
    -- Check if table exists
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND information_schema.tables.table_name = safe_create_hypertable.table_name
    ) THEN
        -- Check if it's already a hypertable
        IF NOT EXISTS (
            SELECT FROM timescaledb_information.hypertables 
            WHERE hypertable_schema = 'public' 
            AND hypertable_name = safe_create_hypertable.table_name
        ) THEN
            -- Create hypertable
            PERFORM create_hypertable(
                safe_create_hypertable.table_name::regclass, 
                safe_create_hypertable.time_column,
                if_not_exists => TRUE
            );
            RAISE NOTICE 'Created hypertable: %', safe_create_hypertable.table_name;
        ELSE
            RAISE NOTICE 'Hypertable already exists: %', safe_create_hypertable.table_name;
        END IF;
    ELSE
        RAISE NOTICE 'Table does not exist: %', safe_create_hypertable.table_name;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating hypertable % : %', safe_create_hypertable.table_name, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Convert tables to hypertables (safe - won't fail if already done)
SELECT safe_create_hypertable('forecasts', 'timestamp');
SELECT safe_create_hypertable('production', 'timestamp');
SELECT safe_create_hypertable('weather_data', 'timestamp');

-- Clean up helper function
DROP FUNCTION IF EXISTS safe_create_hypertable(TEXT, TEXT);

-- Create indexes for better query performance (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_forecasts_location_time 
    ON forecasts ("locationId", timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_production_location_time 
    ON production ("locationId", timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_weather_data_location_time 
    ON weather_data ("locationId", timestamp DESC);

-- Optional: Set chunk time interval (7 days is a good default)
-- This only affects new chunks, existing chunks are not modified
DO $$
BEGIN
    -- Only run if hypertables exist
    IF EXISTS (
        SELECT FROM timescaledb_information.hypertables 
        WHERE hypertable_schema = 'public'
    ) THEN
        -- Set chunk intervals (safe to run multiple times)
        PERFORM set_chunk_time_interval('forecasts', INTERVAL '7 days');
        PERFORM set_chunk_time_interval('production', INTERVAL '7 days');
        PERFORM set_chunk_time_interval('weather_data', INTERVAL '7 days');
        
        RAISE NOTICE 'Chunk intervals configured';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not set chunk intervals: %', SQLERRM;
END $$;

-- Optional: Enable compression (after 7 days)
-- Note: This is optional and can be enabled later if needed
DO $$
BEGIN
    -- Only enable if compression is available
    IF EXISTS (
        SELECT FROM pg_proc 
        WHERE proname = 'add_compression_policy'
    ) THEN
        -- Add compression policies (safe - won't duplicate)
        PERFORM add_compression_policy('forecasts', INTERVAL '7 days', if_not_exists => TRUE);
        PERFORM add_compression_policy('production', INTERVAL '7 days', if_not_exists => TRUE);
        PERFORM add_compression_policy('weather_data', INTERVAL '7 days', if_not_exists => TRUE);
        
        RAISE NOTICE 'Compression policies configured';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Compression not available or already configured: %', SQLERRM;
END $$;

-- Report status
DO $$
DECLARE
    hypertable_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO hypertable_count
    FROM timescaledb_information.hypertables
    WHERE hypertable_schema = 'public';
    
    RAISE NOTICE '✅ TimescaleDB setup complete! Hypertables configured: %', hypertable_count;
END $$;