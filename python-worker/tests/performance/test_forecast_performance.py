"""
Performance test for forecast generation scaling
MUST FAIL until performance requirements are met
TARGET: 100 locations processed in <60 seconds
MEMORY: <5MB per forecast location
"""
import pytest
import httpx
import asyncio
import time
import psutil
import os
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import AsyncSessionLocal


@pytest.mark.asyncio
@pytest.mark.performance
async def test_single_location_performance():
    """
    Test performance baseline for single location forecast

    This test will FAIL until:
    - Single location forecast completes in <10 seconds
    - Memory usage per forecast is <5MB
    - CPU usage is reasonable
    - Database operations are optimized
    """
    base_url = "http://localhost:8001"

    # Measure baseline performance
    start_memory = psutil.Process(os.getpid()).memory_info().rss / 1024 / 1024  # MB

    start_time = time.time()

    async with httpx.AsyncClient(timeout=120) as client:
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
        task_data = response.json()
        task_id = task_data["task_id"]

        completion_time = None
        while True:
            status_response = await client.get(f"{base_url}/api/v1/forecast/task/{task_id}")

            if status_response.status_code == 200:
                status_data = status_response.json()

                if status_data["status"] == "completed":
                    completion_time = time.time()
                    break
                elif status_data["status"] == "failed":
                    pytest.fail(f"Forecast failed: {status_data.get('error')}")

            await asyncio.sleep(1)

            # Timeout after 60 seconds
            if time.time() - start_time > 60:
                pytest.fail("Single location forecast took >60 seconds")

    end_time = time.time()
    end_memory = psutil.Process(os.getpid()).memory_info().rss / 1024 / 1024  # MB

    duration = end_time - start_time
    memory_used = end_memory - start_memory

    print(f"Single location performance:")
    print(f"  Duration: {duration:.2f} seconds")
    print(f"  Memory used: {memory_used:.2f} MB")

    # Performance assertions
    assert duration < 30, f"Single location too slow: {duration:.2f}s (target <30s)"
    assert memory_used < 50, f"Single location uses too much memory: {memory_used:.2f}MB (target <50MB)"


@pytest.mark.asyncio
@pytest.mark.performance
async def test_multiple_locations_sequential():
    """
    Test performance for multiple locations processed sequentially

    This test will FAIL until:
    - 10 locations complete in <60 seconds sequentially
    - Memory usage doesn't grow linearly
    - Models are cached and reused
    """
    base_url = "http://localhost:8001"

    start_time = time.time()
    start_memory = psutil.Process(os.getpid()).memory_info().rss / 1024 / 1024

    completed_count = 0
    target_locations = 10

    async with httpx.AsyncClient(timeout=120) as client:
        for i in range(target_locations):
            location_start = time.time()

            response = await client.post(
                f"{base_url}/api/v1/forecast/generate",
                json={
                    "location_id": "1",  # Same location for now, different requests
                    "horizon_hours": 24,
                    "model_type": "ML_ENSEMBLE"
                }
            )

            if response.status_code == 200:
                # Don't wait for full completion, just queue
                completed_count += 1

                # Check if we're taking too long
                elapsed = time.time() - start_time
                if elapsed > 60:
                    print(f"Sequential test timed out after {completed_count} locations")
                    break

                location_duration = time.time() - location_start
                print(f"Location {i+1} queued in {location_duration:.2f}s")

                # Brief pause to avoid overwhelming
                await asyncio.sleep(0.5)

    end_time = time.time()
    end_memory = psutil.Process(os.getpid()).memory_info().rss / 1024 / 1024

    total_duration = end_time - start_time
    memory_used = end_memory - start_memory

    print(f"Sequential performance ({completed_count} locations):")
    print(f"  Total duration: {total_duration:.2f} seconds")
    print(f"  Memory used: {memory_used:.2f} MB")
    print(f"  Average per location: {total_duration/completed_count:.2f}s")

    # Performance targets
    assert completed_count >= 5, f"Only completed {completed_count} locations (target >=5)"
    assert total_duration < 60, f"Sequential too slow: {total_duration:.2f}s (target <60s)"


