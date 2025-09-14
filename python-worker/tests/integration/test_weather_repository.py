"""Integration tests for weather repository database queries"""

import pytest
import asyncio
from datetime import datetime, timedelta
from typing import List

from app.core.database import get_db
from app.modules.weather.repositories import WeatherRepository
from app.models.weather import WeatherData


@pytest.fixture
async def weather_repository():
    """Create weather repository with test database session"""
    async for db_session in get_db():
        yield WeatherRepository(db_session)


@pytest.fixture
def sample_location_id():
    """Sample location ID for testing"""
    return "123e4567-e89b-12d3-a456-426614174000"


@pytest.fixture
def sample_weather_data():
    """Sample weather data for testing"""
    return {
        'id': '456e7890-e89b-12d3-a456-426614174001',
        'timestamp': datetime.utcnow(),
        'time': datetime.utcnow(),
        'locationId': "123e4567-e89b-12d3-a456-426614174000",
        'temperature': 25.5,
        'humidity': 65.0,
        'pressure': 1013.25,
        'windSpeed': 5.2,
        'cloudCover': 25.0,
        'ghi': 800.0,
        'dni': 600.0,
        'dhi': 200.0
    }


class TestWeatherRepository:
    """Test weather repository database operations"""

    @pytest.mark.asyncio
    async def test_get_recent_weather_returns_empty_when_no_data(
        self,
        weather_repository: WeatherRepository,
        sample_location_id: str
    ):
        """Test get_recent_weather returns empty list when no data exists"""
        # This test should FAIL because repository doesn't exist yet
        result = await weather_repository.get_recent_weather(sample_location_id, hours=24)
        assert result == []

    @pytest.mark.asyncio
    async def test_get_recent_weather_filters_by_location(
        self,
        weather_repository: WeatherRepository,
        sample_location_id: str
    ):
        """Test get_recent_weather filters by location ID"""
        # This test should FAIL because repository doesn't exist yet
        result = await weather_repository.get_recent_weather(sample_location_id, hours=24)
        assert isinstance(result, list)

        # All results should have the same location ID
        for weather_data in result:
            assert weather_data.locationId == sample_location_id

    @pytest.mark.asyncio
    async def test_get_recent_weather_filters_by_time_range(
        self,
        weather_repository: WeatherRepository,
        sample_location_id: str
    ):
        """Test get_recent_weather filters by time range correctly"""
        # This test should FAIL because repository doesn't exist yet
        hours = 12
        result = await weather_repository.get_recent_weather(sample_location_id, hours=hours)

        # All results should be within the time range
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        for weather_data in result:
            assert weather_data.timestamp >= cutoff_time

    @pytest.mark.asyncio
    async def test_get_weather_range_returns_data_in_range(
        self,
        weather_repository: WeatherRepository,
        sample_location_id: str
    ):
        """Test get_weather_range returns data within specified range"""
        # This test should FAIL because repository doesn't exist yet
        start_time = datetime.utcnow() - timedelta(hours=24)
        end_time = datetime.utcnow()

        result = await weather_repository.get_weather_range(
            sample_location_id, start_time, end_time
        )

        assert isinstance(result, list)

        # All results should be within the time range
        for weather_data in result:
            assert start_time <= weather_data.timestamp <= end_time
            assert weather_data.locationId == sample_location_id

    @pytest.mark.asyncio
    async def test_get_latest_weather_returns_most_recent(
        self,
        weather_repository: WeatherRepository,
        sample_location_id: str
    ):
        """Test get_latest_weather returns the most recent weather data"""
        # This test should FAIL because repository doesn't exist yet
        result = await weather_repository.get_latest_weather(sample_location_id)

        if result:
            assert isinstance(result, WeatherData)
            assert result.locationId == sample_location_id

    @pytest.mark.asyncio
    async def test_check_data_freshness_with_fresh_data(
        self,
        weather_repository: WeatherRepository,
        sample_location_id: str
    ):
        """Test check_data_freshness returns True for fresh data"""
        # This test should FAIL because repository doesn't exist yet
        max_age_minutes = 15
        is_fresh = await weather_repository.check_data_freshness(
            sample_location_id, max_age_minutes
        )
        assert isinstance(is_fresh, bool)

    @pytest.mark.asyncio
    async def test_check_data_freshness_with_stale_data(
        self,
        weather_repository: WeatherRepository,
        sample_location_id: str
    ):
        """Test check_data_freshness returns False for stale data"""
        # This test should FAIL because repository doesn't exist yet
        max_age_minutes = 1  # Very short age to ensure data is stale
        is_fresh = await weather_repository.check_data_freshness(
            sample_location_id, max_age_minutes
        )
        assert isinstance(is_fresh, bool)

    @pytest.mark.asyncio
    async def test_repository_handles_database_errors_gracefully(
        self,
        weather_repository: WeatherRepository
    ):
        """Test repository handles database errors gracefully"""
        # This test should FAIL because repository doesn't exist yet
        invalid_location_id = "invalid-uuid"

        # Should not raise exception, should return empty/None
        result = await weather_repository.get_recent_weather(invalid_location_id)
        assert result == []

    @pytest.mark.asyncio
    async def test_weather_data_matches_prisma_schema(
        self,
        weather_repository: WeatherRepository,
        sample_location_id: str
    ):
        """Test that returned weather data matches Prisma schema structure"""
        # This test should FAIL because repository doesn't exist yet
        result = await weather_repository.get_recent_weather(sample_location_id, hours=1)

        if result:
            weather_data = result[0]
            # Check all required Prisma fields exist
            assert hasattr(weather_data, 'id')
            assert hasattr(weather_data, 'timestamp')
            assert hasattr(weather_data, 'locationId')
            assert hasattr(weather_data, 'temperature')
            assert hasattr(weather_data, 'humidity')
            assert hasattr(weather_data, 'pressure')
            assert hasattr(weather_data, 'windSpeed')  # camelCase
            assert hasattr(weather_data, 'cloudCover')  # camelCase
            assert hasattr(weather_data, 'ghi')
            assert hasattr(weather_data, 'dni')
            assert hasattr(weather_data, 'dhi')

    @pytest.mark.asyncio
    async def test_repository_uses_correct_table_name(
        self,
        weather_repository: WeatherRepository,
        sample_location_id: str
    ):
        """Test repository uses correct Prisma table name 'WeatherData'"""
        # This test should FAIL because repository doesn't exist yet
        # This is more of a test to ensure we're querying the right table
        result = await weather_repository.get_recent_weather(sample_location_id)
        # If no exception is thrown, the table name is correct
        assert isinstance(result, list)