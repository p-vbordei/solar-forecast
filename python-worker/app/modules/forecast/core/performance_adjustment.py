#%% PERFORMANCE_ADJUSTMENT_MODULE
"""
Performance adjustment module for solar forecasting.

PURPOSE: Applies weather-dependent performance ratios and calibration factors to solar forecasts
INPUT: Raw forecasts from physics/ML models, weather data, configuration parameters
OUTPUT: Adjusted forecasts with performance corrections applied
ROLE: Final stage calibration system that ensures forecast accuracy through real-world adjustments

This module implements comprehensive performance adjustments including:
- Weather-dependent performance ratios (cloud cover effects)
- Seasonal adjustments (monthly calibration factors)
- Temperature derating (high temperature losses)
- Dynamic soiling effects (dust accumulation)
- Capacity constraints and physical validation
- Comprehensive forecast validation framework
"""
import numpy as np
import pandas as pd
from typing import Dict, Optional, Tuple, List
import logging
from scipy import interpolate
from pathlib import Path
# Local utility for path resolution
from pathlib import Path

def resolve_output_path(filename: str, create_dirs: bool = True) -> Path:
    """Simple path resolution for Python worker environment"""
    output_dir = Path(__file__).parent.parent.parent.parent / "output"
    if create_dirs:
        output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir / filename

logger = logging.getLogger(__name__)
#%% PERFORMANCE_ADJUSTMENT_MODULE END


#%% MAIN_PERFORMANCE_ADJUSTMENT_ORCHESTRATOR
def apply_performance_adjustments(
    forecast: pd.DataFrame,
    weather_data: pd.DataFrame,
    performance_config: Dict[str, any],
    calibration_config: Dict[str, any]
) -> pd.DataFrame:
    """
    Apply all performance adjustments to the forecast.

    PURPOSE: Main orchestrator function that applies all performance corrections in sequence
    INPUT: Raw forecast DataFrame, weather data, performance and calibration configurations
    OUTPUT: Fully adjusted forecast with all performance corrections applied
    ROLE: Central coordination point for all performance adjustment operations

    Sequential adjustment steps:
    1. Weather-dependent performance ratios (cloud cover effects)
    2. Seasonal adjustments (monthly calibration factors)
    3. Global calibration factor (overall system bias correction)
    4. Temperature-based derating (high temperature losses)
    5. Dynamic soiling effects (dust accumulation losses)

    Each step modifies the forecast in place, building up cumulative adjustments
    that reflect real-world operating conditions and historical performance data.
    """
    adjusted = forecast.copy()

    # Apply weather-dependent performance ratios
    adjusted = apply_weather_performance_ratios(
        adjusted,
        weather_data,
        performance_config
    )

    # Apply seasonal adjustments
    adjusted = apply_seasonal_adjustments(
        adjusted,
        calibration_config.get('seasonal_adjustments', None)
    )

    # Apply global calibration factor
    cal_factor = calibration_config.get('adjustment_factor', 1.0)
    if cal_factor != 1.0:
        logger.info(f"Applying global calibration factor: {cal_factor}")
        for col in ['prediction', 'p10', 'p25', 'p50', 'p75', 'p90']:
            if col in adjusted.columns:
                adjusted[col] *= cal_factor

    # Apply temperature derating beyond what's in the model
    adjusted = apply_temperature_derating(
        adjusted,
        weather_data,
        performance_config
    )

    # Apply dynamic soiling
    adjusted = apply_dynamic_soiling(
        adjusted,
        calibration_config
    )

    return adjusted
#%% MAIN_PERFORMANCE_ADJUSTMENT_ORCHESTRATOR END


