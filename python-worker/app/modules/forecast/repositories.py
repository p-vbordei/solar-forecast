"""Forecast repository - data access layer"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, and_, text
from sqlalchemy.sql import func
import json
import pandas as pd
from uuid import uuid4
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class ForecastRepository:
    """Repository for forecast data access"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_location(self, location_id: int) -> Optional[Dict]:
        """Get location by ID"""
        query = text("""
            SELECT id, name, latitude, longitude, "capacityMW", status,
                   timezone, altitude, "tiltAngle", "azimuthAngle",
                   "panelType", "isBifacial", "inverterCount",
                   "plantData", "performanceData"
            FROM locations
            WHERE id = :location_id
        """)

        result = await self.db.execute(query, {"location_id": location_id})
        row = result.fetchone()

        if row:
            return {
                "id": row[0],
                "name": row[1],
                "latitude": row[2],
                "longitude": row[3],
                "capacityMW": row[4],  # Use camelCase to match config builder
                "capacity_mw": row[4],  # Also provide lowercase for compatibility
                "status": row[5],
                "timezone": row[6] or "Europe/Bucharest",
                "altitude": row[7],
                "tiltAngle": row[8],
                "azimuthAngle": row[9],
                "panelType": row[10],
                "isBifacial": row[11],
                "inverterCount": row[12],
                "plantData": row[13],
                "performanceData": row[14]
            }
        return None

    async def save_forecasts(self, forecasts: List[Dict]) -> int:
        """Save multiple forecast records (LEGACY METHOD - USE bulk_save_forecasts for new code)"""
        if not forecasts:
            return 0

        import math

        # Helper function to clean numeric values
        def clean_numeric(val):
            """Replace NaN and Inf values with None for database compatibility"""
            if val is not None and isinstance(val, (float, int)):
                if math.isnan(val) or math.isinf(val):
                    return None
            return val

        # Convert to proper field names
        values = []
        skipped = 0  # Initialize skipped counter
        for f in forecasts:
            # Validate critical power value
            power_mw = f.get("power_output_mw", 0)
            if power_mw is None or (isinstance(power_mw, float) and (math.isnan(power_mw) or math.isinf(power_mw))):
                logger.warning(f"Skipping forecast with invalid power: {power_mw} at {f.get('time')}")
                skipped += 1
                continue

            values.append({
                "timestamp": f["time"],  # Use primary field name
                "locationId": f["location_id"],
                "powerMW": clean_numeric(power_mw),  # Already validated above
                "energyMWh": clean_numeric(f.get("energy_mwh")),
                "confidence": clean_numeric(f.get("confidence")),
                "modelType": f.get("model_type", "ML_ENSEMBLE"),
                "modelVersion": f.get("model_version"),
                "horizonMinutes": f.get("horizon_hours", 1) * 60,  # Convert to minutes
                "temperature": clean_numeric(f.get("temperature")),
                "ghi": clean_numeric(f.get("irradiance")),  # Correct field name
                "cloudCover": clean_numeric(f.get("cloud_cover")),
                "windSpeed": clean_numeric(f.get("wind_speed")),
                "createdAt": datetime.utcnow()
            })

        # Check if we have any valid values to insert
        if not values:
            logger.warning(f"All {skipped} forecasts were invalid and skipped")
            return 0

        # Use correct table name and field names
        query = text("""
            INSERT INTO forecasts (
                timestamp, "locationId", "powerMW", "energyMWh",
                confidence, "modelType", "modelVersion", "horizonMinutes",
                temperature, ghi, "cloudCover", "windSpeed", "createdAt"
            ) VALUES (
                :timestamp, :locationId, :powerMW, :energyMWh,
                :confidence, :modelType, :modelVersion, :horizonMinutes,
                :temperature, :ghi, :cloudCover, :windSpeed, :createdAt
            )
            ON CONFLICT (timestamp, "locationId") DO UPDATE SET
                "powerMW" = EXCLUDED."powerMW",
                "energyMWh" = EXCLUDED."energyMWh",
                confidence = EXCLUDED.confidence,
                "modelType" = EXCLUDED."modelType",
                "modelVersion" = EXCLUDED."modelVersion",
                temperature = EXCLUDED.temperature,
                ghi = EXCLUDED.ghi,
                "cloudCover" = EXCLUDED."cloudCover",
                "windSpeed" = EXCLUDED."windSpeed"
        """)

        for value in values:
            await self.db.execute(query, value)

        await self.db.commit()

        if skipped > 0:
            logger.info(f"Saved {len(values)} forecasts, skipped {skipped} invalid records")

        return len(values)

    async def get_forecasts_range(
        self,
        location_id: str,  # String UUID
        start_time: datetime,
        end_time: datetime,
        model_type: Optional[str] = None
    ) -> List[Dict]:
        """Get forecasts within time range (using correct field names)"""
        query_str = """
            SELECT
                timestamp, "locationId", "powerMW", "energyMWh", "capacityFactor",
                "powerMWQ10", "powerMWQ25", "powerMWQ75", "powerMWQ90",
                "modelType", "modelVersion", "horizonMinutes",
                temperature, ghi, dni, "cloudCover", "windSpeed", "qualityScore"
            FROM forecasts
            WHERE "locationId" = :location_id
                AND timestamp >= :start_time
                AND timestamp <= :end_time
        """

        params = {
            "location_id": location_id,
            "start_time": start_time,
            "end_time": end_time
        }

        if model_type:
            query_str += ' AND "modelType" = :model_type'
            params["model_type"] = model_type

        query_str += " ORDER BY timestamp ASC"

        result = await self.db.execute(text(query_str), params)
        rows = result.fetchall()

        return [
            {
                "time": row[0],  # timestamp
                "location_id": row[1],  # locationId
                "power_output_mw": row[2],  # powerMW
                "energy_mwh": row[3],  # energyMWh
                "capacity_factor": row[4],  # capacityFactor
                "power_mw_q10": row[5],  # powerMWQ10
                "power_mw_q25": row[6],  # powerMWQ25
                "power_mw_q75": row[7],  # powerMWQ75
                "power_mw_q90": row[8],  # powerMWQ90
                "model_type": row[9],  # modelType
                "model_version": row[10],  # modelVersion
                "horizon_minutes": row[11],  # horizonMinutes
                "temperature": row[12],  # temperature
                "ghi": row[13],  # ghi
                "dni": row[14],  # dni
                "cloud_cover": row[15],  # cloudCover
                "wind_speed": row[16],  # windSpeed
                "quality_score": row[17]  # qualityScore
            }
            for row in rows
        ]

    async def get_production_range(
        self,
        location_id: str,  # String UUID
        start_time: datetime,
        end_time: datetime
    ) -> List[Dict]:
        """Get actual production data within time range (optimized schema)"""
        query = text("""
            SELECT timestamp, "powerMW", "capacityFactor", availability
            FROM production
            WHERE "locationId" = :location_id
                AND timestamp >= :start_time
                AND timestamp <= :end_time
            ORDER BY timestamp ASC
        """)

        result = await self.db.execute(query, {
            "location_id": location_id,
            "start_time": start_time,
            "end_time": end_time
        })

        rows = result.fetchall()

        return [
            {
                "time": row[0],  # timestamp
                "power_output_mw": row[1],  # powerMW
                "capacity_factor": row[2],  # capacityFactor
                "availability": row[3]  # availability
            }
            for row in rows
        ]

    async def delete_forecasts_before(
        self,
        location_id: str,  # String UUID
        before_date: datetime
    ) -> int:
        """Delete forecasts before specified date (corrected field names)"""
        query = text("""
            DELETE FROM forecasts
            WHERE "locationId" = :location_id
                AND timestamp < :before_date
        """)

        result = await self.db.execute(query, {
            "location_id": location_id,
            "before_date": before_date
        })

        await self.db.commit()
        return result.rowcount

    async def get_latest_forecast(self, location_id: str) -> Optional[Dict]:
        """Get the most recent forecast for a location (corrected field names)"""
        query = text("""
            SELECT
                timestamp, "powerMW", "qualityScore", "modelType"
            FROM forecasts
            WHERE "locationId" = :location_id
            ORDER BY timestamp DESC
            LIMIT 1
        """)

        result = await self.db.execute(query, {"location_id": location_id})
        row = result.fetchone()

        if row:
            return {
                "time": row[0],  # timestamp
                "power_output_mw": row[1],  # powerMW
                "quality_score": row[2],  # qualityScore
                "model_type": row[3]  # modelType
            }
        return None

    async def get_location_full(self, location_id: str) -> Optional[Dict]:
        """Get location with all JSON fields parsed for forecast configuration"""
        query = text("""
            SELECT
                id, name, code, latitude, longitude, timezone, altitude,
                "capacityMW", "actualCapacityMW", "panelCount", "panelType",
                "trackingSystem", "tiltAngle", "azimuthAngle",
                "plantData", "performanceData", "calibrationSettings"
            FROM locations
            WHERE id = :location_id
        """)

        result = await self.db.execute(query, {"location_id": location_id})
        row = result.fetchone()

        if row:
            return {
                "id": row[0],
                "name": row[1],
                "code": row[2],  # Important for model loading
                "latitude": row[3],
                "longitude": row[4],
                "timezone": row[5],
                "altitude": row[6],
                "capacityMW": row[7],
                "actualCapacityMW": row[8],
                "panelCount": row[9],
                "panelType": row[10],
                "trackingSystem": row[11],
                "tiltAngle": row[12],
                "azimuthAngle": row[13],
                # Handle JSON fields - they might already be dictionaries or JSON strings
                "plantData": row[14] if isinstance(row[14], dict) else (json.loads(row[14]) if row[14] and isinstance(row[14], str) else {}),
                "performanceData": row[15] if isinstance(row[15], dict) else (json.loads(row[15]) if row[15] and isinstance(row[15], str) else {}),
                "calibrationSettings": row[16] if isinstance(row[16], dict) else (json.loads(row[16]) if row[16] and isinstance(row[16], str) else {})
            }
        return None

    async def get_recent_weather(self, location_id: str, hours: int) -> pd.DataFrame:
        """Get weather data from SvelteKit API as DataFrame for forecast models, with database fallback"""
        import httpx
        import os

        # Get SvelteKit URL from environment
        sveltekit_url = os.getenv('SVELTEKIT_URL', 'http://localhost:5173')

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{sveltekit_url}/api/weather/dataframe",
                    params={
                        "location_id": location_id,
                        "hours": hours
                    }
                )

                if response.status_code != 200:
                    logger.warning(f"SvelteKit API returned {response.status_code}, using database fallback")
                    return await self._get_weather_from_database(location_id, hours)

                api_data = response.json()

                if not api_data.get('success'):
                    logger.warning(f"API error: {api_data.get('error')}, using database fallback")
                    return await self._get_weather_from_database(location_id, hours)

                # Convert API response to DataFrame
                weather_records = api_data['data']

                if not weather_records:
                    # Return empty DataFrame with expected columns
                    return pd.DataFrame(columns=[
                        'timestamp', 'temp_air', 'humidity', 'wind_speed',
                        'cloud_cover', 'ghi', 'dni', 'dhi'
                    ])

                # Create DataFrame from API response
                df = pd.DataFrame(weather_records)

                # Convert timestamp to datetime and set as index
                df['timestamp'] = pd.to_datetime(df['timestamp'])
                df.set_index('timestamp', inplace=True)

                # Map SvelteKit field names to PVLIB/forecast expected names
                column_mapping = {
                    'temperature': 'temp_air',
                    'windSpeed': 'wind_speed',
                    'cloudCover': 'cloud_cover'
                }

                df = df.rename(columns=column_mapping)

                # Ensure numeric columns
                numeric_cols = ['temp_air', 'humidity', 'wind_speed', 'cloud_cover', 'ghi', 'dni', 'dhi']
                for col in numeric_cols:
                    if col in df.columns:
                        df[col] = pd.to_numeric(df[col], errors='coerce')

                # Add missing PVLIB fields with reasonable defaults
                if 'pressure' not in df.columns:
                    df['pressure'] = 1013.25

                if 'precipitable_water' not in df.columns:
                    df['precipitable_water'] = 14.0

                if 'solar_zenith' not in df.columns:
                    df['solar_zenith'] = 45

                if 'solar_azimuth' not in df.columns:
                    df['solar_azimuth'] = 180

                if 'albedo' not in df.columns:
                    df['albedo'] = 0.2

                # Fill any missing values with defaults
                pvlib_defaults = {
                    'wind_speed': 2.0,
                    'temp_air': 20.0,
                    'humidity': 60.0,
                    'cloud_cover': 50.0,
                    'ghi': 0,
                    'dni': 0,
                    'dhi': 0
                }

                for field, default_value in pvlib_defaults.items():
                    if field in df.columns:
                        df[field] = df[field].fillna(default_value)

                logger.info(f"Retrieved {len(df)} weather records from SvelteKit for location {location_id}")
                return df

        except Exception as e:
            logger.error(f"Failed to get weather data from SvelteKit for location {location_id}: {e}")
            # Try database fallback
            return await self._get_weather_from_database(location_id, hours)

    async def _get_weather_from_database(self, location_id: str, hours: int) -> pd.DataFrame:
        """Direct database query for weather data (fallback method)"""
        from datetime import timedelta

        try:
            # Calculate time range
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(hours=hours)

            # Query weather data directly from database (using correct camelCase column names)
            query = text("""
                SELECT
                    timestamp,
                    temperature as temp_air,
                    humidity,
                    "windSpeed" as wind_speed,
                    "cloudCover" as cloud_cover,
                    ghi,
                    dni,
                    dhi
                FROM weather_data
                WHERE "locationId" = :location_id
                  AND timestamp >= :start_time
                  AND timestamp <= :end_time
                ORDER BY timestamp ASC
            """)

            result = await self.db.execute(query, {
                "location_id": location_id,
                "start_time": start_time,
                "end_time": end_time
            })

            rows = result.fetchall()

            if not rows:
                logger.warning(f"No weather data found in database for location {location_id}")
                # Return empty DataFrame with expected structure
                return pd.DataFrame(columns=[
                    'timestamp', 'temp_air', 'humidity', 'wind_speed',
                    'cloud_cover', 'ghi', 'dni', 'dhi'
                ])

            # Convert to DataFrame
            weather_data = []
            for row in rows:
                weather_data.append({
                    'timestamp': row[0],
                    'temp_air': row[1] or 20.0,
                    'humidity': row[2] or 60.0,
                    'wind_speed': row[3] or 2.0,
                    'cloud_cover': row[4] or 50.0,
                    'ghi': row[5] or 0,
                    'dni': row[6] or 0,
                    'dhi': row[7] or 0
                })

            df = pd.DataFrame(weather_data)
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            df.set_index('timestamp', inplace=True)

            # Add PVLIB required fields
            df['albedo'] = 0.2
            df['solar_zenith'] = 45
            df['solar_azimuth'] = 180
            df['precipitable_water'] = 14.0

            logger.info(f"Retrieved {len(df)} weather records from database for location {location_id}")
            return df

        except Exception as e:
            logger.error(f"Failed to get weather data from database: {e}")
            # Return empty DataFrame as last resort
            return pd.DataFrame(columns=[
                'timestamp', 'temp_air', 'humidity', 'wind_speed',
                'cloud_cover', 'ghi', 'dni', 'dhi'
            ])

    async def bulk_save_forecasts(self, location_id: str, forecasts: pd.DataFrame) -> int:
        """Bulk insert forecasts using correct Prisma field mapping (UTC timestamps)"""
        if forecasts.empty:
            return 0

        import math
        import numpy as np

        # Helper function to clean numeric values
        def clean_numeric(val):
            """Replace NaN and Inf values with None for database compatibility"""
            if val is None:
                return None
            if isinstance(val, (float, int)):
                if math.isnan(val) or math.isinf(val):
                    return None
            elif isinstance(val, (np.floating, np.integer)):
                if np.isnan(val) or np.isinf(val):
                    return None
            return val

        values = []
        skipped = 0  # Initialize skipped counter
        for idx, row in forecasts.iterrows():
            # Ensure timestamp is in UTC and timezone-naive for PostgreSQL
            timestamp = row.get('timestamp', idx)

            # Convert pandas Timestamp to timezone-naive UTC datetime
            if hasattr(timestamp, 'tz_localize'):
                # If timezone-naive, assume UTC
                if timestamp.tz is None:
                    timestamp = timestamp.tz_localize('UTC')
                else:
                    # Convert to UTC if timezone-aware
                    timestamp = timestamp.tz_convert('UTC')
                # Convert to naive datetime for PostgreSQL
                timestamp = timestamp.tz_localize(None)
            elif hasattr(timestamp, 'to_pydatetime'):
                # Convert pandas timestamp to Python datetime
                timestamp = timestamp.to_pydatetime()
                if timestamp.tzinfo is not None:
                    # Convert timezone-aware to UTC naive
                    timestamp = timestamp.utctimetuple()
                    timestamp = datetime(*timestamp[:6])
            elif hasattr(timestamp, 'replace') and hasattr(timestamp, 'tzinfo'):
                # Python datetime - remove timezone info if present
                if timestamp.tzinfo is not None:
                    timestamp = timestamp.replace(tzinfo=None)

            # Validate critical power value
            power_mw = clean_numeric(row.get('power_mw', 0.0))
            if power_mw is None or power_mw < 0:
                logger.warning(f"Skipping forecast with invalid power: {row.get('power_mw')} at {timestamp}")
                skipped += 1
                continue

            values.append({
                "id": str(uuid4()),
                "timestamp": timestamp,  # Correct field name
                # REMOVED 'time' field - it doesn't exist in database!
                "locationId": location_id,  # String UUID
                "powerMW": power_mw,  # Cleaned and validated
                "powerOutputMW": power_mw,  # Required duplicate field
                "energyMWh": clean_numeric(row.get('energy_mwh', 0.0)),
                "capacityFactor": clean_numeric(row.get('capacity_factor', 0.0)),
                "powerMWQ10": clean_numeric(row.get('p10_mw', None)),  # Confidence bands
                "powerMWQ25": clean_numeric(row.get('p25_mw', None)),
                "powerMWQ75": clean_numeric(row.get('p75_mw', None)),
                "powerMWQ90": clean_numeric(row.get('p90_mw', None)),
                "modelType": self._normalize_model_type(row.get('model_type', 'ENSEMBLE')),
                "modelVersion": row.get('model_version', '2.0'),
                "horizonMinutes": int(row.get('horizon_hours', 1) * 60),  # Convert to minutes
                # Required enum fields with defaults
                "resolution": "HOURLY",  # Valid ResolutionType enum value
                "forecastType": "OPERATIONAL",  # Valid ForecastType enum value
                "dataQuality": "GOOD",  # Valid DataQuality enum value
                # Weather parameters
                "temperature": clean_numeric(row.get('temp_air', None)),
                "ghi": clean_numeric(row.get('ghi', None)),
                "dni": clean_numeric(row.get('dni', None)),
                "cloudCover": clean_numeric(row.get('cloud_cover', None)),
                "windSpeed": clean_numeric(row.get('wind_speed', None)),
                "qualityScore": clean_numeric(row.get('quality_score', 0.95)),
                "isValidated": False,  # Default validation status
                "createdAt": datetime.utcnow()
            })

        # Check if we have any valid values to insert
        if not values:
            logger.warning(f"All {skipped} forecasts were invalid and skipped for location {location_id}")
            return 0

        # Use COPY or multi-row INSERT for TimescaleDB optimization
        query = text("""
            INSERT INTO forecasts (
                id, timestamp, "locationId", "powerMW", "powerOutputMW", "energyMWh", "capacityFactor",
                "powerMWQ10", "powerMWQ25", "powerMWQ75", "powerMWQ90",
                "modelType", "modelVersion", "horizonMinutes",
                resolution, "forecastType", "dataQuality",
                temperature, ghi, dni, "cloudCover", "windSpeed",
                "qualityScore", "isValidated", "createdAt"
            ) VALUES (
                :id, :timestamp, :locationId, :powerMW, :powerOutputMW, :energyMWh, :capacityFactor,
                :powerMWQ10, :powerMWQ25, :powerMWQ75, :powerMWQ90,
                :modelType, :modelVersion, :horizonMinutes,
                :resolution, :forecastType, :dataQuality,
                :temperature, :ghi, :dni, :cloudCover, :windSpeed,
                :qualityScore, :isValidated, :createdAt
            )
        """)

        for value in values:
            await self.db.execute(query, value)

        await self.db.commit()

        if skipped > 0:
            logger.info(f"Saved {len(values)} forecasts, skipped {skipped} invalid records")

        return len(values)

    def _normalize_model_type(self, model_type: str) -> str:
        """Normalize model type to match database enum values"""
        # Map internal model types to database enum values (from Prisma schema)
        model_type_map = {
            'ML_CATBOOST_ENSEMBLE': 'ENSEMBLE',
            'ML_CATBOOST_FALLBACK': 'ENSEMBLE',
            'ML_CATBOOST': 'ENSEMBLE',
            'ML_ENSEMBLE': 'ENSEMBLE',
            'PHYSICS_ONLY': 'PHYSICAL',
            'PHYSICS': 'PHYSICAL',
            'HYBRID': 'HYBRID'
        }

        return model_type_map.get(model_type, 'ENSEMBLE')

    def build_config_from_location(self, location: Dict) -> Dict[str, Any]:
        """Build forecast configuration from database location data with Romanian defaults"""
        # Handle None or missing JSON fields
        plant_data = location.get('plantData') or {}
        performance_data = location.get('performanceData') or {}

        # Calculate optimal tilt based on latitude for Romania
        latitude = location['latitude']

        # Romanian optimal tilt: latitude - 10° for year-round production
        default_tilt = round(latitude - 10) if 44 <= latitude <= 47 else 35

        # Get tilt and azimuth with Romanian defaults
        tilt_angle = location.get('tiltAngle')
        azimuth_angle = location.get('azimuthAngle')

        # Apply Romanian defaults if not specified
        if tilt_angle is None:
            tilt_angle = default_tilt  # Optimal for Romania
        if azimuth_angle is None:
            azimuth_angle = 180  # South-facing for Northern hemisphere

        config = {
            'location': {
                'latitude': location['latitude'],
                'longitude': location['longitude'],
                'timezone': location['timezone'],
                'altitude': location.get('altitude', 100)
            },
            'plant': {
                'capacity_kw': location['capacityMW'] * 1000,  # MW to kW for forecast engine
                'capacity_mw': location['capacityMW'],  # Keep MW for validation
                # Parse from JSON fields or use defaults
                'panels': {
                    'tilt': plant_data.get('panels', {}).get('tilt', tilt_angle),
                    'azimuth': plant_data.get('panels', {}).get('azimuth', azimuth_angle),
                    'technology': location.get('panelType', 'monocrystalline'),
                    'temperature_coefficient': -0.0035,  # Romanian standard for mono-Si
                    'bifacial': location.get('isBifacial', False),
                    'nominal_efficiency': 0.21  # Modern panel efficiency
                },
                'inverter': {
                    'efficiency': plant_data.get('inverter', {}).get('efficiency', 0.98),
                    # Size inverters to match plant capacity (not divide by quantity)
                    'ac_power_rating_kw': location.get('capacityMW', 1) * 1000,  # Total AC capacity
                    'quantity': location.get('inverterCount', 1)  # Handled in solar_physics.py
                },
                'physics_parameters': performance_data.get('physics_parameters', {
                    'performance_ratio': 0.84,  # Romanian typical PR
                    'albedo': 0.2,  # Grass/soil
                    'dc_overpower_ratio': 1.15  # 15% DC oversizing
                }),
                # PVLIB system losses configuration - get from performanceData or use defaults
                'losses': performance_data.get('losses') or {
                    'soiling': 2,       # Soiling losses (%)
                    'shading': 1,       # Shading losses (%) - Romanian default
                    'snow': 1.5,        # Snow losses (%) - Romanian winters
                    'mismatch': 2,      # Module mismatch (%)
                    'wiring': 1.5,      # DC wiring losses (%)
                    'connections': 0.5, # Connection losses (%)
                    'lid': 1.5,         # Light-induced degradation (%)
                    'nameplate': 1,     # Nameplate rating losses (%)
                    'age': 0,           # Age-related losses (%)
                    'availability': 3   # System availability (%)
                }
            }
        }

        # Add tracking system
        tracking_map = {
            'FIXED': 'fixed',
            'SINGLE_AXIS': 'single_axis',
            'DUAL_AXIS': 'dual_axis'
        }
        config['plant']['tracking'] = tracking_map.get(location.get('trackingSystem', 'FIXED'), 'fixed')

        # Ensure all required PVLIB fields are present
        if 'losses' not in config['plant']:
            config['plant']['losses'] = {
                'soiling': 2, 'shading': 3, 'snow': 0, 'mismatch': 2,
                'wiring': 2, 'connections': 0.5, 'lid': 1.5, 'nameplate': 1,
                'age': 0, 'availability': 3
            }

        return config
