"""Forecast repository - data access layer"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, and_, text
from sqlalchemy.sql import func


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
        """Save multiple forecast records"""
        if not forecasts:
            return 0
        
        # Convert to insert statement
        values = []
        for f in forecasts:
            values.append({
                "time": f["time"],
                "locationId": f["location_id"],
                "powerOutputMW": f["power_output_mw"],
                "energyMWh": f.get("energy_mwh"),
                "confidence": f.get("confidence"),
                "modelType": f.get("model_type", "ML"),
                "modelVersion": f.get("model_version"),
                "horizonHours": f.get("horizon_hours"),
                "temperature": f.get("temperature"),
                "irradiance": f.get("irradiance"),
                "cloudCover": f.get("cloud_cover"),
                "windSpeed": f.get("wind_speed"),
                "createdAt": datetime.utcnow()
            })
        
        # Use INSERT ... ON CONFLICT to handle duplicates
        query = text("""
            INSERT INTO "Forecast" (
                time, "locationId", "powerOutputMW", "energyMWh",
                confidence, "modelType", "modelVersion", "horizonHours",
                temperature, irradiance, "cloudCover", "windSpeed", "createdAt"
            ) VALUES (
                :time, :locationId, :powerOutputMW, :energyMWh,
                :confidence, :modelType, :modelVersion, :horizonHours,
                :temperature, :irradiance, :cloudCover, :windSpeed, :createdAt
            )
            ON CONFLICT (time, "locationId") DO UPDATE SET
                "powerOutputMW" = EXCLUDED."powerOutputMW",
                "energyMWh" = EXCLUDED."energyMWh",
                confidence = EXCLUDED.confidence,
                "modelType" = EXCLUDED."modelType",
                "modelVersion" = EXCLUDED."modelVersion",
                temperature = EXCLUDED.temperature,
                irradiance = EXCLUDED.irradiance,
                "cloudCover" = EXCLUDED."cloudCover",
                "windSpeed" = EXCLUDED."windSpeed"
        """)
        
        for value in values:
            await self.db.execute(query, value)
        
        await self.db.commit()
        return len(values)
    
    async def get_forecasts_range(
        self,
        location_id: int,
        start_time: datetime,
        end_time: datetime,
        model_type: Optional[str] = None
    ) -> List[Dict]:
        """Get forecasts within time range"""
        query_str = """
            SELECT 
                time, "locationId", "powerOutputMW", "energyMWh",
                confidence, "modelType", "modelVersion", "horizonHours",
                temperature, irradiance, "cloudCover", "windSpeed"
            FROM "Forecast"
            WHERE "locationId" = :location_id
                AND time >= :start_time
                AND time <= :end_time
        """
        
        params = {
            "location_id": location_id,
            "start_time": start_time,
            "end_time": end_time
        }
        
        if model_type:
            query_str += ' AND "modelType" = :model_type'
            params["model_type"] = model_type
        
        query_str += " ORDER BY time ASC"
        
        result = await self.db.execute(text(query_str), params)
        rows = result.fetchall()
        
        return [
            {
                "time": row[0],
                "location_id": row[1],
                "power_output_mw": row[2],
                "energy_mwh": row[3],
                "confidence": row[4],
                "model_type": row[5],
                "model_version": row[6],
                "horizon_hours": row[7],
                "temperature": row[8],
                "irradiance": row[9],
                "cloud_cover": row[10],
                "wind_speed": row[11]
            }
            for row in rows
        ]
    
    async def get_production_range(
        self,
        location_id: int,
        start_time: datetime,
        end_time: datetime
    ) -> List[Dict]:
        """Get actual production data within time range"""
        query = text("""
            SELECT time, "powerOutputMW", "energyMWh", efficiency
            FROM "Production"
            WHERE "locationId" = :location_id
                AND time >= :start_time
                AND time <= :end_time
            ORDER BY time ASC
        """)
        
        result = await self.db.execute(query, {
            "location_id": location_id,
            "start_time": start_time,
            "end_time": end_time
        })
        
        rows = result.fetchall()
        
        return [
            {
                "time": row[0],
                "power_output_mw": row[1],
                "energy_mwh": row[2],
                "efficiency": row[3]
            }
            for row in rows
        ]
    
    async def delete_forecasts_before(
        self,
        location_id: int,
        before_date: datetime
    ) -> int:
        """Delete forecasts before specified date"""
        query = text("""
            DELETE FROM "Forecast"
            WHERE "locationId" = :location_id
                AND time < :before_date
        """)
        
        result = await self.db.execute(query, {
            "location_id": location_id,
            "before_date": before_date
        })
        
        await self.db.commit()
        return result.rowcount
    
    async def get_latest_forecast(self, location_id: int) -> Optional[Dict]:
        """Get the most recent forecast for a location"""
        query = text("""
            SELECT 
                time, "powerOutputMW", confidence, "modelType"
            FROM "Forecast"
            WHERE "locationId" = :location_id
            ORDER BY time DESC
            LIMIT 1
        """)
        
        result = await self.db.execute(query, {"location_id": location_id})
        row = result.fetchone()
        
        if row:
            return {
                "time": row[0],
                "power_output_mw": row[1],
                "confidence": row[2],
                "model_type": row[3]
            }
        return None