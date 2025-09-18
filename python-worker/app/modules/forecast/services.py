"""Forecast service - business logic layer"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
import numpy as np
import uuid
import asyncio
import pandas as pd
import logging

from .repositories import ForecastRepository
from .models_api import ForecastTaskResponse, ForecastAccuracyResponse
from app.modules.ml_models.services import MLModelService
from app.core.task_manager import task_manager
# Weather service removed - now using SvelteKit API via repository

# Import the real forecast engine (NO CLASSES - pure functions)
try:
    from .core.unified_forecast import run_unified_forecast
    REAL_FORECAST_AVAILABLE = True
except ImportError:
    REAL_FORECAST_AVAILABLE = False
    logging.warning("Real forecast engine not available - using fallback")

logger = logging.getLogger(__name__)


class ForecastService:
    """Service layer for forecast business logic"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ForecastRepository(db)
        self.ml_service = MLModelService(db)
        # Weather service removed - now using SvelteKit API

        # Use global task manager instead of instance-level storage
        # This ensures tasks persist across requests

    async def validate_location(self, location_id: str) -> bool:
        """Validate if location exists and is active (database-driven)"""
        location = await self.repo.get_location_full(location_id)
        return location is not None

    async def queue_forecast_generation(
        self,
        location_id: str,
        horizon_hours: int = 48,
        model_type: str = "ML_ENSEMBLE"
    ) -> str:
        """Queue a forecast generation task"""
        task_id = str(uuid.uuid4())

        task_data = {
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

        # Add to global task manager
        task_manager.add_task(task_id, task_data)
        logger.info(f"Queued task {task_id} for location {location_id}")

        return task_id

    async def process_forecast_task(self, task_id: str) -> None:
        """Process forecast generation task using database-driven approach"""
        task = task_manager.get_task(task_id)
        if not task:
            logger.error(f"Task {task_id} not found in task manager")
            return

        try:
            # Update status
            task_manager.update_task(task_id, {"status": "processing", "progress": 10})
            logger.info(f"Starting forecast task {task_id} for location {task['location_id']}")

            # 1. Get location from database (not YAML)
            location = await self.repo.get_location_full(task["location_id"])
            if not location:
                raise ValueError(f"Location {task['location_id']} not found in database")

            task_manager.update_task(task_id, {"progress": 20})
            logger.info(f"Location loaded: {location['name']} ({location['capacityMW']} MW)")

            # 2. Build config from database fields
            config = self.repo.build_config_from_location(location)

            task_manager.update_task(task_id, {"progress": 30})

            # 3. Get weather from database (not API)
            weather_df = await self.repo.get_recent_weather(
                location_id=task["location_id"],
                hours=task["horizon_hours"] + 24  # Extra for features
            )

            if weather_df.empty:
                raise ValueError(f"No weather data found for location {task['location_id']}")

            task_manager.update_task(task_id, {"progress": 40})
            logger.info(f"Weather data loaded: {len(weather_df)} records")

            # 4. Load ML models for this location
            location_code = location.get("code")
            models = None
            if location_code:
                models = await self.ml_service.load_location_models(location_code)
                if models:
                    logger.info(f"Loaded models for {location_code}: {models['model_type']}")
                else:
                    logger.warning(f"No models found for {location_code}, will use physics-only")

            task_manager.update_task(task_id, {"progress": 60})

            # 5. Run unified forecast (REAL FORECAST ENGINE - NO MOCK DATA)
            if REAL_FORECAST_AVAILABLE:
                forecast_type = "hybrid" if models else "physics"

                # Import time resolution utilities
                from .utils.time_resolution import resample_weather_to_15min, resample_forecast_to_15min

                # Resample weather data to 15-minute intervals
                logger.info(f"Resampling weather data to 15-minute intervals")
                weather_15min = resample_weather_to_15min(weather_df)

                logger.info(f"Running {forecast_type} forecast with unified engine")
                forecast_df = run_unified_forecast(
                    weather_data=weather_15min,
                    config=config,
                    forecast_type=forecast_type,
                    client_id=location_code
                )

                # Ensure forecast is at 15-minute intervals
                if not forecast_df.empty:
                    forecast_df = resample_forecast_to_15min(forecast_df)

                # Add model metadata to forecast
                if models:
                    forecast_df['model_type'] = models['model_type']
                    forecast_df['model_version'] = models['version']
                else:
                    forecast_df['model_type'] = 'PHYSICS_ONLY'
                    forecast_df['model_version'] = '1.0'

                # Convert kW to MW for database storage
                if 'prediction' in forecast_df.columns:
                    forecast_df['power_mw'] = forecast_df['prediction'] / 1000

                # Add capacity constraint validation (CRITICAL SAFETY)
                max_capacity_mw = location['capacityMW']
                forecast_df['power_mw'] = forecast_df['power_mw'].clip(upper=max_capacity_mw)

                # Calculate capacity factor
                forecast_df['capacity_factor'] = forecast_df['power_mw'] / max_capacity_mw

            else:
                # Fallback if core modules not available
                raise ImportError("Real forecast engine not available")

            task_manager.update_task(task_id, {"progress": 80})
            logger.info(f"Forecast generated: {len(forecast_df)} points")

            # 6. Save to database using TimescaleDB bulk operations
            saved_count = await self.repo.bulk_save_forecasts(
                location_id=task["location_id"],
                forecasts=forecast_df
            )

            task_manager.update_task(task_id, {
                "progress": 100,
                "status": "completed",
                "result": {
                "forecast_count": saved_count,
                "start_time": forecast_df.index[0].isoformat() if len(forecast_df) > 0 else None,
                "end_time": forecast_df.index[-1].isoformat() if len(forecast_df) > 0 else None,
                "model_type": forecast_df.iloc[0]['model_type'] if len(forecast_df) > 0 else None,
                "location_name": location['name'],
                "capacity_mw": location['capacityMW']
                }
            })

            logger.info(f"Task {task_id} completed successfully: {saved_count} forecasts saved")

        except Exception as e:
            task_manager.update_task(task_id, {
                "status": "failed",
                "error": str(e)
            })
            logger.error(f"Task {task_id} failed: {e}", exc_info=True)

    # REMOVED: _generate_forecasts() - now using real unified_forecast engine

    async def get_task_status(self, task_id: str) -> Optional[ForecastTaskResponse]:
        """Get current status of a forecast task"""
        task = task_manager.get_task(task_id)
        if not task:
            logger.warning(f"Task {task_id} not found when getting status")
            return None

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
        location_id: str,
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

    # calculate_accuracy method removed - now handled by SvelteKit shared utilities
    # Use ForecastMetricsCalculator in SvelteKit instead

    async def delete_old_forecasts(
        self,
        location_id: str,
        before_date: datetime
    ) -> int:
        """Delete forecasts older than specified date"""
        return await self.repo.delete_forecasts_before(
            location_id=location_id,
            before_date=before_date
        )
