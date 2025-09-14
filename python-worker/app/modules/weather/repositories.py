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
            query = text("""
                SELECT
                    id, timestamp, time, "locationId",
                    temperature, humidity, pressure,
                    "windSpeed", "windDirection", "cloudCover",
                    visibility, precipitation, "precipitationType",
                    ghi, dni, dhi, gti, extraterrestrial,
                    "solarZenith", "solarAzimuth", "solarElevation", "airMass",
                    "dewPoint", "uvIndex", "apparentTemperature",
                    source, "dataQuality", "isForecasted", "forecastHorizon"
                FROM "WeatherData"
                WHERE "locationId" = :location_id
                    AND timestamp >= NOW() - INTERVAL :hours HOUR
                ORDER BY timestamp DESC
                LIMIT 1000
            """)

            result = await self.db.execute(query, {
                "location_id": location_id,
                "hours": f"{hours} hours"
            })

            rows = result.fetchall()

            weather_data_list = []
            for row in rows:
                weather_data = WeatherData(
                    id=row.id,
                    timestamp=row.timestamp,
                    time=row.time or row.timestamp,  # Fallback to timestamp if time is None
                    locationId=row.locationId,
                    temperature=float(row.temperature),
                    humidity=float(row.humidity),
                    pressure=float(row.pressure),
                    windSpeed=float(row.windSpeed),
                    windDirection=float(row.windDirection) if row.windDirection is not None else None,
                    cloudCover=float(row.cloudCover),
                    visibility=float(row.visibility) if row.visibility is not None else None,
                    precipitation=float(row.precipitation) if row.precipitation is not None else None,
                    precipitationType=row.precipitationType,
                    ghi=float(row.ghi) if row.ghi is not None else None,
                    dni=float(row.dni) if row.dni is not None else None,
                    dhi=float(row.dhi) if row.dhi is not None else None,
                    gti=float(row.gti) if row.gti is not None else None,
                    extraterrestrial=float(row.extraterrestrial) if row.extraterrestrial is not None else None,
                    solarZenith=float(row.solarZenith) if row.solarZenith is not None else None,
                    solarAzimuth=float(row.solarAzimuth) if row.solarAzimuth is not None else None,
                    solarElevation=float(row.solarElevation) if row.solarElevation is not None else None,
                    airMass=float(row.airMass) if row.airMass is not None else None,
                    dewPoint=float(row.dewPoint) if row.dewPoint is not None else None,
                    uvIndex=float(row.uvIndex) if row.uvIndex is not None else None,
                    apparentTemperature=float(row.apparentTemperature) if row.apparentTemperature is not None else None,
                    source=row.source or "open-meteo",
                    dataQuality=row.dataQuality or "GOOD",
                    isForecasted=bool(row.isForecasted) if row.isForecasted is not None else False,
                    forecastHorizon=int(row.forecastHorizon) if row.forecastHorizon is not None else None
                )
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
                    id, timestamp, time, "locationId",
                    temperature, humidity, pressure,
                    "windSpeed", "windDirection", "cloudCover",
                    visibility, precipitation, "precipitationType",
                    ghi, dni, dhi, gti, extraterrestrial,
                    "solarZenith", "solarAzimuth", "solarElevation", "airMass",
                    "dewPoint", "uvIndex", "apparentTemperature",
                    source, "dataQuality", "isForecasted", "forecastHorizon"
                FROM "WeatherData"
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
                    id, timestamp, time, "locationId",
                    temperature, humidity, pressure,
                    "windSpeed", "windDirection", "cloudCover",
                    visibility, precipitation, "precipitationType",
                    ghi, dni, dhi, gti, extraterrestrial,
                    "solarZenith", "solarAzimuth", "solarElevation", "airMass",
                    "dewPoint", "uvIndex", "apparentTemperature",
                    source, "dataQuality", "isForecasted", "forecastHorizon"
                FROM "WeatherData"
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
            time=row.time or row.timestamp,
            locationId=row.locationId,
            temperature=float(row.temperature),
            humidity=float(row.humidity),
            pressure=float(row.pressure),
            windSpeed=float(row.windSpeed),
            windDirection=float(row.windDirection) if row.windDirection is not None else None,
            cloudCover=float(row.cloudCover),
            visibility=float(row.visibility) if row.visibility is not None else None,
            precipitation=float(row.precipitation) if row.precipitation is not None else None,
            precipitationType=row.precipitationType,
            ghi=float(row.ghi) if row.ghi is not None else None,
            dni=float(row.dni) if row.dni is not None else None,
            dhi=float(row.dhi) if row.dhi is not None else None,
            gti=float(row.gti) if row.gti is not None else None,
            extraterrestrial=float(row.extraterrestrial) if row.extraterrestrial is not None else None,
            solarZenith=float(row.solarZenith) if row.solarZenith is not None else None,
            solarAzimuth=float(row.solarAzimuth) if row.solarAzimuth is not None else None,
            solarElevation=float(row.solarElevation) if row.solarElevation is not None else None,
            airMass=float(row.airMass) if row.airMass is not None else None,
            dewPoint=float(row.dewPoint) if row.dewPoint is not None else None,
            uvIndex=float(row.uvIndex) if row.uvIndex is not None else None,
            apparentTemperature=float(row.apparentTemperature) if row.apparentTemperature is not None else None,
            source=row.source or "open-meteo",
            dataQuality=row.dataQuality or "GOOD",
            isForecasted=bool(row.isForecasted) if row.isForecasted is not None else False,
            forecastHorizon=int(row.forecastHorizon) if row.forecastHorizon is not None else None
        )