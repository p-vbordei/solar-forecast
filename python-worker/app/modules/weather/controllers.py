"""Weather controller - HTTP endpoints for weather data"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from http import HTTPStatus
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.core.database import get_db
from .services import WeatherService

logger = logging.getLogger(__name__)

# Create router
router = APIRouter()


# Pydantic models for request/response
class WeatherStatusResponse(BaseModel):
    """Response model for weather status endpoint"""
    locationId: str
    hasRecentData: bool
    lastDataTimestamp: Optional[datetime] = None
    dataAge_minutes: Optional[float] = None
    isFresh: bool
    recordCount: int


class WeatherRefreshRequest(BaseModel):
    """Request model for weather refresh endpoint"""
    force: bool = Field(default=False, description="Force refresh even if data is fresh")


class WeatherRefreshResponse(BaseModel):
    """Response model for weather refresh endpoint"""
    success: bool
    locationId: str
    syncTriggered: bool
    message: str
    refreshedAt: datetime


class WeatherDataResponse(BaseModel):
    """Response model for current weather data"""
    locationId: str
    timestamp: datetime
    temperature: float
    humidity: float
    pressure: float
    windSpeed: float
    cloudCover: float
    ghi: Optional[float] = None
    dni: Optional[float] = None
    dhi: Optional[float] = None
    source: str
    dataQuality: str


@router.get("/current/{location_id}", response_model=WeatherDataResponse)
async def get_current_weather(
    location_id: str,
    max_age_minutes: int = 15,
    db: AsyncSession = Depends(get_db)
) -> WeatherDataResponse:
    """
    Get current weather data for a location

    Args:
        location_id: Location UUID string
        max_age_minutes: Maximum age in minutes for data to be considered current
        db: Database session

    Returns:
        Current weather data

    Raises:
        HTTPException: If location not found or no weather data available
    """
    try:
        service = WeatherService(db)

        # Get fresh weather data
        weather_data = await service.get_weather_with_freshness(
            location_id,
            max_age_minutes=max_age_minutes
        )

        if not weather_data:
            raise HTTPException(
                status_code=HTTPStatus.NOT_FOUND,
                detail=f"No weather data found for location {location_id}"
            )

        return WeatherDataResponse(
            locationId=weather_data.locationId,
            timestamp=weather_data.timestamp,
            temperature=weather_data.temperature,
            humidity=weather_data.humidity,
            pressure=weather_data.pressure,
            windSpeed=weather_data.windSpeed,
            cloudCover=weather_data.cloudCover,
            ghi=weather_data.ghi,
            dni=weather_data.dni,
            dhi=weather_data.dhi,
            source=weather_data.source,
            dataQuality=weather_data.dataQuality
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting current weather for location {location_id}: {e}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve current weather data"
        )


@router.post("/refresh/{location_id}", response_model=WeatherRefreshResponse)
async def refresh_weather_data(
    location_id: str,
    request: WeatherRefreshRequest = WeatherRefreshRequest(),
    db: AsyncSession = Depends(get_db)
) -> WeatherRefreshResponse:
    """
    Refresh weather data for a location by triggering sync with SvelteKit

    Args:
        location_id: Location UUID string
        request: Refresh request parameters
        db: Database session

    Returns:
        Refresh operation result
    """
    try:
        service = WeatherService(db)
        sync_triggered = False
        message = "No sync required"

        if request.force:
            # Force refresh regardless of data freshness
            logger.info(f"Force refreshing weather data for location {location_id}")
            success = await service._trigger_sync_and_wait(location_id)
            sync_triggered = True
            message = "Forced refresh completed" if success else "Forced refresh failed"
        else:
            # Check if refresh is needed
            is_fresh = await service.repository.check_data_freshness(location_id)

            if not is_fresh:
                logger.info(f"Weather data is stale, refreshing for location {location_id}")
                success = await service._trigger_sync_and_wait(location_id)
                sync_triggered = True
                message = "Refresh completed" if success else "Refresh failed"
            else:
                success = True
                message = "Data is already fresh"

        return WeatherRefreshResponse(
            success=success,
            locationId=location_id,
            syncTriggered=sync_triggered,
            message=message,
            refreshedAt=datetime.utcnow()
        )

    except Exception as e:
        logger.error(f"Error refreshing weather for location {location_id}: {e}")
        return WeatherRefreshResponse(
            success=False,
            locationId=location_id,
            syncTriggered=False,
            message=f"Refresh failed: {str(e)}",
            refreshedAt=datetime.utcnow()
        )


@router.get("/status/{location_id}", response_model=WeatherStatusResponse)
async def get_weather_status(
    location_id: str,
    db: AsyncSession = Depends(get_db)
) -> WeatherStatusResponse:
    """
    Get weather data status for a location

    Args:
        location_id: Location UUID string
        db: Database session

    Returns:
        Weather data status information
    """
    try:
        service = WeatherService(db)

        # Get latest weather data
        latest_weather = await service.repository.get_latest_weather(location_id)

        # Get recent data count
        recent_weather = await service.repository.get_recent_weather(location_id, hours=24)
        record_count = len(recent_weather)

        # Calculate freshness
        if latest_weather:
            data_age = datetime.utcnow() - latest_weather.timestamp
            data_age_minutes = data_age.total_seconds() / 60
            is_fresh = data_age_minutes <= 15  # Default freshness threshold
            has_recent_data = True
            last_timestamp = latest_weather.timestamp
        else:
            data_age_minutes = None
            is_fresh = False
            has_recent_data = False
            last_timestamp = None

        return WeatherStatusResponse(
            locationId=location_id,
            hasRecentData=has_recent_data,
            lastDataTimestamp=last_timestamp,
            dataAge_minutes=data_age_minutes,
            isFresh=is_fresh,
            recordCount=record_count
        )

    except Exception as e:
        logger.error(f"Error getting weather status for location {location_id}: {e}")
        # Return default status on error
        return WeatherStatusResponse(
            locationId=location_id,
            hasRecentData=False,
            lastDataTimestamp=None,
            dataAge_minutes=None,
            isFresh=False,
            recordCount=0
        )


# Health check endpoint for weather service
@router.get("/health")
async def weather_health_check() -> Dict[str, Any]:
    """
    Health check endpoint for weather service

    Returns:
        Health status information
    """
    try:
        from app.integrations.sveltekit import sveltekit_client

        # Check SvelteKit connectivity
        sveltekit_healthy = await sveltekit_client.health_check()

        return {
            "status": "healthy" if sveltekit_healthy else "degraded",
            "weather_service": "operational",
            "sveltekit_integration": "healthy" if sveltekit_healthy else "unhealthy",
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Weather health check failed: {e}")
        return {
            "status": "unhealthy",
            "weather_service": "error",
            "sveltekit_integration": "unknown",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }