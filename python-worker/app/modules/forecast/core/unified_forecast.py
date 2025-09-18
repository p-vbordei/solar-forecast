#%% MODULE_HEADER
"""
Unified solar forecasting system - SINGLE function for ALL forecasting scenarios.

PURPOSE: Provides ONE forecasting function that works with:
- Historical weather data (for validation)
- Future weather data (for production forecasts)
- Any time period (past, present, future)
- Multiple model types (physics, ML, hybrid)

ROLE: Central forecasting engine that replaces all other forecasting scripts
NO MORE multiple forecasting scripts with duplicate logic!
"""
#%% MODULE_HEADER END

#%% IMPORTS_AND_SETUP
"""
PURPOSE: Import all required modules and configure logging
INPUT: None
OUTPUT: Module dependencies and logger configuration
ROLE: Foundation setup for unified forecasting system
"""
import pandas as pd
import numpy as np
from typing import Dict, Any, Optional, Tuple
from pathlib import Path
import logging
import json

# Import all core modules
from .solar_physics import create_location_and_system, run_forecast as run_pvlib_forecast
from .shoulders_enhancement import enhance_forecast_shoulders
from .performance_adjustment import apply_performance_adjustments
from .feature_engineering import prepare_ml_features, select_features_for_model
from .forecast_models import load_model, predict_with_uncertainty, create_ensemble_forecast
# Local utility for path resolution
from pathlib import Path

def resolve_models_path(filename: str, create_dirs: bool = True) -> Path:
    """Simple models path resolution for Python worker environment"""
    models_dir = Path(__file__).parent.parent.parent.parent / "models"
    if create_dirs:
        models_dir.mkdir(parents=True, exist_ok=True)
    return models_dir / filename

logger = logging.getLogger(__name__)
#%% IMPORTS_AND_SETUP END


