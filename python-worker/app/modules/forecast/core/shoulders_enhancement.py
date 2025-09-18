#%% MODULE_HEADER
"""
Enhanced shoulders (sunrise/sunset) handling for solar forecasting.
Uses PVLIB's built-in functions for all calculations.

PURPOSE: Implements sophisticated dawn/dusk transition modeling to improve forecast accuracy
         during critical shoulder periods when weather APIs often underestimate production
INPUT: Forecast DataFrames with solar position and basic power calculations
OUTPUT: Enhanced forecasts with improved sunrise/sunset transitions and physical constraints
ROLE: Critical component for accurate shoulder period modeling in solar forecasting pipeline
"""
import numpy as np
import pandas as pd
from typing import Dict, Optional, Tuple
import pvlib
from pvlib.location import Location
from scipy.ndimage import gaussian_filter1d
import logging

logger = logging.getLogger(__name__)
#%% MODULE_HEADER END


#%% MAIN_ENHANCEMENT_PIPELINE
def enhance_forecast_shoulders(
    forecast: pd.DataFrame,
    location: Location,
    config: Dict[str, any],
    smooth_minutes: int = 30
) -> pd.DataFrame:
    """
    Apply sophisticated shoulders enhancement to forecast.

    PURPOSE: Orchestrates the complete shoulder period enhancement pipeline for solar forecasting
    INPUT: Raw forecast DataFrame with basic solar position and power calculations
    OUTPUT: Enhanced forecast with improved dawn/dusk transitions and physical constraints
    ROLE: Main entry point for shoulder enhancement - coordinates all enhancement stages

    Parameters:
    - forecast: DataFrame with forecast data including solar_elevation
    - location: PVLIB Location object
    - config: Performance configuration with dawn_dusk_factor and horizon_shading
    - smooth_minutes: Minutes to smooth transitions (default 30)

    Returns:
    - Enhanced forecast with improved shoulders handling

    Enhancement Pipeline:
    1. Horizon shading (terrain blocking)
    2. Atmospheric refraction effects
    3. Dawn/dusk performance factors
    4. Power transition smoothing
    5. Physical constraint enforcement
    """
    enhanced = forecast.copy()

    # Apply horizon shading effects
    enhanced = apply_horizon_shading(
        enhanced,
        config.get('horizon_shading', {})
    )

    # Dawn irradiance enhancement now handled in main forecast script
    # enhanced = enhance_dawn_irradiance(enhanced, location)

    # Apply atmospheric refraction correction using PVLIB
    enhanced = apply_refraction_effects(enhanced, location)

    # Apply dawn/dusk performance factors
    enhanced = apply_dawn_dusk_factors(
        enhanced,
        config.get('dawn_dusk_factor', 0.85)
    )

    # Smooth transitions
    enhanced = smooth_power_transitions(
        enhanced,
        smooth_minutes=smooth_minutes
    )

    # Apply physical constraints
    enhanced = apply_physical_constraints(enhanced, config)

    return enhanced
#%% MAIN_ENHANCEMENT_PIPELINE END


