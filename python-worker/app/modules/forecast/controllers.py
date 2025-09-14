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

router = APIRouter(
    tags=["Solar Forecasting"],
    responses={404: {"description": "Not found"}}
)


@router.post(
    "/generate",
    response_model=ForecastTaskResponse,
    summary="Generate Solar Power Forecast",
    description="""Generate a solar power forecast for a specific location using ML models and physics calculations.

    This endpoint:
    - Uses real CatBoost ML models with quantile regression for uncertainty
    - Integrates PVLIB physics calculations for solar modeling
    - Processes weather data from TimescaleDB
    - Returns a task ID for async tracking
    - Saves forecasts to database with confidence bands

    The forecast generation runs asynchronously in the background.
    Use the task status endpoint to track progress.
    """,
    responses={
        200: {
            "description": "Forecast task successfully queued",
            "content": {
                "application/json": {
                    "example": {
                        "task_id": "550e8400-e29b-41d4-a716-446655440000",
                        "status": "queued",
                        "location_id": "1",
                        "progress": 0,
                        "estimated_time_seconds": 30
                    }
                }
            }
        },
        404: {"description": "Location not found"},
        500: {"description": "Internal server error"}
    }
)
async def generate_forecast(
    request: ForecastRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
) -> ForecastTaskResponse:
    """
    Generate forecast for a location using real ML models and physics calculations.
    Returns task ID for tracking progress.
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


@router.get(
    "/task/{task_id}",
    response_model=ForecastTaskResponse,
    summary="Get Forecast Task Status",
    description="""Check the status of an asynchronous forecast generation task.

    Returns current progress, status, and results when completed.

    Status values:
    - `queued`: Task is waiting to be processed
    - `processing`: Task is currently running (check progress %)
    - `completed`: Task finished successfully (results available)
    - `failed`: Task failed (error details available)
    """,
    responses={
        200: {
            "description": "Task status retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "task_id": "550e8400-e29b-41d4-a716-446655440000",
                        "status": "completed",
                        "location_id": "1",
                        "progress": 100,
                        "result": {
                            "forecast_count": 48,
                            "start_time": "2025-09-14T12:00:00",
                            "end_time": "2025-09-16T12:00:00",
                            "model_type": "ENSEMBLE",
                            "location_name": "Bucharest Solar Farm",
                            "capacity_mw": 1.0
                        }
                    }
                }
            }
        },
        404: {"description": "Task not found"}
    }
)
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


@router.get(
    "/location/{location_id}",
    response_model=List[ForecastResponse],
    summary="Get Location Forecasts",
    description="""Retrieve solar power forecasts for a specific location.

    Returns detailed forecast data including:
    - Power output predictions (MW)
    - Confidence bands (P10, P25, P75, P90)
    - Weather parameters used
    - Model type and version
    - Quality scores

    All data is retrieved from TimescaleDB with optimized queries.
    Default time range is next 48 hours if not specified.
    """,
    responses={
        200: {
            "description": "Forecasts retrieved successfully",
            "content": {
                "application/json": {
                    "example": [{
                        "time": "2025-09-14T12:00:00",
                        "location_id": "1",
                        "power_output_mw": 0.85,
                        "capacity_factor": 0.85,
                        "power_mw_q10": 0.75,
                        "power_mw_q25": 0.80,
                        "power_mw_q75": 0.90,
                        "power_mw_q90": 0.95,
                        "model_type": "ENSEMBLE",
                        "model_version": "2.0",
                        "temperature": 25.0,
                        "ghi": 850.0,
                        "cloud_cover": 10.0,
                        "quality_score": 0.95
                    }]
                }
            }
        },
        404: {"description": "Location not found"},
        500: {"description": "Error retrieving forecasts"}
    }
)
async def get_location_forecasts(
    location_id: str,  # String UUID for database consistency
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    model_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
) -> List[ForecastResponse]:
    """Get forecasts for a specific location from TimescaleDB"""
    service = ForecastService(db)

    try:
        # Validate location exists in database
        location_valid = await service.validate_location(location_id)
        if not location_valid:
            raise HTTPException(status_code=404, detail="Location not found")

        # Default time range if not specified (UTC timestamps)
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

        # Validate capacity constraints in response
        for forecast in forecasts:
            power_mw = forecast.get("power_output_mw", 0)
            # Basic capacity validation (should be done at generation time)
            if power_mw < 0:
                raise HTTPException(
                    status_code=500,
                    detail="Invalid forecast data: negative power"
                )

        return [ForecastResponse.from_orm(f) for f in forecasts]

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error retrieving forecasts")


@router.get(
    "/accuracy/{location_id}",
    response_model=ForecastAccuracyResponse,
    summary="Get Forecast Accuracy Metrics",
    description="""Calculate forecast accuracy by comparing predictions with actual production.

    Metrics calculated:
    - **Accuracy Percentage**: Overall accuracy score (100 - MAPE)
    - **MAPE**: Mean Absolute Percentage Error
    - **RMSE**: Root Mean Square Error (MW)
    - **Sample Size**: Number of data points analyzed

    Default analysis period is 7 days. Requires both forecast and production data.
    """,
    responses={
        200: {
            "description": "Accuracy metrics calculated successfully",
            "content": {
                "application/json": {
                    "example": {
                        "location_id": "1",
                        "accuracy_percentage": 94.5,
                        "mape": 5.5,
                        "rmse": 2.3,
                        "sample_size": 168,
                        "period_days": 7,
                        "model_type": "ENSEMBLE"
                    }
                }
            }
        },
        404: {"description": "No forecast data available for accuracy calculation"}
    }
)
async def get_forecast_accuracy(
    location_id: str,
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


@router.post(
    "/batch",
    response_model=List[ForecastTaskResponse],
    summary="Generate Batch Forecasts",
    description="""Generate forecasts for multiple locations simultaneously.

    Efficient batch processing for multiple solar farms:
    - Processes all locations in parallel
    - Uses same horizon period for all locations
    - Returns individual task IDs for tracking
    - Handles failures gracefully per location

    Maximum recommended batch size: 10 locations
    """,
    responses={
        200: {
            "description": "Batch forecast tasks queued successfully",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "task_id": "task-001",
                            "status": "queued",
                            "location_id": "1",
                            "estimated_time_seconds": 30
                        },
                        {
                            "task_id": "task-002",
                            "status": "queued",
                            "location_id": "2",
                            "estimated_time_seconds": 30
                        }
                    ]
                }
            }
        }
    }
)
async def generate_batch_forecasts(
    location_ids: List[str],  # String UUIDs
    background_tasks: BackgroundTasks,
    horizon_hours: int = 48,
    db: AsyncSession = Depends(get_db)
) -> List[ForecastTaskResponse]:
    """Generate forecasts for multiple locations in parallel"""
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


@router.delete(
    "/location/{location_id}",
    summary="Delete Old Forecasts",
    description="""Delete historical forecasts for a location.

    Cleanup old forecast data to manage storage:
    - Default: Deletes forecasts older than 30 days
    - Custom date: Specify exact cutoff date
    - Maintains data retention compliance
    - Optimizes TimescaleDB storage

    ⚠️ This operation is irreversible.
    """,
    responses={
        200: {
            "description": "Forecasts deleted successfully",
            "content": {
                "application/json": {
                    "example": {
                        "message": "Deleted 1680 forecast records",
                        "location_id": "1"
                    }
                }
            }
        }
    }
)
async def delete_location_forecasts(
    location_id: str,
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


@router.get(
    "/training-data/{location_id}",
    summary="Get Historical Production Data for ML Training",
    description="""Extract historical production data for ML model training.

    Returns historical production data optimized for ML training:
    - Power production values (MW) - primary training target
    - Capacity factor for performance normalization
    - System availability metrics
    - Timestamp-indexed data ready for pandas DataFrame

    This endpoint is specifically designed for ML model training workflows
    and returns data in the format expected by the CatBoost training pipeline.
    """,
    responses={
        200: {
            "description": "Historical production data retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "location_id": "1",
                        "data_points": 8760,
                        "date_range": {
                            "start": "2023-01-01T00:00:00",
                            "end": "2023-12-31T23:00:00"
                        },
                        "records": [
                            {
                                "timestamp": "2023-01-01T00:00:00",
                                "power_mw": 0.0,
                                "capacity_factor": 0.0,
                                "availability": 100.0,
                                "data_quality": "GOOD"
                            }
                        ]
                    }
                }
            }
        },
        404: {"description": "Location not found"},
        400: {"description": "Invalid date range"}
    }
)
async def get_training_data(
    location_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Extract historical production data for ML model training"""
    service = ForecastService(db)

    # Default to last year of data if no dates specified
    if not end_date:
        end_time = datetime.utcnow()
    else:
        end_time = datetime.fromisoformat(end_date.replace('Z', '+00:00'))

    if not start_date:
        start_time = end_time - timedelta(days=365)  # Last year
    else:
        start_time = datetime.fromisoformat(start_date.replace('Z', '+00:00'))

    # Validate location exists
    if not await service.validate_location(location_id):
        raise HTTPException(status_code=404, detail="Location not found")

    # Get historical production data using optimized schema
    production_data = await service.repo.get_production_range(
        location_id=location_id,
        start_time=start_time,
        end_time=end_time
    )

    if not production_data:
        raise HTTPException(
            status_code=404,
            detail=f"No production data found for location {location_id} in specified date range"
        )

    return {
        "location_id": location_id,
        "data_points": len(production_data),
        "date_range": {
            "start": start_time.isoformat(),
            "end": end_time.isoformat()
        },
        "records": [
            {
                "timestamp": record["time"].isoformat(),
                "power_mw": record["power_output_mw"],
                "capacity_factor": record.get("capacity_factor"),
                "availability": record.get("availability"),
                "data_quality": "GOOD"  # From optimized schema
            }
            for record in production_data
        ]
    }