#%% UNIFIED_FORECAST_MAIN
def run_unified_forecast(
    weather_data: pd.DataFrame,
    config: Dict[str, Any],
    forecast_type: str = "hybrid",
    client_id: Optional[str] = None
) -> pd.DataFrame:
    """
    PURPOSE: SINGLE unified forecasting function for ALL scenarios

    This function replaces ALL other forecasting logic in the system:
    - scripts/run_forecast.py -> Use this function
    - scripts/run_historical_forecast.py -> Use this function
    - historical/model_calibration.py forecasting -> Use this function
    - adhoc/run_physics_forecast.py -> Use this function

    INPUT:
    - weather_data: Weather data with columns: ghi, dni, dhi, temp_air, wind_speed, etc.
      Can be historical OR future weather data.
    - config: Client configuration with location, plant, performance settings
    - forecast_type: "physics", "ml", or "hybrid" (default: "hybrid")
    - client_id: Optional client identifier for loading ML models

    OUTPUT:
    - pd.DataFrame with standardized forecast columns:
      - prediction: Main forecast (kW)
      - p10, p25, p50, p75, p90: Quantile predictions (kW)
      - uncertainty_lower, uncertainty_upper: Confidence bounds (kW)

    ROLE: Central forecasting engine that handles all forecasting scenarios
    through a single, consistent interface with proper validation and safety checks

    Example Usage:
    --------------
    # Future forecasting
    weather_future = fetch_weather_forecast(location, hours=96)
    forecast = run_unified_forecast(weather_future, config, "hybrid")

    # Historical validation
    weather_historical = fetch_historical_weather(start_date, end_date)
    forecast = run_unified_forecast(weather_historical, config, "hybrid")

    # Physics-only testing
    forecast = run_unified_forecast(weather_data, config, "physics")
    """
    logger.info(f"🚀 Running unified {forecast_type} forecast for {len(weather_data)} weather records")

    #%% INPUT_VALIDATION
    """
    PURPOSE: Validate all inputs before processing
    INPUT: weather_data, forecast_type parameters
    OUTPUT: Validated inputs or raised exceptions
    ROLE: Ensures data integrity and prevents processing errors
    """
    # Validate inputs
    if weather_data.empty:
        raise ValueError("Weather data cannot be empty")

    required_weather_cols = ['ghi', 'temp_air']
    missing_cols = [col for col in required_weather_cols if col not in weather_data.columns]
    if missing_cols:
        raise ValueError(f"Missing required weather columns: {missing_cols}")

    if forecast_type not in ["physics", "ml", "hybrid"]:
        raise ValueError(f"forecast_type must be 'physics', 'ml', or 'hybrid', got: {forecast_type}")
    #%% INPUT_VALIDATION END

    #%% PVLIB_INITIALIZATION
    """
    PURPOSE: Create PVLIB location and system objects from configuration
    INPUT: config dictionary with location and plant parameters
    OUTPUT: location and system objects for PVLIB calculations
    ROLE: Foundation for all solar physics calculations
    """
    # Step 1: Create PVLIB location and system objects
    logger.info("Step 1: Creating PVLIB location and system")
    location, system = create_location_and_system(config)
    #%% PVLIB_INITIALIZATION END

    #%% PHYSICS_FORECAST_BASE
    """
    PURPOSE: Run PVLIB physics forecast as base for ALL forecast types
    INPUT: location, system objects and weather data
    OUTPUT: Raw PVLIB forecast with solar physics calculations
    ROLE: Base solar physics calculations that all forecast types build upon
    """
    # Step 2: Run PVLIB physics forecast (base for ALL forecast types)
    logger.info("Step 2: Running PVLIB physics forecast")
    # Use 'simple' model for reliability until SAPM module issue is fixed
    pvlib_forecast = run_pvlib_forecast(location, system, weather_data, model='simple')
    #%% PHYSICS_FORECAST_BASE END

    #%% SHOULDERS_ENHANCEMENT
    """
    PURPOSE: Enhance sunrise/sunset transitions with sophisticated modeling
    INPUT: pvlib_forecast, location, and performance configuration
    OUTPUT: Enhanced forecast with improved dawn/dusk transitions
    ROLE: Improves forecast accuracy during critical transition periods
    """
    # Step 3: Enhance shoulders (sunrise/sunset transitions)
    logger.info("Step 3: Enhancing forecast shoulders")
    # Pass plant capacity along with performance config
    performance_config = config.get('performance', {})
    performance_config['capacity_kw'] = config.get('plant', {}).get('capacity_kw', 15000)
    enhanced_forecast = enhance_forecast_shoulders(
        pvlib_forecast,
        location,
        performance_config
    )
    #%% SHOULDERS_ENHANCEMENT END

    #%% FORECAST_TYPE_ROUTING
    """
    PURPOSE: Route to appropriate forecast generation method based on type
    INPUT: forecast_type parameter and processed data
    OUTPUT: Forecast generated using physics, ML, or hybrid approach
    ROLE: Central routing logic that determines forecast methodology
    """
    # Step 4: Generate forecast based on type
    if forecast_type == "physics":
        # Physics-only forecast
        logger.info("Step 4: Using physics-only forecast")
        final_forecast = _create_physics_forecast(enhanced_forecast)

    elif forecast_type == "ml":
        # ML-only forecast
        logger.info("Step 4: Using ML-only forecast")
        final_forecast = _create_ml_forecast(
            weather_data, enhanced_forecast, config, client_id
        )

    elif forecast_type == "hybrid":
        # Hybrid physics + ML forecast (recommended)
        logger.info("Step 4: Using hybrid physics + ML forecast")
        final_forecast = _create_hybrid_forecast(
            weather_data, enhanced_forecast, config, client_id
        )
    #%% FORECAST_TYPE_ROUTING END

    #%% PERFORMANCE_ADJUSTMENTS
    """
    PURPOSE: Apply performance adjustments and calibration factors
    INPUT: final_forecast, weather_data, performance and calibration configs
    OUTPUT: Adjusted forecast with applied performance corrections
    ROLE: Calibrates forecast to historical performance and conditions
    """
    # Step 5: Apply performance adjustments (same for all types)
    logger.info("Step 5: Applying performance adjustments")
    performance_config = config.get('performance', {})
    calibration_config = config.get('calibration', {})

    adjusted_forecast = apply_performance_adjustments(
        final_forecast,
        weather_data,
        performance_config,
        calibration_config
    )
    #%% PERFORMANCE_ADJUSTMENTS END

    #%% CAPACITY_CONSTRAINTS
    """
    PURPOSE: Apply strict capacity constraints (CRITICAL SAFETY REQUIREMENT)
    INPUT: adjusted_forecast and plant capacity limit
    OUTPUT: Constrained forecast with no values exceeding plant capacity
    ROLE: Ensures all forecasts respect physical plant limitations
    """
    # Step 6: Apply capacity constraints (critical safety requirement)
    logger.info("Step 6: Applying capacity constraints")
    # Get capacity in kW since forecast values are in kW
    plant_capacity_kw = config.get('plant', {}).get('capacity_kw', 15000)
    adjusted_forecast = _apply_capacity_constraints(adjusted_forecast, plant_capacity_kw)
    #%% CAPACITY_CONSTRAINTS END

    logger.info(f"✅ Unified forecast complete: {len(adjusted_forecast)} records, "
               f"peak {adjusted_forecast['prediction'].max():.3f} MW")

    return adjusted_forecast
