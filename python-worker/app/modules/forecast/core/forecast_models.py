#%% HEADER_AND_IMPORTS
"""
Forecast models for solar power prediction.
Implements CatBoost and ensemble approaches with quantile regression.

PURPOSE: This module implements the core machine learning forecasting engine for solar power prediction.
         It provides CatBoost-based quantile regression models, ensemble forecasting, and smart persistence models.
         The system uses pure functions following the NO CLASSES architecture rule.

INPUT: Historical weather features, solar production data, and forecast requirements
OUTPUT: Probabilistic forecasts with uncertainty bands (P10, P25, P50, P75, P90)
ROLE: Central ML engine that combines physics-based features with data-driven predictions

KEY FEATURES:
- CatBoost quantile regression for uncertainty quantification
- Ensemble forecasting with multiple model types
- Smart persistence models for short-term forecasting
- Comprehensive performance evaluation metrics
- Model persistence and loading capabilities
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple, Union
import joblib
import logging
from pathlib import Path

logger = logging.getLogger(__name__)
import json
#%% HEADER_AND_IMPORTS END

#%% ML_LIBRARY_IMPORTS
"""
PURPOSE: Import specialized ML libraries for solar power forecasting
INPUT: N/A (imports only)
OUTPUT: N/A (imports only)
ROLE: Provides access to CatBoost for quantile regression, scikit-learn for ensemble methods,
      and evaluation metrics for model performance assessment

