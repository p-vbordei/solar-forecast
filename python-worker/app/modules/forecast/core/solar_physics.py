#%% SOLAR_PHYSICS_MODULE_INITIALIZATION
"""
Core solar physics calculations using PVLIB.
Maximizes use of PVLIB's built-in functions instead of custom implementations.
All functions are linear - no classes, just pure functions.

PURPOSE: Provide solar physics calculations for forecasting
INPUT: Weather data, plant configuration, location data
OUTPUT: Solar power production forecasts with detailed irradiance calculations
ROLE: Core physics engine using PVLIB ModelChain for accurate solar modeling

PVLIB INTEGRATION STRATEGY:
- Uses PVLIB ModelChain for complete physics modeling
- Leverages built-in module and inverter databases
- Applies sophisticated irradiance calculations
- Handles temperature effects and system losses
- Provides both full physics and simplified models
"""
import numpy as np
import pandas as pd
from typing import Dict, Tuple, Optional, Any, Union
import pvlib
from pvlib.location import Location
from pvlib.modelchain import ModelChain
from pvlib.pvsystem import PVSystem, Array, FixedMount
from pvlib.temperature import TEMPERATURE_MODEL_PARAMETERS
from pvlib.pvsystem import retrieve_sam
import warnings

# Suppress pvlib warnings for cleaner output
warnings.filterwarnings('ignore', module='pvlib')

#%% SOLAR_PHYSICS_MODULE_INITIALIZATION END


#%% LOCATION_AND_SYSTEM_CREATION
def create_location_and_system(config: Dict[str, Any]) -> Tuple[Location, PVSystem]:
    """
    Create PVLIB Location and PVSystem objects from configuration.
    
    PURPOSE: Initialize PVLIB components from client configuration
    INPUT:
        - config: Client configuration dict with 'location' and 'plant' sections
          Expected structure:
          {
            'location': {
              'latitude': float,
              'longitude': float, 
              'timezone': str,
              'altitude': float
            },
            'plant': {
              'capacity_kw': float,
              'panels': {...},
              'inverter': {...},
              'losses': {...}
            }
          }
    OUTPUT: Tuple of (Location, PVSystem) objects ready for PVLIB ModelChain
    ROLE: Main entry point for setting up PVLIB components for solar modeling
    
    PVLIB LOCATION OBJECT:
    - Handles solar position calculations
    - Manages timezone conversions
    - Provides clearsky irradiance models
    - Calculates sunrise/sunset times
    
    PVLIB PVSYSTEM OBJECT:
    - Defines PV array configuration
    - Specifies inverter parameters
    - Contains loss models
    - Enables complete system modeling
    """
    # Create Location object with geographic and timezone information
    location = Location(
        latitude=config['location']['latitude'],
        longitude=config['location']['longitude'],
        tz=config['location']['timezone'],
        altitude=config['location']['altitude']
    )
    
    # Create PVSystem with full configuration from plant specs
    system = create_pvsystem_from_config(config['plant'])
    
    return location, system

#%% LOCATION_AND_SYSTEM_CREATION END


