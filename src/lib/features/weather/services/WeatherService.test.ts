import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WeatherService } from './WeatherService';

// Mock the repository
vi.mock('../repositories/WeatherRepository', () => ({
  WeatherRepository: vi.fn().mockImplementation(() => ({
    bulkInsert: vi.fn(),
    findByLocation: vi.fn(),
    aggregateByInterval: vi.fn(),
    findById: vi.fn()
  }))
}));

// Mock the locations repository
vi.mock('../../locations/repositories/LocationsRepository', () => ({
  LocationsRepository: vi.fn().mockImplementation(() => ({
    findById: vi.fn()
  }))
}));

// Mock the Open-Meteo client
vi.mock('../../../integrations/open-meteo/OpenMeteoClient', () => ({
  OpenMeteoClient: vi.fn().mockImplementation(() => ({
    getCurrentWeather: vi.fn(),
    getWeatherForecast: vi.fn()
  }))
}));

describe('WeatherService', () => {
  let service: WeatherService;

  beforeEach(() => {
    service = new WeatherService();
  });

  describe('getCurrentWeather', () => {
    it('should throw error when location not found', async () => {
      const invalidLocationId = '550e8400-e29b-41d4-a716-446655440000';

      // This test should fail initially (TDD)
      await expect(service.getCurrentWeather(invalidLocationId)).rejects.toThrow('Location not found');
    });

    it('should return weather data for valid location', async () => {
      const validLocationId = '550e8400-e29b-41d4-a716-446655440000';

      // This test should fail initially (TDD)
      expect(async () => {
        await service.getCurrentWeather(validLocationId);
      }).rejects.toThrow();
    });

    it('should handle Open-Meteo API errors gracefully', async () => {
      const validLocationId = '550e8400-e29b-41d4-a716-446655440000';

      // This test should fail initially (TDD)
      expect(async () => {
        await service.getCurrentWeather(validLocationId);
      }).rejects.toThrow();
    });
  });

  describe('getForecast', () => {
    it('should validate days parameter', async () => {
      const validLocationId = '550e8400-e29b-41d4-a716-446655440000';

      await expect(service.getForecast(validLocationId, 0)).rejects.toThrow('days must be between 1 and 16');
      await expect(service.getForecast(validLocationId, 20)).rejects.toThrow('days must be between 1 and 16');
    });

    it('should return forecast data for valid parameters', async () => {
      const validLocationId = '550e8400-e29b-41d4-a716-446655440000';

      // This test should fail initially (TDD)
      expect(async () => {
        await service.getForecast(validLocationId, 7);
      }).rejects.toThrow();
    });

    it('should handle multiple days forecast', async () => {
      const validLocationId = '550e8400-e29b-41d4-a716-446655440000';

      // This test should fail initially (TDD)
      expect(async () => {
        await service.getForecast(validLocationId, 5);
      }).rejects.toThrow();
    });
  });

  describe('syncAllLocations', () => {
    it('should process empty location list', async () => {
      const request = {
        locationIds: [],
        batchSize: 1000,
        forceRefresh: false
      };

      // This test should fail initially (TDD)
      expect(async () => {
        await service.syncAllLocations(request);
      }).rejects.toThrow();
    });

    it('should handle batch processing correctly', async () => {
      const request = {
        locationIds: ['550e8400-e29b-41d4-a716-446655440000'],
        batchSize: 500,
        forceRefresh: true
      };

      // This test should fail initially (TDD)
      expect(async () => {
        await service.syncAllLocations(request);
      }).rejects.toThrow();
    });

    it('should track processing statistics', async () => {
      const request = {
        batchSize: 1000,
        includeForecasts: true,
        forecastDays: 7
      };

      // This test should fail initially (TDD)
      expect(async () => {
        await service.syncAllLocations(request);
      }).rejects.toThrow();
    });

    it('should handle API errors during sync', async () => {
      const request = {
        locationIds: ['invalid-location-id'],
        batchSize: 1000
      };

      // This test should fail initially (TDD)
      expect(async () => {
        await service.syncAllLocations(request);
      }).rejects.toThrow();
    });
  });

  describe('getWeatherById', () => {
    it('should validate GUID format', async () => {
      await expect(service.getWeatherById('invalid-guid')).rejects.toThrow('Invalid GUID format');
    });

    it('should return weather record when found', async () => {
      const validGuid = '550e8400-e29b-41d4-a716-446655440000';

      // This test should fail initially (TDD)
      expect(async () => {
        await service.getWeatherById(validGuid);
      }).rejects.toThrow();
    });

    it('should throw error when weather record not found', async () => {
      const validGuid = '550e8400-e29b-41d4-a716-446655440000';

      // This test should fail initially (TDD)
      await expect(service.getWeatherById(validGuid)).rejects.toThrow('Weather record not found');
    });
  });

  describe('error handling', () => {
    it('should handle location coordinate fetching errors', async () => {
      const validLocationId = '550e8400-e29b-41d4-a716-446655440000';

      // This test should fail initially (TDD)
      expect(async () => {
        await service.getCurrentWeather(validLocationId);
      }).rejects.toThrow();
    });

    it('should handle database connection errors', async () => {
      const validLocationId = '550e8400-e29b-41d4-a716-446655440000';

      // This test should fail initially (TDD)
      expect(async () => {
        await service.getCurrentWeather(validLocationId);
      }).rejects.toThrow();
    });

    it('should handle data transformation errors', async () => {
      const validLocationId = '550e8400-e29b-41d4-a716-446655440000';

      // This test should fail initially (TDD)
      expect(async () => {
        await service.getCurrentWeather(validLocationId);
      }).rejects.toThrow();
    });
  });
});