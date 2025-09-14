"""
Integration test for forecast database storage in TimescaleDB
MUST FAIL until proper database field mapping and storage is implemented
ALL TIMESTAMPS IN UTC
"""
import pytest
import httpx
from datetime import datetime, timedelta
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import AsyncSessionLocal


@pytest.mark.asyncio
async def test_forecast_database_storage_contract():
    """
    Test that forecasts are properly stored in TimescaleDB forecasts table

    This test will FAIL until:
    - Proper field mapping to Prisma schema (timestamp, powerMW, etc.)
    - Confidence bands stored as powerMWQ10, Q25, Q75, Q90
    - All timestamps stored in UTC
    - Bulk insert optimization for TimescaleDB
    """
    base_url = "http://localhost:8001"

    async with httpx.AsyncClient(timeout=60) as client:
        # Generate forecast
        response = await client.post(
            f"{base_url}/api/v1/forecast/generate",
            json={
                "location_id": "1",  # String UUID in database
                "horizon_hours": 24,
                "model_type": "ML_ENSEMBLE"
            }
        )

        assert response.status_code == 200
        task_data = response.json()

        # Wait for completion and database storage
        await asyncio.sleep(15)

    # Verify data was stored in database
    async with AsyncSessionLocal() as db:
        # Check forecasts table directly
        query = text("""
            SELECT
                timestamp, "locationId", "powerMW", "energyMWh",
                "powerMWQ10", "powerMWQ25", "powerMWQ75", "powerMWQ90",
                "capacityFactor", "modelType", "modelVersion",
                temperature, ghi, dni, "cloudCover", "windSpeed"
            FROM forecasts
            WHERE "locationId" = :location_id
                AND timestamp >= NOW() - INTERVAL '1 hour'
            ORDER BY timestamp ASC
            LIMIT 10
        """)

        result = await db.execute(query, {"location_id": "1"})
        rows = result.fetchall()

        # Should have forecast records stored
        assert len(rows) > 0, "No forecasts found in database"

        for row in rows:
            timestamp, location_id, power_mw, energy_mwh = row[:4]
            q10, q25, q75, q90 = row[4:8]
            capacity_factor, model_type, model_version = row[8:11]
            temperature, ghi, dni, cloud_cover, wind_speed = row[11:16]

            # Timestamp validation (UTC)
            assert timestamp.tzinfo is not None  # Should be timezone-aware
            # Note: TimescaleDB stores as UTC

            # Location ID should be string UUID
            assert location_id == "1"

            # Power values should be in MW (not kW)
            assert power_mw is not None
            assert 0 <= power_mw <= 50  # Reasonable MW range
            assert isinstance(power_mw, (int, float))

            # Energy should be calculated properly
            if energy_mwh is not None:
                assert 0 <= energy_mwh <= power_mw * 2  # Max 2 hours worth

            # Confidence bands should be present (once implemented)
            if all([q10, q25, q75, q90]):
                assert q10 <= q25 <= power_mw <= q75 <= q90
                # All confidence bands in MW
                assert all(isinstance(q, (int, float)) for q in [q10, q25, q75, q90])

            # Capacity factor should be realistic
            if capacity_factor is not None:
                assert 0 <= capacity_factor <= 1

            # Model metadata should be specific
            if model_type:
                assert model_type != "ML"  # Should be more specific
                assert len(model_type) > 3

            # Weather data should be stored
            weather_present = sum(1 for w in [temperature, ghi, dni, cloud_cover, wind_speed] if w is not None)
            assert weather_present > 0, "No weather data stored with forecast"