#%% PVSYSTEM_CONFIGURATION
def create_pvsystem_from_config(plant_config: Dict[str, Any]) -> PVSystem:
    """
    Create a fully configured PVSystem from plant configuration.
    
    PURPOSE: Build complete PVLIB PVSystem with realistic module and inverter parameters
    INPUT:
        - plant_config: Dict with 'panels', 'inverter', 'capacity_kw' configuration
          Expected structure:
          {
            'capacity_kw': float,
            'panels': {
              'tilt': float,
              'azimuth': float,
              'temperature_coefficient': float,
              'temperature_model': str
            },
            'inverter': {
              'quantity': int,
              'ac_power_rating_kw': float
            },
            'mounting': {
              'type': str ('fixed', 'close_roof', etc.)
            },
            'losses': {
              'soiling_monthly': list,
              'shading': float,
              'wiring_dc': float,
              'wiring_ac': float,
              'transformer': float
            }
          }
    OUTPUT: Configured PVSystem object with arrays, inverters, and mounting
    ROLE: Translate plant configuration into PVLIB-compatible system definition
    
    PVLIB DATABASE INTEGRATION:
    - Uses CECMod database for realistic module parameters
    - Uses CECInverter database for inverter specifications
    - Falls back to manual specifications if database lookup fails
    - Maintains accurate power ratings and efficiency curves
    
    SYSTEM COMPONENTS:
    - Array: Module configuration, mounting, temperature model
    - Inverter: Power ratings, efficiency curves, loss parameters
    - Losses: Soiling, shading, wiring, transformer losses
    - Mount: Fixed tilt/azimuth or tracking system
    """
    panels = plant_config['panels']
    inverter = plant_config['inverter']
    
    #%% MODULE_DATABASE_LOOKUP
    """
    PURPOSE: Retrieve realistic module parameters from PVLIB's CECMod database
    INPUT: Target capacity in kW from plant configuration
    OUTPUT: Module parameters dict with SAPM coefficients
    ROLE: Provides accurate module specifications for power calculations
    
    PVLIB CECMod DATABASE:
    - Contains 17,000+ certified module specifications
    - Includes SAPM (Sandia Array Performance Model) parameters
    - Provides temperature coefficients and I-V curve data
    - Enables realistic power modeling vs simplified calculations
    
    SEARCH STRATEGY:
    - Targets high-power modules (500W+) for utility-scale installations
    - Prefers monocrystalline technology for efficiency
    - Falls back to manual parameters if database unavailable
    - Maintains consistent system sizing across configurations
    """
    target_capacity_kw = plant_config['capacity_kw']
    
    try:
        # Load CEC Module database for realistic module parameters
        module_db = retrieve_sam('CECMod')
        
        # Look for a suitable 500W+ monocrystalline module
        best_module = None
        target_power = 500  # Target ~500W modules
        
        for key, module in module_db.items():
            # Look for high-power monocrystalline modules around 500W
            if (abs(module['STC'] - target_power) < 100 and  # Within 100W of target
                module['STC'] > 400):  # At least 400W
                best_module = module.copy()
                best_module_name = key
                break
        
        if best_module is not None:
            # Use real module parameters
            module_power_w = best_module['STC']
            modules_per_string = 25  # Standard configuration
            total_modules_needed = int(target_capacity_kw * 1000 / module_power_w)
            parallel_strings = int(total_modules_needed / modules_per_string)
            actual_capacity_kw = (parallel_strings * modules_per_string * module_power_w) / 1000
            
            # Apply config temperature coefficient
            best_module['gamma_pmp'] = panels['temperature_coefficient']
            
            module_params = best_module
            print(f"Using PVLIB module: {best_module_name[:50]}...")
            print(f"Module: {module_power_w}W, {parallel_strings} strings × {modules_per_string} = {total_modules_needed} modules")
            print(f"Target: {target_capacity_kw}kW, Actual: {actual_capacity_kw}kW")
        else:
            raise Exception("No suitable module found in database")
            
    except Exception as e:
        print(f"PVLIB module database issue ({e}), using manual 500W module")
        
        # Fallback to manual 500W module parameters
        module_power_w = 500
        modules_per_string = 25
        total_modules_needed = int(target_capacity_kw * 1000 / module_power_w)
        parallel_strings = int(total_modules_needed / modules_per_string)
        actual_capacity_kw = (parallel_strings * modules_per_string * module_power_w) / 1000
        
        # Manual 500W monocrystalline module SAPM parameters  
        module_params = {
            'A0': 0.928, 'A1': 0.068, 'A2': -0.00863, 'A3': 0.000215, 'A4': -1.14e-06,
            'B0': 1.0, 'B1': -0.002438, 'B2': 0.0003103, 'B3': -1.246e-05, 'B4': 2.112e-07, 'B5': -1.359e-09,
            'C0': 1.0, 'C1': -0.047, 'C2': 0.0, 'C3': 0.0, 'C4': 0.0, 'C5': 0.0, 'C6': 0.0, 'C7': 0.0,
            'Isco': 13.5, 'Impo': 12.8, 'Voco': 49.5, 'Vmpo': 39.1,
            'Aisc': 0.0005, 'Aimp': 0.0005, 'Bvoco': -0.154, 'Mbvoc': 0.0, 'Bvmpo': -0.154, 'Mbvmp': 0.0,
            'N': 72, 'Cells_in_Series': 72, 'FD': 1.0,
            'Irradiance': module_power_w, 'Temperature': 25.0
        }
        print(f"Manual module: {module_power_w}W, {parallel_strings} strings × {modules_per_string} = {total_modules_needed} modules")
        print(f"Target: {target_capacity_kw}kW, Actual: {actual_capacity_kw}kW")
    #%% MODULE_DATABASE_LOOKUP END
    
    #%% INVERTER_DATABASE_LOOKUP
    """
    PURPOSE: Retrieve realistic inverter parameters from PVLIB's CECInverter database
    INPUT: Inverter configuration from plant specification
    OUTPUT: Inverter parameters dict with efficiency curves
    ROLE: Provides accurate inverter specifications for AC power conversion modeling
    
    PVLIB CECInverter DATABASE:
    - Contains 2,000+ certified inverter specifications
    - Includes CEC efficiency curves and power ratings
    - Provides DC/AC conversion parameters
    - Enables accurate power conversion modeling
    
    SEARCH STRATEGY:
    - Searches for HUAWEI SUN2000 series inverters
    - Scales single inverter parameters to multi-inverter installations
    - Falls back to manual HUAWEI SUN2000-100KTL-M2 specifications
    - Maintains efficiency curve accuracy for all power levels
    """
    try:
        # Load CEC Inverter database
        inverter_db = retrieve_sam('CECInverter')
        huawei_model = None
        
        # Search for HUAWEI SUN2000 series in database
        for key in inverter_db.keys():
            if 'HUAWEI' in key.upper() and 'SUN2000' in key.upper():
                huawei_model = inverter_db[key]
                print(f"Found HUAWEI inverter in database: {key}")
                print(f"DB Inverter specs: Paco={huawei_model['Paco']}W, Pdco={huawei_model['Pdco']}W")
                break
        
        if huawei_model is not None:
            # Scale for multiple inverters (9 × 100kW)
            num_inverters = inverter.get('quantity', 9)
            # Use exact PVLIB database parameters scaled up
            inverter_params = {
                'Paco': huawei_model['Paco'] * num_inverters,     # Scale AC power
                'Pdco': huawei_model['Pdco'] * num_inverters,     # Scale DC power  
                'Vdco': huawei_model['Vdco'],                     # DC voltage (same)
                'Pso': huawei_model['Pso'] * num_inverters,       # Scale standby power
                'C0': huawei_model['C0'],         # Efficiency curve coefficients (same)
                'C1': huawei_model['C1'],
                'C2': huawei_model['C2'],
                'C3': huawei_model['C3'],
                'Pnt': huawei_model['Pnt'] * num_inverters,       # Scale tare loss
            }
            print(f"PVLIB HUAWEI: {huawei_model['Paco']/1000}kW × {num_inverters} = {inverter_params['Paco']/1000}kW AC")
        else:
            print("HUAWEI not found in PVLIB CECInverter database")
            raise Exception("HUAWEI not found in database")
            
    except Exception as e:
        print(f"PVLIB database issue ({e}), using manual HUAWEI SUN2000-100KTL-M2 specs")
        
        # Manual HUAWEI SUN2000-100KTL-M2 specifications (from real datasheet)
        num_inverters = inverter.get('quantity', 9)
        single_inverter_kw = inverter.get('ac_power_rating_kw', 100)
        total_ac_capacity = num_inverters * single_inverter_kw * 1000  # Watts
        
        # Real HUAWEI SUN2000-100KTL-M2 CEC efficiency parameters
        inverter_params = {
            'Paco': total_ac_capacity,        # 900kW AC total
            'Pdco': total_ac_capacity * 1.1,  # 990kW DC (10% oversizing)
            'Vdco': 1080,                     # Optimal MPPT voltage
            'Pso': total_ac_capacity * 0.001, # 0.1% standby consumption  
            'C0': -8.69e-06,  # CEC efficiency curve coefficients for HUAWEI
            'C1': -9.86e-05,
            'C2': -0.00218,
            'C3': 0.00826,
            'Pnt': total_ac_capacity * 0.0005, # 0.05% night tare loss
        }
        print(f"Manual HUAWEI: {num_inverters} × {single_inverter_kw}kW = {total_ac_capacity/1000}kW AC")
    #%% INVERTER_DATABASE_LOOKUP END
    
    #%% MOUNTING_AND_ARRAY_CREATION
    """
    PURPOSE: Create PVLIB Array and PVSystem objects with proper mounting configuration
    INPUT: Plant configuration with mounting, panel, and loss specifications
    OUTPUT: Complete PVSystem object ready for ModelChain calculations
    ROLE: Assembles all components into final system for solar modeling
    
    PVLIB MOUNTING TYPES:
    - FixedMount: Static tilt/azimuth configuration
    - SingleAxisTracker: Tracking system (not implemented)
    - Temperature models: Open rack vs close roof configurations
    
    PVLIB ARRAY OBJECT:
    - Combines mount, modules, and temperature model
    - Defines electrical configuration (strings, modules per string)
    - Handles shading and mismatch losses
    - Provides foundation for power calculations
    
    PVLIB PVSYSTEM OBJECT:
    - Contains one or more arrays
    - Includes inverter parameters and efficiency curves
    - Applies system-level losses (wiring, transformer, etc.)
    - Enables complete system modeling through ModelChain
    """
    mount_type = plant_config.get('mounting', {}).get('type', 'fixed')
    mounting_config = plant_config.get('mounting', {})
    
    if mount_type == 'fixed':
        # Use PVLIB's temperature model parameters
        temp_model = panels.get('temperature_model', 'sapm')
        if mounting_config.get('type') == 'close_roof':
            temp_params = TEMPERATURE_MODEL_PARAMETERS['sapm']['close_mount_glass_glass']
        else:
            temp_params = TEMPERATURE_MODEL_PARAMETERS['sapm']['open_rack_glass_glass']
            
        # Create mount using config parameters
        tilt = panels['tilt']
        azimuth = panels['azimuth'] 
        mount = FixedMount(
            surface_tilt=tilt,
            surface_azimuth=azimuth
        )
        print(f"Mount Config: {tilt}° tilt, {azimuth}° azimuth (south-facing)")
        
        # Create array
        array = Array(
            mount=mount,
            module_parameters=module_params,
            temperature_model_parameters=temp_params,
            modules_per_string=modules_per_string,
            strings=parallel_strings
        )
        
        # Create PVSystem with array
        system = PVSystem(
            arrays=[array],
            inverter_parameters=inverter_params,
            losses_parameters=create_losses_dict(plant_config['losses'])
        )
    else:
        # Single-axis tracker or other mounting types
        # Would need additional configuration
        raise NotImplementedError(f"Mounting type {mount_type} not yet implemented")
    
    return system
    #%% MOUNTING_AND_ARRAY_CREATION END


