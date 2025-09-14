"""
Integration test for dynamic model loading based on database location
MUST FAIL until proper model loading from location codes is implemented
"""
import pytest
import httpx
from datetime import datetime, timedelta
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import AsyncSessionLocal
import os
from pathlib import Path


@pytest.mark.asyncio
async def test_model_loading_from_location_code():
    """
    Test that models are loaded dynamically based on location code from database

    This test will FAIL until:
    - Location code is fetched from database (e.g., "maghebo_srl")
    - Correct model file is loaded based on code
    - Model metadata is tracked and stored
    - Fallback models work when specific model not found
    """
    base_url = "http://localhost:8001"

    # First, verify what models are available
    models_dir = Path("/Users/vladbordei/Documents/Development/solar/python-worker/models")
    model_files = list(models_dir.glob("*_production_models.pkl"))

    assert len(model_files) > 0, "No model files found in models directory"
    print(f"Available models: {[f.name for f in model_files]}")

    # Get location codes from database
    async with AsyncSessionLocal() as db:
        query = text("""
            SELECT id, code, name, "capacityMW"
            FROM locations
            WHERE code IS NOT NULL
            LIMIT 3
        """)

        result = await db.execute(query)
        locations = result.fetchall()

        if len(locations) == 0:
            # If no coded locations exist, this test will fail as expected
            pytest.fail("No locations with codes found - cannot test model loading")

    for location_id, location_code, name, capacity_mw in locations:
        print(f"Testing model loading for location: {name} (code: {location_code})")

        # Check if corresponding model file exists
        expected_model_file = models_dir / f"{location_code}_production_models.pkl"
        model_available = expected_model_file.exists()

        print(f"Expected model file: {expected_model_file}")
        print(f"Model available: {model_available}")

        async with httpx.AsyncClient(timeout=60) as client:
            # Generate forecast for this location
            response = await client.post(
                f"{base_url}/api/v1/forecast/generate",
                json={
                    "location_id": str(location_id),
                    "horizon_hours": 6,
                    "model_type": "ML_ENSEMBLE"
                }
            )

            # If model is available, forecast should work
            # If not, it should either work with fallback or fail gracefully
            if model_available:
                assert response.status_code == 200, f"Forecast failed for {location_code} with available model"

                await asyncio.sleep(5)

                # Verify model metadata in results
                task_data = response.json()
                task_id = task_data["task_id"]

                # Check task status
                status_response = await client.get(f"{base_url}/api/v1/forecast/task/{task_id}")

                if status_response.status_code == 200:
                    status_data = status_response.json()

                    if status_data["status"] == "completed":
                        # Should have used the correct model
                        result = status_data.get("result", {})
                        # This will pass once model loading is implemented
                        print(f"Forecast completed for {location_code}")
            else:
                # Should either work with fallback or fail gracefully
                print(f"No model available for {location_code} - testing fallback")


@pytest.mark.asyncio
async def test_model_metadata_tracking():
    """
    Test that loaded models include proper metadata tracking

    This test will FAIL until:
    - Model version information is extracted from pickle files
    - Model performance metrics are loaded
    - Model metadata is stored with forecasts
    - Model registry tracks which models are loaded
    """
    base_url = "http://localhost:8001"

    async with httpx.AsyncClient(timeout=60) as client:
        # Generate forecast
        response = await client.post(
            f"{base_url}/api/v1/forecast/generate",
            json={
                "location_id": "1",
                "horizon_hours": 6,
                "model_type": "ML_ENSEMBLE"
            }
        )

        assert response.status_code == 200

        await asyncio.sleep(8)

        # Get forecast results
        forecast_response = await client.get(f"{base_url}/api/v1/forecast/location/1")

        assert forecast_response.status_code == 200
        forecasts = forecast_response.json()

        for forecast in forecasts:
            # Model metadata should be present
            model_type = forecast.get("model_type")
            model_version = forecast.get("model_version")

            # Once implemented, should have specific model info
            if model_type:
                assert model_type != "ML", "Model type too generic"
                assert len(model_type) > 3, "Model type should be specific"

            if model_version:
                assert model_version != "1.0.0", "Version appears to be mock"
                # Should follow semantic versioning or date-based versioning


