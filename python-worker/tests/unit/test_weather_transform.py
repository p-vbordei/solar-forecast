"""Unit tests for weather data transformation and formatting"""

import pytest
from datetime import datetime
from unittest.mock import patch

from app.models.weather import WeatherData
from app.modules.weather.services import WeatherService


@pytest.fixture
def sample_raw_weather_data():
    """Sample raw weather data from database query"""
    return [
        {
            'id': '456e7890-e89b-12d3-a456-426614174001',
            'timestamp': datetime(2025, 9, 14, 12, 0, 0),
            'time': datetime(2025, 9, 14, 12, 0, 0),
            'locationId': '123e4567-e89b-12d3-a456-426614174000',
            'temperature': 25.5,
            'humidity': 65.0,
            'pressure': 1013.25,
            'windSpeed': 5.2,
            'windDirection': 180.0,
            'cloudCover': 25.0,
            'visibility': 10.0,
            'precipitation': 0.0,
            'precipitationType': None,
            'ghi': 800.0,
            'dni': 600.0,
            'dhi': 200.0,
            'gti': 850.0,
            'extraterrestrial': 1000.0,
            'solarZenith': 30.0,
            'solarAzimuth': 180.0,
            'solarElevation': 60.0,
            'airMass': 1.2,
            'dewPoint': 18.5,
            'uvIndex': 8.0,
            'apparentTemperature': 27.0,
            'source': 'open-meteo',
            'dataQuality': 'GOOD',
            'isForecasted': False,
            'forecastHorizon': None
        }
    ]


@pytest.fixture
def mock_db_session():
    """Mock database session"""
    from unittest.mock import AsyncMock
    return AsyncMock()


@pytest.fixture
def weather_service(mock_db_session):
    """Create weather service instance"""
    return WeatherService(mock_db_session)


