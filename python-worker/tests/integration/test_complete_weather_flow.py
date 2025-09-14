"""Integration test for complete weather data flow"""

import pytest
from unittest.mock import patch, AsyncMock
from datetime import datetime, timedelta

from app.modules.weather.services import WeatherService
from app.modules.weather.repositories import WeatherRepository
from app.integrations.sveltekit import SvelteKitClient
from app.models.weather import WeatherData


@pytest.fixture
def mock_db_session():
    """Mock database session"""
    return AsyncMock()


@pytest.fixture
def sample_location_id():
    """Sample location ID for testing"""
    return "123e4567-e89b-12d3-a456-426614174000"


@pytest.fixture
def fresh_weather_data():
    """Fresh weather data"""
    return WeatherData(
        id="weather-id-1",
        timestamp=datetime.utcnow() - timedelta(minutes=5),  # 5 minutes ago
        time=datetime.utcnow() - timedelta(minutes=5),
        locationId="123e4567-e89b-12d3-a456-426614174000",
        temperature=25.0,
        humidity=60.0,
        pressure=1013.0,
        windSpeed=5.0,
        cloudCover=20.0,
        ghi=800.0,
        dni=600.0,
        dhi=200.0
    )


@pytest.fixture
def stale_weather_data():
    """Stale weather data"""
    return WeatherData(
        id="weather-id-2",
        timestamp=datetime.utcnow() - timedelta(minutes=30),  # 30 minutes ago
        time=datetime.utcnow() - timedelta(minutes=30),
        locationId="123e4567-e89b-12d3-a456-426614174000",
        temperature=22.0,
        humidity=65.0,
        pressure=1012.0,
        windSpeed=7.0,
        cloudCover=30.0,
        ghi=750.0,
        dni=550.0,
        dhi=200.0
    )