#%% DAWN_IRRADIANCE_ENHANCEMENT
def enhance_dawn_irradiance(
    result: pd.DataFrame,
    location
) -> pd.DataFrame:
    """
    Enhance early morning irradiance when weather API returns 0
    but solar elevation suggests dawn production should occur.

    PURPOSE: Corrects weather API gaps during dawn when GHI=0 but sun is above horizon
    INPUT: Forecast DataFrame with GHI and solar elevation data
    OUTPUT: Enhanced DataFrame with estimated dawn irradiance values
    ROLE: Critical for early morning production accuracy - based on historical 05:00 CET start

    Based on historical data showing production starts at 05:00 CET.

    Enhancement Logic:
    1. Identify dawn periods (3-8 CET hours)
    2. Find positive solar elevation with zero GHI
    3. Estimate minimal irradiance (2 W/m² per degree elevation)
    4. Update both GHI and effective_irradiance
    """
    # Remove debug print
    enhanced = result.copy()

    if 'ghi' not in enhanced.columns or 'solar_elevation' not in enhanced.columns:
        return enhanced

    # Find times when:
    # 1. Solar elevation > 0° (sun is above horizon)
    # 2. GHI = 0 (weather API returns no irradiance)
    # 3. It's early morning hours (4-8 CET)

    # Convert to local time for hour checking
    if enhanced.index.tz is not None:
        local_time = enhanced.index.tz_convert('Europe/Berlin')  # CET
    else:
        local_time = enhanced.index

    # Debug logging
    logger.info(f"Dawn enhancement check: {len(enhanced)} intervals")
    logger.info(f"Timezone info: {enhanced.index.tz}")
    if len(enhanced) > 0:
        logger.info(f"First timestamp: {enhanced.index[0]} -> {local_time[0] if len(local_time) > 0 else 'N/A'}")

    dawn_hours = local_time.hour.isin([3, 4, 5, 6, 7, 8])  # Extended early morning window
    positive_elevation = enhanced['solar_elevation'] > 0
    zero_ghi = enhanced['ghi'] <= 0.1  # Very low or zero GHI

    dawn_enhancement_mask = dawn_hours & positive_elevation & zero_ghi

    # Remove debug prints

    if dawn_enhancement_mask.any():
        logger.info(f"Enhancing dawn irradiance for {dawn_enhancement_mask.sum()} intervals")

        # Generate minimal dawn irradiance based on solar elevation
        # Use clear-sky model for very low irradiance estimation
        enhanced_ghi = enhanced['ghi'].copy()

        for idx in enhanced[dawn_enhancement_mask].index:
            elevation = enhanced.loc[idx, 'solar_elevation']
            if elevation > 0:
                # Estimate minimal dawn irradiance based on elevation
                # Linear relationship: 0° = 0 W/m², 10° = ~20 W/m²
                estimated_ghi = max(1, elevation * 2.0)  # 2 W/m² per degree
                enhanced_ghi.loc[idx] = estimated_ghi
                logger.debug(f"Enhanced GHI at {idx}: {elevation:.1f}° → {estimated_ghi:.1f} W/m²")

        enhanced['ghi'] = enhanced_ghi

        # Also update effective_irradiance if it exists
        if 'effective_irradiance' in enhanced.columns:
            enhanced['effective_irradiance'] = enhanced['ghi']

    return enhanced
#%% DAWN_IRRADIANCE_ENHANCEMENT END


#%% HORIZON_SHADING_EFFECTS
def apply_horizon_shading(
    forecast: pd.DataFrame,
    horizon_angles: Dict[str, float]
) -> pd.DataFrame:
    """
    Apply horizon shading based on configured angles.

    PURPOSE: Models terrain/building blocking effects at low sun angles
    INPUT: Forecast DataFrame with solar position and power data
    OUTPUT: Forecast with shading factors applied to power output
    ROLE: Accounts for local terrain effects on sunrise/sunset production

    This accounts for terrain/objects blocking the sun at low angles.

    Shading Logic:
    1. Calculate effective horizon angle for each azimuth direction
    2. Interpolate between cardinal directions (N, NE, E, SE, S, SW, W, NW)
    3. Apply zero power when sun below effective horizon
    4. Apply gradual transition (±2°) near horizon for smooth effects
    """
    if not horizon_angles:
        return forecast

    result = forecast.copy()

    # Get solar position
    elevation = result['solar_elevation']
    azimuth = result['solar_azimuth']

    # Calculate effective horizon angle for each timestamp
    # based on azimuth direction
    effective_horizon = pd.Series(0.0, index=result.index)

    # Map azimuth to cardinal directions
    for idx in result.index:
        az = azimuth.loc[idx]

        # Determine which horizon angles to interpolate between
        if 0 <= az < 45 or az >= 315:
            # North
            h1, h2 = horizon_angles.get('north', 0), horizon_angles.get('northeast', 0)
            weight = (az % 45) / 45.0 if az < 45 else (az - 315) / 45.0
        elif 45 <= az < 135:
            # East
            if az < 90:
                h1, h2 = horizon_angles.get('northeast', 0), horizon_angles.get('east', 0)
                weight = (az - 45) / 45.0
            else:
                h1, h2 = horizon_angles.get('east', 0), horizon_angles.get('southeast', 0)
                weight = (az - 90) / 45.0
        elif 135 <= az < 225:
            # South
            if az < 180:
                h1, h2 = horizon_angles.get('southeast', 0), horizon_angles.get('south', 0)
                weight = (az - 135) / 45.0
            else:
                h1, h2 = horizon_angles.get('south', 0), horizon_angles.get('southwest', 0)
                weight = (az - 180) / 45.0
        else:
            # West
            if az < 270:
                h1, h2 = horizon_angles.get('southwest', 0), horizon_angles.get('west', 0)
                weight = (az - 225) / 45.0
            else:
                h1, h2 = horizon_angles.get('west', 0), horizon_angles.get('northwest', 0)
                weight = (az - 270) / 45.0

        # Linear interpolation
        effective_horizon.loc[idx] = h1 * (1 - weight) + h2 * weight

    # Apply shading when sun is below effective horizon
    shading_factor = pd.Series(1.0, index=result.index)
    below_horizon = elevation < effective_horizon

    # Gradual transition near horizon (±2 degrees)
    near_horizon = (elevation >= effective_horizon) & (elevation < effective_horizon + 2)
    shading_factor[below_horizon] = 0.0
    shading_factor[near_horizon] = (elevation[near_horizon] - effective_horizon[near_horizon]) / 2.0

    # Apply shading to power
    if 'ac_power_kw' in result.columns:
        result['ac_power_kw'] *= shading_factor
    if 'dc_power_kw' in result.columns:
        result['dc_power_kw'] *= shading_factor

    return result
