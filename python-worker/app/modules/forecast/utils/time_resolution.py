"""
Time resolution utilities for forecast generation
Handles conversion between hourly and 15-minute intervals
"""

import pandas as pd
import numpy as np
from typing import Optional, Literal
from datetime import datetime, timedelta

def resample_weather_to_15min(weather_df: pd.DataFrame) -> pd.DataFrame:
    """
    Resample hourly weather data to 15-minute intervals using interpolation

    Args:
        weather_df: DataFrame with hourly weather data (index must be datetime)

    Returns:
        DataFrame with 15-minute interval weather data
    """
    if weather_df.empty:
        return weather_df

    # Ensure datetime index
    if not isinstance(weather_df.index, pd.DatetimeIndex):
        if 'timestamp' in weather_df.columns:
            weather_df = weather_df.set_index('timestamp')
        else:
            raise ValueError("Weather data must have datetime index or timestamp column")

    # Create 15-minute range
    start_time = weather_df.index[0]
    end_time = weather_df.index[-1]
    new_index = pd.date_range(start=start_time, end=end_time, freq='15min')

    # Resample using different methods for different variables
    resampled = pd.DataFrame(index=new_index)

    # Variables that should be interpolated linearly
    linear_vars = ['temp_air', 'temperature', 'humidity', 'pressure', 'wind_speed']

    # Solar radiation requires special handling (cubic interpolation for smooth curves)
    solar_vars = ['ghi', 'dni', 'dhi', 'gti']

    # Binary/categorical variables (use forward fill)
    categorical_vars = ['cloud_cover']

    for col in weather_df.columns:
        if col in linear_vars:
            # Linear interpolation for meteorological variables
            resampled[col] = weather_df[col].resample('15min').interpolate(method='linear')
        elif col in solar_vars:
            # Cubic interpolation for solar radiation (smoother curves)
            # But ensure no negative values
            interpolated = weather_df[col].resample('15min').interpolate(method='cubic')
            resampled[col] = interpolated.clip(lower=0)
        elif col in categorical_vars:
            # Forward fill for categorical
            resampled[col] = weather_df[col].resample('15min').ffill()
        else:
            # Default: linear interpolation
            resampled[col] = weather_df[col].resample('15min').interpolate(method='linear')

    # Ensure solar radiation is zero at night (sun below horizon)
    # Simple check: if GHI is very low or zero, set all solar to zero
    if 'ghi' in resampled.columns:
        night_mask = resampled['ghi'] < 1  # Less than 1 W/m² is essentially night
        for solar_var in ['ghi', 'dni', 'dhi', 'gti']:
            if solar_var in resampled.columns:
                resampled.loc[night_mask, solar_var] = 0

    return resampled


def resample_forecast_to_15min(forecast_df: pd.DataFrame) -> pd.DataFrame:
    """
    Resample hourly forecast data to 15-minute intervals

    Args:
        forecast_df: DataFrame with hourly forecast data

    Returns:
        DataFrame with 15-minute interval forecast data
    """
    if forecast_df.empty:
        return forecast_df

    # Ensure datetime index
    if not isinstance(forecast_df.index, pd.DatetimeIndex):
        if 'timestamp' in forecast_df.columns:
            forecast_df = forecast_df.set_index('timestamp')
        else:
            raise ValueError("Forecast data must have datetime index or timestamp column")

    # Create 15-minute range
    start_time = forecast_df.index[0]
    end_time = forecast_df.index[-1]
    new_index = pd.date_range(start=start_time, end=end_time, freq='15min')

    # Resample forecast values
    resampled = pd.DataFrame(index=new_index)

    # Power/energy variables - use cubic interpolation for smooth curves
    power_vars = ['prediction', 'power_mw', 'power_kw', 'energy_mwh']

    # Confidence bounds and quantiles
    quantile_vars = ['p10', 'p25', 'p50', 'p75', 'p90',
                     'uncertainty_lower', 'uncertainty_upper',
                     'confidence_lower', 'confidence_upper']

    # Metadata (forward fill)
    metadata_vars = ['model_type', 'model_version', 'location_id']

    for col in forecast_df.columns:
        if col in power_vars + quantile_vars:
            # Cubic interpolation for smooth power curves
            interpolated = forecast_df[col].resample('15min').interpolate(method='cubic')
            # Ensure non-negative power
            resampled[col] = interpolated.clip(lower=0)
        elif col in metadata_vars:
            # Forward fill metadata
            resampled[col] = forecast_df[col].resample('15min').ffill()
        else:
            # Default: linear interpolation
            resampled[col] = forecast_df[col].resample('15min').interpolate(method='linear')

    # Adjust energy values for 15-minute intervals (divide by 4 since original was hourly)
    if 'energy_mwh' in resampled.columns:
        resampled['energy_mwh'] = resampled['energy_mwh'] / 4

    return resampled


def aggregate_15min_to_hourly(df_15min: pd.DataFrame,
                              aggregation: Literal['mean', 'sum', 'max'] = 'mean') -> pd.DataFrame:
    """
    Aggregate 15-minute data back to hourly if needed

    Args:
        df_15min: DataFrame with 15-minute data
        aggregation: Aggregation method ('mean', 'sum', or 'max')

    Returns:
        DataFrame with hourly data
    """
    if df_15min.empty:
        return df_15min

    # Ensure datetime index
    if not isinstance(df_15min.index, pd.DatetimeIndex):
        if 'timestamp' in df_15min.columns:
            df_15min = df_15min.set_index('timestamp')

    # Resample to hourly
    if aggregation == 'mean':
        hourly = df_15min.resample('1H').mean()
    elif aggregation == 'sum':
        hourly = df_15min.resample('1H').sum()
    elif aggregation == 'max':
        hourly = df_15min.resample('1H').max()
    else:
        raise ValueError(f"Unknown aggregation method: {aggregation}")

    return hourly


def create_15min_forecast_template(start_time: datetime,
                                   hours: int,
                                   location_id: str) -> pd.DataFrame:
    """
    Create an empty 15-minute forecast template

    Args:
        start_time: Start time for forecast
        hours: Number of hours to forecast
        location_id: Location ID

    Returns:
        DataFrame with 15-minute intervals and basic structure
    """
    # Create 15-minute intervals
    intervals = hours * 4  # 4 intervals per hour
    time_index = pd.date_range(start=start_time, periods=intervals, freq='15min')

    # Create template DataFrame
    template = pd.DataFrame({
        'timestamp': time_index,
        'location_id': location_id,
        'power_mw': 0.0,
        'energy_mwh': 0.0,
        'capacity_factor': 0.0,
        'confidence_score': 0.95,
        'model_type': 'PHYSICS',
        'resolution': '15MIN'
    })

    template.set_index('timestamp', inplace=True)

    return template
