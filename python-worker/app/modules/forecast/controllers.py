"""Forecast API controllers - handles HTTP requests"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime, timedelta

from app.core.database import get_db
from .services import ForecastService
from .models_api import (
    ForecastRequest,
    ForecastResponse,
    ForecastTaskResponse,
    ForecastAccuracyResponse
)

router = APIRouter()


@router.post("/generate", response_model=ForecastTaskResponse)
async def generate_forecast(
    request: ForecastRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
) -> ForecastTaskResponse:
    """
    Generate forecast for a location
    Returns task ID for tracking progress
    """
    service = ForecastService(db)
    
    try:
        # Validate location exists
        location_valid = await service.validate_location(request.location_id)
        if not location_valid:
            raise HTTPException(status_code=404, detail="Location not found")
        
        # Queue forecast generation task
        task_id = await service.queue_forecast_generation(
            location_id=request.location_id,
            horizon_hours=request.horizon_hours,
            model_type=request.model_type
        )
        
        # Add background task for async processing
        background_tasks.add_task(
            service.process_forecast_task,
            task_id=task_id
        )
        
        return ForecastTaskResponse(
            task_id=task_id,
            status="queued",
            location_id=request.location_id,
            estimated_time_seconds=30
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/task/{task_id}", response_model=ForecastTaskResponse)
async def get_forecast_task_status(
    task_id: str,
    db: AsyncSession = Depends(get_db)
) -> ForecastTaskResponse:
    """Get status of forecast generation task"""
    service = ForecastService(db)
    
    task_status = await service.get_task_status(task_id)
    
    if not task_status:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return task_status


@router.get("/location/{location_id}", response_model=List[ForecastResponse])
async def get_location_forecasts(
    location_id: int,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    model_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
) -> List[ForecastResponse]:
    """Get forecasts for a specific location"""
    service = ForecastService(db)
    
    # Default time range if not specified
    if not start_time:
        start_time = datetime.utcnow()
    if not end_time:
        end_time = start_time + timedelta(hours=48)
    
    forecasts = await service.get_forecasts(
        location_id=location_id,
        start_time=start_time,
        end_time=end_time,
        model_type=model_type
    )
    
    return [ForecastResponse.from_orm(f) for f in forecasts]


@router.get("/accuracy/{location_id}", response_model=ForecastAccuracyResponse)
async def get_forecast_accuracy(
    location_id: int,
    days: int = 7,
    db: AsyncSession = Depends(get_db)
) -> ForecastAccuracyResponse:
    """Get forecast accuracy metrics for a location"""
    service = ForecastService(db)
    
    accuracy = await service.calculate_accuracy(
        location_id=location_id,
        days=days
    )
    
    if not accuracy:
        raise HTTPException(
            status_code=404,
            detail="No forecast data available for accuracy calculation"
        )
    
    return accuracy


@router.post("/batch", response_model=List[ForecastTaskResponse])
async def generate_batch_forecasts(
    location_ids: List[int],
    background_tasks: BackgroundTasks,
    horizon_hours: int = 48,
    db: AsyncSession = Depends(get_db)
) -> List[ForecastTaskResponse]:
    """Generate forecasts for multiple locations"""
    service = ForecastService(db)
    
    tasks = []
    for location_id in location_ids:
        try:
            task_id = await service.queue_forecast_generation(
                location_id=location_id,
                horizon_hours=horizon_hours
            )
            
            background_tasks.add_task(
                service.process_forecast_task,
                task_id=task_id
            )
            
            tasks.append(ForecastTaskResponse(
                task_id=task_id,
                status="queued",
                location_id=location_id,
                estimated_time_seconds=30
            ))
        except Exception as e:
            tasks.append(ForecastTaskResponse(
                task_id="",
                status="failed",
                location_id=location_id,
                error=str(e)
            ))
    
    return tasks


@router.delete("/location/{location_id}")
async def delete_location_forecasts(
    location_id: int,
    before_date: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Delete old forecasts for a location"""
    service = ForecastService(db)
    
    deleted_count = await service.delete_old_forecasts(
        location_id=location_id,
        before_date=before_date or datetime.utcnow() - timedelta(days=30)
    )
    
    return {
        "message": f"Deleted {deleted_count} forecast records",
        "location_id": location_id
    }