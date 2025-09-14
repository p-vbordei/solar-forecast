"""Weather repository - data access layer"""

from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import logging

from app.models.weather import WeatherData

logger = logging.getLogger(__name__)


class WeatherRepository:
    """Repository for weather data access using raw SQL for Prisma compatibility"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_recent_weather(
        self,
        location_id: str,
        hours: int = 24
    ) -> List[WeatherData]:
        """
        Get recent weather data for a location within specified hours

        Args:
            location_id: Location UUID string
            hours: Number of hours back to fetch data

        Returns:
            List of WeatherData objects
        """
        try:
            query = text(f"""
                SELECT
                    id, timestamp, "locationId",
                    temperature, humidity,
                    "windSpeed", "cloudCover",
                    ghi, dni, dhi,
                    source, "dataQuality"
                FROM weather_data
                WHERE "locationId" = :location_id
                    AND timestamp >= NOW() - INTERVAL '{hours} hours'
                ORDER BY timestamp DESC
                LIMIT 1000
            """)

            result = await self.db.execute(query, {
                "location_id": location_id
            })

            rows = result.fetchall()

            weather_data_list = []
            for row in rows:
                weather_data = self._row_to_weather_data(row)
                weather_data_list.append(weather_data)

            logger.info(f"Retrieved {len(weather_data_list)} weather records for location {location_id}")
            return weather_data_list

        except Exception as e:
            logger.error(f"Error retrieving recent weather for location {location_id}: {e}")
            return []

    async def get_weather_range(
        self,
        location_id: str,
        start_time: datetime,
        end_time: datetime
    ) -> List[WeatherData]:
        """
        Get weather data for a location within specified time range

        Args:
            location_id: Location UUID string
            start_time: Start of time range
            end_time: End of time range

        Returns:
            List of WeatherData objects
        """
        try:
            query = text("""
                SELECT
                    id, timestamp, "locationId",
                    temperature, humidity,
                    "windSpeed", "cloudCover",
                    ghi, dni, dhi,
                    source, "dataQuality"
                FROM weather_data
                WHERE "locationId" = :location_id
                    AND timestamp >= :start_time
                    AND timestamp <= :end_time
                ORDER BY timestamp DESC
                LIMIT 2000
            """)

            result = await self.db.execute(query, {
                "location_id": location_id,
                "start_time": start_time,
                "end_time": end_time
            })

            rows = result.fetchall()

            weather_data_list = []
            for row in rows:
                weather_data = self._row_to_weather_data(row)
                weather_data_list.append(weather_data)

            logger.info(f"Retrieved {len(weather_data_list)} weather records for location {location_id} from {start_time} to {end_time}")
            return weather_data_list

        except Exception as e:
            logger.error(f"Error retrieving weather range for location {location_id}: {e}")
            return []

    async def get_latest_weather(self, location_id: str) -> Optional[WeatherData]:
        """
        Get the most recent weather data for a location

        Args:
            location_id: Location UUID string

        Returns:
            Most recent WeatherData object or None if no data exists
        """
        try:
            query = text("""
                SELECT
                    id, timestamp, "locationId",
                    temperature, humidity,
                    "windSpeed", "cloudCover",
                    ghi, dni, dhi,
                    source, "dataQuality"
                FROM weather_data
                WHERE "locationId" = :location_id
                ORDER BY timestamp DESC
                LIMIT 1
            """)

            result = await self.db.execute(query, {"location_id": location_id})
            row = result.fetchone()

            if row:
                weather_data = self._row_to_weather_data(row)
                logger.debug(f"Retrieved latest weather for location {location_id} at {weather_data.timestamp}")
                return weather_data
            else:
                logger.info(f"No weather data found for location {location_id}")
                return None

        except Exception as e:
            logger.error(f"Error retrieving latest weather for location {location_id}: {e}")
            return None

    async def check_data_freshness(
        self,
        location_id: str,
        max_age_minutes: int = 15
    ) -> bool:
        """
        Check if the latest weather data is within the freshness threshold

        Args:
            location_id: Location UUID string
            max_age_minutes: Maximum age in minutes for data to be considered fresh

        Returns:
            True if data is fresh, False otherwise
        """
        try:
            latest_weather = await self.get_latest_weather(location_id)

            if not latest_weather:
                logger.debug(f"No weather data found for location {location_id} - not fresh")
                return False

            # Calculate age of the data
            now = datetime.utcnow()
            data_age = now - latest_weather.timestamp
            max_age = timedelta(minutes=max_age_minutes)

            is_fresh = data_age <= max_age

            logger.debug(f"Weather data for location {location_id} is {data_age.total_seconds()/60:.1f} minutes old - {'fresh' if is_fresh else 'stale'}")
            return is_fresh

        except Exception as e:
            logger.error(f"Error checking data freshness for location {location_id}: {e}")
            return False

    def _row_to_weather_data(self, row) -> WeatherData:
        """
        Convert database row to WeatherData object

        Args:
            row: Database row from SQLAlchemy result

        Returns:
            WeatherData object
        """
        return WeatherData(
            id=row.id,
            timestamp=row.timestamp,
            time=row.timestamp,  # Use timestamp as time since time column doesn't exist
            locationId=row.locationId,
            temperature=float(row.temperature),
            humidity=float(row.humidity),
            pressure=1013.25,  # Default pressure - not in Prisma schema
            windSpeed=float(row.windSpeed),
            cloudCover=float(row.cloudCover),
            windDirection=0.0,  # Default - not in Prisma schema
            visibility=10.0,  # Default - not in Prisma schema
            precipitation=0.0,  # Default - not in Prisma schema
            precipitationType=None,  # Not in Prisma schema
            ghi=float(row.ghi) if row.ghi is not None else 0.0,
            dni=float(row.dni) if row.dni is not None else 0.0,
            dhi=float(row.dhi) if row.dhi is not None else 0.0,
            gti=None,  # Not in Prisma schema
            extraterrestrial=None,  # Not in Prisma schema
            solarZenith=None,  # Not in Prisma schema
            solarAzimuth=None,  # Not in Prisma schema
            solarElevation=None,  # Not in Prisma schema
            airMass=None,  # Not in Prisma schema
            # Fields not in database - set to None
            dewPoint=None,
            uvIndex=None,
            apparentTemperature=None,
            source=row.source or "open-meteo",
            dataQuality=str(row.dataQuality) if row.dataQuality is not None else "GOOD",
            isForecasted=False,
            forecastHorizon=None
        )