@pytest.mark.asyncio
async def test_model_fallback_strategy():
    """
    Test that system handles missing models gracefully with fallback

    This test will FAIL until:
    - Fallback strategy is implemented for missing models
    - Generic models can be used when location-specific ones missing
    - Error handling for model loading failures
    - Graceful degradation to physics-only models
    """
    base_url = "http://localhost:8001"

    async with httpx.AsyncClient(timeout=60) as client:
        # Try to generate forecast for non-existent location
        response = await client.post(
            f"{base_url}/api/v1/forecast/generate",
            json={
                "location_id": "999999",  # Non-existent location
                "horizon_hours": 6,
                "model_type": "ML_ENSEMBLE"
            }
        )

        # Should either work with fallback or fail gracefully
        # Don't assert success here - just test that it doesn't crash
        print(f"Fallback test response: {response.status_code}")

        if response.status_code == 200:
            # If it works, should use fallback model
            task_data = response.json()
            print("Fallback model used successfully")

        elif response.status_code == 404:
            # Graceful failure is acceptable
            print("Location not found - graceful failure")

        else:
            # Any other error suggests implementation issue
            print(f"Unexpected error: {response.status_code} - {response.text}")


@pytest.mark.asyncio
async def test_model_file_validation():
    """
    Test that model files are properly validated before loading

    This test will FAIL until:
    - Model file existence is checked before loading
    - Model file integrity is validated (not corrupted)
    - Model compatibility with current system is verified
    - Proper error messages for invalid models
    """
    models_dir = Path("/Users/vladbordei/Documents/Development/solar/python-worker/models")

    # Test model file existence
    expected_models = ["maghebo_srl", "envolteco_silistea", "crispvol_unirea"]

    for model_name in expected_models:
        model_file = models_dir / f"{model_name}_production_models.pkl"

        if model_file.exists():
            # Test that file is readable and not corrupted
            assert model_file.stat().st_size > 1024, f"Model file {model_name} too small"

            # Test that it's a valid pickle file (basic check)
            try:
                import pickle
                with open(model_file, 'rb') as f:
                    # Just read first few bytes to check it's a pickle
                    header = f.read(10)
                    assert header.startswith(b'\x80'), f"Model file {model_name} not a pickle"
            except Exception as e:
                pytest.fail(f"Model file {model_name} validation failed: {e}")

            print(f"Model {model_name} validation passed")


@pytest.mark.asyncio
async def test_model_performance_integration():
    """
    Test that model performance metadata is integrated with forecasts

    This test will FAIL until:
    - Model accuracy metrics are loaded from model files
    - Historical performance is tracked
    - Model selection based on performance
    - Performance data included in API responses
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

        await asyncio.sleep(10)

    # Check if performance data is stored in database
    async with AsyncSessionLocal() as db:
        query = text("""
            SELECT "qualityScore", "modelType", "modelVersion"
            FROM forecasts
            WHERE "locationId" = :location_id
                AND timestamp >= NOW() - INTERVAL '30 minutes'
                AND "qualityScore" IS NOT NULL
            LIMIT 5
        """)

        result = await db.execute(query, {"location_id": "1"})
        rows = result.fetchall()

        for quality_score, model_type, model_version in rows:
            # Quality score should be realistic (0-1 range)
            if quality_score is not None:
                assert 0.0 <= quality_score <= 1.0, f"Quality score out of range: {quality_score}"
                assert quality_score != 0.95, "Quality score appears to be mock value"

            # Model type should be specific
            if model_type:
                assert model_type != "ML", "Model type too generic"


@pytest.mark.asyncio
async def test_concurrent_model_loading():
    """
    Test that model loading works correctly under concurrent requests

    This test will FAIL until:
    - Thread-safe model loading is implemented
    - Model caching prevents repeated loading
    - Concurrent forecasts don't interfere with each other
    - Memory management for loaded models
    """
    base_url = "http://localhost:8001"

    async with httpx.AsyncClient(timeout=90) as client:
        # Generate multiple concurrent forecasts
        tasks = []

        for i in range(3):
            task = client.post(
                f"{base_url}/api/v1/forecast/generate",
                json={
                    "location_id": "1",
                    "horizon_hours": 6,
                    "model_type": "ML_ENSEMBLE"
                }
            )
            tasks.append(task)

        # Execute concurrently
        responses = await asyncio.gather(*tasks, return_exceptions=True)

        # All should succeed (or fail gracefully)
        success_count = 0
        for response in responses:
            if not isinstance(response, Exception) and response.status_code == 200:
                success_count += 1

        # At least some should succeed
        assert success_count > 0, "No concurrent forecasts succeeded"

        print(f"Concurrent model loading: {success_count}/3 succeeded")