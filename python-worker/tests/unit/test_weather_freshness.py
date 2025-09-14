"""Unit tests for weather service freshness logic"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta

from app.modules.weather.services import WeatherService
from app.models.weather import WeatherData


@pytest.fixture
def mock_db_session():
    """Mock database session"""
    return AsyncMock()


@pytest.fixture
def weather_service(mock_db_session):
    """Create weather service with mocked dependencies"""
    return WeatherService(mock_db_session)


@pytest.fixture
def sample_location_id():
    """Sample location ID for testing"""
    return "123e4567-e89b-12d3-a456-426614174000"


@pytest.fixture
def fresh_weather_data():
    """Weather data that is fresh (within 15 minutes)"""
    return WeatherData(
        id="456e7890-e89b-12d3-a456-426614174001",
        timestamp=datetime.utcnow() - timedelta(minutes=5),  # 5 minutes ago
        time=datetime.utcnow() - timedelta(minutes=5),
        locationId="123e4567-e89b-12d3-a456-426614174000",
        temperature=25.5,
        humidity=65.0,
        pressure=1013.25,
        windSpeed=5.2,
        cloudCover=25.0
    )


@pytest.fixture
def stale_weather_data():
    """Weather data that is stale (older than 15 minutes)"""
    return WeatherData(
        id="456e7890-e89b-12d3-a456-426614174002",
        timestamp=datetime.utcnow() - timedelta(minutes=30),  # 30 minutes ago
        time=datetime.utcnow() - timedelta(minutes=30),
        locationId="123e4567-e89b-12d3-a456-426614174000",
        temperature=25.5,
        humidity=65.0,
        pressure=1013.25,
        windSpeed=5.2,
        cloudCover=25.0
    )


class TestWeatherServiceFreshness:
    """Test weather service freshness logic"""

    @pytest.mark.asyncio
    async def test_get_weather_with_freshness_returns_fresh_data(
        self,
        weather_service: WeatherService,
        sample_location_id: str,
        fresh_weather_data: WeatherData
    ):
        """Test service returns fresh data without triggering sync"""
        # This test should FAIL because the method doesn't exist yet
        with patch.object(weather_service, 'repository') as mock_repo:
            mock_repo.get_latest_weather.return_value = fresh_weather_data

            result = await weather_service.get_weather_with_freshness(
                sample_location_id, max_age_minutes=15
            )

            assert result == fresh_weather_data
            mock_repo.get_latest_weather.assert_called_once_with(sample_location_id)

    @pytest.mark.asyncio
    async def test_get_weather_with_freshness_triggers_sync_for_stale_data(
        self,
        weather_service: WeatherService,
        sample_location_id: str,
        stale_weather_data: WeatherData,
        fresh_weather_data: WeatherData
    ):
        """Test service triggers sync when data is stale"""
        # This test should FAIL because the method doesn't exist yet
        with patch.object(weather_service, 'repository') as mock_repo, \
             patch.object(weather_service, 'sveltekit_client') as mock_client:

            # First call returns stale data, second call returns fresh data
            mock_repo.get_latest_weather.side_effect = [stale_weather_data, fresh_weather_data]
            mock_client.trigger_weather_sync.return_value = {"success": True}

            result = await weather_service.get_weather_with_freshness(
                sample_location_id, max_age_minutes=15
            )

            assert result == fresh_weather_data
            mock_client.trigger_weather_sync.assert_called_once_with(sample_location_id)
            assert mock_repo.get_latest_weather.call_count == 2

    @pytest.mark.asyncio
    async def test_get_weather_with_freshness_handles_no_data(
        self,
        weather_service: WeatherService,
        sample_location_id: str,
        fresh_weather_data: WeatherData
    ):
        """Test service handles case when no weather data exists"""
        # This test should FAIL because the method doesn't exist yet
        with patch.object(weather_service, 'repository') as mock_repo, \
             patch.object(weather_service, 'sveltekit_client') as mock_client:

            # First call returns None, second call returns fresh data after sync
            mock_repo.get_latest_weather.side_effect = [None, fresh_weather_data]
            mock_client.trigger_weather_sync.return_value = {"success": True}

            result = await weather_service.get_weather_with_freshness(sample_location_id)

            assert result == fresh_weather_data
            mock_client.trigger_weather_sync.assert_called_once_with(sample_location_id)

    @pytest.mark.asyncio
    async def test_is_weather_data_fresh_with_fresh_data(
        self,
        weather_service: WeatherService,
        fresh_weather_data: WeatherData
    ):
        """Test freshness check returns True for fresh data"""
        # This test should FAIL because the method doesn't exist yet
        is_fresh = weather_service._is_weather_data_fresh(
            fresh_weather_data, max_age_minutes=15
        )
        assert is_fresh is True

    @pytest.mark.asyncio
    async def test_is_weather_data_fresh_with_stale_data(
        self,
        weather_service: WeatherService,
        stale_weather_data: WeatherData
    ):
        """Test freshness check returns False for stale data"""
        # This test should FAIL because the method doesn't exist yet
        is_fresh = weather_service._is_weather_data_fresh(
            stale_weather_data, max_age_minutes=15
        )
        assert is_fresh is False

    @pytest.mark.asyncio
    async def test_is_weather_data_fresh_with_none_data(
        self,
        weather_service: WeatherService
    ):
        """Test freshness check returns False for None data"""
        # This test should FAIL because the method doesn't exist yet
        is_fresh = weather_service._is_weather_data_fresh(None, max_age_minutes=15)
        assert is_fresh is False

    @pytest.mark.asyncio
    async def test_get_weather_with_freshness_respects_custom_age_limit(
        self,
        weather_service: WeatherService,
        sample_location_id: str
    ):
        """Test service respects custom max_age_minutes parameter"""
        # This test should FAIL because the method doesn't exist yet
        # Create data that is 10 minutes old
        data_10_min_old = WeatherData(
            id="test-id",
            timestamp=datetime.utcnow() - timedelta(minutes=10),
            time=datetime.utcnow() - timedelta(minutes=10),
            locationId=sample_location_id,
            temperature=25.0,
            humidity=60.0,
            pressure=1013.0,
            windSpeed=5.0,
            cloudCover=20.0
        )

        with patch.object(weather_service, 'repository') as mock_repo, \
             patch.object(weather_service, 'sveltekit_client') as mock_client:

            mock_repo.get_latest_weather.return_value = data_10_min_old

            # With 5 minute limit, should trigger sync
            await weather_service.get_weather_with_freshness(
                sample_location_id, max_age_minutes=5
            )
            mock_client.trigger_weather_sync.assert_called_once()

            mock_client.reset_mock()

            # With 15 minute limit, should NOT trigger sync
            await weather_service.get_weather_with_freshness(
                sample_location_id, max_age_minutes=15
            )
            mock_client.trigger_weather_sync.assert_not_called()

    @pytest.mark.asyncio
    async def test_get_weather_with_freshness_handles_sync_failure(
        self,
        weather_service: WeatherService,
        sample_location_id: str,
        stale_weather_data: WeatherData
    ):
        """Test service handles sync failure gracefully"""
        # This test should FAIL because the method doesn't exist yet
        with patch.object(weather_service, 'repository') as mock_repo, \
             patch.object(weather_service, 'sveltekit_client') as mock_client:

            mock_repo.get_latest_weather.return_value = stale_weather_data
            mock_client.trigger_weather_sync.side_effect = Exception("Sync failed")

            # Should return stale data instead of raising exception
            result = await weather_service.get_weather_with_freshness(sample_location_id)

            assert result == stale_weather_data

    @pytest.mark.asyncio
    async def test_get_forecast_uses_database_instead_of_api(
        self,
        weather_service: WeatherService
    ):
        """Test get_forecast method uses database instead of API calls"""
        # This test should FAIL because the refactored method doesn't exist yet
        latitude = 40.7128
        longitude = -74.0060
        days = 3

        with patch.object(weather_service, 'repository') as mock_repo:
            mock_weather_data = [fresh_weather_data]
            mock_repo.get_recent_weather.return_value = mock_weather_data

            result = await weather_service.get_forecast(latitude, longitude, days)

            # Should use repository instead of generating mock data
            mock_repo.get_recent_weather.assert_called()
            assert isinstance(result, list)