"""Pydantic models for forecast API"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class ForecastRequest(BaseModel):
    """Request model for forecast generation"""
    location_id: int = Field(..., description="Location ID")
    horizon_hours: int = Field(48, description="Forecast horizon in hours", ge=1, le=168)
    model_type: str = Field("ML", description="Model type: ML, PHYSICAL, HYBRID, ENSEMBLE")
    
    class Config:
        json_schema_extra = {
            "example": {
                "location_id": 1,
                "horizon_hours": 48,
                "model_type": "ML"
            }
        }


class ForecastResponse(BaseModel):
    """Response model for forecast data"""
    time: datetime
    location_id: int
    power_output_mw: float = Field(..., description="Forecasted power output in MW")
    energy_mwh: Optional[float] = Field(None, description="Forecasted energy in MWh")
    confidence: Optional[float] = Field(None, description="Confidence percentage (0-100)")
    model_type: str
    model_version: Optional[str] = None
    horizon_hours: Optional[int] = None
    temperature: Optional[float] = None
    irradiance: Optional[float] = None
    cloud_cover: Optional[float] = None
    wind_speed: Optional[float] = None
    
    class Config:
        from_attributes = True


class ForecastTaskResponse(BaseModel):
    """Response model for forecast task status"""
    task_id: str
    status: str = Field(..., description="Task status: queued, processing, completed, failed")
    location_id: int
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