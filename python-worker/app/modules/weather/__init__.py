"""Weather module"""

from fastapi import APIRouter

router = APIRouter()

@router.get("/forecast")
async def get_weather_forecast(latitude: float, longitude: float, days: int = 3):
    """Get weather forecast for location"""
    return {
        "latitude": latitude,
        "longitude": longitude,
        "days": days,
        "forecast": []
    }

weather_router = router