#%% UNIFIED_FORECAST_MAIN END


#%% PHYSICS_FORECAST_CREATION
def _create_physics_forecast(enhanced_forecast: pd.DataFrame) -> pd.DataFrame:
    """
    PURPOSE: Create physics-only forecast with uncertainty bands

    INPUT: enhanced_forecast - PVLIB forecast with shoulder enhancements
    OUTPUT: Standardized forecast DataFrame with quantile predictions
    ROLE: Converts PVLIB output to standardized forecast format with uncertainty
    """

    #%% POWER_COLUMN_DETECTION
    """
    PURPOSE: Detect the correct power column from PVLIB output
    INPUT: enhanced_forecast DataFrame columns
    OUTPUT: Selected power column name and values
    ROLE: Handles different PVLIB output column naming conventions
    """
    # Use ac_power_mw column from PVLIB and convert to kW for consistency
    if 'ac_power_mw' in enhanced_forecast.columns:
        base_power = enhanced_forecast['ac_power_mw'] * 1000  # Convert MW to kW
    elif 'ac_power' in enhanced_forecast.columns:
        base_power = enhanced_forecast['ac_power'] / 1000  # Convert W to kW
    else:
        # Find first numeric column
        numeric_cols = enhanced_forecast.select_dtypes(include=[np.number]).columns
        power_col = numeric_cols[0] if len(numeric_cols) > 0 else enhanced_forecast.columns[0]
        base_power = enhanced_forecast[power_col]
    #%% POWER_COLUMN_DETECTION END

    #%% UNCERTAINTY_BAND_GENERATION
    """
    PURPOSE: Generate uncertainty bands for physics-only predictions
    INPUT: base_power values from PVLIB
    OUTPUT: Standardized quantile predictions (p10, p25, p50, p75, p90)
    ROLE: Creates probabilistic forecast from deterministic physics model
    """
    # Create uncertainty bands (±10% for physics-only)
    uncertainty_factor = 0.1

    return pd.DataFrame({
        'prediction': base_power,
        'p10': base_power * (1 - uncertainty_factor * 2),
        'p25': base_power * (1 - uncertainty_factor),
        'p50': base_power,
        'p75': base_power * (1 + uncertainty_factor),
        'p90': base_power * (1 + uncertainty_factor * 2),
        'uncertainty_lower': base_power * (1 - uncertainty_factor),
        'uncertainty_upper': base_power * (1 + uncertainty_factor)
    }, index=enhanced_forecast.index)
    #%% UNCERTAINTY_BAND_GENERATION END
#%% PHYSICS_FORECAST_CREATION END