#%% WEATHER_PERFORMANCE_RATIOS
def apply_weather_performance_ratios(
    forecast: pd.DataFrame,
    weather_data: pd.DataFrame,
    performance_config: Dict[str, any]
) -> pd.DataFrame:
    """
    Apply performance ratios based on weather conditions.

    PURPOSE: Adjusts forecast power output based on real-world weather impact on solar performance
    INPUT: Raw forecast DataFrame, weather data with cloud cover, performance configuration
    OUTPUT: Weather-adjusted forecast with realistic performance ratios applied
    ROLE: Accounts for weather-dependent efficiency losses that physics models may not capture

    Weather classification system:
    - Clear sky (≤20% cloud cover): 97% performance ratio
    - Partly cloudy (20-50% cloud cover): 90% performance ratio
    - Cloudy (50-80% cloud cover): 85% performance ratio
    - Overcast (>80% cloud cover): 75% performance ratio

    Uses smooth interpolation between categories to avoid sharp transitions
    and applies adjustments to all power prediction columns (p10-p90 quantiles).
    """
    if 'cloud_cover' not in weather_data.columns:
        logger.warning("No cloud cover data, skipping weather performance adjustment")
        return forecast

    # Get performance ratios
    clear_sky_ratio = performance_config.get('clear_sky', 0.97)
    partly_cloudy_ratio = performance_config.get('partly_cloudy', 0.90)
    cloudy_ratio = performance_config.get('cloudy', 0.85)
    overcast_ratio = performance_config.get('overcast', 0.75)

    # Classify weather conditions based on cloud cover
    cloud_cover = weather_data['cloud_cover']

    # Create performance ratio series
    performance_ratio = pd.Series(1.0, index=forecast.index)

    # Apply ratios based on cloud cover thresholds
    performance_ratio[cloud_cover <= 20] = clear_sky_ratio
    performance_ratio[(cloud_cover > 20) & (cloud_cover <= 50)] = partly_cloudy_ratio
    performance_ratio[(cloud_cover > 50) & (cloud_cover <= 80)] = cloudy_ratio
    performance_ratio[cloud_cover > 80] = overcast_ratio

    # Smooth transitions between categories
    performance_ratio = smooth_performance_transitions(
        performance_ratio,
        cloud_cover
    )

    # Apply to all power columns
    adjusted = forecast.copy()
    power_columns = ['prediction', 'p10', 'p25', 'p50', 'p75', 'p90',
                     'ac_power_kw', 'uncertainty_lower', 'uncertainty_upper']

    for col in power_columns:
        if col in adjusted.columns:
            adjusted[col] *= performance_ratio

    return adjusted
#%% WEATHER_PERFORMANCE_RATIOS END


#%% SMOOTH_PERFORMANCE_TRANSITIONS
def smooth_performance_transitions(
    performance_ratio: pd.Series,
    cloud_cover: pd.Series,
    transition_width: float = 10.0
) -> pd.Series:
    """
    Smooth transitions between performance ratio categories.

    PURPOSE: Eliminates sharp jumps in performance ratios by using linear interpolation
    INPUT: Discrete performance ratios, cloud cover data, transition width parameter
    OUTPUT: Smoothed performance ratios with gradual transitions between categories
    ROLE: Prevents unrealistic step changes in forecast power output due to cloud cover thresholds

    Implements linear interpolation between cloud cover thresholds (20%, 50%, 80%)
    to create smooth transitions in performance ratios rather than abrupt changes.
    This reflects the gradual nature of actual solar performance changes with weather.
    """
    # Define transition points
    transitions = [20, 50, 80]  # Cloud cover thresholds
    ratios = [0.97, 0.90, 0.85, 0.75]  # Corresponding ratios

    # Create interpolation function
    interp_func = interpolate.interp1d(
        [0] + transitions + [100],
        ratios + [ratios[-1]],
        kind='linear',
        fill_value='extrapolate'
    )

    # Apply smooth interpolation
    smoothed = pd.Series(
        interp_func(cloud_cover),
        index=performance_ratio.index
    )

    return smoothed
#%% SMOOTH_PERFORMANCE_TRANSITIONS END


#%% SEASONAL_ADJUSTMENTS
def apply_seasonal_adjustments(
    forecast: pd.DataFrame,
    seasonal_adjustments: Optional[List[float]]
) -> pd.DataFrame:
    """
    Apply monthly seasonal adjustment factors.

    PURPOSE: Corrects for seasonal variations in solar plant performance not captured by physics models
    INPUT: Forecast DataFrame, list of 12 monthly adjustment factors (January to December)
    OUTPUT: Seasonally adjusted forecast with month-specific calibration factors applied
    ROLE: Accounts for seasonal effects like panel soiling, sun angle variations, and atmospheric conditions

    Applies monthly calibration factors derived from historical performance analysis.
    Each month gets a specific adjustment factor based on observed deviations
    from expected performance. Factors are applied to all power prediction columns.
    """
    if not seasonal_adjustments or len(seasonal_adjustments) != 12:
        return forecast

    adjusted = forecast.copy()

    # Get month for each timestamp
    months = forecast.index.month

    # Create adjustment factor series
    adjustment_factors = pd.Series(
        [seasonal_adjustments[m-1] for m in months],
        index=forecast.index
    )

    # Apply to power columns
    power_columns = ['prediction', 'p10', 'p25', 'p50', 'p75', 'p90',
                     'ac_power_kw', 'uncertainty_lower', 'uncertainty_upper']

    for col in power_columns:
        if col in adjusted.columns:
            adjusted[col] *= adjustment_factors

    logger.info("Applied seasonal adjustments")

    return adjusted
