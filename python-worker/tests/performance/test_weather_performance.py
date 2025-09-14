"""Performance tests for weather data operations"""

import pytest
import asyncio
import time
from unittest.mock import patch, AsyncMock
from datetime import datetime, timedelta

from app.modules.weather.services import WeatherService
from app.modules.weather.repositories import WeatherRepository
from app.models.weather import WeatherData


@pytest.fixture
def mock_db_session():
    """Mock database session"""
    return AsyncMock()


@pytest.fixture
def sample_location_ids():
    """Sample location IDs for bulk testing"""
    return [f"location-{i:04d}" for i in range(100)]


@pytest.fixture
def bulk_weather_data():
    """Generate bulk weather data for performance testing"""
    base_time = datetime.utcnow()
    weather_data = []

    for i in range(1000):  # 1000 records
        weather_data.append(WeatherData(
            id=f"weather-{i:04d}",
            timestamp=base_time - timedelta(minutes=i),
            time=base_time - timedelta(minutes=i),
            locationId=f"location-{i % 10:04d}",  # 10 different locations
            temperature=20 + (i % 20),
            humidity=50 + (i % 40),
            pressure=1013 + (i % 20),
            windSpeed=i % 15,
            cloudCover=i % 100,
            ghi=max(0, 800 - i),
            dni=max(0, 600 - i),
            dhi=200 - (i % 200)
        ))

    return weather_data