#%% ML_FORECAST_CREATION
def _create_ml_forecast(
    weather_data: pd.DataFrame,
    enhanced_forecast: pd.DataFrame,
    config: Dict[str, Any],
    client_id: Optional[str]
) -> pd.DataFrame:
    """
    PURPOSE: Create ML-only forecast using trained CatBoost models

    INPUT:
    - weather_data: Raw weather data for feature engineering
    - enhanced_forecast: PVLIB forecast with shoulder enhancements
    - config: Client configuration
    - client_id: Client identifier for model loading

    OUTPUT: ML-generated forecast with quantile predictions
    ROLE: Generates ML-based forecast using trained models with fallback to physics
    """

    #%% ML_PREREQUISITES_CHECK
    """
    PURPOSE: Validate prerequisites for ML forecast generation
    INPUT: client_id and model path validation
    OUTPUT: Validated ML setup or fallback to physics
    ROLE: Ensures ML models are available before processing
    """
    if not client_id:
        logger.warning("No client_id provided for ML forecast, falling back to physics")
        return _create_physics_forecast(enhanced_forecast)

    # Check for trained models
    model_path = resolve_models_path(f"{client_id}/catboost_ensemble")
    if not model_path.exists():
        logger.warning(f"No ML models found at {model_path}, falling back to physics")
        return _create_physics_forecast(enhanced_forecast)
    #%% ML_PREREQUISITES_CHECK END

    #%% ML_FEATURE_PREPARATION
    """
    PURPOSE: Prepare ML features from weather data and solar calculations
    INPUT: weather_data, enhanced_forecast, config
    OUTPUT: ML features ready for model prediction
    ROLE: Transforms raw data into ML-compatible feature set
    """
    # Prepare ML features
    try:
        location, _ = create_location_and_system(config)
        solar_position = location.get_solarposition(weather_data.index)

        # Get POA data from enhanced forecast
        poa_data = pd.DataFrame({
            'poa_global': enhanced_forecast.get('poa_global', enhanced_forecast.get('effective_irradiance', 0)),
            'poa_direct': enhanced_forecast.get('poa_direct', 0),
            'poa_diffuse': enhanced_forecast.get('poa_diffuse', 0)
        })

        ml_features = prepare_ml_features(
            weather_data,
            solar_position,
            poa_data,
            config,
            include_lag_features=False
        )

        #%% ML_MODEL_LOADING
        """
        PURPOSE: Load trained quantile models and feature metadata
        INPUT: model_path and quantile specifications
        OUTPUT: Loaded models dictionary and feature names
        ROLE: Loads all quantile models for probabilistic forecasting
        """
        # Load quantile models and feature metadata
        quantile_models = {}
        feature_names = None

        # Load metadata to get correct feature order
        metadata_path = model_path / "metadata.json"
        if metadata_path.exists():
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
                feature_names = metadata.get('feature_names', [])

        for quantile in [0.1, 0.25, 0.5, 0.75, 0.9]:
            q_path = model_path / f"model_q{int(quantile * 100)}"
            if q_path.with_suffix('.cbm').exists():
                model, _ = load_model(q_path, model_type='catboost')
                quantile_models[quantile] = model

        if not quantile_models:
            logger.warning("No valid ML models loaded, falling back to physics")
            return _create_physics_forecast(enhanced_forecast)
        #%% ML_MODEL_LOADING END

        #%% FEATURE_ALIGNMENT
        """
        PURPOSE: Align features with training data format
        INPUT: ml_features and feature_names from metadata
        OUTPUT: Properly aligned features for model prediction
        ROLE: Ensures feature order matches training data
        """
        # Ensure feature order matches training data
        if feature_names:
            # Reorder features to match training order
            available_features = [f for f in feature_names if f in ml_features.columns]
            if len(available_features) < len(feature_names) * 0.8:  # At least 80% of features should be available
                logger.warning(f"Only {len(available_features)}/{len(feature_names)} training features available, falling back to physics")
                return _create_physics_forecast(enhanced_forecast)

            # Create feature DataFrame with correct order, filling missing features with 0
            ml_features_ordered = pd.DataFrame(index=ml_features.index)
            for feature in feature_names:
                if feature in ml_features.columns:
                    ml_features_ordered[feature] = ml_features[feature]
                else:
                    ml_features_ordered[feature] = 0  # Fill missing features with 0

            ml_features_filtered = ml_features_ordered
        else:
            # Fallback to original approach if no metadata
            selected_features = select_features_for_model(ml_features, 'catboost')
            ml_features_filtered = ml_features[selected_features]
        #%% FEATURE_ALIGNMENT END

        #%% ML_PREDICTION_GENERATION
        """
        PURPOSE: Generate ML predictions using quantile models
        INPUT: quantile_models, ml_features_filtered, capacity constraints
        OUTPUT: ML predictions with uncertainty quantiles
        ROLE: Executes ML inference with proper capacity constraints
        """
        capacity_kw = config.get('plant', {}).get('capacity_kw', 870)
        ml_predictions = predict_with_uncertainty(
            quantile_models,
            ml_features_filtered,
            clip_negative=True,
            capacity_kw=capacity_kw,
            solar_position=solar_position  # Pass solar position for night masking
        )

        logger.info(f"✅ ML forecast generated using {len(quantile_models)} quantile models")
        return ml_predictions
        #%% ML_PREDICTION_GENERATION END

    except Exception as e:
        logger.warning(f"ML forecast failed: {e}, falling back to physics")
        return _create_physics_forecast(enhanced_forecast)
#%% ML_FORECAST_CREATION END


