"""SvelteKit API integration client"""

import asyncio
import logging
from typing import Dict, Optional, Any
from datetime import datetime
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class SvelteKitClient:
    """Client for interacting with SvelteKit API endpoints"""

    def __init__(self):
        self.base_url = settings.SVELTEKIT_URL
        self.timeout = settings.SVELTEKIT_API_TIMEOUT
        self.max_retries = settings.WEATHER_MAX_RETRIES
        self.retry_delay = settings.WEATHER_RETRY_DELAY

    async def trigger_weather_sync(self, location_id: str) -> Dict[str, Any]:
        """
        Trigger weather data sync for a specific location

        Args:
            location_id: Location ID to sync weather data for

        Returns:
            Dictionary with sync response

        Raises:
            httpx.HTTPError: If API call fails after retries
        """
        url = f"{self.base_url}/api/weather/sync"
        payload = {"locationId": location_id}

        logger.info(f"Triggering weather sync for location {location_id}")

        for attempt in range(self.max_retries):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(url, json=payload)
                    response.raise_for_status()

                    result = response.json()
                    logger.info(f"Weather sync triggered successfully for location {location_id}: {result}")
                    return result

            except httpx.HTTPError as e:
                logger.warning(f"Weather sync attempt {attempt + 1} failed for location {location_id}: {e}")

                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay)
                else:
                    logger.error(f"Weather sync failed after {self.max_retries} attempts for location {location_id}")
                    raise

            except Exception as e:
                logger.error(f"Unexpected error during weather sync for location {location_id}: {e}")
                raise

    async def trigger_bulk_weather_sync(self, location_ids: list[str]) -> Dict[str, Any]:
        """
        Trigger weather data sync for multiple locations

        Args:
            location_ids: List of location IDs to sync

        Returns:
            Dictionary with bulk sync response
        """
        url = f"{self.base_url}/api/weather/sync"
        payload = {"locationIds": location_ids}

        logger.info(f"Triggering bulk weather sync for {len(location_ids)} locations")

        try:
            async with httpx.AsyncClient(timeout=self.timeout * 2) as client:  # Longer timeout for bulk
                response = await client.post(url, json=payload)
                response.raise_for_status()

                result = response.json()
                logger.info(f"Bulk weather sync completed: {result}")
                return result

        except httpx.HTTPError as e:
            logger.error(f"Bulk weather sync failed: {e}")
            raise

    async def get_weather_sync_status(self, location_id: str) -> Dict[str, Any]:
        """
        Get the status of weather data for a location

        Args:
            location_id: Location ID to check status for

        Returns:
            Dictionary with weather data status
        """
        url = f"{self.base_url}/api/weather/status"
        params = {"locationId": location_id}

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()

                result = response.json()
                logger.debug(f"Weather status for location {location_id}: {result}")
                return result

        except httpx.HTTPError as e:
            logger.warning(f"Failed to get weather status for location {location_id}: {e}")
            raise

    async def wait_for_sync_completion(
        self,
        location_id: str,
        max_wait_seconds: int = 30,
        check_interval: int = 2
    ) -> bool:
        """
        Wait for weather sync to complete by checking status periodically

        Args:
            location_id: Location ID to monitor
            max_wait_seconds: Maximum time to wait
            check_interval: Seconds between status checks

        Returns:
            True if sync completed successfully, False if timeout
        """
        logger.info(f"Waiting for weather sync completion for location {location_id}")

        start_time = datetime.utcnow()

        while (datetime.utcnow() - start_time).seconds < max_wait_seconds:
            try:
                status = await self.get_weather_sync_status(location_id)

                if status.get("hasRecentData", False):
                    logger.info(f"Weather sync completed for location {location_id}")
                    return True

                await asyncio.sleep(check_interval)

            except Exception as e:
                logger.warning(f"Error checking sync status for location {location_id}: {e}")
                await asyncio.sleep(check_interval)

        logger.warning(f"Weather sync timeout for location {location_id}")
        return False

    async def health_check(self) -> bool:
        """
        Check if SvelteKit API is healthy

        Returns:
            True if healthy, False otherwise
        """
        url = f"{self.base_url}/api/health"

        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(url)
                response.raise_for_status()

                result = response.json()
                is_healthy = result.get("status") == "healthy"

                if is_healthy:
                    logger.debug("SvelteKit API health check passed")
                else:
                    logger.warning(f"SvelteKit API health check failed: {result}")

                return is_healthy

        except Exception as e:
            logger.error(f"SvelteKit API health check failed: {e}")
            return False


# Global client instance
sveltekit_client = SvelteKitClient()