class TestCompleteWeatherFlow:
    """Test complete weather data flow from database to API"""

    @pytest.mark.asyncio
    async def test_complete_flow_with_fresh_data(
        self,
        mock_db_session,
        sample_location_id,
        fresh_weather_data
    ):
        """Test complete flow when data is fresh"""
        # This test validates the entire flow without SvelteKit sync
        service = WeatherService(mock_db_session)

        with patch.object(service.repository, 'get_latest_weather') as mock_latest:
            mock_latest.return_value = fresh_weather_data

            # Should return fresh data without triggering sync
            result = await service.get_weather_with_freshness(sample_location_id)

            assert result == fresh_weather_data
            mock_latest.assert_called_once_with(sample_location_id)

    @pytest.mark.asyncio
    async def test_complete_flow_with_stale_data_and_successful_sync(
        self,
        mock_db_session,
        sample_location_id,
        stale_weather_data,
        fresh_weather_data
    ):
        """Test complete flow when data is stale and sync succeeds"""
        service = WeatherService(mock_db_session)

        with patch.object(service.repository, 'get_latest_weather') as mock_latest, \
             patch.object(service.sveltekit_client, 'trigger_weather_sync') as mock_sync, \
             patch.object(service.sveltekit_client, 'wait_for_sync_completion') as mock_wait:

            # First call returns stale data, second call returns fresh data after sync
            mock_latest.side_effect = [stale_weather_data, fresh_weather_data]
            mock_sync.return_value = {"success": True}
            mock_wait.return_value = True

            result = await service.get_weather_with_freshness(sample_location_id)

            assert result == fresh_weather_data
            mock_sync.assert_called_once_with(sample_location_id)
            mock_wait.assert_called_once()
            assert mock_latest.call_count == 2

    @pytest.mark.asyncio
    async def test_complete_flow_with_no_data_triggers_sync(
        self,
        mock_db_session,
        sample_location_id,
        fresh_weather_data
    ):
        """Test complete flow when no data exists and sync provides data"""
        service = WeatherService(mock_db_session)

        with patch.object(service.repository, 'get_latest_weather') as mock_latest, \
             patch.object(service.sveltekit_client, 'trigger_weather_sync') as mock_sync, \
             patch.object(service.sveltekit_client, 'wait_for_sync_completion') as mock_wait:

            # First call returns None, second call returns data after sync
            mock_latest.side_effect = [None, fresh_weather_data]
            mock_sync.return_value = {"success": True}
            mock_wait.return_value = True

            result = await service.get_weather_with_freshness(sample_location_id)

            assert result == fresh_weather_data
            mock_sync.assert_called_once_with(sample_location_id)
            mock_wait.assert_called_once()

    @pytest.mark.asyncio
    async def test_forecast_generation_uses_database_data(
        self,
        mock_db_session,
        sample_location_id
    ):
        """Test that forecast generation uses database weather data"""
        service = WeatherService(mock_db_session)

        # Mock location lookup
        mock_location_data = [
            {
                'id': sample_location_id,
                'latitude': 40.7128,
                'longitude': -74.0060
            }
        ]

        # Mock weather data for forecast
        mock_weather_list = [
            WeatherData(
                id=f"weather-{i}",
                timestamp=datetime.utcnow() - timedelta(hours=i),
                time=datetime.utcnow() - timedelta(hours=i),
                locationId=sample_location_id,
                temperature=20 + i,
                humidity=60,
                pressure=1013,
                windSpeed=5,
                cloudCover=i * 5,
                ghi=800 - i * 10,
                dni=600 - i * 8,
                dhi=200
            )
            for i in range(24)  # 24 hours of data
        ]

        with patch.object(service, '_get_location_id_from_coordinates') as mock_location, \
             patch.object(service, 'get_weather_with_freshness') as mock_freshness, \
             patch.object(service.repository, 'get_recent_weather') as mock_recent:

            mock_location.return_value = sample_location_id
            mock_freshness.return_value = mock_weather_list[0]  # Latest weather
            mock_recent.return_value = mock_weather_list

            result = await service.get_forecast(40.7128, -74.0060, days=1)

            # Should return forecast data based on database weather
            assert isinstance(result, list)
            assert len(result) == 24  # 24 hours of data

            # Verify data structure matches legacy format
            first_item = result[0]
            assert 'temperature' in first_item
            assert 'cloud_cover' in first_item
            assert 'wind_speed' in first_item
            assert 'ghi' in first_item
            assert 'dni' in first_item

            mock_location.assert_called_once_with(40.7128, -74.0060)
            mock_freshness.assert_called_once()
            mock_recent.assert_called_once_with(sample_location_id, 24)

    @pytest.mark.asyncio
    async def test_error_handling_in_complete_flow(
        self,
        mock_db_session,
        sample_location_id
    ):
        """Test error handling throughout the complete flow"""
        service = WeatherService(mock_db_session)

        with patch.object(service.repository, 'get_latest_weather') as mock_latest, \
             patch.object(service.sveltekit_client, 'trigger_weather_sync') as mock_sync:

            # Repository throws exception
            mock_latest.side_effect = Exception("Database connection failed")
            mock_sync.return_value = {"success": True}

            result = await service.get_weather_with_freshness(sample_location_id)

            # Should handle error gracefully and return None
            assert result is None

    @pytest.mark.asyncio
    async def test_repository_sql_query_structure(self, mock_db_session):
        """Test that repository uses correct SQL queries for Prisma compatibility"""
        repository = WeatherRepository(mock_db_session)

        # Mock database execution
        mock_db_session.execute = AsyncMock()
        mock_result = AsyncMock()
        mock_result.fetchall.return_value = []
        mock_db_session.execute.return_value = mock_result

        await repository.get_recent_weather("test-location", 24)

        # Verify SQL query structure
        call_args = mock_db_session.execute.call_args
        sql_query = str(call_args[0][0])

        # Should use correct table name and column names (camelCase)
        assert '"WeatherData"' in sql_query
        assert '"locationId"' in sql_query
        assert '"windSpeed"' in sql_query
        assert '"cloudCover"' in sql_query

    @pytest.mark.asyncio
    async def test_data_freshness_logic_accuracy(
        self,
        mock_db_session,
        sample_location_id
    ):
        """Test data freshness calculation accuracy"""
        service = WeatherService(mock_db_session)

        # Create weather data with specific ages
        weather_5_min_old = WeatherData(
            id="test-1",
            timestamp=datetime.utcnow() - timedelta(minutes=5),
            time=datetime.utcnow() - timedelta(minutes=5),
            locationId=sample_location_id,
            temperature=25.0, humidity=60.0, pressure=1013.0,
            windSpeed=5.0, cloudCover=20.0
        )

        weather_20_min_old = WeatherData(
            id="test-2",
            timestamp=datetime.utcnow() - timedelta(minutes=20),
            time=datetime.utcnow() - timedelta(minutes=20),
            locationId=sample_location_id,
            temperature=25.0, humidity=60.0, pressure=1013.0,
            windSpeed=5.0, cloudCover=20.0
        )

        # Test with 15 minute threshold
        assert service._is_weather_data_fresh(weather_5_min_old, 15) is True
        assert service._is_weather_data_fresh(weather_20_min_old, 15) is False

        # Test with 30 minute threshold
        assert service._is_weather_data_fresh(weather_20_min_old, 30) is True

        # Test with None data
        assert service._is_weather_data_fresh(None, 15) is False

    @pytest.mark.asyncio
    async def test_legacy_format_conversion_accuracy(
        self,
        mock_db_session,
        sample_location_id
    ):
        """Test accuracy of legacy format conversion"""
        service = WeatherService(mock_db_session)

        weather_data_list = [
            WeatherData(
                id="test-1",
                timestamp=datetime.utcnow(),
                time=datetime.utcnow(),
                locationId=sample_location_id,
                temperature=25.0,
                humidity=65.0,
                pressure=1013.25,
                windSpeed=5.2,
                cloudCover=30.0,
                ghi=800.0,
                dni=600.0,
                dhi=200.0,
                solarElevation=45.0
            )
        ]

        result = service._convert_to_legacy_format(weather_data_list)

        assert len(result) == 1
        legacy_item = result[0]

        # Verify field mapping
        assert legacy_item['temperature'] == 25.0
        assert legacy_item['humidity'] == 65.0
        assert legacy_item['pressure'] == 1013.25
        assert legacy_item['wind_speed'] == 5.2  # camelCase -> snake_case
        assert legacy_item['cloud_cover'] == 30.0  # camelCase -> snake_case
        assert legacy_item['ghi'] == 800.0
        assert legacy_item['dni'] == 600.0
        assert legacy_item['dhi'] == 200.0
        assert legacy_item['solar_elevation'] == 45.0

        # Verify required legacy fields
        assert 'hour' in legacy_item
        assert 'timestamp' in legacy_item