#%% HYBRID_FORECAST_CREATION
def _create_hybrid_forecast(
    weather_data: pd.DataFrame,
    enhanced_forecast: pd.DataFrame,
    config: Dict[str, Any],
    client_id: Optional[str]
) -> pd.DataFrame:
    """
    PURPOSE: Create hybrid physics + ML forecast with intelligent blending

    INPUT:
    - weather_data: Raw weather data for weight calculation
    - enhanced_forecast: PVLIB forecast with shoulder enhancements
    - config: Client configuration
    - client_id: Client identifier for ML model loading

    OUTPUT: Hybrid forecast combining physics and ML predictions
    ROLE: Creates optimal blend of physics and ML forecasts based on conditions
    """

    #%% FORECAST_GENERATION
    """
    PURPOSE: Generate both physics and ML forecasts for ensemble
    INPUT: All input parameters
    OUTPUT: physics_forecast and ml_forecast DataFrames
    ROLE: Produces base forecasts for intelligent blending
    """
    # Get physics forecast
    physics_forecast = _create_physics_forecast(enhanced_forecast)

    # Try to get ML forecast
    ml_forecast = _create_ml_forecast(weather_data, enhanced_forecast, config, client_id)

    # Check if ML forecast is actually different from physics (i.e., ML models worked)
    if ml_forecast.equals(physics_forecast):
        logger.info("ML models not available, using physics-only forecast")
        return physics_forecast
    #%% FORECAST_GENERATION END

    #%% ENSEMBLE_BLENDING
    """
    PURPOSE: Blend physics and ML forecasts with intelligent weights
    INPUT: physics_forecast, ml_forecast, weather_data, config
    OUTPUT: Optimally weighted hybrid forecast
    ROLE: Creates ensemble forecast with condition-based weighting
    """
    # Create ensemble forecast with optimal weights
    forecasts = {
        'physics': physics_forecast,
        'ml': ml_forecast
    }

    # Intelligent weight selection based on conditions
    weights = _calculate_optimal_weights(weather_data, config)

    hybrid_forecast = create_ensemble_forecast(
        forecasts,
        weights=weights,
        method='weighted_average'
    )

    logger.info(f"✅ Hybrid forecast created with weights: {weights}")
    return hybrid_forecast
    #%% ENSEMBLE_BLENDING END
#%% HYBRID_FORECAST_CREATION END


#%% OPTIMAL_WEIGHTS_CALCULATION
def _calculate_optimal_weights(weather_data: pd.DataFrame, config: Dict[str, Any]) -> Dict[str, float]:
    """
    PURPOSE: Calculate optimal ensemble weights based on weather conditions and time of day

    INPUT:
    - weather_data: Weather data with cloud_cover and timestamp information
    - config: Client configuration (unused but maintained for consistency)

    OUTPUT: Dictionary with physics and ml weights that sum to 1.0
    ROLE: Intelligent weight selection for hybrid forecasting based on conditions
    """

    #%% DEFAULT_WEIGHTS
    """
    PURPOSE: Set default weights favoring ML for general conditions
    INPUT: None
    OUTPUT: Default physics and ML weights
    ROLE: Baseline weights before condition-based adjustments
    """
    # Default weights (favor ML for general conditions)
    physics_weight = 0.3
    ml_weight = 0.7
    #%% DEFAULT_WEIGHTS END

    #%% CLOUD_CONDITION_ADJUSTMENT
    """
    PURPOSE: Adjust weights based on cloud cover conditions
    INPUT: weather_data with cloud_cover column
    OUTPUT: Adjusted weights based on sky conditions
    ROLE: Optimize forecast blend based on cloud variability
    """
    # Adjust weights based on conditions where physics is more reliable
    if 'cloud_cover' in weather_data.columns:
        avg_cloud_cover = weather_data['cloud_cover'].mean()

        # Clear sky conditions: favor physics (more predictable)
        if avg_cloud_cover < 20:
            physics_weight = 0.5
            ml_weight = 0.5

        # Very cloudy conditions: favor ML (handles variability better)
        elif avg_cloud_cover > 80:
            physics_weight = 0.2
            ml_weight = 0.8
    #%% CLOUD_CONDITION_ADJUSTMENT END

    #%% TIME_OF_DAY_ADJUSTMENT
    """
    PURPOSE: Adjust weights for dawn/dusk hours
    INPUT: weather_data with datetime index
    OUTPUT: Time-adjusted weights
    ROLE: Favor physics during low-light transition periods
    """
    # Dawn/dusk hours: favor physics (ML often struggles with low light)
    if hasattr(weather_data.index, 'hour'):
        dawn_dusk_hours = weather_data.index.hour.isin([5, 6, 7, 18, 19, 20])
        if dawn_dusk_hours.any():
            physics_weight = min(physics_weight + 0.2, 0.8)
            ml_weight = 1 - physics_weight
    #%% TIME_OF_DAY_ADJUSTMENT END

    return {'physics': physics_weight, 'ml': ml_weight}
