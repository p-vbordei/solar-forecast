#%% MODULE_HEADER
"""
Feature engineering for solar forecasting ML models.
Prepares features for CatBoost and other ML algorithms.
"""
#%% MODULE_HEADER END
#%% IMPORTS
"""
PURPOSE: Import required libraries for ML feature engineering
INPUT: System libraries and dependencies
OUTPUT: Available functions and classes
ROLE: Provides core functionality for feature creation, temporal encoding, and data manipulation
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple
import pvlib
from pvlib.location import Location
#%% IMPORTS END


#%% PREPARE_ML_FEATURES
def prepare_ml_features(
    weather_data: pd.DataFrame,
    solar_position: pd.DataFrame,
    poa_irradiance: pd.DataFrame,
    config: Dict[str, any],
    include_lag_features: bool = True,
    lag_hours: List[int] = [1, 2, 3, 6, 12, 24]
) -> pd.DataFrame:
    """
    PURPOSE: Create comprehensive ML feature set for solar forecasting
    
    This function replicates the EXACT same feature engineering logic 
    used in the training script to ensure perfect alignment.
    
    INPUT:
        - weather_data: DataFrame with weather variables (temp, humidity, irradiance)
        - solar_position: DataFrame with solar angles (elevation, azimuth, zenith)
        - poa_irradiance: DataFrame with plane-of-array irradiance components
        - config: Client configuration with plant specifications
        - include_lag_features: Whether to include time-lagged features
        - lag_hours: List of lag periods to create
    
    OUTPUT:
        - DataFrame with 76 engineered features for ML models
    
    ROLE: Central feature engineering for CatBoost models - creates all features
          needed for accurate solar production forecasting
    
    Features include:
    - Basic weather features (10 features)
    - Solar position features (5 features)
    - Temporal features (5 features)
    - Derived solar features (3 features)
    - Clear-sky and cloud features (3 features)
    - Temperature effects (2 features)
    - Wind effects (3 features)
    - Lag features (24 features: 4 variables × 6 lag hours)
    - Rolling statistics (16 features: 4 variables × 2 windows × 2 stats)
    - Interaction features (3 features)
    - Irradiance components (3 features)
    
    Total: 76 features (matches training script exactly)
    """
    features_df = pd.DataFrame(index=weather_data.index)
    
    # 1. Basic weather features (10 features)
    weather_features = [
        'temp_air', 'relative_humidity', 'cloud_cover', 'ghi', 'dni', 'dhi',
        'wind_speed', 'wind_direction', 'pressure', 'precipitation'
    ]
    for feat in weather_features:
        if feat in weather_data.columns:
            features_df[feat] = weather_data[feat]
        else:
            features_df[feat] = 0  # Fill missing with 0
    
    # 2. Solar position features (5 features)
    solar_features = [
        'elevation', 'azimuth', 'apparent_elevation', 'zenith', 'apparent_zenith'
    ]
    for feat in solar_features:
        if feat in solar_position.columns:
            features_df[f'solar_{feat}'] = solar_position[feat]
        else:
            features_df[f'solar_{feat}'] = 0
    
    # 3. Temporal features (5 features)
    features_df['hour'] = features_df.index.hour
    features_df['day_of_year'] = features_df.index.dayofyear
    features_df['month'] = features_df.index.month
    features_df['is_weekend'] = (features_df.index.weekday >= 5).astype(int)
    features_df['season'] = ((features_df.index.month % 12) // 3).astype(int)
    
    # 4. Derived solar features (3 features)
    features_df['solar_hour_angle'] = 15 * (features_df.index.hour - 12)
    features_df['airmass'] = 1 / np.cos(np.radians(90 - solar_position['apparent_elevation'].clip(0.1, 90)))
    features_df['airmass'] = features_df['airmass'].clip(1, 10)  # Reasonable limits
    
    # 5. Clear-sky index and cloud enhancement (3 features)
    # Calculate clear-sky GHI using simple model
    clear_sky_ghi = 1000 * np.sin(np.radians(solar_position['apparent_elevation'].clip(0, 90)))
    features_df['clear_sky_ghi'] = clear_sky_ghi
    features_df['clear_sky_index'] = (features_df['ghi'] / features_df['clear_sky_ghi'].clip(1, 2000)).clip(0, 2)
    
    # Cloud enhancement detection
    features_df['cloud_enhancement'] = (features_df['clear_sky_index'] > 1.2).astype(int)
    
    # 6. Temperature effects (2 features)
    features_df['temp_deviation'] = features_df['temp_air'] - 25  # Deviation from STC
    features_df['temp_effect'] = 1 + 0.004 * features_df['temp_deviation']  # Temperature coefficient
    
    # 7. Wind effects (3 features)
    features_df['wind_cooling'] = np.log1p(features_df['wind_speed'])  # Cooling effect
    features_df['wind_direction_sin'] = np.sin(np.radians(features_df['wind_direction']))
    features_df['wind_direction_cos'] = np.cos(np.radians(features_df['wind_direction']))
    
    # 8. Lag features (24 features: 4 variables × 6 lag hours)
    # NOTE: For prediction, we can't use production_kw lag features since we don't have future production
    # We'll use 0 for production lag features during prediction
    lag_hours = [1, 2, 3, 6, 12, 24]
    lag_variables = ['production_kw', 'ghi', 'cloud_cover', 'temp_air']
    
    for var in lag_variables:
        if var in weather_data.columns:
            for lag in lag_hours:
                features_df[f'{var}_lag_{lag}h'] = weather_data[var].shift(lag)
        elif var == 'production_kw':
            # For production lag features during prediction, use realistic physics-based estimate
            # This provides reasonable values instead of 0, matching the improved physics model scale
            for lag in lag_hours:
                # Use improved physics-based production estimate matching the actual PVLIB output
                # Updated for realistic scale: ~65% efficiency of capacity under good conditions
                # This matches the improved physics model that produces ~571 kW peaks
                efficiency_factor = 0.65  # Improved to match realistic PVLIB output scale
                physics_production = features_df['ghi'] * efficiency_factor
                features_df[f'{var}_lag_{lag}h'] = physics_production.shift(lag).fillna(0)
        else:
            # For other missing variables, fill with 0
            for lag in lag_hours:
                features_df[f'{var}_lag_{lag}h'] = 0
    
    # 9. Rolling statistics (16 features: 4 variables × 2 windows × 2 stats)
    rolling_windows = [3, 6]
    rolling_variables = ['ghi', 'cloud_cover', 'temp_air', 'wind_speed']
    
    for var in rolling_variables:
        if var in weather_data.columns:
            for window in rolling_windows:
                features_df[f'{var}_rolling_{window}h_mean'] = weather_data[var].rolling(window, center=True).mean()
                features_df[f'{var}_rolling_{window}h_std'] = weather_data[var].rolling(window, center=True).std()
        else:
            for window in rolling_windows:
                features_df[f'{var}_rolling_{window}h_mean'] = 0
                features_df[f'{var}_rolling_{window}h_std'] = 0
    
    # 10. Interaction features (3 features)
    features_df['ghi_temp_interaction'] = features_df['ghi'] * features_df['temp_effect']
    features_df['cloud_wind_interaction'] = features_df['cloud_cover'] * features_df['wind_speed']
    features_df['elevation_ghi_interaction'] = features_df['solar_elevation'] * features_df['ghi']
    
    # 11. Irradiance components (3 features)
    features_df['direct_fraction'] = features_df['dni'] / features_df['ghi'].clip(1, 2000)
    features_df['diffuse_fraction'] = features_df['dhi'] / features_df['ghi'].clip(1, 2000)
    features_df['beam_factor'] = features_df['dni'] * np.cos(np.radians(features_df['solar_zenith']))
    
    # Clean up features (same as training script)
    features_df = features_df.fillna(0)  # Fill NaN values with 0
    features_df = features_df.replace([np.inf, -np.inf], 0)  # Replace infinity with 0
    
    return features_df
#%% PREPARE_ML_FEATURES END


#%% ADD_TEMPORAL_FEATURES
def add_temporal_features(features: pd.DataFrame) -> pd.DataFrame:
    """
    PURPOSE: Add comprehensive time-based features for temporal pattern recognition
    
    INPUT:
        - features: DataFrame with datetime index
    
    OUTPUT:
        - DataFrame with additional temporal features (hour, day, month, season)
    
    ROLE: Captures cyclical patterns in solar production throughout day, week, 
          month, and year for improved ML model performance
    """
    # Basic temporal features
    features['hour'] = features.index.hour
    features['day_of_year'] = features.index.dayofyear
    features['day_of_week'] = features.index.dayofweek
    features['month'] = features.index.month
    features['quarter'] = features.index.quarter
    
    # Time since sunrise/sunset (requires calculation)
    # This would be calculated in the main pipeline
    
    # Season encoding (Northern Hemisphere)
    features['season'] = features['month'].map({
        12: 0, 1: 0, 2: 0,  # Winter
        3: 1, 4: 1, 5: 1,   # Spring
        6: 2, 7: 2, 8: 2,   # Summer
        9: 3, 10: 3, 11: 3  # Fall
    })
    
    # Business hours indicator
    features['is_business_hours'] = (
        (features['hour'] >= 8) & (features['hour'] <= 17) &
        (features['day_of_week'] < 5)
    ).astype(int)
    
    return features
#%% ADD_TEMPORAL_FEATURES END


#%% ADD_CLEARSKY_FEATURES
def add_clearsky_features(
    features: pd.DataFrame,
    weather_data: pd.DataFrame,
    config: Dict[str, any]
) -> pd.DataFrame:
    """
    PURPOSE: Add clear-sky index and cloud-related features for irradiance analysis
    
    INPUT:
        - features: DataFrame to add features to
        - weather_data: DataFrame with clear-sky irradiance values
        - config: Client configuration
    
    OUTPUT:
        - DataFrame with clear-sky indices and cloud enhancement indicators
    
    ROLE: Quantifies cloud effects on solar irradiance through clear-sky comparison,
          essential for understanding and predicting cloud-related production changes
    """
    # Check if clear-sky values are already in weather data
    if all(col in weather_data.columns for col in ['ghi_clear', 'dni_clear', 'dhi_clear']):
        # Clear-sky indices
        features['ghi_clearsky_index'] = (
            weather_data['ghi'] / weather_data['ghi_clear'].clip(lower=1)
        ).clip(0, 1.5)
        
        features['dni_clearsky_index'] = (
            weather_data['dni'] / weather_data['dni_clear'].clip(lower=1)
        ).clip(0, 1.5)
        
        features['dhi_clearsky_index'] = (
            weather_data['dhi'] / weather_data['dhi_clear'].clip(lower=1)
        ).clip(0, 2.0)  # DHI can exceed clear-sky under certain conditions
        
        # Clear-sky deviation
        features['ghi_clearsky_deviation'] = (
            weather_data['ghi'] - weather_data['ghi_clear']
        )
    
    return features
#%% ADD_CLEARSKY_FEATURES END


#%% ADD_DERIVED_FEATURES
def add_derived_features(features: pd.DataFrame) -> pd.DataFrame:
    """
    PURPOSE: Create derived meteorological features from basic weather variables
    
    INPUT:
        - features: DataFrame with basic weather features
    
    OUTPUT:
        - DataFrame with derived features (temperature effects, wind categories,
          humidity indicators, atmospheric parameters)
    
    ROLE: Transforms basic weather data into more meaningful features that capture
          physical relationships affecting solar panel performance
    """
    # Temperature features
    if 'temp_air' in features.columns:
        # Temperature squared (non-linear effects)
        features['temp_air_squared'] = features['temp_air'] ** 2
        
        # Temperature deviation from optimal (25°C)
        features['temp_deviation'] = np.abs(features['temp_air'] - 25.0)
    
    # Wind features
    if 'wind_speed' in features.columns:
        # Wind speed categories
        features['wind_calm'] = (features['wind_speed'] < 1).astype(int)
        features['wind_moderate'] = (
            (features['wind_speed'] >= 1) & (features['wind_speed'] < 5)
        ).astype(int)
        features['wind_strong'] = (features['wind_speed'] >= 5).astype(int)
        
        # Wind cooling effect
        if 'temp_air' in features.columns:
            features['wind_cooling'] = features['wind_speed'] * features['temp_air']
    
    # Humidity features
    if 'relative_humidity' in features.columns:
        # High humidity indicator
        features['high_humidity'] = (features['relative_humidity'] > 80).astype(int)
        
        # Humidity categories
        features['humidity_low'] = (features['relative_humidity'] < 40).astype(int)
        features['humidity_mid'] = (
            (features['relative_humidity'] >= 40) & 
            (features['relative_humidity'] <= 70)
        ).astype(int)
    
    # Atmospheric features
    if all(col in features.columns for col in ['temp_air', 'relative_humidity']):
        # Approximate dew point
        features['dew_point'] = calculate_dew_point(
            features['temp_air'],
            features['relative_humidity']
        )
        
        # Vapor pressure deficit
        features['vpd'] = calculate_vpd(
            features['temp_air'],
            features['relative_humidity']
        )
    
    # Irradiance ratios
    if all(col in features.columns for col in ['ghi', 'dni', 'dhi']):
        # Direct fraction
        features['direct_fraction'] = (
            features['dni'] / features['ghi'].clip(lower=1)
        ).clip(0, 1)
        
        # Diffuse fraction
        features['diffuse_fraction'] = (
            features['dhi'] / features['ghi'].clip(lower=1)
        ).clip(0, 1)
        
        # Clearness index (if extraterrestrial radiation available)
        if 'solar_zenith' in features.columns:
            # Simple approximation of extraterrestrial radiation
            solar_constant = 1367  # W/m²
            zenith_rad = np.radians(features['solar_zenith'])
            features['clearness_index'] = (
                features['ghi'] / (solar_constant * np.cos(zenith_rad)).clip(lower=1)
            ).clip(0, 1.2)
    
    return features
#%% ADD_DERIVED_FEATURES END


#%% ADD_LAG_FEATURES
def add_lag_features(
    features: pd.DataFrame,
    lag_hours: List[int] = [1, 2, 3, 6, 12, 24]
) -> pd.DataFrame:
    """
    PURPOSE: Add time-lagged features to capture temporal dependencies
    
    INPUT:
        - features: DataFrame with current-time features
        - lag_hours: List of lag periods to create (1, 2, 3, 6, 12, 24 hours)
    
    OUTPUT:
        - DataFrame with lagged features and difference features
    
    ROLE: Captures temporal persistence and trends in weather patterns,
          essential for understanding how past conditions affect current production
    """
    # Select features to lag (avoid lagging time features)
    lag_columns = [
        'ghi', 'dni', 'dhi', 'temp_air', 'wind_speed',
        'cloud_cover', 'ghi_clearsky_index'
    ]
    
    for col in lag_columns:
        if col in features.columns:
            for lag in lag_hours:
                features[f'{col}_lag_{lag}h'] = features[col].shift(lag)
    
    # Add difference features (change from previous period)
    for col in ['ghi', 'temp_air', 'cloud_cover']:
        if col in features.columns:
            features[f'{col}_diff_1h'] = features[col].diff(1)
            features[f'{col}_diff_3h'] = features[col].diff(3)
    
    return features
#%% ADD_LAG_FEATURES END


#%% ADD_ROLLING_FEATURES
def add_rolling_features(
    features: pd.DataFrame,
    windows: List[int] = [3, 6, 12]
) -> pd.DataFrame:
    """
    PURPOSE: Add rolling window statistics to capture short-term trends
    
    INPUT:
        - features: DataFrame with time-series features
        - windows: List of rolling window sizes (3, 6, 12 hours)
    
    OUTPUT:
        - DataFrame with rolling mean, std, max, min features
    
    ROLE: Captures short-term variability and trends in weather conditions,
          helping models understand changing weather patterns
    """
    # Select features for rolling statistics
    rolling_columns = ['ghi', 'temp_air', 'wind_speed', 'cloud_cover']
    
    for col in rolling_columns:
        if col in features.columns:
            for window in windows:
                # Rolling mean
                features[f'{col}_rolling_mean_{window}h'] = (
                    features[col].rolling(window=window, min_periods=1).mean()
                )
                
                # Rolling std
                features[f'{col}_rolling_std_{window}h'] = (
                    features[col].rolling(window=window, min_periods=1).std()
                )
                
                # Rolling max/min
                features[f'{col}_rolling_max_{window}h'] = (
                    features[col].rolling(window=window, min_periods=1).max()
                )
                features[f'{col}_rolling_min_{window}h'] = (
                    features[col].rolling(window=window, min_periods=1).min()
                )
    
    return features
#%% ADD_ROLLING_FEATURES END


#%% ADD_INTERACTION_FEATURES
def add_interaction_features(features: pd.DataFrame) -> pd.DataFrame:
    """
    PURPOSE: Create interaction features that capture physical relationships
    
    INPUT:
        - features: DataFrame with base features
    
    OUTPUT:
        - DataFrame with interaction features (elevation×GHI, temp×GHI, etc.)
    
    ROLE: Captures complex physical relationships between multiple variables
          that affect solar production (e.g., temperature-irradiance thermal effects)
    """
    # Solar elevation and irradiance interaction
    if all(col in features.columns for col in ['solar_elevation', 'ghi']):
        features['elevation_ghi_interaction'] = (
            features['solar_elevation'] * features['ghi'] / 1000
        )
    
    # Temperature and irradiance interaction (thermal effects)
    if all(col in features.columns for col in ['temp_air', 'ghi']):
        features['temp_ghi_interaction'] = (
            features['temp_air'] * features['ghi'] / 1000
        )
    
    # Cloud cover and diffuse fraction interaction
    if all(col in features.columns for col in ['cloud_cover', 'diffuse_fraction']):
        features['cloud_diffuse_interaction'] = (
            features['cloud_cover'] * features['diffuse_fraction']
        )
    
    # Wind and temperature interaction (cooling effect)
    if all(col in features.columns for col in ['wind_speed', 'temp_deviation']):
        features['wind_temp_cooling'] = (
            features['wind_speed'] * features['temp_deviation']
        )
    
    return features
#%% ADD_INTERACTION_FEATURES END


#%% ADD_CYCLICAL_ENCODING
def add_cyclical_encoding(features: pd.DataFrame) -> pd.DataFrame:
    """
    PURPOSE: Add cyclical encoding for temporal features using sine/cosine
    
    INPUT:
        - features: DataFrame with temporal features (hour, day, month)
    
    OUTPUT:
        - DataFrame with sine/cosine encoded temporal features
    
    ROLE: Properly encodes cyclical time features for ML models,
          ensuring 23:00 and 01:00 are treated as adjacent, not distant
    
    Better than one-hot encoding for cyclic features.
    """
    # Hour of day
    features['hour_sin'] = np.sin(2 * np.pi * features['hour'] / 24)
    features['hour_cos'] = np.cos(2 * np.pi * features['hour'] / 24)
    
    # Day of year
    features['day_sin'] = np.sin(2 * np.pi * features['day_of_year'] / 365.25)
    features['day_cos'] = np.cos(2 * np.pi * features['day_of_year'] / 365.25)
    
    # Month
    features['month_sin'] = np.sin(2 * np.pi * features['month'] / 12)
    features['month_cos'] = np.cos(2 * np.pi * features['month'] / 12)
    
    # Day of week
    features['dow_sin'] = np.sin(2 * np.pi * features['day_of_week'] / 7)
    features['dow_cos'] = np.cos(2 * np.pi * features['day_of_week'] / 7)
    
    return features
#%% ADD_CYCLICAL_ENCODING END


#%% CALCULATE_DEW_POINT
def calculate_dew_point(temp_air: pd.Series, relative_humidity: pd.Series) -> pd.Series:
    """
    PURPOSE: Calculate dew point temperature using Magnus formula
    
    INPUT:
        - temp_air: Air temperature series (°C)
        - relative_humidity: Relative humidity series (%)
    
    OUTPUT:
        - Series with dew point temperatures (°C)
    
    ROLE: Provides atmospheric moisture indicator that affects solar panel
          performance through condensation and atmospheric transparency
    """
    a = 17.27
    b = 237.7
    
    alpha = ((a * temp_air) / (b + temp_air)) + np.log(relative_humidity / 100.0)
    dew_point = (b * alpha) / (a - alpha)
    
    return dew_point
#%% CALCULATE_DEW_POINT END


#%% CALCULATE_VPD
def calculate_vpd(temp_air: pd.Series, relative_humidity: pd.Series) -> pd.Series:
    """
    PURPOSE: Calculate Vapor Pressure Deficit (VPD) in kPa
    
    INPUT:
        - temp_air: Air temperature series (°C)
        - relative_humidity: Relative humidity series (%)
    
    OUTPUT:
        - Series with VPD values (kPa)
    
    ROLE: Atmospheric parameter that affects solar panel cooling and
          atmospheric transparency, important for performance modeling
    """
    # Saturation vapor pressure (Tetens equation)
    svp = 0.61078 * np.exp((17.27 * temp_air) / (temp_air + 237.3))
    
    # Actual vapor pressure
    avp = svp * (relative_humidity / 100.0)
    
    # VPD
    vpd = svp - avp
    
    return vpd
#%% CALCULATE_VPD END


#%% SELECT_FEATURES_FOR_MODEL
def select_features_for_model(
    features: pd.DataFrame,
    model_type: str = 'catboost',
    target_variable: Optional[str] = None
) -> List[str]:
    """
    PURPOSE: Select appropriate features based on ML model type
    
    INPUT:
        - features: DataFrame with all available features
        - model_type: Type of ML model ('catboost', 'linear', etc.)
        - target_variable: Name of target variable to exclude
    
    OUTPUT:
        - List of selected feature names for the model
    
    ROLE: Optimizes feature selection for different ML algorithms,
          removing redundant features and selecting model-appropriate subsets
    """
    # Remove any target variable from features
    feature_cols = features.columns.tolist()
    if target_variable and target_variable in feature_cols:
        feature_cols.remove(target_variable)
    
    if model_type == 'catboost':
        # CatBoost can handle many features
        # Remove only highly correlated or redundant features
        exclude_patterns = [
            'rolling_min_',  # Often redundant with rolling_mean
            'hour',  # Use cyclical encoding instead
            'day_of_year',  # Use cyclical encoding instead
            'month',  # Use cyclical encoding instead
        ]
        
        selected_features = []
        for col in feature_cols:
            if not any(pattern in col for pattern in exclude_patterns):
                selected_features.append(col)
        
    elif model_type == 'linear':
        # For linear models, use fewer, more interpretable features
        selected_features = [
            'ghi', 'dni', 'dhi', 'temp_air', 'wind_speed',
            'solar_elevation', 'hour_sin', 'hour_cos',
            'day_sin', 'day_cos', 'ghi_clearsky_index'
        ]
        selected_features = [f for f in selected_features if f in feature_cols]
    
    else:
        # Default: use all features
        selected_features = feature_cols
    
    return selected_features
#%% SELECT_FEATURES_FOR_MODEL END


#%% CREATE_FEATURE_IMPORTANCE_REPORT
def create_feature_importance_report(
    feature_importance: Dict[str, float],
    top_n: int = 20
) -> pd.DataFrame:
    """
    PURPOSE: Create formatted feature importance report from ML model
    
    INPUT:
        - feature_importance: Dictionary of feature names and importance scores
        - top_n: Number of top features to include in report
    
    OUTPUT:
        - DataFrame with ranked features, importance scores, and percentages
    
    ROLE: Provides interpretable analysis of which features drive model predictions,
          essential for model validation and feature engineering improvement
    """
    # Sort by importance
    sorted_features = sorted(
        feature_importance.items(),
        key=lambda x: x[1],
        reverse=True
    )[:top_n]
    
    # Create DataFrame
    report = pd.DataFrame(
        sorted_features,
        columns=['Feature', 'Importance']
    )
    
    # Add percentage
    total_importance = sum(feature_importance.values())
    report['Percentage'] = (report['Importance'] / total_importance * 100).round(2)
    
    # Add cumulative percentage
    report['Cumulative %'] = report['Percentage'].cumsum()
    
    return report
#%% CREATE_FEATURE_IMPORTANCE_REPORT END