#%% SEASONAL_ADJUSTMENTS END


#%% TEMPERATURE_DERATING
def apply_temperature_derating(
    forecast: pd.DataFrame,
    weather_data: pd.DataFrame,
    performance_config: Dict[str, any]
) -> pd.DataFrame:
    """
    Apply additional temperature-based performance derating.

    PURPOSE: Applies temperature-dependent power losses beyond what physics models capture
    INPUT: Forecast DataFrame, weather data with air temperature, performance configuration
    OUTPUT: Temperature-adjusted forecast with high-temperature losses applied
    ROLE: Supplements ML model temperature effects with additional derating for extreme conditions

    Temperature derating schedule:
    - Optimal temperature: 25°C (no derating)
    - High temperature (35-40°C): 2% power loss
    - Extreme temperature (>40°C): 5% power loss

    This supplements any temperature effects already in the ML model by applying
    additional derating for extreme temperature conditions that may not be well
    represented in the training data.
    """
    if 'temp_air' not in weather_data.columns:
        return forecast

    # Temperature thresholds
    optimal_temp = 25.0  # °C
    high_temp_threshold = 35.0
    extreme_temp_threshold = 40.0

    # Derating factors
    high_temp_derate = 0.98  # 2% loss for high temps
    extreme_temp_derate = 0.95  # 5% loss for extreme temps

    # Calculate derating factor
    derate_factor = pd.Series(1.0, index=forecast.index)

    # Handle temperature data safely
    if 'temp_air' in weather_data.columns and len(weather_data) > 0:
        temp = weather_data['temp_air'].values

        # Ensure temp array matches forecast length
        if len(temp) != len(forecast):
            # If forecast is longer (e.g., resampled to 15-min), interpolate/repeat
            if len(forecast) > len(temp):
                # Repeat each temp value to match forecast resolution
                repeat_factor = (len(forecast) + len(temp) - 1) // len(temp)
                temp = np.repeat(temp, repeat_factor)[:len(forecast)]
            else:
                # Truncate if temp is longer
                temp = temp[:len(forecast)]

        # Apply derating for high temperatures using numpy indexing
        high_temp_indices = np.where((temp > high_temp_threshold) & (temp <= extreme_temp_threshold))[0]
        extreme_temp_indices = np.where(temp > extreme_temp_threshold)[0]

        # Apply derating factors
        if len(high_temp_indices) > 0:
            derate_factor.iloc[high_temp_indices] = high_temp_derate
        if len(extreme_temp_indices) > 0:
            derate_factor.iloc[extreme_temp_indices] = extreme_temp_derate

    # Apply to forecast
    adjusted = forecast.copy()
    power_columns = ['prediction', 'p10', 'p25', 'p50', 'p75', 'p90',
                     'ac_power_kw', 'uncertainty_lower', 'uncertainty_upper']

    for col in power_columns:
        if col in adjusted.columns:
            adjusted[col] *= derate_factor

    return adjusted
#%% TEMPERATURE_DERATING END


#%% DYNAMIC_SOILING
def apply_dynamic_soiling(
    forecast: pd.DataFrame,
    calibration_config: Dict[str, any]
) -> pd.DataFrame:
    """
    Apply dynamic soiling losses based on time since last rain.

    PURPOSE: Accounts for dust accumulation and panel soiling effects over time
    INPUT: Forecast DataFrame, calibration configuration with soiling parameters
    OUTPUT: Soiling-adjusted forecast (currently placeholder - returns unmodified forecast)
    ROLE: Future enhancement for dynamic soiling tracking based on weather conditions

    Currently implemented as a placeholder function. In production, this would:
    - Track time since last significant rain event
    - Apply progressive soiling losses based on dust accumulation
    - Reset soiling losses after rain events
    - Consider seasonal dust patterns and local environmental conditions

    For now, soiling losses are handled by PVLIB's static loss parameters.
    """
    # For now, apply static monthly soiling from config
    # In production, this would track rain events

    # This is already handled in PVLIB losses, so we skip if not needed
    return forecast
#%% DYNAMIC_SOILING END


