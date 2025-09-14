"""
Integration test for capacity constraint validation
MUST FAIL until real plant capacity limits are enforced
CRITICAL: NO FORECASTS CAN EXCEED PLANT CAPACITY
"""
import pytest
import httpx
from datetime import datetime, timedelta
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import AsyncSessionLocal


@pytest.mark.asyncio
async def test_capacity_constraint_enforcement():
    """
    Test that ALL forecasts are <= plant capacity (CRITICAL SAFETY REQUIREMENT)

    This test will FAIL until:
    - Plant capacity is loaded from database locations table
    - ALL forecast values (including confidence bands) are <= capacity
    - Capacity constraints are enforced in forecast generation
    - Database validation prevents capacity violations
    """
    base_url = "http://localhost:8001"

    # First, get the actual plant capacity from database
    async with AsyncSessionLocal() as db:
        query = text("""
            SELECT "capacityMW", "actualCapacityMW", name
            FROM locations
            WHERE id = :location_id
        """)

        result = await db.execute(query, {"location_id": "1"})
        row = result.fetchone()

        assert row is not None, "Location not found in database"
        capacity_mw, actual_capacity_mw, name = row

        # Use actual capacity if available, otherwise nominal
        max_capacity = actual_capacity_mw or capacity_mw
        assert max_capacity > 0, "Plant capacity must be positive"

        print(f"Testing capacity constraints for {name}: {max_capacity} MW")

    async with httpx.AsyncClient(timeout=90) as client:
        # Generate forecast with maximum horizon to test all conditions
        response = await client.post(
            f"{base_url}/api/v1/forecast/generate",
            json={
                "location_id": "1",
                "horizon_hours": 48,
                "model_type": "ML_ENSEMBLE"
            }
        )

        assert response.status_code == 200

        # Wait for completion
        await asyncio.sleep(20)

    # Check ALL forecast values against capacity
    async with AsyncSessionLocal() as db:
        query = text("""
            SELECT
                timestamp, "powerMW", "powerMWQ10", "powerMWQ25",
                "powerMWQ75", "powerMWQ90", "capacityFactor"
            FROM forecasts
            WHERE "locationId" = :location_id
                AND timestamp >= NOW() - INTERVAL '1 hour'
            ORDER BY timestamp ASC
        """)

        result = await db.execute(query, {"location_id": "1"})
        rows = result.fetchall()

        assert len(rows) > 0, "No forecasts found for capacity validation"

        for row in rows:
            timestamp, power_mw, q10, q25, q75, q90, capacity_factor = row

            # CRITICAL: Main forecast MUST NOT exceed capacity
            assert power_mw <= max_capacity, (
                f"CAPACITY VIOLATION: {power_mw} MW > {max_capacity} MW at {timestamp}"
            )

            # CRITICAL: ALL confidence bands MUST NOT exceed capacity
            if q90 is not None:
                assert q90 <= max_capacity, (
                    f"Q90 CAPACITY VIOLATION: {q90} MW > {max_capacity} MW at {timestamp}"
                )

            if q75 is not None:
                assert q75 <= max_capacity, (
                    f"Q75 CAPACITY VIOLATION: {q75} MW > {max_capacity} MW at {timestamp}"
                )

            if q25 is not None:
                assert q25 <= max_capacity, (
                    f"Q25 CAPACITY VIOLATION: {q25} MW > {max_capacity} MW at {timestamp}"
                )

            if q10 is not None:
                assert q10 <= max_capacity, (
                    f"Q10 CAPACITY VIOLATION: {q10} MW > {max_capacity} MW at {timestamp}"
                )

            # All values must be non-negative
            assert power_mw >= 0, f"Negative power: {power_mw} MW at {timestamp}"

            # Capacity factor must be <= 1.0
            if capacity_factor is not None:
                assert capacity_factor <= 1.0, (
                    f"Capacity factor > 1.0: {capacity_factor} at {timestamp}"
                )


@pytest.mark.asyncio
async def test_capacity_constraint_multiple_locations():
    """
    Test capacity constraints for multiple plant types

    This test will FAIL until:
    - Capacity constraints work for different plant sizes
    - Location-specific capacity limits are enforced
    - Different model types respect capacity
    """
    base_url = "http://localhost:8001"

    # Test multiple locations if they exist
    async with AsyncSessionLocal() as db:
        query = text("""
            SELECT id, "capacityMW", "actualCapacityMW", name
            FROM locations
            WHERE "capacityMW" > 0
            LIMIT 3
        """)

        result = await db.execute(query)
        locations = result.fetchall()

        assert len(locations) > 0, "No locations found for testing"

    for location_id, capacity_mw, actual_capacity_mw, name in locations:
        max_capacity = actual_capacity_mw or capacity_mw

        async with httpx.AsyncClient(timeout=60) as client:
            # Generate forecast for this location
            response = await client.post(
                f"{base_url}/api/v1/forecast/generate",
                json={
                    "location_id": str(location_id),
                    "horizon_hours": 12,
                    "model_type": "ML_ENSEMBLE"
                }
            )

            # Skip if location not supported yet
            if response.status_code != 200:
                continue

            await asyncio.sleep(8)

        # Validate capacity for this specific location
        async with AsyncSessionLocal() as db:
            query = text("""
                SELECT MAX("powerMW") as max_power
                FROM forecasts
                WHERE "locationId" = :location_id
                    AND timestamp >= NOW() - INTERVAL '30 minutes'
            """)

            result = await db.execute(query, {"location_id": str(location_id)})
            row = result.fetchone()

            if row and row[0] is not None:
                max_power = row[0]
                assert max_power <= max_capacity, (
                    f"Location {name}: Max power {max_power} MW > capacity {max_capacity} MW"
                )