class TestWeatherDataTransformation:
    """Test weather data transformation and formatting"""

    def test_weather_data_from_dict_conversion(self, sample_raw_weather_data):
        """Test converting raw database data to WeatherData objects"""
        # This test should FAIL because transformation logic doesn't exist yet
        raw_data = sample_raw_weather_data[0]
        weather_data = WeatherData.from_dict(raw_data)

        assert weather_data.id == raw_data['id']
        assert weather_data.timestamp == raw_data['timestamp']
        assert weather_data.locationId == raw_data['locationId']
        assert weather_data.temperature == raw_data['temperature']
        assert weather_data.humidity == raw_data['humidity']
        assert weather_data.pressure == raw_data['pressure']
        assert weather_data.windSpeed == raw_data['windSpeed']
        assert weather_data.cloudCover == raw_data['cloudCover']
        assert weather_data.ghi == raw_data['ghi']
        assert weather_data.dni == raw_data['dni']
        assert weather_data.dhi == raw_data['dhi']

    def test_weather_data_to_dict_conversion(self):
        """Test converting WeatherData objects to dictionaries"""
        # This test should FAIL because to_dict method doesn't exist yet
        weather_data = WeatherData(
            id='test-id',
            timestamp=datetime(2025, 9, 14, 12, 0, 0),
            time=datetime(2025, 9, 14, 12, 0, 0),
            locationId='test-location',
            temperature=25.0,
            humidity=60.0,
            pressure=1013.0,
            windSpeed=5.0,
            cloudCover=20.0
        )

        result_dict = weather_data.to_dict()

        assert result_dict['id'] == 'test-id'
        assert result_dict['locationId'] == 'test-location'
        assert result_dict['temperature'] == 25.0
        assert result_dict['humidity'] == 60.0
        assert result_dict['windSpeed'] == 5.0
        assert result_dict['cloudCover'] == 20.0

    @pytest.mark.asyncio
    async def test_transform_weather_data_for_forecast_service(
        self,
        weather_service: WeatherService,
        sample_raw_weather_data
    ):
        """Test transforming weather data for use in forecast generation"""
        # This test should FAIL because transformation method doesn't exist yet
        with patch.object(weather_service, 'repository') as mock_repo:
            mock_repo.get_recent_weather.return_value = [
                WeatherData.from_dict(data) for data in sample_raw_weather_data
            ]

            result = await weather_service._transform_for_forecast_generation(
                location_id="123e4567-e89b-12d3-a456-426614174000",
                hours=24
            )

            # Should return list of dictionaries compatible with existing forecast logic
            assert isinstance(result, list)
            assert len(result) > 0

            first_item = result[0]
            assert 'temperature' in first_item
            assert 'cloud_cover' in first_item  # Should be snake_case for forecast compatibility
            assert 'wind_speed' in first_item
            assert 'humidity' in first_item
            assert 'pressure' in first_item

    def test_weather_data_handles_missing_optional_fields(self):
        """Test WeatherData handles missing optional fields gracefully"""
        # This test should FAIL because optional field handling doesn't exist yet
        minimal_data = {
            'id': 'test-id',
            'timestamp': datetime.utcnow(),
            'time': datetime.utcnow(),
            'locationId': 'test-location',
            'temperature': 25.0,
            'humidity': 60.0,
            'pressure': 1013.0,
            'windSpeed': 5.0,
            'cloudCover': 20.0
            # Missing all optional fields
        }

        weather_data = WeatherData.from_dict(minimal_data)

        assert weather_data.ghi is None
        assert weather_data.dni is None
        assert weather_data.dhi is None
        assert weather_data.visibility is None
        assert weather_data.precipitation is None
        assert weather_data.precipitationType is None
        assert weather_data.solarZenith is None

    def test_weather_data_uses_defaults_for_metadata_fields(self):
        """Test WeatherData uses appropriate defaults for metadata fields"""
        # This test should FAIL because default handling doesn't exist yet
        minimal_data = {
            'id': 'test-id',
            'timestamp': datetime.utcnow(),
            'time': datetime.utcnow(),
            'locationId': 'test-location',
            'temperature': 25.0,
            'humidity': 60.0,
            'pressure': 1013.0,
            'windSpeed': 5.0,
            'cloudCover': 20.0
            # Missing source, dataQuality, isForecasted
        }

        weather_data = WeatherData.from_dict(minimal_data)

        assert weather_data.source == 'open-meteo'  # Default
        assert weather_data.dataQuality == 'GOOD'  # Default
        assert weather_data.isForecasted is False  # Default

    @pytest.mark.asyncio
    async def test_convert_database_weather_to_legacy_format(
        self,
        weather_service: WeatherService,
        sample_raw_weather_data
    ):
        """Test converting database weather data to legacy format for forecast service"""
        # This test should FAIL because legacy conversion doesn't exist yet
        weather_data_objects = [WeatherData.from_dict(data) for data in sample_raw_weather_data]

        legacy_format = weather_service._convert_to_legacy_format(weather_data_objects)

        # Legacy format uses snake_case and specific field names
        assert isinstance(legacy_format, list)
        first_item = legacy_format[0]

        # Check legacy field names and formats
        assert 'hour' in first_item or 'timestamp' in first_item
        assert 'temperature' in first_item
        assert 'cloud_cover' in first_item  # Not cloudCover
        assert 'wind_speed' in first_item   # Not windSpeed
        assert 'humidity' in first_item
        assert 'pressure' in first_item

        # Ensure values are properly formatted
        assert isinstance(first_item['temperature'], (int, float))
        assert isinstance(first_item['cloud_cover'], (int, float))
        assert isinstance(first_item['wind_speed'], (int, float))

    def test_weather_data_validation_for_required_fields(self):
        """Test WeatherData validation for required fields"""
        # This test should FAIL because validation doesn't exist yet
        incomplete_data = {
            'id': 'test-id',
            'timestamp': datetime.utcnow(),
            # Missing required fields: locationId, temperature, humidity, etc.
        }

        with pytest.raises((ValueError, TypeError, KeyError)):
            WeatherData.from_dict(incomplete_data)

    @pytest.mark.asyncio
    async def test_interpolate_missing_weather_data_points(
        self,
        weather_service: WeatherService
    ):
        """Test interpolating missing data points in weather time series"""
        # This test should FAIL because interpolation doesn't exist yet
        sparse_weather_data = [
            WeatherData(
                id='1', timestamp=datetime(2025, 9, 14, 10, 0, 0),
                time=datetime(2025, 9, 14, 10, 0, 0), locationId='test',
                temperature=20.0, humidity=60.0, pressure=1013.0,
                windSpeed=5.0, cloudCover=10.0
            ),
            WeatherData(
                id='2', timestamp=datetime(2025, 9, 14, 12, 0, 0),  # 2 hour gap
                time=datetime(2025, 9, 14, 12, 0, 0), locationId='test',
                temperature=25.0, humidity=65.0, pressure=1012.0,
                windSpeed=7.0, cloudCover=15.0
            )
        ]

        interpolated = await weather_service._interpolate_weather_data(sparse_weather_data)

        # Should have data points for 11:00 AM filled in
        assert len(interpolated) > len(sparse_weather_data)

        # Find interpolated data point
        interpolated_point = next(
            (w for w in interpolated if w.timestamp.hour == 11), None
        )
        assert interpolated_point is not None
        assert 20.0 < interpolated_point.temperature < 25.0  # Interpolated between values

    def test_weather_data_field_name_mapping_for_prisma_compatibility(self):
        """Test field name mapping maintains Prisma schema compatibility"""
        # This test should pass as we're using exact Prisma field names
        weather_data = WeatherData(
            id='test-id',
            timestamp=datetime.utcnow(),
            time=datetime.utcnow(),
            locationId='test-location',  # camelCase as in Prisma
            temperature=25.0,
            humidity=60.0,
            pressure=1013.0,
            windSpeed=5.0,    # camelCase as in Prisma
            cloudCover=20.0   # camelCase as in Prisma
        )

        # Verify camelCase fields are preserved
        assert hasattr(weather_data, 'locationId')
        assert hasattr(weather_data, 'windSpeed')
        assert hasattr(weather_data, 'cloudCover')
        assert not hasattr(weather_data, 'location_id')  # snake_case should not exist
        assert not hasattr(weather_data, 'wind_speed')
        assert not hasattr(weather_data, 'cloud_cover')