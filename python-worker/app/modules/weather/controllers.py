"""Weather API controllers"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any
from datetime import datetime

from app.core.database import get_db
from .services import WeatherService

router = APIRouter()

@router.get("/current/{location_id}")
async def get_current_weather(
    location_id: int,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get current weather for a location"""
    service = WeatherService(db)
    
    try:
        weather = await service.get_current_weather(location_id)
        return weather
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Weather service unavailable")

@router.get("/forecast/{location_id}")
async def get_weather_forecast(
    location_id: int,
    days: int = 7,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get weather forecast for a location"""
    service = WeatherService(db)
    
    try:
        forecast = await service.get_forecast(location_id, days)
        return forecast
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Weather service unavailable")