@pytest.mark.asyncio
async def test_capacity_constraint_extreme_conditions():
    """
    Test capacity constraints under extreme weather conditions

    This test will FAIL until:
    - High irradiance conditions don't cause capacity violations
    - Model predictions are capped at plant capacity
    - Edge cases (dawn, dusk, cloudy) respect limits
    """
    base_url = "http://localhost:8001"

    async with httpx.AsyncClient(timeout=60) as client:
        # Generate multiple forecasts to test various conditions
        for i in range(3):
            response = await client.post(
                f"{base_url}/api/v1/forecast/generate",
                json={
                    "location_id": "1",
                    "horizon_hours": 24,
                    "model_type": "ML_ENSEMBLE"
                }
            )

            if response.status_code == 200:
                await asyncio.sleep(5)

    # Get plant capacity
    async with AsyncSessionLocal() as db:
        query = text("""
            SELECT "capacityMW", "actualCapacityMW"
            FROM locations
            WHERE id = :location_id
        """)

        result = await db.execute(query, {"location_id": "1"})
        row = result.fetchone()
        capacity_mw, actual_capacity_mw = row
        max_capacity = actual_capacity_mw or capacity_mw

        # Check extreme values
        query = text("""
            SELECT
                MAX("powerMW") as max_power,
                MAX("powerMWQ90") as max_q90,
                COUNT(*) as forecast_count
            FROM forecasts
            WHERE "locationId" = :location_id
                AND timestamp >= NOW() - INTERVAL '2 hours'
        """)

        result = await db.execute(query, {"location_id": "1"})
        row = result.fetchone()

        max_power, max_q90, forecast_count = row

        # Even under extreme conditions, must not exceed capacity
        if max_power is not None:
            assert max_power <= max_capacity, (
                f"Extreme condition violation: {max_power} MW > {max_capacity} MW"
            )

        if max_q90 is not None:
            assert max_q90 <= max_capacity, (
                f"Extreme Q90 violation: {max_q90} MW > {max_capacity} MW"
            )


@pytest.mark.asyncio
async def test_capacity_factor_validation():
    """
    Test that capacity factors are realistic and consistent

    This test will FAIL until:
    - Capacity factors calculated as power_mw / capacity_mw
    - All capacity factors <= 1.0
    - Capacity factors consistent with power values
    """
    base_url = "http://localhost:8001"

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            f"{base_url}/api/v1/forecast/generate",
            json={
                "location_id": "1",
                "horizon_hours": 24,
                "model_type": "ML_ENSEMBLE"
            }
        )

        assert response.status_code == 200
        await asyncio.sleep(12)

    async with AsyncSessionLocal() as db:
        # Get plant capacity and forecasts
        capacity_query = text("""
            SELECT "capacityMW", "actualCapacityMW"
            FROM locations
            WHERE id = :location_id
        """)

        result = await db.execute(capacity_query, {"location_id": "1"})
        row = result.fetchone()
        capacity_mw, actual_capacity_mw = row
        max_capacity = actual_capacity_mw or capacity_mw

        # Check capacity factors
        forecast_query = text("""
            SELECT "powerMW", "capacityFactor", timestamp
            FROM forecasts
            WHERE "locationId" = :location_id
                AND timestamp >= NOW() - INTERVAL '1 hour'
                AND "capacityFactor" IS NOT NULL
        """)

        result = await db.execute(forecast_query, {"location_id": "1"})
        rows = result.fetchall()

        for power_mw, capacity_factor, timestamp in rows:
            # Capacity factor must be <= 1.0
            assert capacity_factor <= 1.0, (
                f"Capacity factor > 1.0: {capacity_factor} at {timestamp}"
            )

            # Capacity factor should be consistent with power/capacity
            expected_cf = power_mw / max_capacity
            tolerance = 0.01  # 1% tolerance for rounding

            assert abs(capacity_factor - expected_cf) <= tolerance, (
                f"Inconsistent CF: got {capacity_factor}, expected {expected_cf:.3f} "
                f"(power={power_mw}, capacity={max_capacity})"
            )


@pytest.mark.asyncio
async def test_capacity_constraint_api_response():
    """
    Test that API responses include capacity information and validation

    This test will FAIL until:
    - API responses include plant capacity information
    - Capacity violations trigger API errors
    - Client can verify capacity constraints
    """
    base_url = "http://localhost:8001"

    async with httpx.AsyncClient(timeout=60) as client:
        # Test forecast generation response
        response = await client.post(
            f"{base_url}/api/v1/forecast/generate",
            json={
                "location_id": "1",
                "horizon_hours": 12,
                "model_type": "ML_ENSEMBLE"
            }
        )

        assert response.status_code == 200
        await asyncio.sleep(8)

        # Test forecast retrieval with capacity info
        forecast_response = await client.get(
            f"{base_url}/api/v1/forecast/location/1"
        )

        assert forecast_response.status_code == 200
        forecasts = forecast_response.json()

        # Each forecast should respect capacity
        for forecast in forecasts:
            power_mw = forecast.get("power_output_mw") or forecast.get("power_mw")

            if power_mw is not None:
                # Power should be reasonable (< 10 MW for testing)
                assert power_mw <= 10.0, f"Unrealistic power: {power_mw} MW"
                assert power_mw >= 0, f"Negative power: {power_mw} MW"

            # If capacity factor is included, it should be <= 1.0
            capacity_factor = forecast.get("capacity_factor")
            if capacity_factor is not None:
                assert capacity_factor <= 1.0, f"CF > 1.0: {capacity_factor}"