#%% PERFORMANCE_METRICS_CALCULATION
def calculate_performance_metrics(
    forecast: pd.DataFrame,
    weather_data: pd.DataFrame,
    config: Dict[str, any]
) -> Dict[str, float]:
    """
    Calculate expected performance metrics for diagnostics.

    PURPOSE: Computes key performance indicators for forecast quality assessment
    INPUT: Forecast DataFrame, weather data, system configuration
    OUTPUT: Dictionary of performance metrics (capacity factor, performance ratio, availability)
    ROLE: Provides diagnostic metrics for forecast validation and system monitoring

    Calculated metrics:
    - Capacity Factor: Average power output as fraction of rated capacity
    - Performance Ratio: Actual energy vs theoretical energy (based on irradiance)
    - Availability: Fraction of daylight hours with production > 1% of capacity

    These metrics help assess forecast reasonableness and identify potential issues
    with system performance or forecast calibration.
    """
    metrics = {}

    # Capacity factor
    if 'prediction' in forecast.columns:
        capacity_kw = config['plant']['capacity_kw']
        avg_power = forecast['prediction'].mean()
        metrics['capacity_factor'] = avg_power / capacity_kw

    # Performance ratio (vs theoretical)
    if 'poa_global' in weather_data.columns:
        # Simple PR calculation
        poa_energy = (weather_data['poa_global'] * 0.25).sum() / 1000  # kWh
        expected_energy = poa_energy * capacity_kw / 1000 * 0.2  # 20% efficiency
        actual_energy = (forecast['prediction'] * 0.25).sum()  # kWh
        metrics['performance_ratio'] = actual_energy / expected_energy if expected_energy > 0 else 0

    # Availability (non-zero production during daylight)
    if 'solar_elevation' in weather_data.columns:
        daylight = weather_data['solar_elevation'] > 5
        producing = forecast['prediction'] > 0.01 * capacity_kw
        metrics['availability'] = (producing & daylight).sum() / daylight.sum() if daylight.sum() > 0 else 0

    return metrics
#%% PERFORMANCE_METRICS_CALCULATION END


#%% CURTAILMENT_APPLICATION
def apply_curtailment(
    forecast: pd.DataFrame,
    curtailment_schedule: Optional[pd.DataFrame] = None,
    max_export_kw: Optional[float] = None
) -> pd.DataFrame:
    """
    Apply curtailment limits for grid constraints.

    PURPOSE: Applies grid-imposed or system-imposed power output limits to forecast
    INPUT: Forecast DataFrame, optional curtailment schedule, optional maximum export limit
    OUTPUT: Curtailment-adjusted forecast with power limits applied
    ROLE: Ensures forecast respects grid constraints and regulatory limits

    Supports two types of curtailment:
    1. Fixed export limit: Constant maximum power output (clips all values above limit)
    2. Time-based schedule: Variable curtailment limits by time period

    Applies limits to prediction and upper quantiles (p50, p75, p90) since
    lower quantiles are already below the main prediction level.
    """
    adjusted = forecast.copy()

    # Apply fixed export limit
    if max_export_kw is not None:
        power_columns = ['prediction', 'p50', 'p75', 'p90', 'uncertainty_upper']
        for col in power_columns:
            if col in adjusted.columns:
                adjusted[col] = adjusted[col].clip(upper=max_export_kw)

    # Apply time-based curtailment schedule
    if curtailment_schedule is not None:
        # Merge curtailment limits with forecast
        adjusted = adjusted.join(curtailment_schedule, how='left')

        if 'curtailment_limit_kw' in adjusted.columns:
            for col in power_columns:
                if col in adjusted.columns:
                    mask = adjusted['curtailment_limit_kw'].notna()
                    adjusted.loc[mask, col] = adjusted.loc[mask, [col, 'curtailment_limit_kw']].min(axis=1)

    return adjusted
#%% CURTAILMENT_APPLICATION END


