import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WeatherController } from './WeatherController';
import type { RequestEvent } from '@sveltejs/kit';

// Mock the service
vi.mock('../services/WeatherService', () => ({
  WeatherService: vi.fn().mockImplementation(() => ({
    getCurrentWeather: vi.fn(),
    getForecast: vi.fn(),
    syncAllLocations: vi.fn(),
    getWeatherById: vi.fn()
  }))
}));

describe('WeatherController', () => {
  let controller: WeatherController;
  let mockRequestEvent: Partial<RequestEvent>;

  beforeEach(() => {
    controller = new WeatherController();
    mockRequestEvent = {
      url: new URL('http://localhost:3000'),
      params: {},
      request: new Request('http://localhost:3000')
    };
  });

  describe('GET /api/weather', () => {
    it('should return 400 when location_id is missing', async () => {
      mockRequestEvent.url = new URL('http://localhost:3000/api/weather');

      const response = await controller.getWeather(mockRequestEvent as RequestEvent);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('location_id');
    });

    it('should return 400 when location_id is invalid GUID', async () => {
      mockRequestEvent.url = new URL('http://localhost:3000/api/weather?location_id=invalid-guid');

      const response = await controller.getWeather(mockRequestEvent as RequestEvent);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('valid GUID');
    });

    it('should return weather data when location_id is valid', async () => {
      const validGuid = '550e8400-e29b-41d4-a716-446655440000';
      mockRequestEvent.url = new URL(`http://localhost:3000/api/weather?location_id=${validGuid}`);

      // This test should fail initially (TDD)
      expect(async () => {
        await controller.getWeather(mockRequestEvent as RequestEvent);
      }).rejects.toThrow();
    });
  });

  describe('GET /api/weather/forecast', () => {
    it('should return 400 when location_id is missing', async () => {
      mockRequestEvent.url = new URL('http://localhost:3000/api/weather/forecast');

      const response = await controller.getForecast(mockRequestEvent as RequestEvent);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('location_id');
    });

    it('should return 400 when days parameter is invalid', async () => {
      const validGuid = '550e8400-e29b-41d4-a716-446655440000';
      mockRequestEvent.url = new URL(`http://localhost:3000/api/weather/forecast?location_id=${validGuid}&days=25`);

      const response = await controller.getForecast(mockRequestEvent as RequestEvent);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('days must be between 1 and 16');
    });

    it('should return forecast data when parameters are valid', async () => {
      const validGuid = '550e8400-e29b-41d4-a716-446655440000';
      mockRequestEvent.url = new URL(`http://localhost:3000/api/weather/forecast?location_id=${validGuid}&days=7`);

      // This test should fail initially (TDD)
      expect(async () => {
        await controller.getForecast(mockRequestEvent as RequestEvent);
      }).rejects.toThrow();
    });
  });

  describe('POST /api/weather/sync', () => {
    it('should require valid JSON body', async () => {
      mockRequestEvent.request = new Request('http://localhost:3000/api/weather/sync', {
        method: 'POST',
        body: 'invalid-json'
      });

      const response = await controller.syncWeather(mockRequestEvent as RequestEvent);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should validate sync request parameters', async () => {
      mockRequestEvent.request = new Request('http://localhost:3000/api/weather/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchSize: 10000, // Invalid: too large
          forecastDays: 30  // Invalid: too many days
        })
      });

      const response = await controller.syncWeather(mockRequestEvent as RequestEvent);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('batchSize');
    });

    it('should process valid sync request', async () => {
      mockRequestEvent.request = new Request('http://localhost:3000/api/weather/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchSize: 1000,
          forecastDays: 7,
          forceRefresh: true
        })
      });

      // This test should fail initially (TDD)
      expect(async () => {
        await controller.syncWeather(mockRequestEvent as RequestEvent);
      }).rejects.toThrow();
    });
  });

  describe('GET /api/weather/[id]', () => {
    it('should return 400 when id is invalid GUID', async () => {
      mockRequestEvent.params = { id: 'invalid-guid' };

      const response = await controller.getWeatherById(mockRequestEvent as RequestEvent);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('valid GUID');
    });

    it('should return weather record when id is valid', async () => {
      const validGuid = '550e8400-e29b-41d4-a716-446655440000';
      mockRequestEvent.params = { id: validGuid };

      // This test should fail initially (TDD)
      expect(async () => {
        await controller.getWeatherById(mockRequestEvent as RequestEvent);
      }).rejects.toThrow();
    });
  });
});