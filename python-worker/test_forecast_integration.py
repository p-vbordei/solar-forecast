#!/usr/bin/env python
"""Test forecast service integration with weather data"""

import asyncio
import sys
import os
import httpx
from datetime import datetime, timedelta
from uuid import uuid4

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import AsyncSessionLocal
from sqlalchemy import text


async def test_forecast_integration():
    """Test forecast service with weather data integration"""
    print("\n" + "="*60)
    print("Test 7: Forecast Service Integration")
    print("="*60)
    
    base_url = "http://localhost:8001"
    
    print("\n1. Testing forecast endpoint...")
    print("-" * 40)
    
    # Test forecast generation
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            response = await client.post(
                f"{base_url}/api/v1/forecast/generate",
                json={
                    "location_id": 1,
                    "horizon_hours": 24,
                    "model_type": "ML"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✓ Forecast generated successfully")
                print(f"  Task ID: {data.get('task_id')}")
                print(f"  Status: {data.get('status')}")
                print(f"  Location ID: {data.get('location_id')}")
                print(f"  Estimated time: {data.get('estimated_time_seconds')} seconds")
            else:
                print(f"✗ Failed to generate forecast: {response.status_code}")
                print(f"  Response: {response.text}")
        except Exception as e:
            print(f"✗ Error: {e}")
    
    print("\n2. Testing forecast with weather data from DB...")
    print("-" * 40)
    
    # Insert weather data for forecast
    async with AsyncSessionLocal() as db:
        # Insert multiple hours of weather data
        base_time = datetime.utcnow()
        for hour in range(24):
            weather_id = str(uuid4())
            timestamp = base_time + timedelta(hours=hour)
            
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
            
            # Simulate varying weather conditions
            temp = 20 + 5 * (hour / 12) if hour < 12 else 25 - 5 * ((hour - 12) / 12)
            cloud = 20 + 30 * abs((hour - 12) / 12)
            ghi = max(0, 800 * (1 - cloud/100) * max(0, 1 - abs(hour - 12)/6))
            
            await db.execute(query, {
                "id": weather_id,
                "timestamp": timestamp,
                "time": timestamp,
                "location_id": "1",
                "temperature": temp,
                "humidity": 55 + hour % 20,
                "pressure": 1013 + hour % 5,
                "wind_speed": 3 + hour % 4,
                "wind_direction": 180 + hour * 15,
                "cloud_cover": cloud,
                "ghi": ghi,
                "dni": ghi * 0.8,
                "dhi": ghi * 0.2,
                "source": "test-forecast",
                "data_quality": "GOOD"
            })
        
        await db.commit()
        print("✓ Inserted 24 hours of weather data")
    
    # Test forecast with database weather data
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            response = await client.post(
                f"{base_url}/api/v1/forecast/generate",
                json={
                    "location_id": 1,
                    "horizon_hours": 24,
                    "model_type": "ML"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✓ Forecast task created")
                print(f"  Task ID: {data.get('task_id')}")
                print(f"  Status: {data.get('status')}")

                # Check task status
                if data.get('task_id'):
                    await asyncio.sleep(2)  # Wait for processing
                    status_response = await client.get(
                        f"{base_url}/api/v1/forecast/task/{data['task_id']}"
                    )
                    if status_response.status_code == 200:
                        status_data = status_response.json()
                        print(f"\n  Task status update:")
                        print(f"    Status: {status_data.get('status')}")
                        print(f"    Progress: {status_data.get('progress')}%")
            else:
                print(f"✗ Failed: {response.status_code}")
        except Exception as e:
            print(f"✗ Error: {e}")
    
    print("\n3. Testing analysis endpoint...")
    print("-" * 40)
    
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            response = await client.post(
                f"{base_url}/api/v1/analysis/analyze",
                json={
                    "location_id": "1",
                    "start_date": (datetime.utcnow() - timedelta(days=7)).isoformat(),
                    "end_date": datetime.utcnow().isoformat(),
                    "analysis_type": "performance"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✓ Analysis completed")
                print(f"  Analysis type: {data.get('analysis_type')}")
                print(f"  Metrics calculated: {len(data.get('metrics', {}))}")
                
                if data.get('metrics'):
                    for key, value in list(data['metrics'].items())[:3]:
                        print(f"    {key}: {value}")
            else:
                print(f"✗ Analysis failed: {response.status_code}")
        except Exception as e:
            print(f"✗ Error: {e}")
    
    print("\n4. Testing pipeline endpoint...")
    print("-" * 40)
    
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            response = await client.post(
                f"{base_url}/api/v1/pipeline/process",
                json={
                    "location_ids": ["1"],
                    "process_type": "forecast",
                    "parameters": {
                        "days": 1,
                        "installed_capacity": 100
                    }
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✓ Pipeline processed")
                print(f"  Process type: {data.get('process_type')}")
                print(f"  Locations processed: {data.get('locations_processed')}")
                print(f"  Status: {data.get('status')}")
            else:
                print(f"✗ Pipeline failed: {response.status_code}")
        except Exception as e:
            print(f"✗ Error: {e}")
    
    print("\n" + "="*60)
    print("Forecast Integration Test Complete")
    print("="*60)


if __name__ == "__main__":
    asyncio.run(test_forecast_integration())