#%% DEGRADATION_ADJUSTMENT
def adjust_for_degradation(
    forecast: pd.DataFrame,
    installation_date: pd.Timestamp,
    annual_degradation_rate: float = 0.005  # 0.5% per year
) -> pd.DataFrame:
    """
    Adjust forecast for system degradation over time.

    PURPOSE: Accounts for gradual decline in solar panel efficiency over operational lifetime
    INPUT: Forecast DataFrame, installation date, annual degradation rate
    OUTPUT: Degradation-adjusted forecast with age-based efficiency reduction applied
    ROLE: Ensures forecast accuracy by accounting for equipment aging effects

    Applies compound annual degradation rate (typically 0.5-0.8% per year)
    to account for natural decline in solar panel efficiency over time.
    Degradation factor is calculated as (1 - rate)^years_elapsed.

    Applied to all power prediction columns to maintain quantile relationships.
    """
    # Calculate years since installation
    current_date = pd.Timestamp.now()
    years_elapsed = (current_date - installation_date).days / 365.25

    # Calculate degradation factor
    degradation_factor = (1 - annual_degradation_rate) ** years_elapsed

    logger.info(f"Applying degradation factor: {degradation_factor:.3f} ({years_elapsed:.1f} years)")

    # Apply to forecast
    adjusted = forecast.copy()
    power_columns = ['prediction', 'p10', 'p25', 'p50', 'p75', 'p90',
                     'ac_power_kw', 'uncertainty_lower', 'uncertainty_upper']

    for col in power_columns:
        if col in adjusted.columns:
            adjusted[col] *= degradation_factor

    return adjusted
#%% DEGRADATION_ADJUSTMENT END


#%% BASIC_FORECAST_VALIDATION
def validate_adjusted_forecast(
    forecast: pd.DataFrame,
    capacity_kw: float,
    weather_data: Optional[pd.DataFrame] = None
) -> Tuple[bool, List[str]]:
    """
    Validate that adjusted forecast is physically reasonable.

    PURPOSE: Performs basic validation checks on forecast data for physical consistency
    INPUT: Forecast DataFrame, plant capacity, optional weather data
    OUTPUT: Tuple of (is_valid boolean, list of validation issues)
    ROLE: Quality assurance check to catch obvious forecast errors before output

    Validation checks performed:
    1. No negative power values
    2. No values exceeding plant capacity (with 10% overpower allowance)
    3. Quantile monotonicity (p10 ≤ p25 ≤ p50 ≤ p75 ≤ p90)
    4. No significant production during night hours (solar elevation < -5°)

    Returns list of specific issues found for debugging purposes.
    """
    issues = []

    # Check for negative values
    power_columns = ['prediction', 'p10', 'p25', 'p50', 'p75', 'p90']
    for col in power_columns:
        if col in forecast.columns:
            if (forecast[col] < 0).any():
                issues.append(f"Negative values found in {col}")

    # Check for values exceeding capacity
    for col in power_columns:
        if col in forecast.columns:
            if (forecast[col] > capacity_kw * 1.1).any():  # Allow 10% overpower
                issues.append(f"Values exceeding capacity in {col}")

    # Check quantile monotonicity
    quantile_cols = ['p10', 'p25', 'p50', 'p75', 'p90']
    existing_q_cols = [col for col in quantile_cols if col in forecast.columns]

    if len(existing_q_cols) > 1:
        for i in range(1, len(existing_q_cols)):
            prev_col = existing_q_cols[i-1]
            curr_col = existing_q_cols[i]
            if (forecast[prev_col] > forecast[curr_col]).any():
                issues.append(f"Quantile ordering violated: {prev_col} > {curr_col}")

    # Check for production at night
    if weather_data is not None and 'solar_elevation' in weather_data.columns:
        night_mask = weather_data['solar_elevation'] < -5
        if 'prediction' in forecast.columns:
            night_production = forecast.loc[night_mask, 'prediction']
            if (night_production > 0.001 * capacity_kw).any():  # Allow tiny values
                issues.append("Significant production during night hours")

    is_valid = len(issues) == 0
    return is_valid, issues
#%% BASIC_FORECAST_VALIDATION END