#%% HORIZON_SHADING_EFFECTS END


#%% ATMOSPHERIC_REFRACTION_EFFECTS
def apply_refraction_effects(
    forecast: pd.DataFrame,
    location: Location
) -> pd.DataFrame:
    """
    Apply atmospheric refraction correction using PVLIB.

    PURPOSE: Enhances production at very low sun angles due to atmospheric refraction
    INPUT: Forecast DataFrame with solar elevation and power data
    OUTPUT: Forecast with refraction-enhanced power at low angles
    ROLE: Extends productive hours by accounting for atmospheric light bending

    At low sun angles, atmospheric refraction makes the sun appear
    higher than its geometric position, extending productive hours.

    Refraction Enhancement:
    1. Identify very low sun angles (< 5°)
    2. Apply refraction boost (0.5° effect at horizon)
    3. Enhance power output by up to 5% at lowest angles
    4. Smooth transition to avoid step changes
    """
    result = forecast.copy()

    # PVLIB already includes refraction in 'apparent_elevation'
    # but we can enhance the effect at very low angles

    # Get both geometric and apparent elevation if available
    if 'solar_elevation' in result.columns:
        elevation = result['solar_elevation']

        # Enhanced refraction factor at very low angles
        # Standard atmospheric refraction is about 0.5° at horizon
        # but can be up to 1° in certain conditions
        low_angle_mask = elevation < 5.0

        if low_angle_mask.any():
            # Apply enhanced refraction boost at very low angles
            refraction_boost = pd.Series(0.0, index=result.index)
            refraction_boost[low_angle_mask] = 0.5 * (1 - elevation[low_angle_mask] / 5.0)

            # Apply to power with smooth transition
            power_boost = 1.0 + 0.1 * refraction_boost  # Max 5% boost

            if 'ac_power_kw' in result.columns:
                result.loc[low_angle_mask, 'ac_power_kw'] *= power_boost[low_angle_mask]
            if 'dc_power_kw' in result.columns:
                result.loc[low_angle_mask, 'dc_power_kw'] *= power_boost[low_angle_mask]

    return result
#%% ATMOSPHERIC_REFRACTION_EFFECTS END


#%% DAWN_DUSK_PERFORMANCE_FACTORS
def apply_dawn_dusk_factors(
    forecast: pd.DataFrame,
    dawn_dusk_factor: float
) -> pd.DataFrame:
    """
    Apply performance reduction factors during dawn/dusk.

    PURPOSE: Models reduced efficiency at low sun angles due to spectral and atmospheric effects
    INPUT: Forecast DataFrame with solar elevation and power data
    OUTPUT: Forecast with dawn/dusk performance factors applied
    ROLE: Critical for accurate shoulder period modeling - accounts for physics-based losses

    Accounts for:
    - Spectral shifts at low sun angles (more red light)
    - Increased atmospheric absorption
    - Non-optimal angle of incidence

    Performance Factor Logic:
    1. Full production above 15° elevation
    2. Linear transition from dawn_dusk_factor to 1.0 between -6° and 15°
    3. Matches historical model behavior for negative elevations
    4. Smooth performance curve to avoid step changes
    """
    result = forecast.copy()

    if 'solar_elevation' not in result.columns:
        return result

    elevation = result['solar_elevation']

    # Define transition zones
    # Full production above 15°, reduced production -6° to 15° (matching old model)
    transition_start = -6.0  # Allow production at negative elevations like old model
    transition_end = 15.0

    # Calculate performance factor based on elevation
    performance_factor = pd.Series(1.0, index=result.index)

    # Linear transition in the dawn/dusk zone
    transition_mask = (elevation > transition_start) & (elevation <= transition_end)
    if transition_mask.any():
        # Linear interpolation from dawn_dusk_factor to 1.0
        normalized_elevation = (elevation[transition_mask] - transition_start) / (transition_end - transition_start)
        performance_factor[transition_mask] = (
            dawn_dusk_factor + (1.0 - dawn_dusk_factor) * normalized_elevation
        )

    # Apply factor to power
    if 'ac_power_kw' in result.columns:
        result['ac_power_kw'] *= performance_factor
    if 'dc_power_kw' in result.columns:
        result['dc_power_kw'] *= performance_factor

    return result
