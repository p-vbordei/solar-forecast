-- Add CHECK constraints to prevent NaN and Infinity values in forecasts table
-- These constraints ensure data integrity at the database level

-- Add constraint for powerMW to ensure it's a finite number and within reasonable bounds
ALTER TABLE forecasts
ADD CONSTRAINT check_power_mw_valid
CHECK (
    "powerMW" IS NULL
    OR ("powerMW" >= 0 AND "powerMW" <= 10000 AND "powerMW" = "powerMW")
);
-- Note: x = x check fails for NaN values in PostgreSQL

-- Add constraint for energyMWh
ALTER TABLE forecasts
ADD CONSTRAINT check_energy_mwh_valid
CHECK (
    "energyMWh" IS NULL
    OR ("energyMWh" >= 0 AND "energyMWh" <= 100000 AND "energyMWh" = "energyMWh")
);

-- Add constraint for capacityFactor (should be between 0 and 1)
ALTER TABLE forecasts
ADD CONSTRAINT check_capacity_factor_valid
CHECK (
    "capacityFactor" IS NULL
    OR ("capacityFactor" >= 0 AND "capacityFactor" <= 1 AND "capacityFactor" = "capacityFactor")
);

-- Add constraint for confidence (should be between 0 and 1)
ALTER TABLE forecasts
ADD CONSTRAINT check_confidence_valid
CHECK (
    confidence IS NULL
    OR (confidence >= 0 AND confidence <= 1 AND confidence = confidence)
);

-- Add constraint for qualityScore (should be between 0 and 1)
ALTER TABLE forecasts
ADD CONSTRAINT check_quality_score_valid
CHECK (
    "qualityScore" IS NULL
    OR ("qualityScore" >= 0 AND "qualityScore" <= 1 AND "qualityScore" = "qualityScore")
);

-- Add constraint for temperature (reasonable range -50 to 60 Celsius)
ALTER TABLE forecasts
ADD CONSTRAINT check_temperature_valid
CHECK (
    temperature IS NULL
    OR (temperature >= -50 AND temperature <= 60 AND temperature = temperature)
);

-- Add constraint for irradiance values (GHI, DNI should be non-negative)
ALTER TABLE forecasts
ADD CONSTRAINT check_ghi_valid
CHECK (
    ghi IS NULL
    OR (ghi >= 0 AND ghi <= 1500 AND ghi = ghi)
);

ALTER TABLE forecasts
ADD CONSTRAINT check_dni_valid
CHECK (
    dni IS NULL
    OR (dni >= 0 AND dni <= 1500 AND dni = dni)
);

-- Add constraint for wind speed (reasonable range 0 to 50 m/s)
ALTER TABLE forecasts
ADD CONSTRAINT check_wind_speed_valid
CHECK (
    "windSpeed" IS NULL
    OR ("windSpeed" >= 0 AND "windSpeed" <= 50 AND "windSpeed" = "windSpeed")
);

-- Add constraint for cloud cover (0 to 100 percent)
ALTER TABLE forecasts
ADD CONSTRAINT check_cloud_cover_valid
CHECK (
    "cloudCover" IS NULL
    OR ("cloudCover" >= 0 AND "cloudCover" <= 100 AND "cloudCover" = "cloudCover")
);

-- Create a trigger function to validate and clean data before insert/update
CREATE OR REPLACE FUNCTION validate_forecast_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Replace NaN/Infinity with NULL for all numeric fields
    IF NEW."powerMW" IS NOT NULL AND (NEW."powerMW" != NEW."powerMW" OR NEW."powerMW" IN ('Infinity', '-Infinity')) THEN
        NEW."powerMW" := NULL;
    END IF;

    IF NEW."energyMWh" IS NOT NULL AND (NEW."energyMWh" != NEW."energyMWh" OR NEW."energyMWh" IN ('Infinity', '-Infinity')) THEN
        NEW."energyMWh" := NULL;
    END IF;

    IF NEW."capacityFactor" IS NOT NULL AND (NEW."capacityFactor" != NEW."capacityFactor" OR NEW."capacityFactor" IN ('Infinity', '-Infinity')) THEN
        NEW."capacityFactor" := NULL;
    END IF;

    IF NEW.confidence IS NOT NULL AND (NEW.confidence != NEW.confidence OR NEW.confidence IN ('Infinity', '-Infinity')) THEN
        NEW.confidence := NULL;
    END IF;

    IF NEW."qualityScore" IS NOT NULL AND (NEW."qualityScore" != NEW."qualityScore" OR NEW."qualityScore" IN ('Infinity', '-Infinity')) THEN
        NEW."qualityScore" := NULL;
    END IF;

    -- Ensure powerMW is non-negative
    IF NEW."powerMW" IS NOT NULL AND NEW."powerMW" < 0 THEN
        NEW."powerMW" := 0;
    END IF;

    -- Log when data is cleaned
    IF NEW."powerMW" IS DISTINCT FROM OLD."powerMW" AND OLD."powerMW" IS NOT NULL THEN
        RAISE NOTICE 'Cleaned invalid powerMW value for location % at %', NEW."locationId", NEW.timestamp;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run validation before insert or update
DROP TRIGGER IF EXISTS validate_forecast_data_trigger ON forecasts;
CREATE TRIGGER validate_forecast_data_trigger
BEFORE INSERT OR UPDATE ON forecasts
FOR EACH ROW
EXECUTE FUNCTION validate_forecast_data();

-- Similar validation for production table
ALTER TABLE production
ADD CONSTRAINT check_production_power_mw_valid
CHECK (
    "powerMW" IS NULL
    OR ("powerMW" >= 0 AND "powerMW" <= 10000 AND "powerMW" = "powerMW")
);

ALTER TABLE production
ADD CONSTRAINT check_production_capacity_factor_valid
CHECK (
    "capacityFactor" IS NULL
    OR ("capacityFactor" >= 0 AND "capacityFactor" <= 1 AND "capacityFactor" = "capacityFactor")
);

-- Similar validation for weather_data table
ALTER TABLE weather_data
ADD CONSTRAINT check_weather_temperature_valid
CHECK (
    "temperatureC" IS NULL
    OR ("temperatureC" >= -50 AND "temperatureC" <= 60 AND "temperatureC" = "temperatureC")
);

ALTER TABLE weather_data
ADD CONSTRAINT check_weather_ghi_valid
CHECK (
    "ghiWM2" IS NULL
    OR ("ghiWM2" >= 0 AND "ghiWM2" <= 1500 AND "ghiWM2" = "ghiWM2")
);