"""Weather data caching layer"""

import logging
import json
import asyncio
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from app.models.weather import WeatherData
from app.core.config import settings

logger = logging.getLogger(__name__)

# Simple in-memory cache (in production, would use Redis)
_weather_cache: Dict[str, Dict[str, Any]] = {}


class WeatherCache:
    """Simple weather data cache with TTL support"""

    def __init__(self, ttl_minutes: int = 10):
        self.ttl_minutes = ttl_minutes

    def _cache_key(self, location_id: str, cache_type: str = "latest") -> str:
        """Generate cache key for location and type"""
        return f"weather:{cache_type}:{location_id}"

    def _is_expired(self, cached_data: Dict[str, Any]) -> bool:
        """Check if cached data is expired"""
        cached_at = datetime.fromisoformat(cached_data["cached_at"])
        return datetime.utcnow() - cached_at > timedelta(minutes=self.ttl_minutes)

    async def get_latest_weather(self, location_id: str) -> Optional[WeatherData]:
        """Get latest weather data from cache"""
        try:
            cache_key = self._cache_key(location_id, "latest")

            if cache_key not in _weather_cache:
                logger.debug(f"Cache miss for latest weather: {location_id}")
                return None

            cached_data = _weather_cache[cache_key]

            if self._is_expired(cached_data):
                logger.debug(f"Cache expired for latest weather: {location_id}")
                del _weather_cache[cache_key]
                return None

            # Convert cached data back to WeatherData object
            weather_data = WeatherData.from_dict(cached_data["data"])
            logger.debug(f"Cache hit for latest weather: {location_id}")
            return weather_data

        except Exception as e:
            logger.error(f"Error getting cached weather data for {location_id}: {e}")
            return None

    async def set_latest_weather(self, weather_data: WeatherData) -> None:
        """Cache latest weather data"""
        try:
            cache_key = self._cache_key(weather_data.locationId, "latest")

            cached_data = {
                "data": weather_data.to_dict(),
                "cached_at": datetime.utcnow().isoformat()
            }

            _weather_cache[cache_key] = cached_data
            logger.debug(f"Cached latest weather data for: {weather_data.locationId}")

        except Exception as e:
            logger.error(f"Error caching weather data for {weather_data.locationId}: {e}")

    async def invalidate_location(self, location_id: str) -> None:
        """Invalidate all cached data for a location"""
        try:
            keys_to_remove = [key for key in _weather_cache.keys() if location_id in key]

            for key in keys_to_remove:
                del _weather_cache[key]

            logger.debug(f"Invalidated cache for location: {location_id}")

        except Exception as e:
            logger.error(f"Error invalidating cache for {location_id}: {e}")

    async def clear_expired(self) -> int:
        """Clear all expired cache entries"""
        try:
            expired_keys = []

            for key, cached_data in _weather_cache.items():
                if self._is_expired(cached_data):
                    expired_keys.append(key)

            for key in expired_keys:
                del _weather_cache[key]

            logger.debug(f"Cleared {len(expired_keys)} expired cache entries")
            return len(expired_keys)

        except Exception as e:
            logger.error(f"Error clearing expired cache entries: {e}")
            return 0

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        try:
            total_entries = len(_weather_cache)
            expired_count = sum(1 for data in _weather_cache.values() if self._is_expired(data))

            return {
                "total_entries": total_entries,
                "expired_entries": expired_count,
                "active_entries": total_entries - expired_count,
                "ttl_minutes": self.ttl_minutes
            }

        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {"error": str(e)}


# Global cache instance
weather_cache = WeatherCache(ttl_minutes=settings.WEATHER_FRESHNESS_MINUTES // 2)


# Background task to periodically clear expired entries
async def cache_cleanup_task():
    """Background task to clean up expired cache entries"""
    while True:
        try:
            await asyncio.sleep(300)  # Run every 5 minutes
            cleared_count = await weather_cache.clear_expired()

            if cleared_count > 0:
                logger.info(f"Cache cleanup: cleared {cleared_count} expired entries")

        except Exception as e:
            logger.error(f"Error in cache cleanup task: {e}")
            await asyncio.sleep(60)  # Wait before retrying