#%% DAWN_DUSK_PERFORMANCE_FACTORS END


#%% POWER_TRANSITION_SMOOTHING
def smooth_power_transitions(
    forecast: pd.DataFrame,
    smooth_minutes: int = 30
) -> pd.DataFrame:
    """
    Smooth power transitions to avoid unrealistic step changes.

    PURPOSE: Creates natural, realistic power transitions during sunrise/sunset
    INPUT: Forecast DataFrame with power data containing potential step changes
    OUTPUT: Forecast with smoothed power transitions using Gaussian filtering
    ROLE: Final smoothing step for realistic shoulder period transitions

    Uses Gaussian smoothing to create natural transitions while
    preserving the overall energy production.

    Smoothing Logic:
    1. Calculate time resolution and smoothing window
    2. Identify transition periods (rapid power changes > 10% of peak)
    3. Expand mask to cover full transition period
    4. Apply Gaussian smoothing only to transition periods
    5. Preserve energy balance while creating smooth curves
    """
    result = forecast.copy()

    # Calculate number of samples for smoothing based on time resolution
    if len(result) > 1:
        # Check if index is datetime
        if hasattr(result.index[0], 'total_seconds'):
            time_diff = (result.index[1] - result.index[0]).total_seconds() / 60
        elif isinstance(result.index[0], pd.Timestamp):
            time_diff = (result.index[1] - result.index[0]).total_seconds() / 60
        else:
            # Assume hourly data if index is not datetime
            time_diff = 60

        # Avoid division by zero - default to 1 hour if time_diff is 0
        if time_diff == 0:
            time_diff = 60  # Default to 60 minutes
        smooth_samples = max(1, int(smooth_minutes / time_diff))

        # Apply smoothing to power columns
        for col in ['ac_power_kw', 'dc_power_kw']:
            if col in result.columns:
                # Only smooth if we have enough samples
                if len(result) > smooth_samples * 2:
                    # Identify transition periods (rapid changes)
                    power = result[col].values
                    power_diff = np.abs(np.diff(power, prepend=power[0]))

                    # Find sunrise/sunset transitions (large changes)
                    threshold = 0.1 * result[col].max()  # 10% of peak
                    transition_mask = power_diff > threshold

                    # Expand mask to cover transition period
                    for i in range(smooth_samples):
                        transition_mask[1:] |= transition_mask[:-1]
                        transition_mask[:-1] |= transition_mask[1:]

                    # Apply smoothing only to transition periods
                    smoothed = power.copy()
                    if transition_mask.any():
                        # Use smaller sigma for more precise smoothing
                        sigma = max(smooth_samples / 3, 1)  # Ensure sigma is at least 1
                        smoothed[transition_mask] = gaussian_filter1d(
                            power[transition_mask],
                            sigma=sigma,
                            mode='nearest'
                        )

                    result[col] = smoothed

    return result
#%% POWER_TRANSITION_SMOOTHING END