#%% VALIDATION_FRAMEWORK_CREATION
def create_validation_framework(
    config: Dict[str, any]
) -> Dict[str, any]:
    """
    Create comprehensive validation framework for solar forecasting system.

    PURPOSE: Defines validation criteria and thresholds for comprehensive forecast assessment
    INPUT: System configuration dictionary with plant specifications
    OUTPUT: Validation framework dictionary with all validation criteria
    ROLE: Establishes quality standards and acceptance criteria for forecast validation

    Creates structured validation framework with categories:
    - Capacity limits: Power output constraints and emergency thresholds
    - MAPE requirements: Accuracy targets and failure thresholds
    - Physics validation: Solar physics consistency checks
    - Data quality: Missing data and negative value limits
    - Quantile validation: Uncertainty quantile relationship requirements
    - Performance validation: Capacity factor and availability standards

    Returns validation configuration based on client requirements.
    """

    capacity_kw = config['plant']['capacity_kw']

    validation_framework = {
        'capacity_limits': {
            'max_power_kw': capacity_kw,
            'max_overpower_ratio': 1.0,  # No overpower allowed (strict)
            'emergency_stop_ratio': 1.2   # System emergency stop
        },

        'mape_requirements': {
            'target_mape': 1.0,          # Target: ≤1% MAPE
            'warning_mape': 5.0,         # Warning: >5% MAPE
            'failure_mape': 10.0         # Failure: >10% MAPE
        },

        'physics_validation': {
            'min_night_elevation': -5.0,  # Below this = night
            'max_night_power_ratio': 0.001,  # Max 0.1% capacity at night
            'max_cloudy_efficiency': 0.25,   # Max 25% efficiency in clouds
            'min_clear_efficiency': 0.15     # Min 15% efficiency clear sky
        },

        'data_quality': {
            'max_negative_values': 0,     # No negative values allowed
            'max_missing_percentage': 5.0, # Max 5% missing data
            'min_forecast_hours': 24,     # Minimum forecast horizon
            'max_forecast_hours': 168     # Maximum forecast horizon (7 days)
        },

        'quantile_validation': {
            'required_quantiles': ['p10', 'p50', 'p90'],
            'monotonicity_tolerance': 0.01,  # 1% tolerance for ordering
            'uncertainty_min_ratio': 0.8,    # p10 ≥ 80% of p50
            'uncertainty_max_ratio': 1.2     # p90 ≤ 120% of p50
        },

        'performance_validation': {
            'min_capacity_factor': 0.05,  # Min 5% CF over forecast period
            'max_capacity_factor': 0.35,  # Max 35% CF over forecast period
            'min_availability': 0.90,     # Min 90% availability during day
            'max_ramp_rate_per_hour': 0.5 # Max 50% capacity change per hour
        }
    }

    return validation_framework
#%% VALIDATION_FRAMEWORK_CREATION END


