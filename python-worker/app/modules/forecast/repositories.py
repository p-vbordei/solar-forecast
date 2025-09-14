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


class ForecastRepository:
    """Repository for forecast data access"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_location(self, location_id: int) -> Optional[Dict]:
        """Get location by ID"""
        query = text("""
            SELECT id, name, latitude, longitude, capacity_mw, status
            FROM "Location"
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
                "capacity_mw": row[4],
                "status": row[5]
            }
        return None
    
    async def save_forecasts(self, forecasts: List[Dict]) -> int:
        """Save multiple forecast records (LEGACY METHOD - USE bulk_save_forecasts for new code)"""
        if not forecasts:
            return 0

        # Convert to proper field names
        values = []
        for f in forecasts:
            values.append({
                "timestamp": f["time"],  # Use primary field name
                "locationId": f["location_id"],
                "powerMW": f["power_output_mw"],  # Use primary field name
                "energyMWh": f.get("energy_mwh"),
                "confidence": f.get("confidence"),
                "modelType": f.get("model_type", "ML_ENSEMBLE"),
                "modelVersion": f.get("model_version"),
                "horizonMinutes": f.get("horizon_hours", 1) * 60,  # Convert to minutes
                "temperature": f.get("temperature"),
                "ghi": f.get("irradiance"),  # Correct field name
                "cloudCover": f.get("cloud_cover"),
                "windSpeed": f.get("wind_speed"),
                "createdAt": datetime.utcnow()
            })

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
        """Get actual production data within time range (corrected field names)"""
        query = text("""
            SELECT timestamp, "powerMW", "energyMWh", efficiency
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
                "energy_mwh": row[2],  # energyMWh
                "efficiency": row[3]
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
                "plantData": json.loads(row[14]) if row[14] else {},
                "performanceData": json.loads(row[15]) if row[15] else {},
                "calibrationSettings": json.loads(row[16]) if row[16] else {}
            }
        return None

    async def get_recent_weather(self, location_id: str, hours: int) -> pd.DataFrame:
        """Get weather data from TimescaleDB as DataFrame for forecast models"""
        query = text("""
            SELECT
                timestamp, temperature, humidity, pressure,
                "windSpeed", "cloudCover", ghi, dni, dhi,
                "solarZenith", "solarAzimuth"
            FROM weather_data
            WHERE "locationId" = :location_id
                AND timestamp >= NOW() - INTERVAL '{} hours'
            ORDER BY timestamp ASC
        """.format(hours))

        result = await self.db.execute(query, {"location_id": location_id})

        # Convert to DataFrame for forecast models
        data = []
        for row in result:
            data.append({
                'timestamp': row[0],
                'temp_air': row[1],
                'humidity': row[2],
                'pressure': row[3],
                'wind_speed': row[4],
                'cloud_cover': row[5],
                'ghi': row[6],
                'dni': row[7],
                'dhi': row[8],
                'solar_zenith': row[9],
                'solar_azimuth': row[10]
            })

        df = pd.DataFrame(data)
        if not df.empty:
            df.set_index('timestamp', inplace=True)

            # Add missing PVLIB fields with reasonable defaults
            if 'precipitable_water' not in df.columns:
                # Default precipitable water: 14mm (typical mid-latitude value)
                df['precipitable_water'] = 14.0

            # Ensure all required PVLIB weather fields are present
            pvlib_fields = {
                'wind_speed': 2.0,      # Default wind speed m/s
                'temp_air': 20.0,       # Default air temperature °C
                'albedo': 0.2           # Default ground reflectance
            }

            for field, default_value in pvlib_fields.items():
                if field not in df.columns:
                    df[field] = default_value

        return df

    async def bulk_save_forecasts(self, location_id: str, forecasts: pd.DataFrame) -> int:
        """Bulk insert forecasts using correct Prisma field mapping (UTC timestamps)"""
        if forecasts.empty:
            return 0

        values = []
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

            values.append({
                "id": str(uuid4()),
                "timestamp": timestamp,  # Correct field name
                "time": timestamp,  # Legacy field for Prisma compatibility
                "locationId": location_id,  # String UUID
                "powerMW": row.get('power_mw', 0.0),  # Correct field name, MW units
                "powerOutputMW": row.get('power_mw', 0.0),  # Required duplicate field
                "energyMWh": row.get('energy_mwh', 0.0),
                "capacityFactor": row.get('capacity_factor', 0.0),
                "powerMWQ10": row.get('p10_mw', None),  # Confidence bands
                "powerMWQ25": row.get('p25_mw', None),
                "powerMWQ75": row.get('p75_mw', None),
                "powerMWQ90": row.get('p90_mw', None),
                "modelType": self._normalize_model_type(row.get('model_type', 'ENSEMBLE')),
                "modelVersion": row.get('model_version', '2.0'),
                "horizonMinutes": int(row.get('horizon_hours', 1) * 60),  # Convert to minutes
                # Required enum fields with defaults
                "resolution": "HOURLY",  # Valid ResolutionType enum value
                "forecastType": "OPERATIONAL",  # Valid ForecastType enum value
                "dataQuality": "GOOD",  # Valid DataQuality enum value
                # Weather parameters
                "temperature": row.get('temp_air', None),
                "ghi": row.get('ghi', None),
                "dni": row.get('dni', None),
                "cloudCover": row.get('cloud_cover', None),
                "windSpeed": row.get('wind_speed', None),
                "qualityScore": row.get('quality_score', 0.95),
                "isValidated": False,  # Default validation status
                "createdAt": datetime.utcnow()
            })

        # Use COPY or multi-row INSERT for TimescaleDB optimization
        query = text("""
            INSERT INTO forecasts (
                id, timestamp, time, "locationId", "powerMW", "powerOutputMW", "energyMWh", "capacityFactor",
                "powerMWQ10", "powerMWQ25", "powerMWQ75", "powerMWQ90",
                "modelType", "modelVersion", "horizonMinutes",
                resolution, "forecastType", "dataQuality",
                temperature, ghi, dni, "cloudCover", "windSpeed",
                "qualityScore", "isValidated", "createdAt"
            ) VALUES (
                :id, :timestamp, :time, :locationId, :powerMW, :powerOutputMW, :energyMWh, :capacityFactor,
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
        """Build forecast configuration from database location data"""
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
                'panels': location['plantData'].get('panels', {
                    'tilt': location.get('tiltAngle', 30),
                    'azimuth': location.get('azimuthAngle', 180),
                    'technology': location.get('panelType', 'monocrystalline'),
                    'temperature_coefficient': -0.004,
                    'bifacial': False
                }),
                'inverter': location['plantData'].get('inverter', {
                    'efficiency': 0.95
                }),
                'physics_parameters': location['performanceData'].get('physics_parameters', {
                    'performance_ratio': 0.90,
                    'albedo': 0.2,
                    'dc_overpower_ratio': 1.1
                }),
                # PVLIB system losses configuration
                'losses': location['performanceData'].get('losses', {
                    'soiling': 2,       # Soiling losses (%)
                    'shading': 3,       # Shading losses (%)
                    'snow': 0,          # Snow losses (%)
                    'mismatch': 2,      # Module mismatch (%)
                    'wiring': 2,        # DC wiring losses (%)
                    'connections': 0.5, # Connection losses (%)
                    'lid': 1.5,         # Light-induced degradation (%)
                    'nameplate': 1,     # Nameplate rating losses (%)
                    'age': 0,           # Age-related losses (%)
                    'availability': 3   # System availability (%)
                })
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