class TestWeatherPerformance:
    """Performance tests for weather operations"""

    @pytest.mark.asyncio
    async def test_bulk_weather_query_performance(
        self,
        mock_db_session,
        bulk_weather_data
    ):
        """Test performance of bulk weather queries"""
        repository = WeatherRepository(mock_db_session)

        # Mock bulk query response
        mock_db_session.execute = AsyncMock()
        mock_result = AsyncMock()

        # Create mock rows that match the expected structure
        mock_rows = []
        for weather in bulk_weather_data[:100]:  # First 100 records
            mock_row = AsyncMock()
            # Set attributes to match WeatherData fields
            for field, value in weather.to_dict().items():
                setattr(mock_row, field, value)
            mock_rows.append(mock_row)

        mock_result.fetchall.return_value = mock_rows
        mock_db_session.execute.return_value = mock_result

        # Measure query performance
        start_time = time.time()
        result = await repository.get_recent_weather("location-0001", hours=24)
        end_time = time.time()

        query_time = end_time - start_time

        # Performance assertion: should complete in under 100ms
        assert query_time < 0.1, f"Query took {query_time:.3f}s, expected < 0.1s"
        assert len(result) <= 100

    @pytest.mark.asyncio
    async def test_concurrent_weather_requests_performance(
        self,
        mock_db_session,
        sample_location_ids
    ):
        """Test performance of concurrent weather requests"""
        service = WeatherService(mock_db_session)

        # Mock fresh weather data for all locations
        mock_weather = WeatherData(
            id="test-weather",
            timestamp=datetime.utcnow() - timedelta(minutes=5),
            time=datetime.utcnow() - timedelta(minutes=5),
            locationId="test-location",
            temperature=25.0, humidity=60.0, pressure=1013.0,
            windSpeed=5.0, cloudCover=20.0
        )

        with patch.object(service.repository, 'get_latest_weather') as mock_latest:
            mock_latest.return_value = mock_weather

            # Measure concurrent request performance
            start_time = time.time()

            # Create 50 concurrent requests
            tasks = [
                service.get_weather_with_freshness(location_id, max_age_minutes=15)
                for location_id in sample_location_ids[:50]
            ]

            results = await asyncio.gather(*tasks)
            end_time = time.time()

            total_time = end_time - start_time

            # Performance assertion: 50 concurrent requests should complete in under 1 second
            assert total_time < 1.0, f"Concurrent requests took {total_time:.3f}s, expected < 1.0s"
            assert len(results) == 50
            assert all(result == mock_weather for result in results)

    @pytest.mark.asyncio
    async def test_data_freshness_check_performance(
        self,
        mock_db_session,
        sample_location_ids
    ):
        """Test performance of data freshness checks"""
        repository = WeatherRepository(mock_db_session)

        # Mock latest weather query
        mock_weather = WeatherData(
            id="test-weather",
            timestamp=datetime.utcnow() - timedelta(minutes=10),
            time=datetime.utcnow() - timedelta(minutes=10),
            locationId="test-location",
            temperature=25.0, humidity=60.0, pressure=1013.0,
            windSpeed=5.0, cloudCover=20.0
        )

        with patch.object(repository, 'get_latest_weather') as mock_latest:
            mock_latest.return_value = mock_weather

            # Measure freshness check performance for multiple locations
            start_time = time.time()

            freshness_results = []
            for location_id in sample_location_ids[:100]:
                is_fresh = await repository.check_data_freshness(location_id, max_age_minutes=15)
                freshness_results.append(is_fresh)

            end_time = time.time()
            total_time = end_time - start_time

            # Performance assertion: 100 freshness checks should complete in under 500ms
            assert total_time < 0.5, f"Freshness checks took {total_time:.3f}s, expected < 0.5s"
            assert len(freshness_results) == 100
            assert all(isinstance(result, bool) for result in freshness_results)

    @pytest.mark.asyncio
    async def test_legacy_format_conversion_performance(
        self,
        mock_db_session,
        bulk_weather_data
    ):
        """Test performance of legacy format conversion"""
        service = WeatherService(mock_db_session)

        # Measure conversion performance for large dataset
        start_time = time.time()
        legacy_data = service._convert_to_legacy_format(bulk_weather_data)
        end_time = time.time()

        conversion_time = end_time - start_time

        # Performance assertion: converting 1000 records should take under 100ms
        assert conversion_time < 0.1, f"Conversion took {conversion_time:.3f}s, expected < 0.1s"
        assert len(legacy_data) == len(bulk_weather_data)

        # Verify conversion quality (spot check)
        assert 'temperature' in legacy_data[0]
        assert 'cloud_cover' in legacy_data[0]
        assert 'wind_speed' in legacy_data[0]

    @pytest.mark.asyncio
    async def test_memory_usage_during_bulk_operations(
        self,
        mock_db_session,
        bulk_weather_data
    ):
        """Test memory efficiency during bulk weather operations"""
        import psutil
        import os

        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB

        service = WeatherService(mock_db_session)

        # Perform multiple bulk operations
        for _ in range(10):
            # Convert data format
            legacy_data = service._convert_to_legacy_format(bulk_weather_data)

            # Simulate processing
            processed_count = sum(1 for item in legacy_data if item['temperature'] > 0)

            # Clear references
            del legacy_data

        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = final_memory - initial_memory

        # Memory assertion: should not increase by more than 50MB during bulk operations
        assert memory_increase < 50, f"Memory increased by {memory_increase:.1f}MB, expected < 50MB"

    @pytest.mark.asyncio
    async def test_database_connection_efficiency(
        self,
        mock_db_session
    ):
        """Test database connection efficiency"""
        repository = WeatherRepository(mock_db_session)

        # Mock database responses
        mock_db_session.execute = AsyncMock()
        mock_result = AsyncMock()
        mock_result.fetchall.return_value = []
        mock_result.fetchone.return_value = None
        mock_db_session.execute.return_value = mock_result

        # Perform multiple database operations
        start_time = time.time()

        for i in range(100):
            await repository.get_recent_weather(f"location-{i}", hours=24)
            await repository.get_latest_weather(f"location-{i}")
            await repository.check_data_freshness(f"location-{i}")

        end_time = time.time()
        total_time = end_time - start_time

        # Performance assertion: 300 database operations should complete in under 1 second
        assert total_time < 1.0, f"Database operations took {total_time:.3f}s, expected < 1.0s"

        # Verify all operations were called
        assert mock_db_session.execute.call_count == 300  # 3 operations × 100 iterations

    @pytest.mark.asyncio
    async def test_forecast_generation_performance(
        self,
        mock_db_session
    ):
        """Test forecast generation performance with database weather data"""
        service = WeatherService(mock_db_session)

        # Mock location and weather data
        with patch.object(service, '_get_location_id_from_coordinates') as mock_location, \
             patch.object(service, 'get_weather_with_freshness') as mock_freshness, \
             patch.object(service.repository, 'get_recent_weather') as mock_recent:

            mock_location.return_value = "test-location"
            mock_freshness.return_value = WeatherData(
                id="test", timestamp=datetime.utcnow(), time=datetime.utcnow(),
                locationId="test-location", temperature=25.0, humidity=60.0,
                pressure=1013.0, windSpeed=5.0, cloudCover=20.0
            )

            # Large weather dataset for forecast
            mock_recent.return_value = [
                WeatherData(
                    id=f"weather-{i}", timestamp=datetime.utcnow() - timedelta(hours=i),
                    time=datetime.utcnow() - timedelta(hours=i),
                    locationId="test-location", temperature=20 + i % 10,
                    humidity=60, pressure=1013, windSpeed=5, cloudCover=i * 2
                )
                for i in range(168)  # 1 week of hourly data
            ]

            # Measure forecast generation performance
            start_time = time.time()
            forecast = await service.get_forecast(40.7128, -74.0060, days=7)
            end_time = time.time()

            generation_time = end_time - start_time

            # Performance assertion: generating 7-day forecast should take under 200ms
            assert generation_time < 0.2, f"Forecast generation took {generation_time:.3f}s, expected < 0.2s"
            assert len(forecast) == 168  # 7 days × 24 hours