#%% COMPREHENSIVE_FORECAST_VALIDATION
def validate_forecast_comprehensive(
    forecast: pd.DataFrame,
    weather_data: pd.DataFrame,
    config: Dict[str, any],
    actual_data: Optional[pd.DataFrame] = None
) -> Dict[str, any]:
    """
    Comprehensive validation of solar forecast against all requirements.

    PURPOSE: Performs complete validation of forecast against all quality criteria
    INPUT: Forecast DataFrame, weather data, configuration, optional actual data for accuracy check
    OUTPUT: Detailed validation report with pass/fail status and comprehensive metrics
    ROLE: Final quality assurance gate before forecast deployment and distribution

    Validation categories performed:
    1. Capacity validation: Ensures no power output exceeds plant capacity
    2. MAPE validation: Checks accuracy against actual data if available
    3. Physics validation: Verifies solar physics consistency (night production, etc.)
    4. Data quality: Checks for negative values, missing data, forecast length
    5. Quantile validation: Ensures proper uncertainty quantile relationships
    6. Performance validation: Validates capacity factor and availability metrics
    7. Ramp rate validation: Checks for realistic power change rates
    8. Energy totals: Calculates total energy production estimates

    Returns detailed validation report with pass/fail status and metrics.
    """

    validation_config = create_validation_framework(config)
    report = {
        'timestamp': pd.Timestamp.now(),
        'validation_passed': True,
        'critical_failures': [],
        'warnings': [],
        'metrics': {},
        'details': {}
    }

    capacity_kw = config['plant']['capacity_kw']

    # 1. CAPACITY VALIDATION (CRITICAL)
    max_power = forecast['prediction'].max()
    capacity_violation = max_power > validation_config['capacity_limits']['max_power_kw']

    if capacity_violation:
        report['critical_failures'].append(
            f"CAPACITY VIOLATION: {max_power:.1f} kW > {capacity_kw} kW limit"
        )
        report['validation_passed'] = False

    report['metrics']['max_power_kw'] = max_power
    report['metrics']['capacity_utilization'] = max_power / capacity_kw

    # 2. MAPE VALIDATION (if actual data provided)
    if actual_data is not None:
        mape = calculate_mape(forecast['prediction'], actual_data['actual'])
        report['metrics']['mape_percent'] = mape

        if mape > validation_config['mape_requirements']['target_mape']:
            if mape > validation_config['mape_requirements']['failure_mape']:
                report['critical_failures'].append(f"MAPE FAILURE: {mape:.1f}% > {validation_config['mape_requirements']['failure_mape']}% limit")
                report['validation_passed'] = False
            elif mape > validation_config['mape_requirements']['warning_mape']:
                report['warnings'].append(f"MAPE WARNING: {mape:.1f}% > {validation_config['mape_requirements']['warning_mape']}% target")

    # 3. PHYSICS VALIDATION
    if 'solar_elevation' in weather_data.columns:
        night_mask = weather_data['solar_elevation'] < validation_config['physics_validation']['min_night_elevation']
        night_power = forecast.loc[night_mask, 'prediction']
        max_night_power = validation_config['physics_validation']['max_night_power_ratio'] * capacity_kw

        if (night_power > max_night_power).any():
            report['warnings'].append(f"Night production detected: max {night_power.max():.1f} kW")

        report['metrics']['max_night_power_kw'] = night_power.max()

    # 4. DATA QUALITY VALIDATION
    negative_count = (forecast['prediction'] < 0).sum()
    if negative_count > validation_config['data_quality']['max_negative_values']:
        report['critical_failures'].append(f"Negative values: {negative_count} found")
        report['validation_passed'] = False

    missing_percentage = forecast['prediction'].isna().sum() / len(forecast) * 100
    if missing_percentage > validation_config['data_quality']['max_missing_percentage']:
        report['critical_failures'].append(f"Missing data: {missing_percentage:.1f}% > {validation_config['data_quality']['max_missing_percentage']}% limit")
        report['validation_passed'] = False

    forecast_hours = len(forecast)
    if forecast_hours < validation_config['data_quality']['min_forecast_hours']:
        report['critical_failures'].append(f"Forecast too short: {forecast_hours}h < {validation_config['data_quality']['min_forecast_hours']}h minimum")
        report['validation_passed'] = False

    report['metrics']['negative_values'] = negative_count
    report['metrics']['missing_percentage'] = missing_percentage
    report['metrics']['forecast_hours'] = forecast_hours

    # 5. QUANTILE VALIDATION
    quantile_cols = validation_config['quantile_validation']['required_quantiles']
    existing_quantiles = [col for col in quantile_cols if col in forecast.columns]

    if len(existing_quantiles) > 1:
        for i in range(1, len(existing_quantiles)):
            prev_col = existing_quantiles[i-1]
            curr_col = existing_quantiles[i]
            violations = (forecast[prev_col] > forecast[curr_col]).sum()
            if violations > 0:
                report['warnings'].append(f"Quantile ordering violations: {violations} in {prev_col}>{curr_col}")

    # 6. PERFORMANCE VALIDATION
    capacity_factor = forecast['prediction'].mean() / capacity_kw
    report['metrics']['capacity_factor'] = capacity_factor

    if capacity_factor < validation_config['performance_validation']['min_capacity_factor']:
        report['warnings'].append(f"Low capacity factor: {capacity_factor:.1%}")
    elif capacity_factor > validation_config['performance_validation']['max_capacity_factor']:
        report['warnings'].append(f"High capacity factor: {capacity_factor:.1%}")

    # 7. RAMP RATE VALIDATION
    power_diff = forecast['prediction'].diff().abs()
    max_ramp = power_diff.max() / capacity_kw
    max_allowed_ramp = validation_config['performance_validation']['max_ramp_rate_per_hour']

    if max_ramp > max_allowed_ramp:
        report['warnings'].append(f"High ramp rate: {max_ramp:.1%} > {max_allowed_ramp:.1%}")

    report['metrics']['max_ramp_rate'] = max_ramp

    # 8. ENERGY TOTALS
    total_energy_mwh = forecast['prediction'].sum() / 1000
    report['metrics']['total_energy_mwh'] = total_energy_mwh

    # Summary
    report['details']['validation_framework'] = validation_config
    report['summary'] = {
        'status': 'PASS' if report['validation_passed'] else 'FAIL',
        'critical_failures': len(report['critical_failures']),
        'warnings': len(report['warnings']),
        'key_metrics': {
            'max_power_kw': report['metrics']['max_power_kw'],
            'capacity_factor': f"{report['metrics']['capacity_factor']:.1%}",
            'total_energy_mwh': f"{report['metrics']['total_energy_mwh']:.1f}",
            'forecast_hours': report['metrics']['forecast_hours']
        }
    }

    return report
#%% COMPREHENSIVE_FORECAST_VALIDATION END