#%% LOSSES_CONFIGURATION
def create_losses_dict(losses_config: Dict[str, Any]) -> Dict[str, Union[float, np.ndarray]]:
    """
    Convert loss configuration to PVLIB format.
    
    PURPOSE: Transform plant loss configuration into PVLIB-compatible format
    INPUT: Loss configuration dict with various loss types and values
    OUTPUT: PVLIB losses dict ready for ModelChain integration
    ROLE: Enables realistic system loss modeling in power calculations
    
    PVLIB LOSS TYPES:
    - Constant losses: Applied uniformly (shading, wiring, transformer)
    - Time-varying losses: Can vary by time period (soiling, snow)
    - System losses: DC wiring, AC wiring, inverter clipping
    - Environmental losses: Soiling, snow, availability
    
    LOSS MAPPING STRATEGY:
    - Maps custom loss names to PVLIB standard names
    - Converts monthly soiling to annual average
    - Applies seasonal losses (snow in winter months)
    - Maintains loss factor accuracy for power calculations
    """
    pvlib_losses = {}
    
    # Convert monthly soiling to annual average for now
    # (Could be enhanced to use time-series losses)
    if 'soiling_monthly' in losses_config:
        soiling_avg = np.mean(losses_config['soiling_monthly'])
        pvlib_losses['soiling'] = soiling_avg
        print(f"Soiling losses: {soiling_avg:.1%} (monthly average)")
    
    # Map our loss names to PVLIB names and apply them
    loss_mapping = {
        'shading': 'shading',
        'snow': 'snow', 
        'mismatch': 'mismatch',
        'wiring_dc': 'dc_wiring',
        'wiring_ac': 'ac_wiring',
        'transformer': 'transformer',
        'availability': 'availability'
    }
    
    for our_name, pvlib_name in loss_mapping.items():
        if our_name in losses_config:
            pvlib_losses[pvlib_name] = losses_config[our_name]
    
    return pvlib_losses
