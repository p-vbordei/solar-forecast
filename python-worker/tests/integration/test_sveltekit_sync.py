"""Integration tests for SvelteKit sync trigger"""

import pytest
from unittest.mock import patch, AsyncMock
import httpx
from datetime import datetime

from app.integrations.sveltekit import SvelteKitClient, sveltekit_client
from app.core.config import settings


@pytest.fixture
def sample_location_id():
    """Sample location ID for testing"""
    return "123e4567-e89b-12d3-a456-426614174000"


@pytest.fixture
def sveltekit_client_instance():
    """Create SvelteKit client instance for testing"""
    return SvelteKitClient()


class TestSvelteKitSync:
    """Test SvelteKit synchronization integration"""

    @pytest.mark.asyncio
    async def test_trigger_weather_sync_success(
        self,
        sveltekit_client_instance: SvelteKitClient,
        sample_location_id: str
    ):
        """Test successful weather sync trigger"""
        # This test should FAIL because we're testing actual HTTP calls
        expected_response = {
            "success": True,
            "locationId": sample_location_id,
            "syncedRecords": 96,
            "syncedAt": datetime.utcnow().isoformat()
        }

        with patch("httpx.AsyncClient") as mock_client:
            mock_response = AsyncMock()
            mock_response.json.return_value = expected_response
            mock_response.raise_for_status.return_value = None
            mock_client.return_value.__aenter__.return_value.post.return_value = mock_response

            result = await sveltekit_client_instance.trigger_weather_sync(sample_location_id)

            assert result == expected_response
            # Verify correct URL and payload
            mock_client.return_value.__aenter__.return_value.post.assert_called_once()
            call_args = mock_client.return_value.__aenter__.return_value.post.call_args
            assert call_args[0][0] == f"{settings.SVELTEKIT_URL}/api/weather/sync"
            assert call_args[1]["json"] == {"locationId": sample_location_id}

    @pytest.mark.asyncio
    async def test_trigger_weather_sync_http_error_with_retries(
        self,
        sveltekit_client_instance: SvelteKitClient,
        sample_location_id: str
    ):
        """Test weather sync handles HTTP errors with retries"""
        # This test should FAIL because retry logic doesn't exist yet
        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.post.side_effect = [
                httpx.HTTPStatusError(
                    "Server Error",
                    request=httpx.Request("POST", "http://test.com"),
                    response=httpx.Response(500)
                ),
                httpx.HTTPStatusError(
                    "Server Error",
                    request=httpx.Request("POST", "http://test.com"),
                    response=httpx.Response(500)
                ),
                # Third attempt succeeds
                AsyncMock(json=AsyncMock(return_value={"success": True}))
            ]

            result = await sveltekit_client_instance.trigger_weather_sync(sample_location_id)

            assert result == {"success": True}
            # Should have made 3 attempts
            assert mock_client.return_value.__aenter__.return_value.post.call_count == 3

    @pytest.mark.asyncio
    async def test_trigger_weather_sync_max_retries_exceeded(
        self,
        sveltekit_client_instance: SvelteKitClient,
        sample_location_id: str
    ):
        """Test weather sync raises exception after max retries"""
        # This test should FAIL because retry logic doesn't exist yet
        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.post.side_effect = httpx.HTTPStatusError(
                "Server Error",
                request=httpx.Request("POST", "http://test.com"),
                response=httpx.Response(500)
            )

            with pytest.raises(httpx.HTTPStatusError):
                await sveltekit_client_instance.trigger_weather_sync(sample_location_id)

            # Should have made max_retries attempts
            assert mock_client.return_value.__aenter__.return_value.post.call_count == settings.WEATHER_MAX_RETRIES

    @pytest.mark.asyncio
    async def test_trigger_bulk_weather_sync(
        self,
        sveltekit_client_instance: SvelteKitClient
    ):
        """Test bulk weather sync for multiple locations"""
        # This test should FAIL because bulk sync method doesn't exist yet
        location_ids = [
            "123e4567-e89b-12d3-a456-426614174000",
            "123e4567-e89b-12d3-a456-426614174001",
            "123e4567-e89b-12d3-a456-426614174002"
        ]

        expected_response = {
            "success": True,
            "locationIds": location_ids,
            "totalSyncedRecords": 288,  # 96 * 3
            "syncedAt": datetime.utcnow().isoformat()
        }

        with patch("httpx.AsyncClient") as mock_client:
            mock_response = AsyncMock()
            mock_response.json.return_value = expected_response
            mock_response.raise_for_status.return_value = None
            mock_client.return_value.__aenter__.return_value.post.return_value = mock_response

            result = await sveltekit_client_instance.trigger_bulk_weather_sync(location_ids)

            assert result == expected_response
            # Verify correct payload
            call_args = mock_client.return_value.__aenter__.return_value.post.call_args
            assert call_args[1]["json"] == {"locationIds": location_ids}

    @pytest.mark.asyncio
    async def test_get_weather_sync_status(
        self,
        sveltekit_client_instance: SvelteKitClient,
        sample_location_id: str
    ):
        """Test getting weather sync status"""
        # This test should FAIL because status method doesn't exist yet
        expected_response = {
            "locationId": sample_location_id,
            "hasRecentData": True,
            "lastSyncAt": datetime.utcnow().isoformat(),
            "recordCount": 96,
            "dataFreshness": "fresh"
        }

        with patch("httpx.AsyncClient") as mock_client:
            mock_response = AsyncMock()
            mock_response.json.return_value = expected_response
            mock_response.raise_for_status.return_value = None
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_response

            result = await sveltekit_client_instance.get_weather_sync_status(sample_location_id)

            assert result == expected_response
            # Verify correct URL and params
            call_args = mock_client.return_value.__aenter__.return_value.get.call_args
            assert call_args[0][0] == f"{settings.SVELTEKIT_URL}/api/weather/status"
            assert call_args[1]["params"] == {"locationId": sample_location_id}

    @pytest.mark.asyncio
    async def test_wait_for_sync_completion_success(
        self,
        sveltekit_client_instance: SvelteKitClient,
        sample_location_id: str
    ):
        """Test waiting for sync completion returns True when completed"""
        # This test should FAIL because wait method doesn't exist yet
        with patch.object(sveltekit_client_instance, 'get_weather_sync_status') as mock_status:
            mock_status.return_value = {"hasRecentData": True}

            result = await sveltekit_client_instance.wait_for_sync_completion(
                sample_location_id, max_wait_seconds=5, check_interval=1
            )

            assert result is True
            mock_status.assert_called_with(sample_location_id)

    @pytest.mark.asyncio
    async def test_wait_for_sync_completion_timeout(
        self,
        sveltekit_client_instance: SvelteKitClient,
        sample_location_id: str
    ):
        """Test waiting for sync completion returns False on timeout"""
        # This test should FAIL because wait method doesn't exist yet
        with patch.object(sveltekit_client_instance, 'get_weather_sync_status') as mock_status:
            mock_status.return_value = {"hasRecentData": False}

            result = await sveltekit_client_instance.wait_for_sync_completion(
                sample_location_id, max_wait_seconds=2, check_interval=1
            )

            assert result is False
            # Should have made multiple status checks
            assert mock_status.call_count >= 2

    @pytest.mark.asyncio
    async def test_health_check_healthy(
        self,
        sveltekit_client_instance: SvelteKitClient
    ):
        """Test health check returns True when API is healthy"""
        # This test should FAIL because health check method doesn't exist yet
        with patch("httpx.AsyncClient") as mock_client:
            mock_response = AsyncMock()
            mock_response.json.return_value = {"status": "healthy"}
            mock_response.raise_for_status.return_value = None
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_response

            result = await sveltekit_client_instance.health_check()

            assert result is True

    @pytest.mark.asyncio
    async def test_health_check_unhealthy(
        self,
        sveltekit_client_instance: SvelteKitClient
    ):
        """Test health check returns False when API is unhealthy"""
        # This test should FAIL because health check method doesn't exist yet
        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get.side_effect = httpx.ConnectError(
                "Connection failed"
            )

            result = await sveltekit_client_instance.health_check()

            assert result is False

    @pytest.mark.asyncio
    async def test_global_client_instance_available(self):
        """Test that global client instance is available"""
        # This test should pass as the client is already created
        assert sveltekit_client is not None
        assert isinstance(sveltekit_client, SvelteKitClient)
        assert sveltekit_client.base_url == settings.SVELTEKIT_URL

    @pytest.mark.asyncio
    async def test_client_uses_configuration_settings(
        self,
        sveltekit_client_instance: SvelteKitClient
    ):
        """Test client uses configuration settings correctly"""
        # This test should pass as configuration is already loaded
        assert sveltekit_client_instance.base_url == settings.SVELTEKIT_URL
        assert sveltekit_client_instance.timeout == settings.SVELTEKIT_API_TIMEOUT
        assert sveltekit_client_instance.max_retries == settings.WEATHER_MAX_RETRIES
        assert sveltekit_client_instance.retry_delay == settings.WEATHER_RETRY_DELAY