#%% PHYSICAL_CONSTRAINTS_ENFORCEMENT
def apply_physical_constraints(
    forecast: pd.DataFrame,
    config: Dict[str, any]
) -> pd.DataFrame:
    """
    Apply physical constraints to ensure realistic output.

    PURPOSE: Enforces absolute physical limits and realistic operating conditions
    INPUT: Forecast DataFrame with power and irradiance data
    OUTPUT: Forecast with all physical constraints enforced
    ROLE: Critical safety mechanism - prevents impossible forecast values

    Constraints:
    - Zero production when sun is below horizon
    - Maximum power limited by plant capacity
    - Minimum irradiance threshold for inverter startup

    Constraint Logic:
    1. Horizon constraint: Zero power below -0.833° (includes refraction)
    2. Capacity constraint: Hard limit at plant capacity (870 kW)
    3. Inverter startup: Minimum 1 W/m² irradiance for operation
    4. All constraints are absolute - no exceptions allowed
    """
    result = forecast.copy()

    # Zero production below horizon (with small tolerance for refraction)
    if 'solar_elevation' in result.columns:
        below_horizon = result['solar_elevation'] < -0.833  # Include refraction
        if 'ac_power_kw' in result.columns:
            result.loc[below_horizon, 'ac_power_kw'] = 0.0
        if 'dc_power_kw' in result.columns:
            result.loc[below_horizon, 'dc_power_kw'] = 0.0

    # Apply capacity constraints
    capacity_kw = config.get('capacity_kw', 1000)
    if 'ac_power_kw' in result.columns:
        result['ac_power_kw'] = result['ac_power_kw'].clip(0, capacity_kw)
    if 'dc_power_kw' in result.columns:
        result['dc_power_kw'] = result['dc_power_kw'].clip(0, capacity_kw * 1.1)  # DC can be slightly higher

    # Minimum irradiance for inverter startup (lowered to match historical dawn production)
    if 'effective_irradiance' in result.columns:
        min_irradiance = 1  # W/m² - allow very low irradiance production like historical data
        low_irradiance = result['effective_irradiance'] < min_irradiance
        if 'ac_power_kw' in result.columns:
            result.loc[low_irradiance, 'ac_power_kw'] = 0.0

    return result
#%% PHYSICAL_CONSTRAINTS_ENFORCEMENT END


#%% TRANSITION_TIMES_CALCULATION
def calculate_transition_times(
    location: Location,
    date: pd.Timestamp,
    horizon_angles: Optional[Dict[str, float]] = None
) -> Dict[str, pd.Timestamp]:
    """
    Calculate important transition times for a given date.

    PURPOSE: Determines critical solar transition times for daily forecasting
    INPUT: Location object, date, and optional horizon angles
    OUTPUT: Dictionary with all important transition timestamps
    ROLE: Provides timing reference for forecast analysis and validation

    Returns:
    - geometric_sunrise/sunset: When sun crosses 0° elevation
    - civil_dawn/dusk: Sun at -6° (civil twilight)
    - effective_sunrise/sunset: Accounting for horizon shading
    - solar_noon: Maximum elevation time

    Calculation Logic:
    1. Use PVLIB for standard sun times (sunrise, sunset, solar noon)
    2. Calculate minute-by-minute solar position for the entire day
    3. Find civil twilight times (-6° elevation)
    4. Account for horizon shading effects on effective times
    5. Return comprehensive transition time dictionary
    """
    # Get sun times from PVLIB
    sun_times = location.get_sun_rise_set_transit(date)

    # Calculate solar position for the entire day
    times = pd.date_range(
        start=date.normalize(),
        end=date.normalize() + pd.Timedelta(days=1),
        freq='1min',
        tz=location.tz
    )
    solar_position = location.get_solarposition(times)

    # Find transition times
    elevation = solar_position['elevation']

    # Civil twilight (-6 degrees)
    civil_angle = -6.0
    civil_dawn_idx = elevation[elevation > civil_angle].index.min()
    civil_dusk_idx = elevation[elevation > civil_angle].index.max()

    # Effective sunrise/sunset with horizon shading
    if horizon_angles:
        east_horizon = horizon_angles.get('east', 0)
        west_horizon = horizon_angles.get('west', 0)

        morning_mask = solar_position['azimuth'] < 180
        evening_mask = solar_position['azimuth'] >= 180

        effective_sunrise_idx = elevation[morning_mask & (elevation > east_horizon)].index.min()
        effective_sunset_idx = elevation[evening_mask & (elevation > west_horizon)].index.max()
    else:
        effective_sunrise_idx = sun_times['sunrise']
        effective_sunset_idx = sun_times['sunset']

    return {
        'geometric_sunrise': sun_times['sunrise'],
        'geometric_sunset': sun_times['sunset'],
        'solar_noon': sun_times['transit'],
        'civil_dawn': civil_dawn_idx,
        'civil_dusk': civil_dusk_idx,
        'effective_sunrise': effective_sunrise_idx,
        'effective_sunset': effective_sunset_idx
    }
#%% TRANSITION_TIMES_CALCULATION END
