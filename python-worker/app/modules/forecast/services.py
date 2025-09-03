"""Forecast service - business logic layer"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
import numpy as np
import uuid
import asyncio

from .repositories import ForecastRepository
from .models_api import ForecastTaskResponse, ForecastAccuracyResponse
from app.modules.ml_models.services import MLModelService
from app.modules.weather.services import WeatherService


class ForecastService:
    """Service layer for forecast business logic"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ForecastRepository(db)
        self.ml_service = MLModelService(db)
        self.weather_service = WeatherService(db)
        
        # In-memory task tracking (should use Redis in production)
        self.tasks: Dict[str, Dict] = {}
    
    async def validate_location(self, location_id: int) -> bool:
        """Validate if location exists and is active"""
        location = await self.repo.get_location(location_id)
        return location is not None and location.get("status") == "ACTIVE"
    
    async def queue_forecast_generation(
        self,
        location_id: int,
        horizon_hours: int = 48,
        model_type: str = "ML"
    ) -> str:
        """Queue a forecast generation task"""
        task_id = str(uuid.uuid4())
        
        self.tasks[task_id] = {
            "id": task_id,
            "status": "queued",
            "location_id": location_id,
            "horizon_hours": horizon_hours,
            "model_type": model_type,
            "created_at": datetime.utcnow(),
            "progress": 0,
            "result": None,
            "error": None
        }
        
        return task_id
    
    async def process_forecast_task(self, task_id: str) -> None:
        """Process forecast generation task (async background)"""
        if task_id not in self.tasks:
            return
        
        task = self.tasks[task_id]
        
        try:
            # Update status
            task["status"] = "processing"
            task["progress"] = 10
            
            # Get location data
            location = await self.repo.get_location(task["location_id"])
            if not location:
                raise ValueError("Location not found")
            
            task["progress"] = 20
            
            # Get weather forecast
            weather_data = await self.weather_service.get_forecast(
                latitude=location["latitude"],
                longitude=location["longitude"],
                days=max(1, task["horizon_hours"] // 24)
            )
            
            task["progress"] = 40
            
            # Load ML model
            model = await self.ml_service.get_model(task["model_type"])
            
            task["progress"] = 50
            
            # Generate forecasts
            forecasts = await self._generate_forecasts(
                location=location,
                weather_data=weather_data,
                model=model,
                horizon_hours=task["horizon_hours"]
            )
            
            task["progress"] = 80
            
            # Save forecasts to database
            saved_count = await self.repo.save_forecasts(forecasts)
            
            task["progress"] = 100
            task["status"] = "completed"
            task["result"] = {
                "forecast_count": saved_count,
                "start_time": forecasts[0]["time"] if forecasts else None,
                "end_time": forecasts[-1]["time"] if forecasts else None
            }
            
        except Exception as e:
            task["status"] = "failed"
            task["error"] = str(e)
    
    async def _generate_forecasts(
        self,
        location: Dict,
        weather_data: List[Dict],
        model: Any,
        horizon_hours: int
    ) -> List[Dict]:
        """Generate forecast data points"""
        forecasts = []
        now = datetime.utcnow()
        
        for hour in range(horizon_hours):
            forecast_time = now + timedelta(hours=hour + 1)
            hour_of_day = forecast_time.hour
            
            # Simple solar production curve simulation
            # In production, this would use the actual ML model
            power_output = 0.0
            confidence = 95.0
            
            if 6 <= hour_of_day <= 18:
                # Daylight hours
                peak_hour = 12
                max_capacity = location["capacity_mw"] * 0.85
                hour_diff = abs(hour_of_day - peak_hour)
                
                # Base production curve
                power_output = max_capacity * max(0, 1 - (hour_diff / 6))
                
                # Apply weather factors if available
                if hour < len(weather_data):
                    weather = weather_data[hour]
                    cloud_factor = 1 - (weather.get("cloud_cover", 0) / 100 * 0.5)
                    power_output *= cloud_factor
                    confidence -= weather.get("cloud_cover", 0) / 10
                
                # Add some variation
                power_output *= (0.9 + np.random.random() * 0.2)
                power_output = max(0, min(power_output, location["capacity_mw"]))
            
            forecasts.append({
                "time": forecast_time,
                "location_id": location["id"],
                "power_output_mw": round(power_output, 2),
                "energy_mwh": round(power_output * 1, 2),  # 1 hour
                "confidence": round(confidence, 1),
                "model_type": model.get("type", "ML"),
                "model_version": model.get("version", "1.0.0"),
                "horizon_hours": hour + 1,
                "temperature": weather_data[min(hour, len(weather_data)-1)].get("temperature", 20) if weather_data else 20,
                "irradiance": round(power_output * 1000 / location["capacity_mw"], 1) if power_output > 0 else 0,
                "cloud_cover": weather_data[min(hour, len(weather_data)-1)].get("cloud_cover", 0) if weather_data else 0,
                "wind_speed": weather_data[min(hour, len(weather_data)-1)].get("wind_speed", 5) if weather_data else 5,
            })
        
        return forecasts
    
    async def get_task_status(self, task_id: str) -> Optional[ForecastTaskResponse]:
        """Get current status of a forecast task"""
        if task_id not in self.tasks:
            return None
        
        task = self.tasks[task_id]
        
        return ForecastTaskResponse(
            task_id=task["id"],
            status=task["status"],
            location_id=task["location_id"],
            progress=task["progress"],
            result=task["result"],
            error=task["error"],
            estimated_time_seconds=max(0, 30 - (task["progress"] / 100 * 30))
        )
    
    async def get_forecasts(
        self,
        location_id: int,
        start_time: datetime,
        end_time: datetime,
        model_type: Optional[str] = None
    ) -> List[Dict]:
        """Get forecasts for a location within time range"""
        return await self.repo.get_forecasts_range(
            location_id=location_id,
            start_time=start_time,
            end_time=end_time,
            model_type=model_type
        )
    
    async def calculate_accuracy(
        self,
        location_id: int,
        days: int = 7
    ) -> Optional[ForecastAccuracyResponse]:
        """Calculate forecast accuracy metrics"""
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(days=days)
        
        # Get forecasts and actual production
        forecasts = await self.repo.get_forecasts_range(
            location_id=location_id,
            start_time=start_time,
            end_time=end_time
        )
        
        actuals = await self.repo.get_production_range(
            location_id=location_id,
            start_time=start_time,
            end_time=end_time
        )
        
        if not forecasts or not actuals:
            return None
        
        # Calculate metrics
        forecast_values = np.array([f["power_output_mw"] for f in forecasts])
        actual_values = np.array([a["power_output_mw"] for a in actuals[:len(forecasts)]])
        
        # Mean Absolute Percentage Error
        mape = np.mean(np.abs((actual_values - forecast_values) / (actual_values + 0.001))) * 100
        
        # Root Mean Square Error
        rmse = np.sqrt(np.mean((actual_values - forecast_values) ** 2))
        
        # Accuracy percentage
        accuracy = max(0, 100 - mape)
        
        return ForecastAccuracyResponse(
            location_id=location_id,
            accuracy_percentage=round(accuracy, 1),
            mape=round(mape, 2),
            rmse=round(rmse, 2),
            sample_size=len(forecasts),
            period_days=days,
            model_type=forecasts[0].get("model_type", "Unknown") if forecasts else "Unknown"
        )
    
    async def delete_old_forecasts(
        self,
        location_id: int,
        before_date: datetime
    ) -> int:
        """Delete forecasts older than specified date"""
        return await self.repo.delete_forecasts_before(
            location_id=location_id,
            before_date=before_date
        )