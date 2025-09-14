"""Pydantic models for forecast API"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class ForecastRequest(BaseModel):
    """Request model for forecast generation (database-driven)"""
    location_id: str = Field(..., description="Location UUID")
    horizon_hours: int = Field(48, description="Forecast horizon in hours", ge=1, le=168)
    model_type: str = Field("ML_ENSEMBLE", description="Model type: ML_ENSEMBLE, PHYSICS, HYBRID")

    class Config:
        json_schema_extra = {
            "example": {
                "location_id": "1",
                "horizon_hours": 48,
                "model_type": "ML_ENSEMBLE"
            }
        }


class ForecastResponse(BaseModel):
    """Response model for forecast data (with confidence bands)"""
    time: datetime
    location_id: str  # String UUID
    power_output_mw: float = Field(..., description="Forecasted power output in MW")
    energy_mwh: Optional[float] = Field(None, description="Forecasted energy in MWh")
    capacity_factor: Optional[float] = Field(None, description="Capacity factor (0-1)")

    # Confidence bands from CatBoost quantile regression
    power_mw_q10: Optional[float] = Field(None, description="10th percentile (MW)")
    power_mw_q25: Optional[float] = Field(None, description="25th percentile (MW)")
    power_mw_q75: Optional[float] = Field(None, description="75th percentile (MW)")
    power_mw_q90: Optional[float] = Field(None, description="90th percentile (MW)")

    model_type: str
    model_version: Optional[str] = None
    horizon_minutes: Optional[int] = None  # Changed from hours to minutes

    # Weather parameters used in forecast
    temperature: Optional[float] = None
    ghi: Optional[float] = Field(None, description="Global Horizontal Irradiance (W/m²)")
    dni: Optional[float] = Field(None, description="Direct Normal Irradiance (W/m²)")
    cloud_cover: Optional[float] = None
    wind_speed: Optional[float] = None
    quality_score: Optional[float] = Field(None, description="Forecast quality (0-1)")

    class Config:
        from_attributes = True


class ForecastTaskResponse(BaseModel):
    """Response model for forecast task status"""
    task_id: str
    status: str = Field(..., description="Task status: queued, processing, completed, failed")
    location_id: str  # String UUID
    progress: Optional[int] = Field(0, description="Progress percentage (0-100)")
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    estimated_time_seconds: Optional[int] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "task_id": "550e8400-e29b-41d4-a716-446655440000",
                "status": "processing",
                "location_id": 1,
                "progress": 45,
                "estimated_time_seconds": 15
            }
        }


class ForecastAccuracyResponse(BaseModel):
    """Response model for forecast accuracy metrics"""
    location_id: int
    accuracy_percentage: float = Field(..., description="Overall accuracy percentage")
    mape: float = Field(..., description="Mean Absolute Percentage Error")
    rmse: float = Field(..., description="Root Mean Square Error")
    sample_size: int = Field(..., description="Number of data points analyzed")
    period_days: int = Field(..., description="Analysis period in days")
    model_type: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "location_id": 1,
                "accuracy_percentage": 94.5,
                "mape": 5.5,
                "rmse": 2.3,
                "sample_size": 168,
                "period_days": 7,
                "model_type": "ML"
            }
        }