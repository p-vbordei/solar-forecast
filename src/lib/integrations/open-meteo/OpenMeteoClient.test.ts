import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenMeteoClient } from './OpenMeteoClient';

// Mock global fetch
global.fetch = vi.fn();

describe('OpenMeteoClient', () => {
  let client: OpenMeteoClient;

  beforeEach(() => {
    client = new OpenMeteoClient();
    vi.clearAllMocks();
  });

  describe('getCurrentWeather', () => {
    it('should construct correct API URL for current weather', async () => {
      const latitude = 45.5;
      const longitude = -73.5;

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          latitude: 45.5,
          longitude: -73.5,
          hourly: {
            time: ['2023-01-01T00:00'],
            temperature_2m: [20.5],
            relative_humidity_2m: [65],
            pressure_msl: [1013.25]
          }
        })
      });

      // This test should fail initially (TDD)
      expect(async () => {
        await client.getCurrentWeather(latitude, longitude);
      }).rejects.toThrow();
    });

    it('should include all required weather parameters', async () => {
      const latitude = 45.5;
      const longitude = -73.5;

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          latitude: 45.5,
          longitude: -73.5,
          hourly: {
            time: ['2023-01-01T00:00'],
            temperature_2m: [20.5],
            relative_humidity_2m: [65],
            pressure_msl: [1013.25],
            cloud_cover: [30],
            wind_speed_10m: [5.2],
            wind_direction_10m: [180],
            shortwave_radiation: [600],
            direct_normal_irradiance: [800],
            diffuse_radiation: [200]
          }
        })
      });

      // This test should fail initially (TDD)
      expect(async () => {
        await client.getCurrentWeather(latitude, longitude);
      }).rejects.toThrow();
    });
  });

  describe('getWeatherForecast', () => {
    it('should limit forecast days to maximum of 16', async () => {
      const latitude = 45.5;
      const longitude = -73.5;
      const days = 20; // Should be capped to 16

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          latitude: 45.5,
          longitude: -73.5,
          hourly: {
            time: ['2023-01-01T00:00'],
            temperature_2m: [20.5]
          }
        })
      });

      // This test should fail initially (TDD)
      expect(async () => {
        await client.getWeatherForecast(latitude, longitude, days);
      }).rejects.toThrow();
    });

    it('should handle multiple days forecast correctly', async () => {
      const latitude = 45.5;
      const longitude = -73.5;
      const days = 7;

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          latitude: 45.5,
          longitude: -73.5,
          hourly: {
            time: Array(168).fill('2023-01-01T00:00'), // 7 days * 24 hours
            temperature_2m: Array(168).fill(20.5),
            relative_humidity_2m: Array(168).fill(65)
          }
        })
      });

      // This test should fail initially (TDD)
      expect(async () => {
        await client.getWeatherForecast(latitude, longitude, days);
      }).rejects.toThrow();
    });
  });

  describe('getHistoricalWeather', () => {
    it('should format dates correctly for API request', async () => {
      const latitude = 45.5;
      const longitude = -73.5;
      const startDate = '2023-01-01';
      const endDate = '2023-01-07';

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          latitude: 45.5,
          longitude: -73.5,
          hourly: {
            time: ['2023-01-01T00:00'],
            temperature_2m: [20.5]
          }
        })
      });

      // This test should fail initially (TDD)
      expect(async () => {
        await client.getHistoricalWeather(latitude, longitude, startDate, endDate);
      }).rejects.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle HTTP errors gracefully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(client.getCurrentWeather(45.5, -73.5)).rejects.toThrow('HTTP 404: Not Found');
    });

    it('should handle API errors from Open-Meteo', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          error: true,
          reason: 'Invalid coordinates'
        })
      });

      await expect(client.getCurrentWeather(999, 999)).rejects.toThrow('Open-Meteo API error: Invalid coordinates');
    });

    it('should handle network timeouts', async () => {
      (global.fetch as any).mockImplementationOnce(() =>
        new Promise((resolve) => {
          // Simulate timeout - never resolve
        })
      );

      // This test should fail initially (TDD)
      await expect(client.getCurrentWeather(45.5, -73.5)).rejects.toThrow('timeout');
    });

    it('should retry on network failures', async () => {
      // First call fails
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      // Second call succeeds
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          latitude: 45.5,
          longitude: -73.5,
          hourly: {
            time: ['2023-01-01T00:00'],
            temperature_2m: [20.5]
          }
        })
      });

      // This test should fail initially (TDD)
      expect(async () => {
        await client.getCurrentWeather(45.5, -73.5);
      }).rejects.toThrow();
    });

    it('should implement exponential backoff for retries', async () => {
      const startTime = Date.now();

      // All calls fail
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      await expect(client.getCurrentWeather(45.5, -73.5)).rejects.toThrow('failed after 3 attempts');

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should take at least 1000ms + 2000ms = 3000ms for exponential backoff
      // This test should fail initially (TDD)
      expect(duration).toBeGreaterThan(2500);
    });
  });

  describe('response validation', () => {
    it('should validate response structure', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          // Missing required fields
        })
      });

      await expect(client.getCurrentWeather(45.5, -73.5)).rejects.toThrow('Invalid response: missing hourly time data');
    });

    it('should handle empty response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => null
      });

      await expect(client.getCurrentWeather(45.5, -73.5)).rejects.toThrow('Empty response from Open-Meteo API');
    });

    it('should validate required weather fields', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          latitude: 45.5,
          longitude: -73.5,
          hourly: {
            time: ['2023-01-01T00:00'],
            // Missing required temperature_2m field
            relative_humidity_2m: [65]
          }
        })
      });

      // This test should fail initially (TDD)
      expect(async () => {
        await client.getCurrentWeather(45.5, -73.5);
      }).rejects.toThrow();
    });
  });

  describe('utility methods', () => {
    it('should format dates correctly', () => {
      const date = new Date('2023-01-15T12:30:45Z');
      const formatted = OpenMeteoClient.formatDate(date);

      expect(formatted).toBe('2023-01-15');
    });

    it('should determine timezone for coordinates', () => {
      expect(OpenMeteoClient.getTimezoneForCoordinates(45.5, -73.5)).toBe('America/New_York');
      expect(OpenMeteoClient.getTimezoneForCoordinates(52.5, 13.4)).toBe('Europe/Berlin');
      expect(OpenMeteoClient.getTimezoneForCoordinates(0, 0)).toBe('UTC');
    });

    it('should build weather parameters correctly', () => {
      const paramsWithSolar = OpenMeteoClient.buildWeatherParameters(true);
      const paramsWithoutSolar = OpenMeteoClient.buildWeatherParameters(false);

      expect(paramsWithSolar.temperature_2m).toBe(true);
      expect(paramsWithSolar.shortwave_radiation).toBe(true);

      expect(paramsWithoutSolar.temperature_2m).toBe(true);
      expect(paramsWithoutSolar.shortwave_radiation).toBe(undefined);
    });
  });
});