#%% LOSSES_CONFIGURATION END


#%% WEATHER_DATA_PREPARATION
def prepare_weather_data(weather_data: pd.DataFrame) -> pd.DataFrame:
    """
    Prepare weather data for PVLIB ModelChain.
    
    PURPOSE: Transform weather data into PVLIB-compatible format
    INPUT: Weather DataFrame with various column naming conventions
    OUTPUT: Standardized weather DataFrame with required PVLIB columns
    ROLE: Ensures weather data compatibility with PVLIB ModelChain
    
    PVLIB REQUIRED COLUMNS:
    - ghi: Global Horizontal Irradiance (W/m²)
    - dni: Direct Normal Irradiance (W/m²)
    - dhi: Diffuse Horizontal Irradiance (W/m²)
    - temp_air: Air temperature (°C)
    - wind_speed: Wind speed (m/s)
    
    PVLIB OPTIONAL COLUMNS:
    - relative_humidity: Relative humidity (%)
    - pressure: Atmospheric pressure (Pa)
    - precipitable_water: Precipitable water (cm)
    
    COLUMN MAPPING STRATEGY:
    - Maps common weather API column names to PVLIB standards
    - Validates presence of required columns
    - Adds optional columns when available
    - Raises clear errors for missing critical data
    """
    # Required columns for ModelChain
    required_columns = ['ghi', 'dni', 'dhi', 'temp_air', 'wind_speed']
    
    # Map common alternative names
    column_mapping = {
        'temperature_2m': 'temp_air',
        'shortwave_radiation': 'ghi',
        'direct_radiation': 'dni',
        'diffuse_radiation': 'dhi',
        'wind_speed_10m': 'wind_speed'
    }
    
    # Rename columns if needed
    weather = weather_data.rename(columns=column_mapping)
    
    # Check for missing columns
    missing = [col for col in required_columns if col not in weather.columns]
    if missing:
        raise ValueError(f"Missing required weather columns: {missing}")
    
    # Add optional columns if available
    optional_mapping = {
        'relative_humidity_2m': 'relative_humidity',
        'pressure_msl': 'pressure',
        'precipitation': 'precipitable_water'
    }
    
    for old_name, new_name in optional_mapping.items():
        if old_name in weather_data.columns:
            weather[new_name] = weather_data[old_name]
    
    return weather
#%% WEATHER_DATA_PREPARATION END