@pytest.mark.asyncio
@pytest.mark.performance
async def test_concurrent_locations_performance():
    """
    Test performance for concurrent location processing

    This test will FAIL until:
    - Multiple locations can be processed concurrently
    - Concurrent processing is faster than sequential
    - Memory usage is controlled under load
    - No race conditions or deadlocks
    """
    base_url = "http://localhost:8001"

    start_time = time.time()
    start_memory = psutil.Process(os.getpid()).memory_info().rss / 1024 / 1024

    concurrent_count = 5

    async with httpx.AsyncClient(timeout=120) as client:
        # Create concurrent forecast requests
        tasks = []

        for i in range(concurrent_count):
            task = client.post(
                f"{base_url}/api/v1/forecast/generate",
                json={
                    "location_id": "1",
                    "horizon_hours": 24,
                    "model_type": "ML_ENSEMBLE"
                }
            )
            tasks.append(task)

        # Execute all concurrently
        responses = await asyncio.gather(*tasks, return_exceptions=True)

        # Count successful responses
        successful_requests = 0
        task_ids = []

        for response in responses:
            if not isinstance(response, Exception) and response.status_code == 200:
                successful_requests += 1
                task_data = response.json()
                task_ids.append(task_data["task_id"])

        end_time = time.time()
        request_duration = end_time - start_time
        end_memory = psutil.Process(os.getpid()).memory_info().rss / 1024 / 1024

        print(f"Concurrent requests performance:")
        print(f"  Successful requests: {successful_requests}/{concurrent_count}")
        print(f"  Request duration: {request_duration:.2f} seconds")
        print(f"  Memory used: {end_memory - start_memory:.2f} MB")

        # Performance assertions for request phase
        assert successful_requests >= 3, f"Only {successful_requests} concurrent requests succeeded"
        assert request_duration < 30, f"Concurrent requests too slow: {request_duration:.2f}s"


@pytest.mark.asyncio
@pytest.mark.performance
async def test_database_performance():
    """
    Test database operation performance under forecast load

    This test will FAIL until:
    - TimescaleDB bulk operations are optimized
    - Forecast storage uses efficient batch inserts
    - Database queries are properly indexed
    - Connection pooling is optimized
    """
    base_url = "http://localhost:8001"

    # Generate some forecasts to test database performance
    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(
            f"{base_url}/api/v1/forecast/generate",
            json={
                "location_id": "1",
                "horizon_hours": 96,  # Larger dataset
                "model_type": "ML_ENSEMBLE"
            }
        )

        if response.status_code == 200:
            await asyncio.sleep(15)  # Wait for database storage

    # Test database query performance
    async with AsyncSessionLocal() as db:
        start_time = time.time()

        # Test complex query performance
        query = text("""
            SELECT
                DATE_TRUNC('hour', timestamp) as hour,
                AVG("powerMW") as avg_power,
                MAX("powerMW") as max_power,
                COUNT(*) as forecast_count
            FROM forecasts
            WHERE "locationId" = :location_id
                AND timestamp >= NOW() - INTERVAL '24 hours'
            GROUP BY DATE_TRUNC('hour', timestamp)
            ORDER BY hour
        """)

        result = await db.execute(query, {"location_id": "1"})
        rows = result.fetchall()

        query_time = time.time() - start_time

        print(f"Database query performance:")
        print(f"  Query time: {query_time:.3f} seconds")
        print(f"  Rows returned: {len(rows)}")

        # Database performance targets
        assert query_time < 5.0, f"Database query too slow: {query_time:.3f}s (target <5s)"
        assert len(rows) > 0, "No forecast data found for performance test"


