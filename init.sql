-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create schema if needed
CREATE SCHEMA IF NOT EXISTS public;

-- Function to create hypertables after Prisma schema is applied
-- This will be called after running prisma db push
CREATE OR REPLACE FUNCTION setup_hypertables() RETURNS void AS $$
BEGIN
    -- Create hypertables for time-series data (only if tables exist and not already hypertables)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'production') 
       AND NOT EXISTS (SELECT 1 FROM timescaledb_information.hypertables WHERE hypertable_name = 'production') THEN
        -- Drop primary key constraint first to allow partitioning
        ALTER TABLE production DROP CONSTRAINT IF EXISTS production_pkey;
        
        PERFORM create_hypertable('production', 'timestamp', if_not_exists => TRUE);
        
        -- Create composite primary key including timestamp
        ALTER TABLE production ADD CONSTRAINT production_pkey PRIMARY KEY (id, timestamp);
        
        -- Add indexes for better performance (using correct column names)
        CREATE INDEX IF NOT EXISTS idx_production_location_time ON production ("locationId", timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_production_time_bucket ON production USING BTREE (time_bucket('1 hour', timestamp));
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'weather_data') 
       AND NOT EXISTS (SELECT 1 FROM timescaledb_information.hypertables WHERE hypertable_name = 'weather_data') THEN
        ALTER TABLE weather_data DROP CONSTRAINT IF EXISTS weather_data_pkey;
        PERFORM create_hypertable('weather_data', 'timestamp', if_not_exists => TRUE);
        ALTER TABLE weather_data ADD CONSTRAINT weather_data_pkey PRIMARY KEY (id, timestamp);
        CREATE INDEX IF NOT EXISTS idx_weather_location_time ON weather_data ("locationId", timestamp DESC);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'forecasts') 
       AND NOT EXISTS (SELECT 1 FROM timescaledb_information.hypertables WHERE hypertable_name = 'forecasts') THEN
        ALTER TABLE forecasts DROP CONSTRAINT IF EXISTS forecasts_pkey;
        PERFORM create_hypertable('forecasts', 'timestamp', if_not_exists => TRUE);
        ALTER TABLE forecasts ADD CONSTRAINT forecasts_pkey PRIMARY KEY (id, timestamp);
        CREATE INDEX IF NOT EXISTS idx_forecast_location_time ON forecasts ("locationId", timestamp DESC);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'forecast_accuracy') 
       AND NOT EXISTS (SELECT 1 FROM timescaledb_information.hypertables WHERE hypertable_name = 'forecast_accuracy') THEN
        ALTER TABLE forecast_accuracy DROP CONSTRAINT IF EXISTS forecast_accuracy_pkey;
        PERFORM create_hypertable('forecast_accuracy', 'date', if_not_exists => TRUE);
        ALTER TABLE forecast_accuracy ADD CONSTRAINT forecast_accuracy_pkey PRIMARY KEY (id, date);
        CREATE INDEX IF NOT EXISTS idx_accuracy_location_time ON forecast_accuracy ("locationId", date DESC);
    END IF;
    
    RAISE NOTICE 'TimescaleDB hypertables setup completed successfully';
END;
$$ LANGUAGE plpgsql;