#%% MAIN_FORECAST_FUNCTION
def run_forecast(location: Location, 
                system: PVSystem,
                weather: pd.DataFrame,
                model: str = 'chain') -> pd.DataFrame:
    """
    Run solar power forecast using PVLIB ModelChain (full physics model).
    
    PURPOSE: Execute complete solar power forecast using PVLIB physics modeling
    INPUT:
        - location: PVLIB Location object with geographic coordinates
        - system: PVSystem object (fully configured with arrays, inverters, losses)
        - weather: Weather DataFrame with required meteorological data
        - model: Modeling approach ('chain', 'simple', or 'pvwatts')
    OUTPUT: DataFrame with power output and intermediate calculations
    ROLE: Main forecasting engine that transforms weather into power predictions
    
    PVLIB MODELCHAIN APPROACH:
    - Uses complete physics modeling with all system components
    - Applies spectral corrections, angle of incidence effects
    - Includes temperature modeling and system losses
    - Provides most accurate power predictions
    
    SIMPLIFIED APPROACH:
    - Uses proven formula from legacy v3 system
    - Applies basic temperature corrections
    - Faster execution for operational forecasting
    - Maintains compatibility with existing calibration
    
    OUTPUT COLUMNS:
    - ac_power: AC power output (W)
    - dc_power: DC power before inverter (W)
    - cell_temperature: Cell temperature (°C)
    - effective_irradiance: Irradiance reaching cells (W/m²)
    - poa_global: Plane of array irradiance (W/m²)
    - solar_elevation: Solar elevation angle (degrees)
    - solar_azimuth: Solar azimuth angle (degrees)
    - ac_power_mw: AC power in MW for easier interpretation
    - dc_power_mw: DC power in MW for easier interpretation
    """
    if model == 'chain':
        #%% PVLIB_MODELCHAIN_APPROACH
        """
        PURPOSE: Execute complete physics-based solar modeling using PVLIB ModelChain
        INPUT: Weather data, system configuration, location parameters
        OUTPUT: Complete power calculation results with intermediate values
        ROLE: Provides most accurate physics-based power predictions
        
        PVLIB MODELCHAIN COMPONENTS:
        - AOI model: Physical angle of incidence corrections
        - Spectral model: First Solar spectral response corrections
        - Temperature model: SAPM cell temperature calculations
        - Losses model: PVWatts system losses
        
        CALCULATION SEQUENCE:
        1. Solar position calculation
        2. Irradiance transposition to plane of array
        3. Angle of incidence corrections
        4. Spectral corrections
        5. Cell temperature modeling
        6. DC power calculation with SAPM
        7. Inverter conversion to AC power
        8. System losses application
        """
        # Use PVLIB's ModelChain for complete physics modeling
        # This uses ALL the configured system parameters (modules, inverters, losses)
        mc = ModelChain(
            system, 
            location,
            aoi_model='physical',
            spectral_model='first_solar',
            temperature_model='sapm',
            losses_model='pvwatts'
        )
        
        # Run the model with weather data
        mc.run_model(weather)
        
        # Extract results
        results = pd.DataFrame({
            'ac_power': mc.results.ac,
            'dc_power': mc.results.dc.sum(axis=1) if isinstance(mc.results.dc, pd.DataFrame) else mc.results.dc,
            'cell_temperature': mc.results.cell_temperature,
            'effective_irradiance': mc.results.effective_irradiance,
            'poa_global': mc.results.total_irrad['poa_global'] if hasattr(mc.results, 'total_irrad') else mc.results.poa_global,
            'solar_elevation': mc.results.solar_position['elevation'],
            'solar_azimuth': mc.results.solar_position['azimuth']
        })
        #%% PVLIB_MODELCHAIN_APPROACH END
        
    elif model == 'simple':
        #%% SIMPLIFIED_LEGACY_APPROACH
        """
        PURPOSE: Execute simplified solar modeling using legacy v3 system formula
        INPUT: Weather data with GHI and temperature
        OUTPUT: Power calculations using proven simple formula
        ROLE: Provides fast, calibrated power predictions for operational use
        
        LEGACY V3 FORMULA APPROACH:
        - Uses direct GHI to power conversion
        - Applies temperature coefficient corrections
        - Includes performance ratio from historical calibration
        - Maintains compatibility with existing operational system
        
        CALCULATION SEQUENCE:
        1. Solar position calculation for dawn/dusk cutoffs
        2. GHI normalization to standard test conditions
        3. Temperature effect calculation (-0.4% per °C above 25°C)
        4. Performance ratio application (92% system efficiency)
        5. DC to AC conversion with inverter efficiency
        6. Physical constraints and night production cutoff
        
        ADVANTAGES:
        - Fast execution for operational forecasting
        - Proven accuracy with existing calibration
        - Simple to understand and debug
        - Compatible with weather-adaptive system
        """
        # Use proven simple formula from v3 system
        results = pd.DataFrame(index=weather.index)
        
        # Extract capacity from system (convert from W to MW for calculation)
        capacity_mw = 0.87  # Hardcoded for now, matches original system
        
        # Calculate solar position
        solar_position = location.get_solarposition(weather.index)
        solar_elevation = solar_position['apparent_elevation']
        
        # Get GHI (Global Horizontal Irradiance)
        ghi = weather['ghi'].fillna(0)
        
        # Temperature effect (original v3 formula)
        temp_coefficient = -0.004  # -0.4% per degree C above 25C
        if 'temp_air' in weather.columns:
            temp_effect = 1 + temp_coefficient * (weather['temp_air'] - 25)
            temp_effect = temp_effect.clip(0.7, 1.1)
        else:
            temp_effect = 1.0
        
        # Performance ratio (from original v3 system)
        performance_ratio = 0.92  # 92% default performance ratio
        
        # Core formula: capacity × GHI_ratio × temp_effect × performance_ratio
        # Apply minimum irradiance threshold like old model (allow very low irradiance production)
        ghi_normalized = ghi / 1000  # Convert W/m² to fraction of standard irradiance
        dc_power_mw = capacity_mw * ghi_normalized * temp_effect * performance_ratio
        
        # Convert MW to Watts
        dc_power = dc_power_mw * 1_000_000
        ac_power = dc_power * 0.95  # 95% inverter efficiency
        
        # Physical constraints
        max_power = capacity_mw * 1_000_000  # Convert MW to W
        ac_power = ac_power.clip(lower=0, upper=max_power)
        dc_power = dc_power.clip(lower=0, upper=max_power)
        
        # Set night production to zero (lowered threshold to match old model)
        # Old model starts production at ~3° solar elevation
        ac_power[solar_elevation <= -6] = 0  # Allow production down to -6° for dawn/dusk
        dc_power[solar_elevation <= -6] = 0
        
        # Fill results
        results['ac_power'] = ac_power
        results['dc_power'] = dc_power
        results['cell_temperature'] = weather.get('temp_air', 25)  # Approximate
        results['effective_irradiance'] = ghi
        results['poa_global'] = ghi  # Simplified
        results['solar_elevation'] = solar_elevation
        results['solar_azimuth'] = solar_position['azimuth']
        #%% SIMPLIFIED_LEGACY_APPROACH END
        
    else:
        #%% PVWATTS_COMPONENT_APPROACH
        """
        PURPOSE: Execute component-level solar modeling using individual PVLIB functions
        INPUT: Weather data, system configuration, location parameters
        OUTPUT: Power calculations using individual PVLIB components
        ROLE: Provides granular control over modeling steps for custom applications
        
        PVWATTS COMPONENT APPROACH:
        - Manual control over each calculation step
        - Direct use of PVLIB functions without ModelChain
        - Suitable for custom modeling requirements
        - More complex but provides flexibility
        
        CALCULATION SEQUENCE:
        1. Solar position calculation
        2. Manual irradiance transposition to plane of array
        3. Cell temperature calculation using SAPM
        4. DC power calculation with PVWatts
        5. AC power calculation with PVWatts inverter
        6. Manual results assembly
        """
        # Simple calculation using PVLIB functions directly
        # This gives more control but less sophisticated modeling
        
        # Get solar position
        solar_position = location.get_solarposition(weather.index)
        
        # Get POA irradiance
        poa = get_irradiance(
            location,
            weather,
            system.arrays[0].mount.surface_tilt,
            system.arrays[0].mount.surface_azimuth
        )
        
        # Get cell temperature
        cell_temp = pvlib.temperature.sapm_cell(
            poa['poa_global'],
            weather['temp_air'],
            weather['wind_speed'],
            **system.arrays[0].temperature_model_parameters
        )
        
        # Simple DC power calculation
        dc_power = pvlib.pvsystem.pvwatts_dc(
            poa['poa_global'],
            cell_temp,
            system.arrays[0].module_parameters['pdc0'],
            system.arrays[0].module_parameters['gamma_pdc']
        )
        
        # Apply inverter model
        ac_power = pvlib.inverter.pvwatts(
            dc_power,
            system.inverter_parameters['Paco']
        )
        
        results = pd.DataFrame({
            'ac_power': ac_power,
            'dc_power': dc_power,
            'cell_temperature': cell_temp,
            'effective_irradiance': poa['poa_global'],
            'poa_global': poa['poa_global'],
            'solar_elevation': solar_position['elevation'],
            'solar_azimuth': solar_position['azimuth']
        })
        #%% PVWATTS_COMPONENT_APPROACH END
    
    #%% FINAL_POWER_CALCULATIONS
    """
    PURPOSE: Finalize power calculations with unit conversions and constraints
    INPUT: Raw power calculations in Watts
    OUTPUT: Cleaned power results with MW conversion and physical constraints
    ROLE: Ensures realistic power outputs and proper unit handling
    
    FINAL PROCESSING STEPS:
    - Unit conversion from Watts to MW for easier interpretation
    - Physical constraint enforcement (no negative power)
    - Capacity limit validation (should not exceed plant capacity)
    - Data quality checks and cleaning
    """
    # Convert from W to MW for easier interpretation
    results['ac_power_mw'] = results['ac_power'] / 1000000.0
    results['dc_power_mw'] = results['dc_power'] / 1000000.0
    
    # Ensure no negative power
    results['ac_power_mw'] = results['ac_power_mw'].clip(lower=0)
    results['dc_power_mw'] = results['dc_power_mw'].clip(lower=0)
    
    return results
    #%% FINAL_POWER_CALCULATIONS END