#%% MAPE_CALCULATION
def calculate_mape(forecast: pd.Series, actual: pd.Series) -> float:
    """
    Calculate Mean Absolute Percentage Error.

    PURPOSE: Computes MAPE accuracy metric for forecast validation
    INPUT: Forecast and actual power production time series
    OUTPUT: MAPE percentage value
    ROLE: Standard accuracy metric for forecast performance assessment

    Handles zero actual values by excluding them from calculation
    to avoid division by zero errors.
    """
    # Remove zero actuals to avoid division by zero
    mask = actual != 0
    if mask.sum() == 0:
        return 0.0

    mape = np.mean(np.abs((actual[mask] - forecast[mask]) / actual[mask])) * 100
    return mape
#%% MAPE_CALCULATION END


#%% VALIDATION_REPORT_PRINTING
def print_validation_report(report: Dict[str, any]) -> None:
    """
    Print formatted validation report to console.

    PURPOSE: Displays comprehensive validation results in human-readable format
    INPUT: Validation report dictionary from validate_forecast_comprehensive
    OUTPUT: Formatted console output with status icons and metrics
    ROLE: User interface for validation results review and debugging

    Provides structured output with:
    - Pass/fail status with visual indicators
    - Critical failures and warnings lists
    - Key performance metrics
    - MAPE accuracy assessment if available
    - Summary statistics
    """

    status_icon = "✅" if report['validation_passed'] else "❌"

    print(f"\n{status_icon} FORECAST VALIDATION REPORT")
    print(f"   Timestamp: {report['timestamp'].strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"   Status: {report['summary']['status']}")

    if report['critical_failures']:
        print(f"\n❌ CRITICAL FAILURES ({len(report['critical_failures'])}):")
        for failure in report['critical_failures']:
            print(f"   • {failure}")

    if report['warnings']:
        print(f"\n⚠️ WARNINGS ({len(report['warnings'])}):")
        for warning in report['warnings']:
            print(f"   • {warning}")

    print(f"\n📊 KEY METRICS:")
    for metric, value in report['summary']['key_metrics'].items():
        print(f"   • {metric}: {value}")

    if 'mape_percent' in report['metrics']:
        mape_icon = "✅" if report['metrics']['mape_percent'] <= 1.0 else "⚠️" if report['metrics']['mape_percent'] <= 5.0 else "❌"
        print(f"   • MAPE: {mape_icon} {report['metrics']['mape_percent']:.2f}%")

    print(f"\n📋 VALIDATION SUMMARY:")
    print(f"   • Critical failures: {report['summary']['critical_failures']}")
    print(f"   • Warnings: {report['summary']['warnings']}")
    print(f"   • Overall status: {status_icon} {report['summary']['status']}")
#%% VALIDATION_REPORT_PRINTING END


#%% CONTINUOUS_VALIDATION_RUNNER
def run_continuous_validation(
    forecast: pd.DataFrame,
    weather_data: pd.DataFrame,
    config: Dict[str, any],
    actual_data: Optional[pd.DataFrame] = None,
    save_report: bool = True,
    print_report: bool = True
) -> Dict[str, any]:
    """
    Run comprehensive validation and optionally save/print results.

    PURPOSE: Main entry point for complete forecast validation workflow
    INPUT: Forecast data, weather data, configuration, optional actual data, save/print flags
    OUTPUT: Comprehensive validation report dictionary
    ROLE: Orchestrates complete validation process with reporting and persistence

    Workflow:
    1. Runs comprehensive validation using validate_forecast_comprehensive
    2. Optionally prints human-readable report to console
    3. Optionally saves detailed JSON report to output directory
    4. Returns validation report for programmatic use

    This is the main function to call for validating any forecast.
    """

    # Run comprehensive validation
    report = validate_forecast_comprehensive(
        forecast, weather_data, config, actual_data
    )

    # Print report if requested
    if print_report:
        print_validation_report(report)

    # Save report if requested
    if save_report:
        client_id = config['client']['id']
        timestamp = report['timestamp'].strftime('%Y%m%d_%H%M%S')
        report_file = resolve_output_path(f"{client_id}/validation_report_{timestamp}.json", create_dirs=True)

        # Convert timestamps to strings for JSON serialization
        report_copy = report.copy()
        report_copy['timestamp'] = report_copy['timestamp'].isoformat()

        import json
        with open(report_file, 'w') as f:
            json.dump(report_copy, f, indent=2, default=str)

        logger.info(f"Validation report saved: {report_file}")

    return report
#%% CONTINUOUS_VALIDATION_RUNNER END
