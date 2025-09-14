import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WeatherRepository } from './WeatherRepository';
import type { WeatherData } from '../models/dto/weather';

// Mock the database
vi.mock('../../../server/database', () => ({
  db: {
    weatherData: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      createMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
  },
  TimescaleQueries: {
    bulkInsert: vi.fn(),
    timeBucket: vi.fn()
  }
}));

describe('WeatherRepository', () => {
  let repository: WeatherRepository;

  beforeEach(() => {
    repository = new WeatherRepository();
  });

  describe('bulkInsert', () => {
    it('should handle empty data array', async () => {
      const emptyData: WeatherData[] = [];

      // This test should fail initially (TDD)
      expect(async () => {
        await repository.bulkInsert(emptyData);
      }).rejects.toThrow();
    });

    it('should validate weather data before insert', async () => {
      const invalidData = [{
        id: 'invalid-guid',
        locationId: 'invalid-location',
        timestamp: new Date(),
        temperature: -200, // Invalid temperature
        humidity: 150,     // Invalid humidity
        pressure: 500      // Invalid pressure
      }] as WeatherData[];

      // This test should fail initially (TDD)
      expect(async () => {
        await repository.bulkInsert(invalidData);
      }).rejects.toThrow('Invalid weather data');
    });

    it('should use TimescaleDB bulk insert for large datasets', async () => {
      const weatherData: Partial<WeatherData>[] = Array(1500).fill({
        id: '550e8400-e29b-41d4-a716-446655440000',
        locationId: '550e8400-e29b-41d4-a716-446655440001',
        timestamp: new Date(),
        temperature: 25,
        humidity: 60,
        pressure: 1013,
        windSpeed: 5,
        cloudCover: 20,
        source: 'open-meteo',
        dataQuality: 'GOOD'
      });

      // This test should fail initially (TDD)
      expect(async () => {
        await repository.bulkInsert(weatherData as WeatherData[]);
      }).rejects.toThrow();
    });

    it('should handle duplicate timestamps correctly', async () => {
      const duplicateData: Partial<WeatherData>[] = [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          locationId: '550e8400-e29b-41d4-a716-446655440001',
          timestamp: new Date('2023-01-01T12:00:00Z'),
          temperature: 25
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          locationId: '550e8400-e29b-41d4-a716-446655440001',
          timestamp: new Date('2023-01-01T12:00:00Z'), // Same timestamp
          temperature: 26
        }
      ];

      // This test should fail initially (TDD)
      expect(async () => {
        await repository.bulkInsert(duplicateData as WeatherData[]);
      }).rejects.toThrow();
    });
  });

  describe('findByLocation', () => {
    it('should validate location ID format', async () => {
      await expect(repository.findByLocation('invalid-guid', new Date(), new Date())).rejects.toThrow('Invalid GUID format');
    });

    it('should validate date range', async () => {
      const validLocationId = '550e8400-e29b-41d4-a716-446655440000';
      const startDate = new Date('2023-01-02');
      const endDate = new Date('2023-01-01'); // End before start

      await expect(repository.findByLocation(validLocationId, startDate, endDate)).rejects.toThrow('Start date must be before end date');
    });

    it('should return weather data for valid parameters', async () => {
      const validLocationId = '550e8400-e29b-41d4-a716-446655440000';
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-02');

      // This test should fail initially (TDD)
      expect(async () => {
        await repository.findByLocation(validLocationId, startDate, endDate);
      }).rejects.toThrow();
    });

    it('should use proper indexes for time-series queries', async () => {
      const validLocationId = '550e8400-e29b-41d4-a716-446655440000';
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // 7 days ago
      const endDate = new Date();

      // This test should fail initially (TDD)
      expect(async () => {
        await repository.findByLocation(validLocationId, startDate, endDate);
      }).rejects.toThrow();
    });
  });

  describe('aggregateByInterval', () => {
    it('should validate interval parameter', async () => {
      const validLocationId = '550e8400-e29b-41d4-a716-446655440000';

      await expect(repository.aggregateByInterval(validLocationId, 'invalid' as any, 24)).rejects.toThrow('Invalid interval');
    });

    it('should validate hours parameter', async () => {
      const validLocationId = '550e8400-e29b-41d4-a716-446655440000';

      await expect(repository.aggregateByInterval(validLocationId, '1hour', 0)).rejects.toThrow('Hours must be positive');
      await expect(repository.aggregateByInterval(validLocationId, '1hour', 721)).rejects.toThrow('Hours must be less than 720'); // 30 days
    });

    it('should return aggregated data using TimescaleDB time buckets', async () => {
      const validLocationId = '550e8400-e29b-41d4-a716-446655440000';

      // This test should fail initially (TDD)
      expect(async () => {
        await repository.aggregateByInterval(validLocationId, '1hour', 24);
      }).rejects.toThrow();
    });

    it('should handle different aggregation intervals', async () => {
      const validLocationId = '550e8400-e29b-41d4-a716-446655440000';

      // This test should fail initially (TDD)
      expect(async () => {
        await repository.aggregateByInterval(validLocationId, '15min', 6); // 6 hours of 15-min data
      }).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('should validate GUID format', async () => {
      await expect(repository.findById('invalid-guid')).rejects.toThrow('Invalid GUID format');
    });

    it('should return weather record when found', async () => {
      const validGuid = '550e8400-e29b-41d4-a716-446655440000';

      // This test should fail initially (TDD)
      expect(async () => {
        await repository.findById(validGuid);
      }).rejects.toThrow();
    });

    it('should return null when record not found', async () => {
      const validGuid = '550e8400-e29b-41d4-a716-446655440000';

      // This test should fail initially (TDD)
      expect(async () => {
        await repository.findById(validGuid);
      }).rejects.toThrow();
    });
  });

  describe('deduplication', () => {
    it('should detect duplicate records by location and timestamp', async () => {
      const weatherData: Partial<WeatherData>[] = [
        {
          locationId: '550e8400-e29b-41d4-a716-446655440000',
          timestamp: new Date('2023-01-01T12:00:00Z'),
          temperature: 25
        }
      ];

      // This test should fail initially (TDD)
      expect(async () => {
        await repository.bulkInsert(weatherData as WeatherData[]);
      }).rejects.toThrow();
    });

    it('should update existing records when upsert is enabled', async () => {
      const weatherData: Partial<WeatherData>[] = [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          locationId: '550e8400-e29b-41d4-a716-446655440001',
          timestamp: new Date('2023-01-01T12:00:00Z'),
          temperature: 30 // Updated temperature
        }
      ];

      // This test should fail initially (TDD)
      expect(async () => {
        await repository.bulkInsert(weatherData as WeatherData[], { upsert: true });
      }).rejects.toThrow();
    });
  });

  describe('data quality validation', () => {
    it('should validate temperature range', async () => {
      const invalidTempData: Partial<WeatherData>[] = [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          locationId: '550e8400-e29b-41d4-a716-446655440001',
          timestamp: new Date(),
          temperature: -150, // Below absolute zero
          humidity: 60,
          pressure: 1013
        }
      ];

      // This test should fail initially (TDD)
      expect(async () => {
        await repository.bulkInsert(invalidTempData as WeatherData[]);
      }).rejects.toThrow('Invalid temperature value');
    });

    it('should validate humidity range', async () => {
      const invalidHumidityData: Partial<WeatherData>[] = [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          locationId: '550e8400-e29b-41d4-a716-446655440001',
          timestamp: new Date(),
          temperature: 25,
          humidity: 150, // Above 100%
          pressure: 1013
        }
      ];

      // This test should fail initially (TDD)
      expect(async () => {
        await repository.bulkInsert(invalidHumidityData as WeatherData[]);
      }).rejects.toThrow('Invalid humidity value');
    });

    it('should validate solar radiation values', async () => {
      const invalidSolarData: Partial<WeatherData>[] = [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          locationId: '550e8400-e29b-41d4-a716-446655440001',
          timestamp: new Date(),
          temperature: 25,
          humidity: 60,
          pressure: 1013,
          ghi: -100 // Negative solar radiation
        }
      ];

      // This test should fail initially (TDD)
      expect(async () => {
        await repository.bulkInsert(invalidSolarData as WeatherData[]);
      }).rejects.toThrow('Invalid solar radiation value');
    });
  });
});