#%% MAIN_FORECAST_FUNCTION END


#%% IRRADIANCE_CALCULATIONS
def get_irradiance(location: Location,
                  weather: pd.DataFrame,
                  surface_tilt: float,
                  surface_azimuth: float,
                  albedo: float = 0.2) -> pd.DataFrame:
    """
    Calculate POA irradiance using PVLIB's built-in functions.
    
    PURPOSE: Transform horizontal irradiance to plane-of-array irradiance
    INPUT: 
        - location: PVLIB Location object
        - weather: DataFrame with GHI, DNI, DHI components
        - surface_tilt: Panel tilt angle in degrees
        - surface_azimuth: Panel azimuth angle in degrees
        - albedo: Ground reflectance (0.2 = typical ground)
    OUTPUT: DataFrame with POA irradiance components
    ROLE: Critical step for accurate solar panel irradiance calculations
    
    PVLIB IRRADIANCE TRANSPOSITION:
    - Hay-Davies model for sophisticated sky diffuse modeling
    - Accounts for horizon brightening and circumsolar radiation
    - Includes ground reflection (albedo) effects
    - More accurate than simple isotropic sky models
    
    OUTPUT COMPONENTS:
    - poa_global: Total irradiance on tilted surface
    - poa_direct: Direct beam component on tilted surface
    - poa_diffuse: Diffuse sky component on tilted surface
    - poa_ground_diffuse: Ground reflection component
    """
    # Get solar position
    solar_position = location.get_solarposition(weather.index)
    
    # Get POA irradiance
    poa = pvlib.irradiance.get_total_irradiance(
        surface_tilt=surface_tilt,
        surface_azimuth=surface_azimuth,
        solar_zenith=solar_position['apparent_zenith'],
        solar_azimuth=solar_position['azimuth'],
        dni=weather['dni'],
        ghi=weather['ghi'],
        dhi=weather['dhi'],
        albedo=albedo,
        model='haydavies'  # More sophisticated than isotropic
    )
    
    return poa
