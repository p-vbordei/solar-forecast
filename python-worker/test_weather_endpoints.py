#!/usr/bin/env python
"""Test weather API endpoints"""

import asyncio
import sys
import os
import httpx
from datetime import datetime, timedelta
from uuid import uuid4

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import AsyncSessionLocal
from sqlalchemy import text


async def test_weather_endpoints():
    """Test weather API endpoints"""
    print("\n" + "="*60)
    print("Test 6: Weather API Endpoints")
    print("="*60)
    
    base_url = "http://localhost:8001"
    location_id = "1"  # Use existing location
    
    print("\n1. Testing API health check...")
    print("-" * 40)
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{base_url}/api/v1/weather/health")
            if response.status_code == 200:
                data = response.json()
                print(f"✓ Weather service status: {data.get('weather_service')}")
                print(f"  SvelteKit integration: {data.get('sveltekit_integration')}")
                print(f"  Overall status: {data.get('status')}")
            else:
                print(f"✗ Health check failed: {response.status_code}")
        except Exception as e:
            print(f"✗ Could not connect to API: {e}")
            print("  Make sure the FastAPI server is running:")
            print("  uv run uvicorn app.main:app --host 0.0.0.0 --port 8001")
            return
    
    print("\n2. Preparing test data...")
    print("-" * 40)
    
    # Insert fresh test data
    async with AsyncSessionLocal() as db:
        fresh_weather_id = str(uuid4())
        fresh_timestamp = datetime.utcnow() - timedelta(minutes=5)
        
        query = text("""
            INSERT INTO weather_data (
                id, timestamp, time, "locationId",
                temperature, humidity, pressure,
                "windSpeed", "windDirection", "cloudCover",
                ghi, dni, dhi,
                source, "dataQuality"
            ) VALUES (
                :id, :timestamp, :time, :location_id,
                :temperature, :humidity, :pressure,
                :wind_speed, :wind_direction, :cloud_cover,
                :ghi, :dni, :dhi,
                :source, :data_quality
            )
            ON CONFLICT (id) DO NOTHING
        """)
        
        await db.execute(query, {
            "id": fresh_weather_id,
            "timestamp": fresh_timestamp,
            "time": fresh_timestamp,
            "location_id": location_id,
            "temperature": 24.5,
            "humidity": 62.0,
            "pressure": 1012.0,
            "wind_speed": 6.5,
            "wind_direction": 225.0,
            "cloud_cover": 35.0,
            "ghi": 850.0,
            "dni": 700.0,
            "dhi": 150.0,
            "source": "test-endpoint",
            "data_quality": "GOOD"
        })
        await db.commit()
        print("✓ Inserted fresh test weather data")
    
    print("\n3. Testing GET /api/weather/current/{location_id}...")
    print("-" * 40)
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{base_url}/api/v1/weather/current/{location_id}",
                params={"max_age_minutes": 15}
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✓ Current weather retrieved:")
                print(f"  Temperature: {data.get('temperature')}°C")
                print(f"  Humidity: {data.get('humidity')}%")
                print(f"  Wind Speed: {data.get('windSpeed')} m/s")
                print(f"  GHI: {data.get('ghi')} W/m²")
                print(f"  Source: {data.get('source')}")
            else:
                print(f"✗ Failed to get current weather: {response.status_code}")
                print(f"  Response: {response.text}")
        except Exception as e:
            print(f"✗ Error: {e}")
    
    print("\n4. Testing GET /api/weather/status/{location_id}...")
    print("-" * 40)
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{base_url}/api/v1/weather/status/{location_id}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✓ Weather status retrieved:")
                print(f"  Has recent data: {data.get('hasRecentData')}")
                print(f"  Is fresh: {data.get('isFresh')}")
                print(f"  Record count (24h): {data.get('recordCount')}")
                if data.get('dataAge_minutes'):
                    print(f"  Data age: {data.get('dataAge_minutes'):.1f} minutes")
            else:
                print(f"✗ Failed to get weather status: {response.status_code}")
        except Exception as e:
            print(f"✗ Error: {e}")
    
    print("\n5. Testing POST /api/weather/refresh/{location_id}...")
    print("-" * 40)
    
    async with httpx.AsyncClient() as client:
        try:
            # Test without force
            response = await client.post(
                f"{base_url}/api/v1/weather/refresh/{location_id}",
                json={"force": False}
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✓ Refresh response:")
                print(f"  Success: {data.get('success')}")
                print(f"  Sync triggered: {data.get('syncTriggered')}")
                print(f"  Message: {data.get('message')}")
            else:
                print(f"✗ Failed to refresh weather: {response.status_code}")
        except Exception as e:
            print(f"✗ Error: {e}")
    
    print("\n6. Testing non-existent location handling...")
    print("-" * 40)
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{base_url}/api/v1/weather/current/999999")
            
            if response.status_code == 404:
                print(f"✓ Correctly returned 404 for non-existent location")
            else:
                print(f"✗ Unexpected status code: {response.status_code}")
        except Exception as e:
            print(f"✗ Error: {e}")
    
    print("\n7. Testing forced refresh...")
    print("-" * 40)
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{base_url}/api/v1/weather/refresh/{location_id}",
                json={"force": True}
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✓ Forced refresh response:")
                print(f"  Success: {data.get('success')}")
                print(f"  Sync triggered: {data.get('syncTriggered')}")
                print(f"  Message: {data.get('message')}")
            else:
                print(f"✗ Failed to force refresh: {response.status_code}")
        except Exception as e:
            print(f"✗ Error: {e}")
    
    print("\n" + "="*60)
    print("Weather API Endpoints Test Complete")
    print("="*60)


if __name__ == "__main__":
    print("\n⚠  Make sure the FastAPI server is running:")
    print("  uv run uvicorn app.main:app --host 0.0.0.0 --port 8001")
    print("\nStarting tests in 3 seconds...")
    asyncio.run(asyncio.sleep(3))
    asyncio.run(test_weather_endpoints())