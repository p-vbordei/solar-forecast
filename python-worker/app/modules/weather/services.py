"""Weather service for forecast data"""

from typing import List, Dict
from sqlalchemy.ext.asyncio import AsyncSession


class WeatherService:
    """Weather data service"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_forecast(
        self, 
        latitude: float, 
        longitude: float, 
        days: int = 3
    ) -> List[Dict]:
        """Get weather forecast for location"""
        # Mock weather data for now
        weather_data = []
        for hour in range(days * 24):
            weather_data.append({
                "hour": hour,
                "temperature": 15 + (hour % 24) / 2,
                "cloud_cover": 20 + (hour % 12) * 5,
                "wind_speed": 5 + (hour % 6),
                "humidity": 60 + (hour % 8) * 2,
                "pressure": 1013
            })
        return weather_data