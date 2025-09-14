#!/usr/bin/env python
"""End-to-end test for weather data flow: Open-Meteo -> SvelteKit -> DB -> Python"""

import asyncio
import sys
import os
import httpx
from datetime import datetime, timedelta
from uuid import uuid4
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import AsyncSessionLocal
from sqlalchemy import text
from app.modules.weather.services import WeatherService
from app.modules.weather.repositories import WeatherRepository


async def test_end_to_end_weather():
    """Test complete weather data flow from Open-Meteo to Python"""
    print("\n" + "="*60)
    print("End-to-End Weather Data Flow Test")
    print("Open-Meteo → SvelteKit → Database → Python")
    print("="*60)
    
    # Test configuration
    location_id = "1"  # Use existing location
    sveltekit_url = "http://localhost:5173"
    python_url = "http://localhost:8001"
    
    print("\n1. Checking services availability...")
    print("-" * 40)
    
    # Check SvelteKit is running
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{sveltekit_url}/api/health")
            if response.status_code == 200:
                print("✓ SvelteKit is running")
            else:
                print(f"✗ SvelteKit health check returned: {response.status_code}")
        except Exception as e:
            print(f"✗ SvelteKit not accessible: {e}")
            print("  Make sure SvelteKit is running: npm run dev")
    
    # Check Python worker is running
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{python_url}/health")
            if response.status_code == 200:
                print("✓ Python worker is running")
            else:
                print(f"✗ Python health check failed: {response.status_code}")
        except Exception as e:
            print(f"✗ Python worker not accessible: {e}")
    
    print("\n2. Getting location details from database...")
    print("-" * 40)
    
    # Get location coordinates from database
    async with AsyncSessionLocal() as db:
        result = await db.execute(text("""
            SELECT id, name, latitude, longitude 
            FROM locations 
            WHERE id = :location_id
        """), {"location_id": location_id})
        
        location = result.fetchone()
        if location:
            print(f"✓ Location found: {location.name}")
            print(f"  Coordinates: {location.latitude}, {location.longitude}")
            # Create a proper GUID for the location if needed
            location_guid = "550e8400-e29b-41d4-a716-446655440001"  # Example GUID
        else:
            print("✗ Location not found in database")
            return
    
    print("\n3. Clearing old test data...")
    print("-" * 40)
    
    # Clear old weather data for clean test
    async with AsyncSessionLocal() as db:
        await db.execute(text("""
            DELETE FROM weather_data 
            WHERE "locationId" = :location_id 
            AND timestamp < NOW() - INTERVAL '1 hour'
        """), {"location_id": location_id})
        await db.commit()
        print("✓ Old weather data cleared")
    
    print("\n4. Triggering weather sync via SvelteKit...")
    print("-" * 40)
    
    # Call SvelteKit API to sync weather data from Open-Meteo
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            # First, let's try to get the current weather to trigger a fetch
            response = await client.get(
                f"{sveltekit_url}/api/weather",
                params={"location_id": location_guid}
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✓ Weather data fetched from Open-Meteo via SvelteKit")
                print(f"  Records: {data.get('recordCount', 0)}")
                print(f"  Source: {data.get('source', 'unknown')}")
            else:
                print(f"✗ Weather fetch failed: {response.status_code}")
                print(f"  Response: {response.text[:200]}")
                
                # Try the sync endpoint instead
                print("\n  Trying sync endpoint...")
                sync_response = await client.post(
                    f"{sveltekit_url}/api/weather",
                    json={"locationIds": [location_guid]}
                )
                
                if sync_response.status_code == 200:
                    sync_data = sync_response.json()
                    print(f"✓ Sync triggered: {sync_data}")
                else:
                    print(f"✗ Sync failed: {sync_response.status_code}")
                    print(f"  Response: {sync_response.text[:200]}")
        
        except Exception as e:
            print(f"✗ Error calling SvelteKit: {e}")
    
    # Wait for data to be written to database
    print("\n  Waiting for database write...")
    await asyncio.sleep(3)
    
    print("\n5. Verifying data in database...")
    print("-" * 40)
    
    # Check if weather data was written to database
    async with AsyncSessionLocal() as db:
        result = await db.execute(text("""
            SELECT COUNT(*) as count, 
                   MAX(timestamp) as latest,
                   MIN(timestamp) as earliest,
                   AVG(temperature) as avg_temp
            FROM weather_data 
            WHERE "locationId" = :location_id
            AND timestamp >= NOW() - INTERVAL '1 hour'
        """), {"location_id": location_id})
        
        stats = result.fetchone()
        if stats and stats.count > 0:
            print(f"✓ Weather data in database:")
            print(f"  Records: {stats.count}")
            print(f"  Latest: {stats.latest}")
            print(f"  Average temp: {stats.avg_temp:.1f}°C" if stats.avg_temp else "  No temperature data")
        else:
            print("✗ No weather data found in database")
            print("  This might indicate the sync didn't work")
    
    print("\n6. Testing Python weather service...")
    print("-" * 40)
    
    # Test Python reading the data
    async with AsyncSessionLocal() as db:
        service = WeatherService(db)
        
        # Test get_weather_with_freshness
        weather = await service.get_weather_with_freshness(
            str(location_id),
            max_age_minutes=60
        )
        
        if weather:
            print(f"✓ Python service retrieved weather data:")
            print(f"  Temperature: {weather.temperature}°C")
            print(f"  Humidity: {weather.humidity}%")
            print(f"  Timestamp: {weather.timestamp}")
            print(f"  Source: {weather.source}")
            print(f"  Data age: {(datetime.utcnow() - weather.timestamp).total_seconds()/60:.1f} minutes")
        else:
            print("✗ Python service couldn't retrieve weather data")
    
    print("\n7. Testing Python API endpoints...")
    print("-" * 40)
    
    async with httpx.AsyncClient() as client:
        # Test current weather endpoint
        response = await client.get(
            f"{python_url}/api/v1/weather/current/{location_id}"
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Python API /current endpoint:")
            print(f"  Temperature: {data.get('temperature')}°C")
            print(f"  Source: {data.get('source')}")
        else:
            print(f"✗ Python API failed: {response.status_code}")
    
    print("\n8. Testing stale data sync trigger...")
    print("-" * 40)
    
    # Insert stale data to test sync trigger
    async with AsyncSessionLocal() as db:
        stale_id = str(uuid4())
        stale_time = datetime.utcnow() - timedelta(minutes=30)
        
        await db.execute(text("""
            INSERT INTO weather_data (
                id, timestamp, time, "locationId",
                temperature, humidity, pressure,
                "windSpeed", "windDirection", "cloudCover",
                source, "dataQuality"
            ) VALUES (
                :id, :timestamp, :time, :location_id,
                :temperature, :humidity, :pressure,
                :wind_speed, :wind_direction, :cloud_cover,
                :source, :data_quality
            )
            ON CONFLICT (id) DO NOTHING
        """), {
            "id": stale_id,
            "timestamp": stale_time,
            "time": stale_time,
            "location_id": location_id,
            "temperature": 15.0,
            "humidity": 50.0,
            "pressure": 1010.0,
            "wind_speed": 5.0,
            "wind_direction": 180.0,
            "cloud_cover": 20.0,
            "source": "test-stale",
            "data_quality": "GOOD"
        })
        await db.commit()
        print("✓ Inserted stale test data (30 minutes old)")
    
    # Test if Python service triggers sync for stale data
    async with AsyncSessionLocal() as db:
        service = WeatherService(db)
        
        print("\n  Testing freshness check and sync trigger...")
        weather = await service.get_weather_with_freshness(
            str(location_id),
            max_age_minutes=15  # Data older than 15 minutes triggers sync
        )
        
        if weather:
            age = (datetime.utcnow() - weather.timestamp).total_seconds()/60
            if age < 15:
                print(f"✓ Fresh data retrieved after sync")
                print(f"  Data age: {age:.1f} minutes")
            else:
                print(f"  Data still stale: {age:.1f} minutes old")
                print("  Sync might have failed or SvelteKit not responding")
        else:
            print("✗ No data retrieved after sync attempt")
    
    print("\n9. Summary...")
    print("-" * 40)
    
    # Final verification
    async with AsyncSessionLocal() as db:
        result = await db.execute(text("""
            SELECT COUNT(*) as total,
                   COUNT(CASE WHEN timestamp >= NOW() - INTERVAL '15 minutes' THEN 1 END) as fresh,
                   COUNT(CASE WHEN source = 'open-meteo' THEN 1 END) as from_api
            FROM weather_data
            WHERE "locationId" = :location_id
        """), {"location_id": location_id})
        
        summary = result.fetchone()
        
        print("✓ End-to-End Test Results:")
        print(f"  Total records: {summary.total}")
        print(f"  Fresh records (<15 min): {summary.fresh}")
        print(f"  From Open-Meteo: {summary.from_api}")
        
        if summary.fresh > 0:
            print("\n✓ SUCCESS: Complete weather data flow is working!")
            print("  Open-Meteo → SvelteKit → Database → Python")
        else:
            print("\n⚠ PARTIAL SUCCESS: Data flow needs debugging")
            print("  Check SvelteKit logs for Open-Meteo API errors")
    
    print("\n" + "="*60)
    print("End-to-End Test Complete")
    print("="*60)


if __name__ == "__main__":
    print("\n⚠ Prerequisites:")
    print("  1. SvelteKit must be running (npm run dev)")
    print("  2. Python worker must be running (uv run uvicorn app.main:app)")
    print("  3. Database must be accessible")
    print("\nStarting test in 3 seconds...")
    asyncio.run(asyncio.sleep(3))
    asyncio.run(test_end_to_end_weather())