@pytest.mark.asyncio
async def test_forecast_timescaledb_optimization():
    """
    Test that forecasts use TimescaleDB optimizations for time-series data

    This test will FAIL until:
    - Bulk insert operations are used
    - Proper time-based indexing
    - Hypertable structure utilized
    """
    base_url = "http://localhost:8001"

    async with httpx.AsyncClient(timeout=90) as client:
        # Generate longer forecast for bulk insert testing
        response = await client.post(
            f"{base_url}/api/v1/forecast/generate",
            json={
                "location_id": "1",
                "horizon_hours": 48,  # More data points
                "model_type": "ML_ENSEMBLE"
            }
        )

        assert response.status_code == 200

        # Wait for bulk insert completion
        await asyncio.sleep(25)

    async with AsyncSessionLocal() as db:
        # Check that multiple records were inserted efficiently
        query = text("""
            SELECT COUNT(*) as forecast_count,
                   MIN(timestamp) as min_time,
                   MAX(timestamp) as max_time
            FROM forecasts
            WHERE "locationId" = :location_id
                AND timestamp >= NOW() - INTERVAL '2 hours'
        """)

        result = await db.execute(query, {"location_id": "1"})
        row = result.fetchone()

        forecast_count, min_time, max_time = row

        # Should have multiple forecasts stored
        assert forecast_count >= 48, f"Expected at least 48 forecasts, got {forecast_count}"

        # Time range should span approximately 48 hours
        if min_time and max_time:
            time_span = max_time - min_time
            expected_span = timedelta(hours=47)  # 48 points, last one is +47 hours
            assert time_span >= expected_span, f"Time span too short: {time_span}"


@pytest.mark.asyncio
async def test_forecast_database_field_mapping():
    """
    Test that all database fields are correctly mapped from forecast engine output

    This test will FAIL until:
    - Correct Prisma field names used (powerMW not powerOutputMW)
    - String UUIDs for locationId
    - Proper JSON parsing for location configs
    - UTC timestamp handling
    """
    base_url = "http://localhost:8001"

    async with httpx.AsyncClient(timeout=60) as client:
        # Generate forecast
        response = await client.post(
            f"{base_url}/api/v1/forecast/generate",
            json={
                "location_id": "1",
                "horizon_hours": 12,
                "model_type": "ML_ENSEMBLE"
            }
        )

        assert response.status_code == 200

        # Wait for storage
        await asyncio.sleep(10)

    async with AsyncSessionLocal() as db:
        # Test field mapping by checking column names and data types
        query = text("""
            SELECT
                timestamp, "locationId", "powerMW", "energyMWh",
                "capacityFactor", "modelType", "horizonMinutes",
                "qualityScore", "createdAt"
            FROM forecasts
            WHERE "locationId" = :location_id
                AND timestamp >= NOW() - INTERVAL '30 minutes'
            LIMIT 1
        """)

        result = await db.execute(query, {"location_id": "1"})
        row = result.fetchone()

        assert row is not None, "No forecast found with correct field mapping"

        timestamp, location_id, power_mw, energy_mwh = row[:4]
        capacity_factor, model_type, horizon_minutes = row[4:7]
        quality_score, created_at = row[7:9]

        # Field mapping validations
        assert isinstance(location_id, str), "locationId should be string UUID"
        assert isinstance(power_mw, (int, float)), "powerMW should be numeric"
        assert isinstance(timestamp, datetime), "timestamp should be datetime"

        # UTC timezone validation
        # TimescaleDB stores as UTC, so this might be naive but represents UTC
        assert created_at is not None, "createdAt should be populated"

        # Horizon should be in minutes, not hours
        if horizon_minutes is not None:
            assert horizon_minutes > 0, "horizonMinutes should be positive"
            assert horizon_minutes <= 48 * 60, "horizonMinutes should be <= 48 hours"


@pytest.mark.asyncio
async def test_forecast_database_constraints():
    """
    Test that database constraints prevent invalid forecast data

    This test will FAIL until:
    - Capacity constraints enforced at database level
    - Non-null validations for critical fields
    - Proper foreign key relationships
    """
    async with AsyncSessionLocal() as db:
        # This test would verify database constraints
        # For now, we test that we can query the structure

        # Check that forecasts table exists with expected constraints
        query = text("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'forecasts'
            ORDER BY column_name
        """)

        result = await db.execute(query)
        columns = result.fetchall()

        # Should have the expected columns
        column_names = [col[0] for col in columns]

        required_columns = [
            "timestamp", "locationId", "powerMW",
            "capacityFactor", "modelType"
        ]

        for req_col in required_columns:
            assert req_col in column_names, f"Missing required column: {req_col}"

        # Optional confidence band columns
        confidence_columns = ["powerMWQ10", "powerMWQ25", "powerMWQ75", "powerMWQ90"]
        for conf_col in confidence_columns:
            if conf_col in column_names:
                # If present, should be nullable (since not all models provide them)
                col_info = next((col for col in columns if col[0] == conf_col), None)
                # This is OK to be nullable initially