#%% OPTIMAL_WEIGHTS_CALCULATION END


#%% CAPACITY_CONSTRAINTS_APPLICATION
def _apply_capacity_constraints(forecast: pd.DataFrame, plant_capacity: float) -> pd.DataFrame:
    """
    PURPOSE: Apply strict capacity constraints to forecast (CRITICAL SAFETY REQUIREMENT)

    INPUT:
    - forecast: Forecast DataFrame with all prediction columns
    - plant_capacity: Maximum plant capacity in MW

    OUTPUT: Constrained forecast with no values exceeding plant capacity
    ROLE: Ensures all forecasts respect physical plant limitations (safety requirement)
    """

    #%% CONSTRAINT_CLIPPING
    """
    PURPOSE: Clip all forecast values to [0, plant_capacity] range
    INPUT: forecast DataFrame and plant_capacity limit
    OUTPUT: Clipped forecast within physical constraints
    ROLE: Enforces hard physical limits on all forecast values
    """
    constrained_forecast = forecast.copy()

    # Apply capacity limit to all columns
    for col in constrained_forecast.columns:
        if constrained_forecast[col].dtype in [np.float64, np.float32, np.int64, np.int32]:
            # Clip to [0, plant_capacity]
            constrained_forecast[col] = constrained_forecast[col].clip(0, plant_capacity)
    #%% CONSTRAINT_CLIPPING END

    #%% VIOLATION_CHECK
    """
    PURPOSE: Verify no capacity violations remain after clipping
    INPUT: constrained_forecast and plant_capacity
    OUTPUT: Violation count and warning if any found
    ROLE: Safety check to ensure constraints were properly applied
    """
    # Check for violations (should be zero after clipping)
    violations = (constrained_forecast > plant_capacity).any(axis=1).sum()
    if violations > 0:
        logger.warning(f"Found {violations} capacity violations after clipping - this should not happen")

    max_forecast = constrained_forecast['prediction'].max()
    logger.info(f"🚨 Capacity constraints applied: max forecast = {max_forecast:.3f} MW (limit: {plant_capacity} MW)")
    #%% VIOLATION_CHECK END

    return constrained_forecast
#%% CAPACITY_CONSTRAINTS_APPLICATION END


#%% CONVENIENCE_FUNCTIONS
"""
PURPOSE: Provide backward compatibility functions for specific forecast types
INPUT: Various combinations of weather_data, config, and client_id
OUTPUT: Forecasts generated using run_unified_forecast
ROLE: Maintains backward compatibility while encouraging use of unified function
"""

def run_physics_forecast(weather_data: pd.DataFrame, config: Dict[str, Any]) -> pd.DataFrame:
    """
    PURPOSE: Convenience function for physics-only forecast
    INPUT: weather_data and config
    OUTPUT: Physics-only forecast DataFrame
    ROLE: Backward compatibility wrapper for physics forecasting
    """
    return run_unified_forecast(weather_data, config, forecast_type="physics")


def run_ml_forecast(weather_data: pd.DataFrame, config: Dict[str, Any], client_id: str) -> pd.DataFrame:
    """
    PURPOSE: Convenience function for ML-only forecast
    INPUT: weather_data, config, and client_id
    OUTPUT: ML-only forecast DataFrame
    ROLE: Backward compatibility wrapper for ML forecasting
    """
    return run_unified_forecast(weather_data, config, forecast_type="ml", client_id=client_id)


def run_hybrid_forecast(weather_data: pd.DataFrame, config: Dict[str, Any], client_id: str) -> pd.DataFrame:
    """
    PURPOSE: Convenience function for hybrid forecast
    INPUT: weather_data, config, and client_id
    OUTPUT: Hybrid forecast DataFrame
    ROLE: Backward compatibility wrapper for hybrid forecasting
    """
    return run_unified_forecast(weather_data, config, forecast_type="hybrid", client_id=client_id)
#%% CONVENIENCE_FUNCTIONS END