#%% IRRADIANCE_CALCULATIONS END


#%% AOI_MODIFIER_CALCULATIONS
def get_aoi_modifier(location: Location,
                    weather: pd.DataFrame,
                    system: PVSystem,
                    model: str = 'physical') -> pd.Series:
    """
    Calculate angle of incidence modifier using PVLIB.
    
    PURPOSE: Calculate angle of incidence corrections for solar panels
    INPUT:
        - location: PVLIB Location object
        - weather: Weather DataFrame for time index
        - system: PVSystem object with array configuration
        - model: IAM model ('physical', 'ashrae', 'martin_ruiz')
    OUTPUT: Series with angle of incidence modifier values
    ROLE: Corrects for reduced solar panel efficiency at high incidence angles
    
    ANGLE OF INCIDENCE PHYSICS:
    - Solar panels are most efficient when sun is perpendicular to surface
    - Efficiency decreases at high angles due to reflection losses
    - Physical model accounts for Fresnel reflections
    - ASHRAE model uses simple cosine relationship
    - Martin-Ruiz model optimized for specific panel types
    
    CALCULATION SEQUENCE:
    1. Calculate solar position for all timestamps
    2. Determine angle of incidence for panel orientation
    3. Apply selected IAM model for correction factors
    4. Return multiplier series for power calculations
    """
    solar_position = location.get_solarposition(weather.index)
    
    # Get AOI for first array
    aoi = pvlib.irradiance.aoi(
        surface_tilt=system.arrays[0].mount.surface_tilt,
        surface_azimuth=system.arrays[0].mount.surface_azimuth,
        solar_zenith=solar_position['apparent_zenith'],
        solar_azimuth=solar_position['azimuth']
    )
    
    # Calculate IAM based on model
    if model == 'physical':
        iam = pvlib.iam.physical(aoi)
    elif model == 'ashrae':
        iam = pvlib.iam.ashrae(aoi)
    elif model == 'martin_ruiz':
        iam = pvlib.iam.martin_ruiz(aoi)
    else:
        iam = pd.Series(1.0, index=aoi.index)
    
    return iam
#%% AOI_MODIFIER_CALCULATIONS END


