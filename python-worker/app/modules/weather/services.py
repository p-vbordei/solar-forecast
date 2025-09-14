"""Weather service - business logic layer"""

import asyncio
import logging
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession

from .repositories import WeatherRepository
from app.integrations.sveltekit import sveltekit_client
from app.models.weather import WeatherData
from app.core.config import settings

logger = logging.getLogger(__name__)


class WeatherService:
    """Weather data service with database-first approach and SvelteKit sync fallback"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repository = WeatherRepository(db)
        self.sveltekit_client = sveltekit_client

    async def get_forecast(
        self,
        latitude: float,
        longitude: float,
        days: int = 3
    ) -> List[Dict]:
        """
        Get weather forecast for location using database data

        Args:
            latitude: Location latitude (used to find location_id)
            longitude: Location longitude (used to find location_id)
            days: Number of days for forecast

        Returns:
            List of weather data dictionaries in legacy format
        """
        try:
            # Get location_id from coordinates (simplified - in production would query locations table)
            location_id = await self._get_location_id_from_coordinates(latitude, longitude)

            if not location_id:
                logger.error(f"No location found for coordinates {latitude}, {longitude}")
                raise ValueError(f"Location not found for coordinates {latitude}, {longitude}")

            # Get fresh weather data from database
            weather_data = await self.get_weather_with_freshness(
                location_id,
                max_age_minutes=settings.WEATHER_FRESHNESS_MINUTES
            )

            if not weather_data:
                logger.error(f"No weather data available for location {location_id}")
                raise ValueError(f"No weather data available for location {location_id}")

            # Get recent weather data for forecast period
            hours = days * 24
            recent_weather = await self.repository.get_recent_weather(location_id, hours)

            # Convert to legacy format for forecast compatibility
            return self._convert_to_legacy_format(recent_weather)

        except Exception as e:
            logger.error(f"Error in get_forecast: {e}")
            raise ValueError(f"Failed to get weather forecast: {str(e)}")

    async def get_weather_with_freshness(
        self,
        location_id: str,
        max_age_minutes: int = None
    ) -> Optional[WeatherData]:
        """
        Get weather data with freshness check and automatic sync

        Args:
            location_id: Location UUID string
            max_age_minutes: Maximum age for data to be considered fresh

        Returns:
            WeatherData object or None if no data available
        """
        if max_age_minutes is None:
            max_age_minutes = settings.WEATHER_FRESHNESS_MINUTES

        try:
            # Check if we have fresh data
            latest_weather = await self.repository.get_latest_weather(location_id)

            if self._is_weather_data_fresh(latest_weather, max_age_minutes):
                logger.debug(f"Using fresh weather data for location {location_id}")
                return latest_weather

            # Data is stale or missing, trigger sync
            logger.info(f"Weather data is stale for location {location_id}, triggering sync")
            await self._trigger_sync_and_wait(location_id)

            # Retry getting fresh data after sync
            latest_weather = await self.repository.get_latest_weather(location_id)

            if latest_weather:
                logger.info(f"Retrieved fresh weather data after sync for location {location_id}")
            else:
                logger.warning(f"No weather data available after sync for location {location_id}")

            return latest_weather

        except Exception as e:
            logger.error(f"Error in get_weather_with_freshness for location {location_id}: {e}")
            # Return stale data if sync fails
            return await self.repository.get_latest_weather(location_id)

    def _is_weather_data_fresh(
        self,
        weather_data: Optional[WeatherData],
        max_age_minutes: int
    ) -> bool:
        """
        Check if weather data is within freshness threshold

        Args:
            weather_data: WeatherData object or None
            max_age_minutes: Maximum age in minutes

        Returns:
            True if data is fresh, False otherwise
        """
        if not weather_data:
            return False

        now = datetime.utcnow()
        data_age = now - weather_data.timestamp
        max_age = timedelta(minutes=max_age_minutes)

        return data_age <= max_age

    async def _trigger_sync_and_wait(self, location_id: str) -> bool:
        """
        Trigger SvelteKit sync and wait for completion

        Args:
            location_id: Location UUID string

        Returns:
            True if sync completed, False otherwise
        """
        try:
            # Trigger sync
            sync_result = await self.sveltekit_client.trigger_weather_sync(location_id)

            if not sync_result.get("success", False):
                logger.warning(f"Sync trigger failed for location {location_id}: {sync_result}")
                return False

            # Wait for sync completion
            success = await self.sveltekit_client.wait_for_sync_completion(
                location_id,
                max_wait_seconds=settings.WEATHER_SYNC_TIMEOUT,
                check_interval=2
            )

            return success

        except Exception as e:
            logger.error(f"Error in sync and wait for location {location_id}: {e}")
            return False

    def _convert_to_legacy_format(self, weather_data_list: List[WeatherData]) -> List[Dict]:
        """
        Convert WeatherData objects to legacy format for forecast service compatibility

        Args:
            weather_data_list: List of WeatherData objects

        Returns:
            List of dictionaries in legacy format
        """
        legacy_data = []

        for i, weather in enumerate(weather_data_list):
            legacy_item = {
                "hour": i,
                "temperature": weather.temperature,
                "cloud_cover": weather.cloudCover,
                "wind_speed": weather.windSpeed,
                "humidity": weather.humidity,
                "pressure": weather.pressure,
                # Additional fields for improved forecasting
                "ghi": weather.ghi or 0,
                "dni": weather.dni or 0,
                "dhi": weather.dhi or 0,
                "solar_elevation": weather.solarElevation or 0,
                "timestamp": weather.timestamp.isoformat() if weather.timestamp else None
            }
            legacy_data.append(legacy_item)

        return legacy_data

    async def _get_location_id_from_coordinates(
        self,
        latitude: float,
        longitude: float
    ) -> Optional[str]:
        """
        Get location ID from coordinates (simplified implementation)

        In production, this would query the locations table to find
        the location ID that matches these coordinates

        Args:
            latitude: Latitude coordinate
            longitude: Longitude coordinate

        Returns:
            Location UUID string or None if not found
        """
        try:
            # Simplified query to get location ID from coordinates
            from sqlalchemy import text

            query = text("""
                SELECT id FROM "Location"
                WHERE ABS(latitude - :lat) < 0.01
                  AND ABS(longitude - :lng) < 0.01
                LIMIT 1
            """)

            result = await self.db.execute(query, {
                "lat": latitude,
                "lng": longitude
            })

            row = result.fetchone()
            return row.id if row else None

        except Exception as e:
            logger.error(f"Error finding location ID for coordinates {latitude}, {longitude}: {e}")
            return None


    async def _transform_for_forecast_generation(
        self,
        location_id: str,
        hours: int = 24
    ) -> List[Dict]:
        """
        Transform weather data specifically for forecast generation

        Args:
            location_id: Location UUID string
            hours: Number of hours of data to retrieve

        Returns:
            List of weather data dictionaries optimized for forecasting
        """
        weather_data = await self.repository.get_recent_weather(location_id, hours)
        return self._convert_to_legacy_format(weather_data)

    async def _interpolate_weather_data(self, weather_data: List[WeatherData]) -> List[WeatherData]:
        """
        Interpolate missing data points in weather time series

        Args:
            weather_data: List of WeatherData objects with potential gaps

        Returns:
            List of WeatherData objects with interpolated gaps filled
        """
        # Simplified interpolation - in production would use more sophisticated methods
        if len(weather_data) < 2:
            return weather_data

        interpolated_data = []

        for i in range(len(weather_data) - 1):
            current = weather_data[i]
            next_data = weather_data[i + 1]

            interpolated_data.append(current)

            # Check if there's a gap > 1 hour
            time_diff = next_data.timestamp - current.timestamp
            if time_diff > timedelta(hours=1.5):
                # Add interpolated point
                mid_time = current.timestamp + time_diff / 2
                interpolated_point = WeatherData(
                    id=f"interpolated-{current.id}-{next_data.id}",
                    timestamp=mid_time,
                    time=mid_time,
                    locationId=current.locationId,
                    temperature=(current.temperature + next_data.temperature) / 2,
                    humidity=(current.humidity + next_data.humidity) / 2,
                    pressure=(current.pressure + next_data.pressure) / 2,
                    windSpeed=(current.windSpeed + next_data.windSpeed) / 2,
                    cloudCover=(current.cloudCover + next_data.cloudCover) / 2,
                    source="interpolated"
                )
                interpolated_data.append(interpolated_point)

        # Add the last element
        if weather_data:
            interpolated_data.append(weather_data[-1])

        return interpolated_data