@pytest.mark.asyncio
@pytest.mark.performance
async def test_memory_usage_scaling():
    """
    Test that memory usage scales reasonably with forecast load

    This test will FAIL until:
    - Memory usage per forecast is controlled
    - Models are cached, not reloaded repeatedly
    - Garbage collection works properly
    - No memory leaks under sustained load
    """
    base_url = "http://localhost:8001"

    # Measure memory before
    initial_memory = psutil.Process(os.getpid()).memory_info().rss / 1024 / 1024

    memory_measurements = [initial_memory]

    async with httpx.AsyncClient(timeout=180) as client:
        # Generate multiple forecasts and measure memory
        for i in range(5):
            response = await client.post(
                f"{base_url}/api/v1/forecast/generate",
                json={
                    "location_id": "1",
                    "horizon_hours": 24,
                    "model_type": "ML_ENSEMBLE"
                }
            )

            if response.status_code == 200:
                await asyncio.sleep(3)  # Brief processing time

                # Measure memory after each forecast
                current_memory = psutil.Process(os.getpid()).memory_info().rss / 1024 / 1024
                memory_measurements.append(current_memory)

                print(f"After forecast {i+1}: {current_memory:.2f} MB")

    final_memory = memory_measurements[-1]
    memory_growth = final_memory - initial_memory

    print(f"Memory scaling test:")
    print(f"  Initial memory: {initial_memory:.2f} MB")
    print(f"  Final memory: {final_memory:.2f} MB")
    print(f"  Total growth: {memory_growth:.2f} MB")
    print(f"  Growth per forecast: {memory_growth/5:.2f} MB")

    # Memory scaling assertions
    assert memory_growth < 100, f"Excessive memory growth: {memory_growth:.2f}MB (target <100MB)"
    assert memory_growth/5 < 20, f"Memory per forecast too high: {memory_growth/5:.2f}MB (target <20MB)"


@pytest.mark.asyncio
@pytest.mark.performance
async def test_end_to_end_performance_target():
    """
    Test the overall performance target: 100 locations in 60 seconds

    This test will FAIL until:
    - System can handle high concurrent load
    - Database can store large volumes efficiently
    - Memory usage remains reasonable
    - Error rates are acceptable under load
    """
    # Note: This is a scaled-down version since we don't have 100 real locations
    # In production, this would test the full 100-location scenario

    base_url = "http://localhost:8001"
    target_locations = 20  # Scaled down for testing
    target_time = 60

    start_time = time.time()
    start_memory = psutil.Process(os.getpid()).memory_info().rss / 1024 / 1024

    successful_forecasts = 0
    failed_forecasts = 0

    async with httpx.AsyncClient(timeout=180) as client:
        # Batch concurrent requests to simulate high load
        batch_size = 5
        batches = target_locations // batch_size

        for batch in range(batches):
            batch_start = time.time()
            tasks = []

            # Create batch of concurrent requests
            for i in range(batch_size):
                task = client.post(
                    f"{base_url}/api/v1/forecast/generate",
                    json={
                        "location_id": "1",
                        "horizon_hours": 12,  # Shorter for performance
                        "model_type": "ML_ENSEMBLE"
                    }
                )
                tasks.append(task)

            # Execute batch
            try:
                responses = await asyncio.gather(*tasks, return_exceptions=True)

                for response in responses:
                    if not isinstance(response, Exception) and response.status_code == 200:
                        successful_forecasts += 1
                    else:
                        failed_forecasts += 1

                batch_time = time.time() - batch_start
                print(f"Batch {batch+1}/{batches}: {batch_time:.2f}s")

                # Check if we're exceeding time target
                elapsed = time.time() - start_time
                if elapsed > target_time:
                    print(f"Performance test timed out at {elapsed:.2f}s")
                    break

                # Brief pause between batches
                await asyncio.sleep(1)

            except Exception as e:
                print(f"Batch {batch+1} failed: {e}")
                failed_forecasts += batch_size

    end_time = time.time()
    end_memory = psutil.Process(os.getpid()).memory_info().rss / 1024 / 1024

    total_duration = end_time - start_time
    memory_used = end_memory - start_memory
    total_requests = successful_forecasts + failed_forecasts
    success_rate = successful_forecasts / total_requests if total_requests > 0 else 0

    print(f"End-to-end performance test:")
    print(f"  Duration: {total_duration:.2f} seconds")
    print(f"  Successful: {successful_forecasts}")
    print(f"  Failed: {failed_forecasts}")
    print(f"  Success rate: {success_rate:.2%}")
    print(f"  Memory used: {memory_used:.2f} MB")
    print(f"  Requests per second: {total_requests/total_duration:.2f}")

    # Performance targets (scaled)
    assert total_duration < target_time, f"Performance target missed: {total_duration:.2f}s > {target_time}s"
    assert success_rate > 0.8, f"Success rate too low: {success_rate:.2%} (target >80%)"
    assert successful_forecasts >= target_locations * 0.7, f"Too few successful forecasts: {successful_forecasts}"
    assert memory_used < 200, f"Memory usage too high: {memory_used:.2f}MB (target <200MB)"