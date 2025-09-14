import { describe, it, expect } from 'vitest';
import { ForecastTransformer } from '../../../src/lib/features/forecasts/helpers/ForecastTransformer';
import type { GenerateForecastRequest } from '../../../src/lib/features/forecasts/models/requests/GenerateForecastRequest';

/**
 * Unit tests for ForecastTransformer
 * These tests MUST FAIL until the transformer is implemented
 */
describe('ForecastTransformer', () => {
  // Mock Prisma types for testing
  const mockLocation = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Solar Farm Alpha',
    city: 'Bucharest',
    capacityMW: 50.0,
    createdAt: new Date(),
    updatedAt: new Date()
  } as any;

  const mockForecast = {
    id: '550e8400-e29b-41d4-a716-446655440002',
    locationId: '550e8400-e29b-41d4-a716-446655440001',
    timestamp: new Date('2024-01-01T12:00:00.000Z'),
    time: new Date('2024-01-01T12:00:00.000Z'),
    modelType: 'ML_LSTM',
    modelVersion: '1.0',
    forecastType: 'OPERATIONAL',
    resolution: 'FIFTEEN_MINUTES',
    horizonMinutes: 1440, // 24 hours
    horizonDays: 1,
    powerMW: 35.5,
    powerOutputMW: 35.5,
    energyMWh: 850.2,
    capacityFactor: 0.71,
    powerMWQ10: 30.2,
    powerMWQ25: 32.8,
    powerMWQ75: 38.1,
    powerMWQ90: 40.7,
    confidenceLevel: 92.3,
    runId: 'run_123456_abc',
    createdAt: new Date('2024-01-01T11:00:00.000Z'),
    updatedAt: new Date('2024-01-01T11:30:00.000Z'),
    notes: 'Test forecast',
    location: mockLocation,
    forecastAccuracy: []
  } as any;

  const mockForecastAccuracy = {
    id: '550e8400-e29b-41d4-a716-446655440003',
    locationId: '550e8400-e29b-41d4-a716-446655440001',
    date: new Date('2024-01-01'),
    modelType: 'ML_LSTM',
    modelVersion: '1.0',
    mape: 7.5,
    rmse: 2.3,
    mae: 1.8,
    mbe: -0.2,
    r2: 0.89,
    skillScore: 0.76,
    sampleCount: 96,
    validSamples: 94,
    createdAt: new Date()
  } as any;

  describe('toForecastResponse', () => {
    it('should transform basic forecast to response format', () => {
      const response = ForecastTransformer.toForecastResponse(mockForecast);

      expect(response).toHaveProperty('id', mockForecast.id);
      expect(response).toHaveProperty('location');
      expect(response.location).toMatchObject({
        id: mockLocation.id,
        name: mockLocation.name,
        city: mockLocation.city,
        capacityMW: mockLocation.capacityMW
      });

      expect(response).toHaveProperty('metadata');
      expect(response.metadata).toMatchObject({
        modelType: 'ML_LSTM',
        modelVersion: '1.0',
        forecastType: 'OPERATIONAL',
        resolution: 'FIFTEEN_MINUTES',
        horizonHours: 24,
        runId: 'run_123456_abc'
      });

      expect(response).toHaveProperty('timing');
      expect(response.timing).toMatchObject({
        createdAt: '2024-01-01T11:00:00.000Z',
        forecastStart: '2024-01-01T12:00:00.000Z',
        forecastEnd: '2024-01-02T12:00:00.000Z'
      });

      expect(response).toHaveProperty('quality');
      expect(response.quality).toHaveProperty('confidence', 92.3);

      expect(response).toHaveProperty('status');
      expect(['generating', 'completed', 'failed']).toContain(response.status);
    });

    it('should include forecast data when requested', () => {
      const response = ForecastTransformer.toForecastResponse(mockForecast, true);

      expect(response).toHaveProperty('data');
      expect(Array.isArray(response.data)).toBe(true);

      if (response.data && response.data.length > 0) {
        const dataPoint = response.data[0];
        expect(dataPoint).toHaveProperty('timestamp', '2024-01-01T12:00:00.000Z');
        expect(dataPoint).toHaveProperty('powerMW', 35.5);
        expect(dataPoint).toHaveProperty('energyMWh', 850.2);
        expect(dataPoint).toHaveProperty('capacityFactor', 0.71);
        expect(dataPoint).toHaveProperty('confidence');
        expect(dataPoint.confidence).toMatchObject({
          q10: 30.2,
          q25: 32.8,
          q75: 38.1,
          q90: 40.7
        });
      }
    });

    it('should exclude forecast data when not requested', () => {
      const response = ForecastTransformer.toForecastResponse(mockForecast, false);

      expect(response.data).toBeUndefined();
    });

    it('should handle forecast with accuracy metrics', () => {
      const forecastWithAccuracy = {
        ...mockForecast,
        forecastAccuracy: [mockForecastAccuracy]
      };

      const response = ForecastTransformer.toForecastResponse(forecastWithAccuracy);

      expect(response.quality).toHaveProperty('accuracy');
      expect(typeof response.quality.accuracy).toBe('number');
      expect(response.quality.accuracy).toBeGreaterThan(0);
      expect(response.quality.accuracy).toBeLessThanOrEqual(100);

      expect(response.quality).toHaveProperty('metrics');
      expect(response.quality.metrics).toMatchObject({
        mape: 7.5,
        rmse: 2.3,
        mae: 1.8,
        mbe: -0.2,
        r2: 0.89,
        skillScore: 0.76
      });
    });

    it('should handle forecast without accuracy metrics', () => {
      const forecastWithoutAccuracy = {
        ...mockForecast,
        forecastAccuracy: []
      };

      const response = ForecastTransformer.toForecastResponse(forecastWithoutAccuracy);

      expect(response.quality.accuracy).toBeUndefined();
      expect(response.quality.metrics).toBeUndefined();
    });

    it('should determine correct forecast status', () => {
      // Test completed forecast (has power data)
      const completedResponse = ForecastTransformer.toForecastResponse(mockForecast);
      expect(completedResponse.status).toBe('completed');

      // Test generating forecast (recent, no power data)
      const generatingForecast = {
        ...mockForecast,
        powerMW: 0,
        createdAt: new Date(Date.now() - 60000) // 1 minute ago
      };
      const generatingResponse = ForecastTransformer.toForecastResponse(generatingForecast);
      expect(generatingResponse.status).toBe('generating');

      // Test failed forecast (old, no power data)
      const failedForecast = {
        ...mockForecast,
        powerMW: 0,
        createdAt: new Date(Date.now() - 600000) // 10 minutes ago
      };
      const failedResponse = ForecastTransformer.toForecastResponse(failedForecast);
      expect(failedResponse.status).toBe('failed');
    });

    it('should handle optional fields correctly', () => {
      const minimalForecast = {
        ...mockForecast,
        modelVersion: null,
        energyMWh: null,
        capacityFactor: null,
        powerMWQ10: null,
        powerMWQ25: null,
        powerMWQ75: null,
        powerMWQ90: null,
        runId: null,
        notes: null,
        location: {
          ...mockLocation,
          city: null
        }
      };

      const response = ForecastTransformer.toForecastResponse(minimalForecast);

      expect(response.location.city).toBeUndefined();
      expect(response.metadata.modelVersion).toBeUndefined();
      expect(response.metadata.runId).toBeUndefined();
      expect(response.message).toBeUndefined();

      if (response.data && response.data.length > 0) {
        const dataPoint = response.data[0];
        expect(dataPoint.energyMWh).toBeUndefined();
        expect(dataPoint.capacityFactor).toBeUndefined();
        expect(dataPoint.confidence?.q10).toBeUndefined();
      }
    });
  });

  describe('toForecastListResponse', () => {
    const mockForecasts = [
      { ...mockForecast, id: 'forecast1' },
      { ...mockForecast, id: 'forecast2' },
      { ...mockForecast, id: 'forecast3' }
    ];

    it('should transform forecast array to list response', () => {
      const total = 25;
      const limit = 10;
      const offset = 0;
      const filters = { locationId: mockLocation.id };

      const response = ForecastTransformer.toForecastListResponse(
        mockForecasts,
        total,
        limit,
        offset,
        filters
      );

      expect(response).toHaveProperty('forecasts');
      expect(Array.isArray(response.forecasts)).toBe(true);
      expect(response.forecasts).toHaveLength(3);

      expect(response).toHaveProperty('pagination');
      expect(response.pagination).toMatchObject({
        total: 25,
        size: 10,
        current: 1,
        hasNext: true,
        hasPrev: false
      });

      expect(response).toHaveProperty('filters', filters);
    });

    it('should calculate pagination correctly for middle page', () => {
      const response = ForecastTransformer.toForecastListResponse(
        mockForecasts,
        100, // total
        10,  // limit
        30   // offset (page 4)
      );

      expect(response.pagination).toMatchObject({
        total: 100,
        size: 10,
        current: 4,
        hasNext: true,
        hasPrev: true
      });
    });

    it('should calculate pagination correctly for last page', () => {
      const response = ForecastTransformer.toForecastListResponse(
        mockForecasts,
        23,  // total
        10,  // limit
        20   // offset (last page)
      );

      expect(response.pagination).toMatchObject({
        total: 23,
        size: 10,
        current: 3,
        hasNext: false,
        hasPrev: true
      });
    });

    it('should not include data in list responses', () => {
      const response = ForecastTransformer.toForecastListResponse(
        mockForecasts,
        25,
        10,
        0
      );

      // Forecasts in list should not have data field
      for (const forecast of response.forecasts) {
        expect(forecast.data).toBeUndefined();
      }
    });
  });

  describe('toForecastCreateData', () => {
    const mockRequest: GenerateForecastRequest = {
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      horizonHours: 48,
      modelType: 'ML_XGBOOST' as any,
      resolution: 'HOURLY' as any,
      description: 'Test forecast creation'
    };

    it('should transform request to Prisma create data', () => {
      const createData = ForecastTransformer.toForecastCreateData(mockRequest, mockRequest.locationId);

      expect(createData).toHaveProperty('locationId', mockRequest.locationId);
      expect(createData).toHaveProperty('modelType', 'ML_XGBOOST');
      expect(createData).toHaveProperty('resolution', 'HOURLY');
      expect(createData).toHaveProperty('horizonMinutes', 48 * 60);
      expect(createData).toHaveProperty('horizonDays', 2);
      expect(createData).toHaveProperty('forecastType', 'OPERATIONAL');
      expect(createData).toHaveProperty('notes', 'Test forecast creation');

      // Should initialize with placeholder values
      expect(createData).toHaveProperty('powerMW', 0);
      expect(createData).toHaveProperty('energyMWh', 0);
      expect(createData).toHaveProperty('isActive', true);
      expect(createData).toHaveProperty('version', 1);

      // Should have timestamps
      expect(createData).toHaveProperty('timestamp');
      expect(createData).toHaveProperty('time');
      expect(createData.timestamp).toBeInstanceOf(Date);
      expect(createData.time).toBeInstanceOf(Date);

      // Should generate run ID
      expect(createData).toHaveProperty('runId');
      expect(typeof createData.runId).toBe('string');
      expect(createData.runId).toMatch(/^run_\d+_\w+$/);
    });

    it('should use custom start time when provided', () => {
      const customStartTime = '2024-01-15T14:00:00.000Z';
      const requestWithStartTime = {
        ...mockRequest,
        startTime: customStartTime
      };

      const createData = ForecastTransformer.toForecastCreateData(requestWithStartTime, mockRequest.locationId);

      expect(createData.timestamp).toEqual(new Date(customStartTime));
      expect(createData.time).toEqual(new Date(customStartTime));
    });

    it('should use current time when no start time provided', () => {
      const beforeTime = Date.now();
      const createData = ForecastTransformer.toForecastCreateData(mockRequest, mockRequest.locationId);
      const afterTime = Date.now();

      const createdTime = createData.timestamp.getTime();
      expect(createdTime).toBeGreaterThanOrEqual(beforeTime - 1000); // 1 second tolerance
      expect(createdTime).toBeLessThanOrEqual(afterTime + 1000);
    });

    it('should handle missing optional fields', () => {
      const minimalRequest: GenerateForecastRequest = {
        locationId: '550e8400-e29b-41d4-a716-446655440001',
        horizonHours: 24,
        modelType: 'ML_LSTM' as any,
        resolution: 'FIFTEEN_MINUTES' as any
      };

      const createData = ForecastTransformer.toForecastCreateData(minimalRequest, minimalRequest.locationId);

      expect(createData.notes).toBeNull();
      expect(createData).toHaveProperty('locationId');
      expect(createData).toHaveProperty('horizonMinutes', 24 * 60);
    });

    it('should calculate horizon days correctly', () => {
      const testCases = [
        { hours: 12, expectedDays: 1 },
        { hours: 24, expectedDays: 1 },
        { hours: 36, expectedDays: 2 },
        { hours: 48, expectedDays: 2 },
        { hours: 72, expectedDays: 3 }
      ];

      for (const testCase of testCases) {
        const request = {
          ...mockRequest,
          horizonHours: testCase.hours
        };

        const createData = ForecastTransformer.toForecastCreateData(request, request.locationId);
        expect(createData.horizonDays).toBe(testCase.expectedDays);
      }
    });
  });

  describe('transformPythonWorkerResponse', () => {
    const mockPythonResponse = {
      power_mw: 42.5,
      energy_mwh: 1020.3,
      capacity_factor: 0.85,
      confidence_intervals: {
        q10: 38.2,
        q25: 40.1,
        q75: 45.8,
        q90: 48.3
      },
      quality_score: 0.91,
      confidence_level: 91.2,
      processing_time_ms: 1250,
      worker_version: '1.2.3'
    };

    it('should transform Python worker response to Prisma update data', () => {
      const updateData = ForecastTransformer.transformPythonWorkerResponse(mockPythonResponse);

      expect(updateData).toMatchObject({
        powerMW: 42.5,
        powerOutputMW: 42.5,
        energyMWh: 1020.3,
        capacityFactor: 0.85,
        powerMWQ10: 38.2,
        powerMWQ25: 40.1,
        powerMWQ75: 45.8,
        powerMWQ90: 48.3,
        qualityScore: 0.91,
        confidenceLevel: 91.2,
        processingTime: 1250,
        pythonWorkerVersion: '1.2.3',
        validationStatus: 'COMPLETED'
      });

      expect(updateData).toHaveProperty('forecastGeneratedAt');
      expect(updateData.forecastGeneratedAt).toBeInstanceOf(Date);

      expect(updateData).toHaveProperty('updatedAt');
      expect(updateData.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle missing optional fields in Python response', () => {
      const minimalResponse = {
        power_mw: 30.0
      };

      const updateData = ForecastTransformer.transformPythonWorkerResponse(minimalResponse);

      expect(updateData).toMatchObject({
        powerMW: 30.0,
        powerOutputMW: 30.0,
        energyMWh: null,
        capacityFactor: null,
        powerMWQ10: null,
        powerMWQ25: null,
        powerMWQ75: null,
        powerMWQ90: null,
        qualityScore: null,
        confidenceLevel: null,
        processingTime: null,
        pythonWorkerVersion: null
      });
    });

    it('should handle missing power_mw', () => {
      const responseWithoutPower = {
        energy_mwh: 500.0
      };

      const updateData = ForecastTransformer.transformPythonWorkerResponse(responseWithoutPower);

      expect(updateData.powerMW).toBe(0);
      expect(updateData.powerOutputMW).toBe(0);
      expect(updateData.energyMWh).toBe(500.0);
    });
  });

  describe('utility methods', () => {
    it('should extract unique location IDs from forecast array', () => {
      const forecasts = [
        { ...mockForecast, locationId: 'location1' },
        { ...mockForecast, locationId: 'location2' },
        { ...mockForecast, locationId: 'location1' }, // duplicate
        { ...mockForecast, locationId: 'location3' }
      ];

      const locationIds = ForecastTransformer.extractLocationIds(forecasts);

      expect(locationIds).toHaveLength(3);
      expect(locationIds).toContain('location1');
      expect(locationIds).toContain('location2');
      expect(locationIds).toContain('location3');
      expect(new Set(locationIds).size).toBe(3); // All unique
    });

    it('should group forecasts by location', () => {
      const forecasts = [
        { ...mockForecast, id: 'f1', locationId: 'location1' },
        { ...mockForecast, id: 'f2', locationId: 'location2' },
        { ...mockForecast, id: 'f3', locationId: 'location1' },
        { ...mockForecast, id: 'f4', locationId: 'location3' }
      ];

      const grouped = ForecastTransformer.groupForecastsByLocation(forecasts);

      expect(grouped.size).toBe(3);
      expect(grouped.get('location1')).toHaveLength(2);
      expect(grouped.get('location2')).toHaveLength(1);
      expect(grouped.get('location3')).toHaveLength(1);

      const location1Forecasts = grouped.get('location1')!;
      expect(location1Forecasts.map(f => f.id)).toEqual(['f1', 'f3']);
    });

    it('should calculate pagination metadata correctly', () => {
      const testCases = [
        { total: 100, limit: 10, offset: 0, expected: { current: 1, totalPages: 10, hasNext: true, hasPrev: false } },
        { total: 100, limit: 10, offset: 50, expected: { current: 6, totalPages: 10, hasNext: true, hasPrev: true } },
        { total: 95, limit: 10, offset: 90, expected: { current: 10, totalPages: 10, hasNext: false, hasPrev: true } },
        { total: 5, limit: 10, offset: 0, expected: { current: 1, totalPages: 1, hasNext: false, hasPrev: false } }
      ];

      for (const testCase of testCases) {
        const pagination = ForecastTransformer.calculatePagination(
          testCase.total,
          testCase.limit,
          testCase.offset
        );

        expect(pagination.current).toBe(testCase.expected.current);
        expect(pagination.totalPages).toBe(testCase.expected.totalPages);
        expect(pagination.hasNext).toBe(testCase.expected.hasNext);
        expect(pagination.hasPrev).toBe(testCase.expected.hasPrev);
        expect(pagination.total).toBe(testCase.total);
        expect(pagination.size).toBe(testCase.limit);
      }
    });

    it('should calculate next and previous offsets correctly', () => {
      const pagination = ForecastTransformer.calculatePagination(100, 10, 30);

      expect(pagination.nextOffset).toBe(40);
      expect(pagination.prevOffset).toBe(20);

      // Test first page
      const firstPagePagination = ForecastTransformer.calculatePagination(100, 10, 0);
      expect(firstPagePagination.prevOffset).toBeNull();

      // Test last page
      const lastPagePagination = ForecastTransformer.calculatePagination(95, 10, 90);
      expect(lastPagePagination.nextOffset).toBeNull();
    });
  });
});