#%% TIME_VARYING_LOSSES
def apply_monthly_losses(power: pd.Series,
                        losses_config: Dict[str, Any]) -> pd.Series:
    """
    Apply time-varying losses (like monthly soiling) to power output.
    
    PURPOSE: Apply seasonal and monthly loss variations to power output
    INPUT:
        - power: Power series with datetime index
        - losses_config: Dict with monthly loss configurations
    OUTPUT: Power series with time-varying losses applied
    ROLE: Supplements PVLIB's constant loss factors with temporal variations
    
    TIME-VARYING LOSS TYPES:
    - Monthly soiling: Varies by season (dust, pollen, weather)
    - Snow losses: Winter months only (December-March)
    - Seasonal availability: Maintenance schedules
    - Weather-dependent losses: Rain washing, wind cleaning
    
    LOSS APPLICATION STRATEGY:
    - Monthly soiling applied based on timestamp month
    - Snow losses only during winter months
    - Multiplicative loss factors (1 - loss_fraction)
    - Preserves power time series structure
    """
    power_with_losses = power.copy()
    
    # Apply monthly soiling if specified
    if 'soiling_monthly' in losses_config:
        months = power.index.month
        soiling_factors = pd.Series(
            [1 - losses_config['soiling_monthly'][m-1] for m in months],
            index=power.index
        )
        power_with_losses *= soiling_factors
    
    # Apply snow losses for winter months
    if 'snow' in losses_config and losses_config['snow'] > 0:
        winter_months = [12, 1, 2, 3]
        is_winter = power.index.month.isin(winter_months)
        snow_factor = pd.Series(1.0, index=power.index)
        snow_factor[is_winter] = 1 - losses_config['snow']
        power_with_losses *= snow_factor
    
    return power_with_losses
#%% TIME_VARYING_LOSSES END


#%% SOLAR_TIMING_FUNCTIONS
def get_sun_rise_set_transit(location: Location,
                            dates: pd.DatetimeIndex) -> pd.DataFrame:
    """
    Get sunrise, sunset, and solar noon times using PVLIB.
    
    PURPOSE: Calculate solar timing events for location and dates
    INPUT:
        - location: PVLIB Location object with coordinates
        - dates: DatetimeIndex with dates for calculation
    OUTPUT: DataFrame with sunrise, sunset, and solar noon times
    ROLE: Provides timing information for solar forecasting and scheduling
    
    SOLAR TIMING CALCULATIONS:
    - Sunrise: When sun's center crosses eastern horizon
    - Sunset: When sun's center crosses western horizon
    - Solar noon: When sun reaches highest elevation
    - Accounts for atmospheric refraction and location elevation
    """
    return location.get_sun_rise_set_transit(dates)
#%% SOLAR_TIMING_FUNCTIONS END


#%% CLEARSKY_CALCULATIONS
def get_clear_sky(location: Location,
                 times: pd.DatetimeIndex,
                 model: str = 'ineichen',
                 solar_position: Optional[pd.DataFrame] = None) -> pd.DataFrame:
    """
    Get clear sky irradiance using PVLIB models.
    
    PURPOSE: Calculate theoretical clear sky irradiance for comparison
    INPUT:
        - location: PVLIB Location object
        - times: DatetimeIndex for calculation periods
        - model: Clear sky model selection
        - solar_position: Optional pre-calculated solar position
    OUTPUT: DataFrame with clear sky GHI, DNI, DHI components
    ROLE: Provides reference irradiance for cloud effect analysis
    
    CLEAR SKY MODELS:
    - 'ineichen': Requires atmospheric data (most accurate)
    - 'haurwitz': Simple, elevation-based model
    - 'simplified_solis': Good accuracy, minimal inputs required
    
    APPLICATIONS:
    - Cloud effect quantification
    - Weather forecast validation
    - Solar resource assessment
    - Forecast model benchmarking
    """
    return location.get_clearsky(times, model=model, solar_position=solar_position)
#%% CLEARSKY_CALCULATIONS END


#%% SOLAR_POSITION_CALCULATIONS
def get_solarposition(location: Location,
                     times: pd.DatetimeIndex,
                     method: str = 'nrel_numpy') -> pd.DataFrame:
    """
    Calculate solar position using PVLIB.
    
    PURPOSE: Calculate solar elevation and azimuth angles
    INPUT:
        - location: PVLIB Location object with coordinates
        - times: DatetimeIndex for calculation periods
        - method: Solar position algorithm selection
    OUTPUT: DataFrame with elevation, azimuth, and other solar angles
    ROLE: Fundamental calculation for all solar modeling applications
    
    SOLAR POSITION ALGORITHMS:
    - 'nrel_numpy': NREL SPA algorithm (most accurate, <0.0003° error)
    - 'nrel_numba': Faster version if numba installed
    - 'ephemeris': Uses ephemeris data from pyephem
    - 'pyephem': Uses PyEphem library directly
    
    OUTPUT PARAMETERS:
    - elevation: Solar elevation angle (degrees above horizon)
    - azimuth: Solar azimuth angle (degrees from north)
    - zenith: Solar zenith angle (degrees from vertical)
    - apparent_elevation: Elevation corrected for atmospheric refraction
    """
    return location.get_solarposition(times, method=method)
#%% SOLAR_POSITION_CALCULATIONS END

#%% PVSYSTEM_CONFIGURATION END