#!/usr/bin/env python
"""Setup test location with proper GUID for weather sync"""

import asyncio
import sys
import os
from uuid import uuid4
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import AsyncSessionLocal
from sqlalchemy import text


async def setup_test_location():
    """Create a test location with proper GUID"""
    
    # Generate a proper GUID
    location_guid = str(uuid4())
    
    async with AsyncSessionLocal() as db:
        # Check if we have a location with proper coordinates
        result = await db.execute(text("""
            SELECT id, name, latitude, longitude
            FROM locations
            WHERE latitude != 0 AND longitude != 0
            LIMIT 1
        """))
        
        existing = result.fetchone()
        
        if existing:
            print(f"Found existing location: {existing.name}")
            print(f"  ID: {existing.id}")
            print(f"  Coordinates: {existing.latitude}, {existing.longitude}")
            
            # Update to a real location (Bucharest, Romania)
            await db.execute(text("""
                UPDATE locations
                SET latitude = 44.4268,
                    longitude = 26.1025,
                    name = 'Bucharest Solar Farm'
                WHERE id = :id
            """), {"id": existing.id})
            await db.commit()
            print(f"\nUpdated location to Bucharest coordinates")
            return existing.id
        else:
            # Create a new location with GUID
            await db.execute(text("""
                INSERT INTO locations (id, name, latitude, longitude, status)
                VALUES (:id, :name, :latitude, :longitude, :status)
            """), {
                "id": location_guid,
                "name": "Bucharest Solar Farm",
                "latitude": 44.4268,
                "longitude": 26.1025,
                "status": "ACTIVE"
            })
            await db.commit()
            print(f"Created new location: Bucharest Solar Farm")
            print(f"  GUID: {location_guid}")
            print(f"  Coordinates: 44.4268, 26.1025")
            return location_guid


if __name__ == "__main__":
    location_id = asyncio.run(setup_test_location())
    print(f"\nTest location ID: {location_id}")
    print("Use this ID for weather sync testing")