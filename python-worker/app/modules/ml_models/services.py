"""ML Model service"""

from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from pathlib import Path
import joblib
import logging
import asyncio
from datetime import datetime

logger = logging.getLogger(__name__)

# Global model cache to avoid repeated loading
_model_cache: Dict[str, Dict[str, Any]] = {}
_model_cache_lock = asyncio.Lock()

class MLModelService:
    """Service for ML model management"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.models_dir = Path("/Users/vladbordei/Documents/Development/solar/python-worker/models")

    async def get_model(self, model_type: str = "ML") -> Dict[str, Any]:
        """Get ML model configuration (legacy method)"""
        return {
            "type": model_type,
            "version": "1.0.0",
            "name": f"solar-forecast-{model_type.lower()}",
            "status": "active"
        }

    async def load_location_models(self, location_code: str) -> Optional[Dict[str, Any]]:
        """Load models dynamically based on location code from database"""
        async with _model_cache_lock:
            # Check cache first
            if location_code in _model_cache:
                logger.info(f"Using cached models for location: {location_code}")
                return _model_cache[location_code]

            # Try to find location-specific models
            model_file = self.models_dir / f"{location_code}_production_models.pkl"

            if model_file.exists():
                try:
                    logger.info(f"Loading models for location: {location_code}")

                    # Load the model file
                    models = joblib.load(model_file)

                    # Create model metadata
                    model_metadata = {
                        "models": models,
                        "location_code": location_code,
                        "file_path": str(model_file),
                        "loaded_at": datetime.utcnow(),
                        "model_type": "ML_CATBOOST_ENSEMBLE",
                        "version": "2.0",
                        "file_size": model_file.stat().st_size,
                        "status": "loaded"
                    }

                    # Cache the models
                    _model_cache[location_code] = model_metadata

                    logger.info(f"Successfully loaded models for {location_code}")
                    return model_metadata

                except Exception as e:
                    logger.error(f"Failed to load models for {location_code}: {e}")
                    return None
            else:
                logger.warning(f"No specific models found for {location_code}, trying fallback")
                return await self._load_fallback_models(location_code)

    async def _load_fallback_models(self, location_code: str) -> Optional[Dict[str, Any]]:
        """Load fallback models when location-specific ones are not available"""
        # Try to find any available model as fallback
        model_files = list(self.models_dir.glob("*_production_models.pkl"))

        if model_files:
            fallback_file = model_files[0]  # Use first available model
            logger.info(f"Using fallback model {fallback_file.name} for {location_code}")

            try:
                models = joblib.load(fallback_file)

                model_metadata = {
                    "models": models,
                    "location_code": location_code,
                    "fallback_from": fallback_file.stem.replace("_production_models", ""),
                    "file_path": str(fallback_file),
                    "loaded_at": datetime.utcnow(),
                    "model_type": "ML_CATBOOST_FALLBACK",
                    "version": "2.0-fallback",
                    "status": "fallback"
                }

                _model_cache[location_code] = model_metadata
                return model_metadata

            except Exception as e:
                logger.error(f"Failed to load fallback model: {e}")
                return None
        else:
            logger.error("No model files found for fallback")
            return None

    def get_available_models(self) -> list[str]:
        """Get list of available model files"""
        model_files = list(self.models_dir.glob("*_production_models.pkl"))
        return [f.stem.replace("_production_models", "") for f in model_files]

    async def validate_model_file(self, location_code: str) -> bool:
        """Validate that model file exists and is readable"""
        model_file = self.models_dir / f"{location_code}_production_models.pkl"

        if not model_file.exists():
            return False

        if model_file.stat().st_size < 1024:  # Less than 1KB is suspicious
            return False

        try:
            # Try to read the first few bytes to verify it's a pickle file
            with open(model_file, 'rb') as f:
                header = f.read(10)
                return header.startswith(b'\x80')  # Pickle protocol marker
        except Exception:
            return False

    def get_model_metadata(self, location_code: str) -> Optional[Dict[str, Any]]:
        """Get cached model metadata without loading"""
        return _model_cache.get(location_code)

    def clear_model_cache(self, location_code: Optional[str] = None):
        """Clear model cache (for memory management)"""
        if location_code:
            _model_cache.pop(location_code, None)
            logger.info(f"Cleared cache for {location_code}")
        else:
            _model_cache.clear()
            logger.info("Cleared all model cache")