#!/usr/bin/env python3
"""
Simple test script to verify weather service consolidation works
Run this after starting both SvelteKit and Python worker services
"""

import asyncio
import os
import sys
import httpx
import pandas as pd

# Add the python-worker directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'python-worker'))

from app.modules.forecast.repositories import ForecastRepository
from sqlalchemy.ext.asyncio import create_async_session, AsyncSession
from unittest.mock import AsyncMock

async def test_sveltekit_weather_endpoint():
    """Test the SvelteKit weather dataframe endpoint directly"""
    print("🧪 Testing SvelteKit weather DataFrame endpoint...")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "http://localhost:5173/api/weather/dataframe",
                params={
                    "location_id": "550e8400-e29b-41d4-a716-446655440000",
                    "hours": 24
                }
            )

            if response.status_code == 200:
                data = response.json()
                print(f"✅ SvelteKit endpoint working! Got {len(data.get('data', []))} weather records")
                return True
            else:
                print(f"❌ SvelteKit endpoint failed: {response.status_code}")
                print(f"Response: {response.text}")
                return False

    except Exception as e:
        print(f"❌ SvelteKit endpoint error: {e}")
        return False

async def test_python_weather_integration():
    """Test Python forecast repository calling SvelteKit"""
    print("🧪 Testing Python weather integration...")

    try:
        # Create a mock database session
        mock_db = AsyncMock(spec=AsyncSession)
        repo = ForecastRepository(mock_db)

        # Test getting weather data
        df = await repo.get_recent_weather(
            location_id="550e8400-e29b-41d4-a716-446655440000",
            hours=24
        )

        if isinstance(df, pd.DataFrame):
            print(f"✅ Python integration working! Got DataFrame with {len(df)} rows")
            if not df.empty:
                print(f"   Columns: {list(df.columns)}")
                print(f"   Sample data: {df.head(1).to_dict('records')}")
            return True
        else:
            print(f"❌ Python integration failed: Expected DataFrame, got {type(df)}")
            return False

    except Exception as e:
        print(f"❌ Python integration error: {e}")
        return False

async def test_end_to_end():
    """Run end-to-end integration test"""
    print("🚀 Starting Weather Service Consolidation Integration Test")
    print("=" * 60)

    # Set environment variable for SvelteKit URL
    os.environ['SVELTEKIT_URL'] = 'http://localhost:5173'

    # Test 1: SvelteKit endpoint
    sveltekit_ok = await test_sveltekit_weather_endpoint()

    # Test 2: Python integration
    python_ok = await test_python_weather_integration()

    print("=" * 60)
    print("📊 Test Results:")
    print(f"   SvelteKit Endpoint: {'✅ PASS' if sveltekit_ok else '❌ FAIL'}")
    print(f"   Python Integration: {'✅ PASS' if python_ok else '❌ FAIL'}")

    if sveltekit_ok and python_ok:
        print("🎉 Weather service consolidation SUCCESS!")
        print("   Python forecast service now uses SvelteKit for weather data")
        return True
    else:
        print("💥 Integration test FAILED!")
        print("   Check that both SvelteKit (port 5173) and database are running")
        return False

if __name__ == "__main__":
    # Check if we can import required modules
    try:
        import pandas as pd
        import httpx
        print("📦 Dependencies check: ✅ All required packages available")
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        sys.exit(1)

    # Run the test
    success = asyncio.run(test_end_to_end())
    sys.exit(0 if success else 1)