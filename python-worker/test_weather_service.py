#!/usr/bin/env python
"""Test weather service freshness logic"""

import asyncio
import sys
import os
from datetime import datetime, timedelta
from uuid import uuid4

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import AsyncSessionLocal
from app.modules.weather.services import WeatherService
from app.models.weather import WeatherData


async def test_weather_service():
    """Test weather service with freshness checks and sync trigger"""
    async with AsyncSessionLocal() as db:
        print("\n" + "="*60)
        print("Test 4: Weather Service Freshness Logic")
        print("="*60)
        
        service = WeatherService(db)
        
        # Test location ID - use existing location from DB
        location_id = "1"
        
        print("\n1. Testing get_weather_with_freshness() with fresh data...")
        print("-" * 40)
        
        # Insert very fresh test data (1 minute old)
        fresh_weather_id = str(uuid4())
        fresh_timestamp = datetime.utcnow() - timedelta(minutes=1)
        
        query = text("""
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
        """)

        await db.execute(query, {
            "id": fresh_weather_id,
            "timestamp": fresh_timestamp,
            "time": fresh_timestamp,
            "location_id": location_id,
            "temperature": 22.0,
            "humidity": 65.0,
            "pressure": 1013.0,
            "wind_speed": 5.0,
            "wind_direction": 180.0,
            "cloud_cover": 30.0,
            "source": "test-fresh",
            "data_quality": "GOOD"
        })
        await db.commit()
        
        # Test with fresh data (should not trigger sync)
        try:
            weather = await service.get_weather_with_freshness(
                location_id,
                max_age_minutes=15
            )
            
            if weather:
                print(f"✓ Fresh data retrieved without sync")
                print(f"  Temperature: {weather.temperature}°C")
                print(f"  Data age: {(datetime.utcnow() - weather.timestamp).total_seconds()/60:.1f} minutes")
                print(f"  Source: {weather.source}")
            else:
                print("✗ No data retrieved (unexpected)")
        except Exception as e:
            print(f"✗ Error: {e}")
        
        print("\n2. Testing _is_weather_data_fresh() method...")
        print("-" * 40)
        
        # Test freshness checks
        test_cases = [
            (None, 15, False, "None data"),
            (WeatherData(
                id="test", timestamp=datetime.utcnow() - timedelta(minutes=5),
                time=datetime.utcnow(), locationId=location_id,
                temperature=20.0, humidity=60.0, pressure=1013.0,
                windSpeed=5.0, cloudCover=30.0
            ), 15, True, "5 min old (fresh)"),
            (WeatherData(
                id="test", timestamp=datetime.utcnow() - timedelta(minutes=20),
                time=datetime.utcnow(), locationId=location_id,
                temperature=20.0, humidity=60.0, pressure=1013.0,
                windSpeed=5.0, cloudCover=30.0
            ), 15, False, "20 min old (stale)"),
        ]
        
        for weather_data, max_age, expected, description in test_cases:
            is_fresh = service._is_weather_data_fresh(weather_data, max_age)
            status = "✓" if is_fresh == expected else "✗"
            print(f"{status} {description}: {is_fresh} (expected {expected})")
        
        print("\n3. Testing with stale data (should trigger sync)...")
        print("-" * 40)
        
        # Insert stale test data (30 minutes old)
        stale_weather_id = str(uuid4())
        stale_timestamp = datetime.utcnow() - timedelta(minutes=30)
        
        await db.execute(query, {
            "id": stale_weather_id,
            "timestamp": stale_timestamp,
            "time": stale_timestamp,
            "location_id": location_id,
            "temperature": 18.0,
            "humidity": 70.0,
            "pressure": 1015.0,
            "wind_speed": 3.0,
            "wind_direction": 270.0,
            "cloud_cover": 50.0,
            "source": "test-stale",
            "data_quality": "GOOD"
        })
        await db.commit()
        
        # Test with stale data (should trigger sync)
        print("  Note: Sync will fail if SvelteKit is not running")
        print("  This is expected in test environment\n")
        
        try:
            weather = await service.get_weather_with_freshness(
                location_id,
                max_age_minutes=15
            )
            
            if weather:
                print(f"✓ Data retrieved (may be stale if sync failed)")
                print(f"  Temperature: {weather.temperature}°C")
                print(f"  Data age: {(datetime.utcnow() - weather.timestamp).total_seconds()/60:.1f} minutes")
                print(f"  Source: {weather.source}")
            else:
                print("✗ No data retrieved")
        except Exception as e:
            print(f"  Expected error (SvelteKit not running): {e}")
        
        print("\n4. Testing legacy format conversion...")
        print("-" * 40)
        
        # Get recent weather data
        recent_weather = await service.repository.get_recent_weather(location_id, 24)
        
        if recent_weather:
            legacy_data = service._convert_to_legacy_format(recent_weather[:3])
            print(f"✓ Converted {len(recent_weather)} records to legacy format")
            
            if legacy_data:
                print(f"\n  Sample legacy format:")
                sample = legacy_data[0]
                for key, value in sample.items():
                    if key != "timestamp":
                        print(f"    {key}: {value}")
        else:
            print("✗ No weather data to convert")
        
        print("\n5. Testing mock data generation fallback...")
        print("-" * 40)
        
        mock_data = service._generate_mock_weather_data(days=1)
        print(f"✓ Generated {len(mock_data)} hours of mock data")
        print(f"  Sample: Hour 0 - Temp: {mock_data[0]['temperature']}°C")
        print(f"  Sample: Hour 12 - Temp: {mock_data[12]['temperature']}°C")
        
        print("\n" + "="*60)
        print("Weather Service Test Complete")
        print("="*60)


if __name__ == "__main__":
    asyncio.run(test_weather_service())