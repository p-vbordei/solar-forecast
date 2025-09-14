#!/usr/bin/env python
"""Test SvelteKit integration client"""

import asyncio
import sys
import os
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.integrations.sveltekit import SvelteKitClient


async def test_sveltekit_client():
    """Test SvelteKit client methods"""
    print("\n" + "="*60)
    print("Test 5: SvelteKit Integration Client")
    print("="*60)
    
    client = SvelteKitClient()
    
    print("\n1. Testing client configuration...")
    print("-" * 40)
    print(f"✓ Base URL: {client.base_url}")
    print(f"✓ Timeout: {client.timeout} seconds")
    print(f"✓ Max retries: {client.max_retries}")
    print(f"✓ Retry delay: {client.retry_delay} seconds")
    
    print("\n2. Testing health check (may fail if SvelteKit not running)...")
    print("-" * 40)
    
    try:
        is_healthy = await client.health_check()
        if is_healthy:
            print("✓ SvelteKit API is healthy")
        else:
            print("✗ SvelteKit API returned unhealthy status")
    except Exception as e:
        print(f"  Expected: SvelteKit not running - {type(e).__name__}")
    
    print("\n3. Testing with mocked HTTP client...")
    print("-" * 40)
    
    # Test trigger_weather_sync with mock
    with patch('httpx.AsyncClient') as mock_client_class:
        mock_client = AsyncMock()
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "success": True,
            "locationId": "1",
            "message": "Sync triggered"
        }
        mock_response.raise_for_status = MagicMock()
        mock_client.post.return_value = mock_response
        mock_client.__aenter__.return_value = mock_client
        mock_client_class.return_value = mock_client
        
        result = await client.trigger_weather_sync("1")
        print(f"✓ Mocked trigger_weather_sync: {result}")
    
    # Test get_weather_sync_status with mock
    with patch('httpx.AsyncClient') as mock_client_class:
        mock_client = AsyncMock()
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "hasRecentData": True,
            "lastUpdate": "2025-09-14T10:00:00Z",
            "dataAge": 5
        }
        mock_response.raise_for_status = MagicMock()
        mock_client.get.return_value = mock_response
        mock_client.__aenter__.return_value = mock_client
        mock_client_class.return_value = mock_client
        
        status = await client.get_weather_sync_status("1")
        print(f"✓ Mocked get_weather_sync_status: {status}")
    
    # Test wait_for_sync_completion with immediate success
    with patch.object(client, 'get_weather_sync_status') as mock_status:
        mock_status.return_value = {"hasRecentData": True}
        
        completed = await client.wait_for_sync_completion("1", max_wait_seconds=5)
        print(f"✓ Mocked wait_for_sync (immediate): {completed}")
    
    # Test wait_for_sync_completion with timeout
    with patch.object(client, 'get_weather_sync_status') as mock_status:
        mock_status.return_value = {"hasRecentData": False}
        
        completed = await client.wait_for_sync_completion("1", max_wait_seconds=1, check_interval=0.1)
        print(f"✓ Mocked wait_for_sync (timeout): {completed}")
    
    print("\n4. Testing retry logic with mocked failures...")
    print("-" * 40)
    
    # Test retry on failure
    with patch('httpx.AsyncClient') as mock_client_class:
        mock_client = AsyncMock()
        
        # First two attempts fail, third succeeds
        responses = [
            Exception("Connection error"),
            Exception("Timeout"),
            MagicMock(json=lambda: {"success": True})
        ]
        
        mock_client.post.side_effect = responses
        mock_client.__aenter__.return_value = mock_client
        mock_client_class.return_value = mock_client
        
        # Override retry delay for faster test
        original_delay = client.retry_delay
        client.retry_delay = 0.01
        
        try:
            result = await client.trigger_weather_sync("1")
            print(f"✓ Retry succeeded after failures: {result}")
        except Exception as e:
            print(f"✗ Retry failed: {e}")
        finally:
            client.retry_delay = original_delay
    
    print("\n5. Testing bulk sync...")
    print("-" * 40)
    
    with patch('httpx.AsyncClient') as mock_client_class:
        mock_client = AsyncMock()
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "success": True,
            "locationIds": ["1", "2", "3"],
            "message": "Bulk sync triggered"
        }
        mock_response.raise_for_status = MagicMock()
        mock_client.post.return_value = mock_response
        mock_client.__aenter__.return_value = mock_client
        mock_client_class.return_value = mock_client
        
        result = await client.trigger_bulk_weather_sync(["1", "2", "3"])
        print(f"✓ Bulk sync result: {result}")
    
    print("\n6. Testing actual connection (if SvelteKit is running)...")
    print("-" * 40)
    print("  Note: These will fail if SvelteKit is not running")
    print("  This is expected in test environment\n")
    
    # Try actual API call (will fail if SvelteKit not running)
    try:
        result = await client.trigger_weather_sync("1")
        print(f"✓ Real API call succeeded: {result}")
    except Exception as e:
        print(f"  Expected error (SvelteKit not running): {type(e).__name__}")
    
    print("\n" + "="*60)
    print("SvelteKit Client Test Complete")
    print("="*60)


if __name__ == "__main__":
    asyncio.run(test_sveltekit_client())