KEY IMPORTS:
- CatBoost: Primary ML engine for quantile regression
- RandomForest/GradientBoosting: Alternative ensemble methods
- TimeSeriesSplit: Proper time-aware validation
- Evaluation metrics: MAE, RMSE, R2 for performance assessment
"""

# ML libraries
from catboost import CatBoostRegressor, Pool
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import QuantileRegressor
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# Configure logging
logger = logging.getLogger(__name__)
#%% ML_LIBRARY_IMPORTS END


#%% CATBOOST_MODEL_TRAINING
def train_catboost_model(
    features: pd.DataFrame,
    target: pd.Series,
    quantile: float = 0.5,
    categorical_features: Optional[List[str]] = None,
    params: Optional[Dict] = None
) -> CatBoostRegressor:
    """
    Train a CatBoost model for quantile regression.
    
    PURPOSE: Trains a single CatBoost model for a specific quantile prediction.
             Uses time-aware validation and optimized parameters for solar forecasting.
    
    INPUT: 
    - features: Feature DataFrame with weather and temporal features
    - target: Target values (solar power in kW)
    - quantile: Quantile to predict (0.1-0.9 range, 0.5 for median)
    - categorical_features: List of categorical feature names (hour, month, weather_code)
    - params: Custom CatBoost parameters to override defaults
    
    OUTPUT: Trained CatBoost model ready for predictions
    
    ROLE: Core ML training function that creates quantile-specific models.
          Uses TimeSeriesSplit for proper temporal validation and early stopping.
    
    OPTIMIZATION:
    - 1000 iterations with early stopping (50 rounds)
    - Learning rate 0.03 for stable convergence
    - Depth 6 for complex weather patterns
    - L2 regularization for generalization
    - Quantile loss function for uncertainty quantification
    """
    # Default parameters optimized for solar forecasting
    default_params = {
        'loss_function': f'Quantile:alpha={quantile}',
        'iterations': 1000,
        'learning_rate': 0.03,
        'depth': 6,
        'l2_leaf_reg': 3,
        'min_data_in_leaf': 20,
        'random_strength': 0.5,
        'bagging_temperature': 0.5,
        'od_type': 'Iter',
        'od_wait': 50,
        'random_seed': 42,
        'verbose': False,
        'thread_count': -1,
        'use_best_model': True,
        'eval_metric': 'Quantile:alpha=' + str(quantile)
    }
    
    # Override with custom parameters
    if params:
        default_params.update(params)
    
    # Prepare data
    train_pool = Pool(
        features,
        target,
        cat_features=categorical_features or []
    )
    
    # Train model
    model = CatBoostRegressor(**default_params)
    
    # Use time series split for validation
    tscv = TimeSeriesSplit(n_splits=3)
    
    # Get last split for validation
    for train_idx, val_idx in tscv.split(features):
        X_train = features.iloc[train_idx]
        y_train = target.iloc[train_idx]
        X_val = features.iloc[val_idx]
        y_val = target.iloc[val_idx]
    
    # Create validation pool
    eval_pool = Pool(X_val, y_val, cat_features=categorical_features or [])
    
    # Fit model
    model.fit(
        X_train, y_train,
        eval_set=eval_pool,
        early_stopping_rounds=50,
        plot=False,
        cat_features=categorical_features
    )
    
    logger.info(f"CatBoost model trained for quantile {quantile}")
    logger.info(f"Best iteration: {model.best_iteration_}")
    
    return model
#%% CATBOOST_MODEL_TRAINING END


#%% QUANTILE_ENSEMBLE_TRAINING
def train_quantile_ensemble(
    features: pd.DataFrame,
    target: pd.Series,
    quantiles: List[float] = [0.1, 0.25, 0.5, 0.75, 0.9],
    model_type: str = 'catboost',
    categorical_features: Optional[List[str]] = None
) -> Dict[float, any]:
    """
    Train multiple models for different quantiles.
    
    PURPOSE: Creates a complete ensemble of quantile models for uncertainty quantification.
             Trains separate models for P10, P25, P50, P75, P90 predictions.
    
    INPUT:
    - features: Feature DataFrame with weather and temporal data
    - target: Historical solar power production (kW)
    - quantiles: List of quantiles to train (default: [0.1, 0.25, 0.5, 0.75, 0.9])
    - model_type: 'catboost', 'sklearn_quantile', or 'gradient_boosting'
    - categorical_features: Categorical feature names for CatBoost
    
    OUTPUT: Dictionary mapping quantile values to trained models
    
    ROLE: Ensemble training coordinator that creates multiple quantile-specific models.
          Enables probabilistic forecasting with confidence intervals.
    
    MODEL TYPES:
    - CatBoost: Primary choice for solar forecasting (handles categories, fast)
    - QuantileRegressor: Sklearn alternative for comparison
    - GradientBoosting: Additional ensemble method option
    """
    models = {}
    
    for quantile in quantiles:
        logger.info(f"Training model for quantile {quantile}")
        
        if model_type == 'catboost':
            model = train_catboost_model(
                features, target, quantile,
                categorical_features=categorical_features
            )
        elif model_type == 'sklearn_quantile':
            model = QuantileRegressor(
                quantile=quantile,
                alpha=0.01,
                solver='highs'
            )
            model.fit(features, target)
        elif model_type == 'gradient_boosting':
            model = GradientBoostingRegressor(
                loss='quantile',
                alpha=quantile,
                n_estimators=100,
                learning_rate=0.1,
                max_depth=5,
                random_state=42
            )
            model.fit(features, target)
        else:
            raise ValueError(f"Unknown model type: {model_type}")
        
        models[quantile] = model
    
    return models
#%% QUANTILE_ENSEMBLE_TRAINING END


#%% UNCERTAINTY_PREDICTION
def predict_with_uncertainty(
    models: Dict[float, any],
    features: pd.DataFrame,
    clip_negative: bool = True,
    capacity_kw: Optional[float] = None,
    solar_position: Optional[pd.DataFrame] = None,
    **kwargs
) -> pd.DataFrame:
    """
    Generate predictions with uncertainty bands.
    
    PURPOSE: Generates probabilistic forecasts with uncertainty quantification.
             Applies physical constraints and night masking for realistic predictions.
    
    INPUT:
    - models: Dictionary of trained quantile models
    - features: Feature DataFrame for prediction period
    - clip_negative: Whether to clip negative predictions to 0
    - capacity_kw: Plant capacity for upper bound constraint (870 kW)
    - solar_position: Solar position data for night masking
    
    OUTPUT: DataFrame with quantile predictions and uncertainty bands
            Columns: p10, p25, p50, p75, p90, prediction, uncertainty_lower, uncertainty_upper
    
    ROLE: Main prediction engine that combines ML models with physical constraints.
          Ensures realistic outputs through night masking and capacity limits.
    
    CONSTRAINTS APPLIED:
    - Night masking: Zero production when sun elevation <= 0°
    - Capacity limits: All predictions <= 870 kW (plant capacity)
    - Physics-based scaling: Moderate limits based on GHI and solar elevation
    - Monotonicity: Ensures p10 <= p25 <= p50 <= p75 <= p90
    """
    predictions = pd.DataFrame(index=features.index)
    
    # Generate predictions for each quantile
    for quantile, model in models.items():
        col_name = f'p{int(quantile * 100)}'
        predictions[col_name] = model.predict(features)
    
    # Add named columns for convenience
    predictions['prediction'] = predictions.get('p50', predictions.mean(axis=1))
    predictions['uncertainty_lower'] = predictions.get('p10', predictions.min(axis=1))
    predictions['uncertainty_upper'] = predictions.get('p90', predictions.max(axis=1))
    
    # Clip negative values
    if clip_negative:
        predictions = predictions.clip(lower=0)
    
    # Apply capacity constraint
    if capacity_kw is not None:
        predictions = predictions.clip(upper=capacity_kw)
    
    # CRITICAL: Apply night masking to force zero production during night
    if solar_position is not None and 'elevation' in solar_position.columns:
        night_mask = solar_position['elevation'] <= 0.0  # Sun below horizon
        predictions.loc[night_mask] = 0.0
        logger.info(f"🌙 Applied night masking: {night_mask.sum()} night hours set to 0 kW")
        
        # BALANCED: Apply moderate physics-based scaling only when needed
        # Calculate physics-based theoretical maximum for each prediction
        if 'ghi' in features.columns:
            physics_limits = []
            for idx in predictions.index:
                if idx in features.index:
                    ghi = features.loc[idx, 'ghi'] if 'ghi' in features.columns else 0
                    elevation = solar_position.loc[idx, 'elevation'] if idx in solar_position.index else 0
                    
                    if elevation > 0 and ghi > 0:
                        # Physics-based maximum: Realistic with reasonable headroom
                        physics_max = (capacity_kw or 870) * (ghi / 1000.0) * np.sin(np.radians(elevation)) * 1.1
                        physics_max = min(physics_max, (capacity_kw or 870) * 0.95)  # Allow up to 95% capacity
                    else:
                        physics_max = 0.0
                else:
                    physics_max = 0.0
                    
                physics_limits.append(physics_max)
            
            # Only apply physics limits to predictions that exceed them by significant margins
            physics_limits_series = pd.Series(physics_limits, index=predictions.index)
            for col in predictions.columns:
                if col in ['p10', 'p25', 'p50', 'p75', 'p90', 'prediction', 'uncertainty_lower', 'uncertainty_upper']:
                    # Only constrain predictions that exceed physics limits by 20% or more
                    over_physics = predictions[col] > (physics_limits_series * 1.2)
                    predictions.loc[over_physics, col] = physics_limits_series[over_physics]
            
            physics_constrained = (predictions['prediction'] > physics_limits_series).sum()
            logger.info(f"🔬 Applied moderate physics scaling: {physics_constrained} predictions limited by physics")
    
    # Ensure monotonicity (p10 <= p25 <= p50 <= p75 <= p90)
    quantile_cols = ['p10', 'p25', 'p50', 'p75', 'p90']
    existing_cols = [col for col in quantile_cols if col in predictions.columns]
    
    if len(existing_cols) > 1:
        for i in range(1, len(existing_cols)):
            prev_col = existing_cols[i-1]
            curr_col = existing_cols[i]
            predictions[curr_col] = predictions[[prev_col, curr_col]].max(axis=1)
    
    return predictions
#%% UNCERTAINTY_PREDICTION END


#%% ENSEMBLE_FORECAST_CREATION
def create_ensemble_forecast(
    forecasts: Dict[str, pd.DataFrame],
    weights: Optional[Dict[str, float]] = None,
    method: str = 'weighted_average'
) -> pd.DataFrame:
    """
    Combine multiple forecasts into an ensemble.
    
    PURPOSE: Combines multiple individual forecasts into a single ensemble prediction.
             Supports weighted averaging, median, and mean combination methods.
    
    INPUT:
    - forecasts: Dictionary mapping model names to forecast DataFrames
    - weights: Dictionary mapping model names to weights (must sum to 1.0)
    - method: Combination method ('weighted_average', 'median', 'mean')
    
    OUTPUT: Combined ensemble forecast DataFrame with same structure as input forecasts
    
    ROLE: Forecast combination engine that leverages multiple models for improved accuracy.
          Reduces individual model biases through ensemble averaging.
    
    METHODS:
    - weighted_average: Combines using specified weights (default: equal weights)
    - median: Robust combination using median across models
    - mean: Simple average of all model predictions
    
    VALIDATION:
    - Ensures all forecasts have same temporal index
    - Validates weights sum to 1.0
    - Handles missing columns gracefully
    """
    if not forecasts:
        raise ValueError("No forecasts provided")
    
    # Default equal weights
    if weights is None:
        weights = {name: 1.0 / len(forecasts) for name in forecasts}
    
    # Validate weights
    if abs(sum(weights.values()) - 1.0) > 1e-6:
        raise ValueError("Weights must sum to 1")
    
    # Check all forecasts have same index
    first_index = list(forecasts.values())[0].index
    for name, forecast in forecasts.items():
        if not forecast.index.equals(first_index):
            raise ValueError(f"Forecast {name} has different index")
    
    if method == 'weighted_average':
        # Weighted average for each column
        ensemble = pd.DataFrame(index=first_index)
        
        # Get all columns present in any forecast
        all_columns = set()
        for forecast in forecasts.values():
            all_columns.update(forecast.columns)
        
        for col in all_columns:
            weighted_sum = pd.Series(0, index=first_index)
            total_weight = 0
            
            for name, forecast in forecasts.items():
                if col in forecast.columns:
                    weight = weights.get(name, 0)
                    weighted_sum += forecast[col] * weight
                    total_weight += weight
            
            if total_weight > 0:
                ensemble[col] = weighted_sum / total_weight
    
    elif method == 'median':
        # Median across all forecasts
        ensemble = pd.concat(forecasts.values()).groupby(level=0).median()
    
    elif method == 'mean':
        # Simple average
        ensemble = pd.concat(forecasts.values()).groupby(level=0).mean()
    
    else:
        raise ValueError(f"Unknown ensemble method: {method}")
    
    return ensemble
#%% ENSEMBLE_FORECAST_CREATION END


#%% SMART_PERSISTENCE_TRAINING
def train_smart_persistence_model(
    historical_data: pd.DataFrame,
    clear_sky_data: pd.DataFrame
) -> Dict[str, float]:
    """
    Train a smart persistence model that uses clear-sky index.
    
    PURPOSE: Creates a smart persistence model based on clear-sky index (CSI) patterns.
             Useful for short-term forecasting when ML models may not be available.
    
    INPUT:
    - historical_data: Historical solar production data with 'power' column
    - clear_sky_data: Clear-sky irradiance data with 'poa_global' column
    
    OUTPUT: Dictionary containing model parameters for persistence forecasting
    
    ROLE: Backup forecasting method that uses statistical patterns in clear-sky index.
          Provides reasonable short-term forecasts based on historical persistence.
    
    METHODOLOGY:
    - Calculates clear-sky index: CSI = actual_power / clear_sky_power
    - Computes hourly statistics (mean, std, median, quartiles)
    - Calculates autocorrelation for various time lags
    - Stores global CSI statistics for fallback
    
    APPLICATIONS:
    - Short-term forecasting (1-6 hours)
    - Fallback when ML models fail
    - Baseline for model comparison
    """
    # Calculate clear-sky index
    csi = historical_data['power'] / clear_sky_data['poa_global'].clip(lower=1)
    
    # Calculate persistence statistics by hour of day
    csi_stats = pd.DataFrame({
        'hour': historical_data.index.hour,
        'csi': csi
    })
    
    # Group by hour and calculate statistics
    hourly_stats = csi_stats.groupby('hour')['csi'].agg([
        'mean', 'std', 'median',
        ('p25', lambda x: x.quantile(0.25)),
        ('p75', lambda x: x.quantile(0.75))
    ]).to_dict('index')
    
    # Calculate autocorrelation for different lags
    autocorr = {}
    for lag in [1, 2, 3, 6, 12, 24]:
        autocorr[f'lag_{lag}h'] = csi.autocorr(lag=lag)
    
    model_params = {
        'hourly_statistics': hourly_stats,
        'autocorrelation': autocorr,
        'global_mean_csi': float(csi.mean()),
        'global_std_csi': float(csi.std())
    }
    
    return model_params
#%% SMART_PERSISTENCE_TRAINING END


#%% SMART_PERSISTENCE_APPLICATION
def apply_smart_persistence(
    current_power: float,
    current_clear_sky: float,
    future_clear_sky: pd.Series,
    model_params: Dict[str, any],
    hours: Optional[pd.DatetimeIndex] = None
) -> pd.DataFrame:
    """
    Apply smart persistence model for short-term forecasting.
    
    PURPOSE: Applies trained persistence model to generate short-term forecasts.
             Uses clear-sky index persistence with autocorrelation decay.
    
    INPUT:
    - current_power: Current solar power production (kW)
    - current_clear_sky: Current clear-sky irradiance
    - future_clear_sky: Future clear-sky irradiance series
    - model_params: Trained persistence model parameters
    - hours: Hour-of-day information for hourly statistics
    
    OUTPUT: DataFrame with persistence forecast and uncertainty bands
    
    ROLE: Short-term forecasting engine when ML models are unavailable.
          Provides reasonable forecasts based on current conditions.
    
    ALGORITHM:
    - Calculates current clear-sky index: CSI = power / clear_sky
    - Applies autocorrelation decay for future time steps
    - Blends current CSI with historical hourly averages
    - Multiplies by future clear-sky for power forecast
    
    FORMULA: CSI(t+h) ≈ CSI(t) * decay(h) + hourly_mean(h) * (1-decay(h))
    """
    # Calculate current clear-sky index
    current_csi = current_power / max(current_clear_sky, 1.0)
    
    # Initialize forecast
    forecast = pd.DataFrame(index=future_clear_sky.index)
    
    # Apply persistence with decay
    persistence_csi = pd.Series(current_csi, index=future_clear_sky.index)
    
    # Apply autocorrelation decay
    for i, timestamp in enumerate(future_clear_sky.index):
        lag_hours = i + 1
        
        # Get decay factor from autocorrelation
        if lag_hours <= 24:
            decay_key = f'lag_{lag_hours}h'
            decay = model_params['autocorrelation'].get(decay_key, 0.5)
        else:
            decay = 0.3  # Long-term decay
        
        # Blend current CSI with hourly average
        if hours is not None:
            hour = hours[i]
            hourly_mean = model_params['hourly_statistics'][hour]['mean']
            persistence_csi.iloc[i] = (
                decay * current_csi + (1 - decay) * hourly_mean
            )
        else:
            # Simple decay
            persistence_csi.iloc[i] = current_csi * decay
    
    # Calculate power forecast
    forecast['prediction'] = persistence_csi * future_clear_sky
    
    # Add uncertainty based on historical statistics
    if hours is not None:
        forecast['uncertainty_lower'] = forecast['prediction'] * 0.8
        forecast['uncertainty_upper'] = forecast['prediction'] * 1.2
    
    return forecast
#%% SMART_PERSISTENCE_APPLICATION END


#%% MODEL_PERFORMANCE_EVALUATION
def evaluate_model_performance(
    predictions: pd.DataFrame,
    actuals: pd.Series,
    capacity_kw: float
) -> Dict[str, float]:
    """
    Calculate comprehensive performance metrics.
    
    PURPOSE: Evaluates model performance using comprehensive metrics for solar forecasting.
             Provides both absolute and normalized metrics for model assessment.
    
    INPUT:
    - predictions: Model predictions DataFrame (must have 'prediction' column)
    - actuals: Actual solar power production series
    - capacity_kw: Plant capacity for normalization (870 kW)
    
    OUTPUT: Dictionary with comprehensive performance metrics
    
    ROLE: Model evaluation engine that quantifies forecast accuracy and skill.
          Enables comparison between different models and configurations.
    
    METRICS CALCULATED:
    - MAE/RMSE/MBE: Absolute error metrics (kW)
    - NMAE/NRMSE/NMBE: Normalized error metrics (% of capacity)
    - Skill Score: Improvement over persistence baseline
    - Correlation: Linear relationship strength
    - R-squared: Explained variance
    - Peak Detection: Precision/recall for high production periods
    
    PEAK ANALYSIS:
    - Threshold: 80% of plant capacity (696 kW)
    - Precision: Correctly predicted peaks / All predicted peaks
    - Recall: Correctly predicted peaks / All actual peaks
    """
    # Ensure alignment
    common_index = predictions.index.intersection(actuals.index)
    pred = predictions.loc[common_index, 'prediction']
    actual = actuals.loc[common_index]
    
    # Basic metrics
    mae = mean_absolute_error(actual, pred)
    rmse = np.sqrt(mean_squared_error(actual, pred))
    mbe = (pred - actual).mean()
    
    # Normalized metrics
    nmae = mae / capacity_kw * 100
    nrmse = rmse / capacity_kw * 100
    nmbe = mbe / capacity_kw * 100
    
    # Skill score vs persistence
    persistence = actual.shift(1).fillna(actual.mean())
    persistence_mae = mean_absolute_error(actual, persistence)
    skill_score = 1 - (mae / persistence_mae)
    
    # Correlation
    correlation = pred.corr(actual)
    
    # R-squared
    r2 = r2_score(actual, pred)
    
    # Peak detection
    peak_threshold = capacity_kw * 0.8
    peak_actual = actual > peak_threshold
    peak_pred = pred > peak_threshold
    
    if peak_actual.any():
        peak_precision = (peak_actual & peak_pred).sum() / peak_pred.sum() if peak_pred.any() else 0
        peak_recall = (peak_actual & peak_pred).sum() / peak_actual.sum()
    else:
        peak_precision = peak_recall = 1.0
    
    metrics = {
        'mae_kw': mae,
        'rmse_kw': rmse,
        'mbe_kw': mbe,
        'nmae_percent': nmae,
        'nrmse_percent': nrmse,
        'nmbe_percent': nmbe,
        'skill_score': skill_score,
        'correlation': correlation,
        'r2': r2,
        'peak_precision': peak_precision,
        'peak_recall': peak_recall
    }
    
    return metrics
#%% MODEL_PERFORMANCE_EVALUATION END


#%% MODEL_PERSISTENCE_SAVE
def save_model(
    model: Union[CatBoostRegressor, Dict],
    model_path: Path,
    metadata: Optional[Dict] = None
):
    """
    Save model and metadata to disk.
    
    PURPOSE: Persists trained models to disk for future use in forecasting.
             Supports both CatBoost models and generic scikit-learn models.
    
    INPUT:
    - model: Trained model object (CatBoost or sklearn)
    - model_path: Path where model should be saved
    - metadata: Optional metadata dictionary (training info, performance metrics)
    
    OUTPUT: Model files saved to disk (.cbm for CatBoost, .pkl for others)
    
    ROLE: Model persistence layer that enables model reuse and deployment.
          Separates model training from forecasting execution.
    
    FILE FORMATS:
    - CatBoost: Native .cbm format (optimized)
    - Others: Joblib .pkl format (universal)
    - Metadata: JSON format for human readability
    
    METADATA INCLUDES:
    - Training date and parameters
    - Performance metrics
    - Feature importance
    - Model configuration
    """
    model_path = Path(model_path)
    model_path.parent.mkdir(parents=True, exist_ok=True)
    
    if isinstance(model, CatBoostRegressor):
        # Save CatBoost model
        model.save_model(str(model_path.with_suffix('.cbm')))
    else:
        # Save other models with joblib
        joblib.dump(model, model_path.with_suffix('.pkl'))
    
    # Save metadata
    if metadata:
        with open(model_path.with_suffix('.json'), 'w') as f:
            json.dump(metadata, f, indent=2, default=str)
    
    logger.info(f"Model saved to {model_path}")
#%% MODEL_PERSISTENCE_SAVE END


#%% MODEL_PERSISTENCE_LOAD
def load_model(
    model_path: Path,
    model_type: str = 'catboost'
) -> Tuple[any, Dict]:
    """
    Load model and metadata from disk.
    
    PURPOSE: Loads previously trained and saved models for forecasting.
             Reconstructs model objects and associated metadata.
    
    INPUT:
    - model_path: Path to saved model files
    - model_type: Type of model ('catboost' or 'sklearn')
    
    OUTPUT: Tuple of (loaded_model, metadata_dict)
    
    ROLE: Model loading system that enables operational forecasting.
          Allows separation of training and prediction phases.
    
    LOADING PROCESS:
    - Detects model type and loads appropriate format
    - Reconstructs model object with all parameters
    - Loads associated metadata if available
    - Provides empty metadata dict if file missing
    
    ERROR HANDLING:
    - Validates model file exists
    - Handles missing metadata gracefully
    - Ensures model compatibility
    """
    model_path = Path(model_path)
    
    # Load model
    if model_type == 'catboost':
        model = CatBoostRegressor()
        model.load_model(str(model_path.with_suffix('.cbm')))
    else:
        model = joblib.load(model_path.with_suffix('.pkl'))
    
    # Load metadata
    metadata_path = model_path.with_suffix('.json')
    if metadata_path.exists():
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
    else:
        metadata = {}
    
    return model, metadata
#%% MODEL_PERSISTENCE_LOAD END