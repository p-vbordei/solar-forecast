"""Solar irradiance estimation utilities"""

import pandas as pd
import numpy as np
from datetime import datetime
import pvlib
import logging

logger = logging.getLogger(__name__)


def estimate_ghi_from_cloud_cover(
    location_lat: float,
    location_lon: float,
    timestamps: pd.DatetimeIndex,
    cloud_cover: pd.Series,
    altitude: float = 0
) -> pd.DataFrame:
    """
    Estimate GHI (Global Horizontal Irradiance) from cloud cover percentage.

    Uses PVLIB to calculate clear-sky GHI and applies cloud cover reduction.

    Args:
        location_lat: Latitude in degrees
        location_lon: Longitude in degrees
        timestamps: DatetimeIndex with timezone-aware timestamps
        cloud_cover: Cloud cover percentage (0-100)
        altitude: Altitude in meters

    Returns:
        DataFrame with columns: ghi, dni, dhi
    """
    # Create location object
    location = pvlib.location.Location(
        latitude=location_lat,
        longitude=location_lon,
        altitude=altitude
    )

    # Calculate solar position
    solar_position = location.get_solarposition(timestamps)

    # Calculate clear-sky irradiance
    clear_sky = location.get_clearsky(timestamps, model='ineichen')

    # Apply cloud cover reduction
    # Simple model: GHI = Clear_Sky_GHI * (1 - cloud_cover/100 * reduction_factor)
    # reduction_factor varies with cloud type, using 0.75 as average
    reduction_factor = 0.75
    cloud_factor = 1 - (cloud_cover / 100 * reduction_factor)

    # Ensure cloud factor is between 0.1 and 1
    cloud_factor = cloud_factor.clip(lower=0.1, upper=1.0)

    # Calculate estimated irradiance
    estimated_ghi = clear_sky['ghi'] * cloud_factor
    estimated_dni = clear_sky['dni'] * cloud_factor * 0.8  # DNI more affected by clouds
    estimated_dhi = clear_sky['dhi'] + (clear_sky['ghi'] - estimated_ghi) * 0.5  # Diffuse increases with clouds

    # Set to 0 when sun is below horizon
    sun_up = solar_position['elevation'] > 0
    estimated_ghi = estimated_ghi.where(sun_up, 0)
    estimated_dni = estimated_dni.where(sun_up, 0)
    estimated_dhi = estimated_dhi.where(sun_up, 0)

    return pd.DataFrame({
        'ghi': estimated_ghi,
        'dni': estimated_dni,
        'dhi': estimated_dhi
    })


def enhance_weather_data_with_irradiance(
    weather_df: pd.DataFrame,
    location_lat: float,
    location_lon: float,
    altitude: float = 0
) -> pd.DataFrame:
    """
    Add estimated solar irradiance to weather data if missing.

    Args:
        weather_df: Weather DataFrame with timestamp index
        location_lat: Latitude in degrees
        location_lon: Longitude in degrees
        altitude: Altitude in meters

    Returns:
        Enhanced weather DataFrame with ghi, dni, dhi columns
    """
    # Check if GHI data exists and is not all null/zero
    has_valid_ghi = 'ghi' in weather_df.columns and weather_df['ghi'].notna().any() and (weather_df['ghi'] > 0).any()

    if has_valid_ghi:
        logger.info("Weather data already has valid GHI values")
        return weather_df

    logger.info("GHI data missing or all zero, estimating from cloud cover")

    # Ensure we have cloud cover data
    if 'cloud_cover' not in weather_df.columns:
        logger.warning("No cloud cover data, using 30% default")
        weather_df['cloud_cover'] = 30

    # Fill missing cloud cover with interpolation
    weather_df['cloud_cover'] = weather_df['cloud_cover'].interpolate(method='linear').fillna(30)

    # Ensure timestamps are timezone-aware
    if weather_df.index.tz is None:
        weather_df.index = weather_df.index.tz_localize('UTC')

    # Calculate estimated irradiance
    irradiance = estimate_ghi_from_cloud_cover(
        location_lat=location_lat,
        location_lon=location_lon,
        timestamps=weather_df.index,
        cloud_cover=weather_df['cloud_cover'],
        altitude=altitude
    )

    # Add or replace irradiance columns
    weather_df['ghi'] = irradiance['ghi']
    weather_df['dni'] = irradiance['dni']
    weather_df['dhi'] = irradiance['dhi']

    logger.info(f"Added estimated irradiance: GHI avg={weather_df['ghi'].mean():.1f} W/m²")

    return weather_df