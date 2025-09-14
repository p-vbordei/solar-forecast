"""Weather data model matching Prisma schema"""

from typing import Optional
from datetime import datetime
from dataclasses import dataclass


@dataclass
class WeatherData:
    """Weather data model matching Prisma WeatherData schema"""

    # Primary fields (matching Prisma exact naming)
    id: str
    timestamp: datetime
    time: datetime  # Legacy field name compatibility
    locationId: str

    # Basic weather metrics (required fields)
    temperature: float          # Celsius
    humidity: float            # Percentage
    pressure: float            # hPa
    windSpeed: float           # m/s (camelCase in DB)
    cloudCover: float          # Percentage (camelCase in DB)

    # Basic weather metrics (optional fields)
    windDirection: Optional[float] = None  # Degrees
    visibility: Optional[float] = None     # km
    precipitation: Optional[float] = None  # mm
    precipitationType: Optional[str] = None  # rain, snow, etc.

    # Solar radiation components (industry standard)
    ghi: Optional[float] = None           # Global Horizontal Irradiance W/m²
    dni: Optional[float] = None           # Direct Normal Irradiance W/m²
    dhi: Optional[float] = None           # Diffuse Horizontal Irradiance W/m²
    gti: Optional[float] = None           # Global Tilted Irradiance W/m² (POA)
    extraterrestrial: Optional[float] = None  # Extraterrestrial radiation W/m²

    # Solar position
    solarZenith: Optional[float] = None      # Degrees
    solarAzimuth: Optional[float] = None     # Degrees
    solarElevation: Optional[float] = None   # Degrees
    airMass: Optional[float] = None          # Air mass coefficient

    # Additional metrics
    dewPoint: Optional[float] = None         # Celsius
    uvIndex: Optional[float] = None          # UV Index
    apparentTemperature: Optional[float] = None  # Feels like temperature

    # Data metadata
    source: str = "open-meteo"              # Data source identifier
    dataQuality: str = "GOOD"               # Data quality flag
    isForecasted: bool = False              # Is this forecast or actual data
    forecastHorizon: Optional[int] = None   # Hours ahead for forecasts

    def to_dict(self) -> dict:
        """Convert to dictionary for database operations"""
        return {
            'id': self.id,
            'timestamp': self.timestamp,
            'time': self.time,
            'locationId': self.locationId,
            'temperature': self.temperature,
            'humidity': self.humidity,
            'pressure': self.pressure,
            'windSpeed': self.windSpeed,
            'windDirection': self.windDirection,
            'cloudCover': self.cloudCover,
            'visibility': self.visibility,
            'precipitation': self.precipitation,
            'precipitationType': self.precipitationType,
            'ghi': self.ghi,
            'dni': self.dni,
            'dhi': self.dhi,
            'gti': self.gti,
            'extraterrestrial': self.extraterrestrial,
            'solarZenith': self.solarZenith,
            'solarAzimuth': self.solarAzimuth,
            'solarElevation': self.solarElevation,
            'airMass': self.airMass,
            'dewPoint': self.dewPoint,
            'uvIndex': self.uvIndex,
            'apparentTemperature': self.apparentTemperature,
            'source': self.source,
            'dataQuality': self.dataQuality,
            'isForecasted': self.isForecasted,
            'forecastHorizon': self.forecastHorizon
        }

    @classmethod
    def from_dict(cls, data: dict) -> 'WeatherData':
        """Create WeatherData from dictionary (database row)"""
        return cls(
            id=data['id'],
            timestamp=data['timestamp'],
            time=data.get('time', data['timestamp']),  # Fallback to timestamp
            locationId=data['locationId'],
            temperature=data['temperature'],
            humidity=data['humidity'],
            pressure=data['pressure'],
            windSpeed=data['windSpeed'],
            windDirection=data.get('windDirection'),
            cloudCover=data['cloudCover'],
            visibility=data.get('visibility'),
            precipitation=data.get('precipitation'),
            precipitationType=data.get('precipitationType'),
            ghi=data.get('ghi'),
            dni=data.get('dni'),
            dhi=data.get('dhi'),
            gti=data.get('gti'),
            extraterrestrial=data.get('extraterrestrial'),
            solarZenith=data.get('solarZenith'),
            solarAzimuth=data.get('solarAzimuth'),
            solarElevation=data.get('solarElevation'),
            airMass=data.get('airMass'),
            dewPoint=data.get('dewPoint'),
            uvIndex=data.get('uvIndex'),
            apparentTemperature=data.get('apparentTemperature'),
            source=data.get('source', 'open-meteo'),
            dataQuality=data.get('dataQuality', 'GOOD'),
            isForecasted=data.get('isForecasted', False),
            forecastHorizon=data.get('forecastHorizon')
        )