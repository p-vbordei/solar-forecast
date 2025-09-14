import { describe, it, expect } from 'vitest';
import { ForecastValidator } from '../../../src/lib/features/forecasts/helpers/ForecastValidator';
import { BadRequestError } from '../../../src/lib/utils/ApiErrors';
import type { GenerateForecastRequest } from '../../../src/lib/features/forecasts/models/requests/GenerateForecastRequest';
import type { ListForecastsRequest } from '../../../src/lib/features/forecasts/models/requests/ListForecastsRequest';

/**
 * Unit tests for ForecastValidator
 * These tests MUST FAIL until the validator is implemented
 */
describe('ForecastValidator', () => {
  describe('validateGenerateForecastRequest', () => {
    const validRequest: GenerateForecastRequest = {
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      horizonHours: 24,
      modelType: 'ML_LSTM' as any,
      resolution: 'FIFTEEN_MINUTES' as any,
      description: 'Test forecast'
    };

    it('should validate a correct generate forecast request', () => {
      expect(() => {
        ForecastValidator.validateGenerateForecastRequest(validRequest);
      }).not.toThrow();
    });

    it('should reject request without locationId', () => {
      const invalidRequest = { ...validRequest, locationId: undefined as any };

      expect(() => {
        ForecastValidator.validateGenerateForecastRequest(invalidRequest);
      }).toThrow(BadRequestError);

      expect(() => {
        ForecastValidator.validateGenerateForecastRequest(invalidRequest);
      }).toThrow('Location ID is required');
    });

    it('should reject request without horizonHours', () => {
      const invalidRequest = { ...validRequest, horizonHours: undefined as any };

      expect(() => {
        ForecastValidator.validateGenerateForecastRequest(invalidRequest);
      }).toThrow(BadRequestError);

      expect(() => {
        ForecastValidator.validateGenerateForecastRequest(invalidRequest);
      }).toThrow('Horizon hours is required');
    });

    it('should reject request without modelType', () => {
      const invalidRequest = { ...validRequest, modelType: undefined as any };

      expect(() => {
        ForecastValidator.validateGenerateForecastRequest(invalidRequest);
      }).toThrow(BadRequestError);

      expect(() => {
        ForecastValidator.validateGenerateForecastRequest(invalidRequest);
      }).toThrow('Model type is required');
    });

    it('should reject request without resolution', () => {
      const invalidRequest = { ...validRequest, resolution: undefined as any };

      expect(() => {
        ForecastValidator.validateGenerateForecastRequest(invalidRequest);
      }).toThrow(BadRequestError);

      expect(() => {
        ForecastValidator.validateGenerateForecastRequest(invalidRequest);
      }).toThrow('Resolution is required');
    });

    it('should reject invalid UUID format for locationId', () => {
      const invalidRequest = { ...validRequest, locationId: 'not-a-uuid' };

      expect(() => {
        ForecastValidator.validateGenerateForecastRequest(invalidRequest);
      }).toThrow(BadRequestError);

      expect(() => {
        ForecastValidator.validateGenerateForecastRequest(invalidRequest);
      }).toThrow('Invalid locationId format');
    });

    it('should reject horizonHours below minimum', () => {
      const invalidRequest = { ...validRequest, horizonHours: 0 };

      expect(() => {
        ForecastValidator.validateGenerateForecastRequest(invalidRequest);
      }).toThrow(BadRequestError);

      expect(() => {
        ForecastValidator.validateGenerateForecastRequest(invalidRequest);
      }).toThrow('horizonHours must be between');
    });

    it('should reject horizonHours above maximum', () => {
      const invalidRequest = { ...validRequest, horizonHours: 200 };

      expect(() => {
        ForecastValidator.validateGenerateForecastRequest(invalidRequest);
      }).toThrow(BadRequestError);

      expect(() => {
        ForecastValidator.validateGenerateForecastRequest(invalidRequest);
      }).toThrow('horizonHours must be between');
    });

    it('should reject invalid modelType', () => {
      const invalidRequest = { ...validRequest, modelType: 'INVALID_MODEL' as any };

      expect(() => {
        ForecastValidator.validateGenerateForecastRequest(invalidRequest);
      }).toThrow(BadRequestError);

      expect(() => {
        ForecastValidator.validateGenerateForecastRequest(invalidRequest);
      }).toThrow('Invalid modelType');
    });

    it('should reject invalid resolution', () => {
      const invalidRequest = { ...validRequest, resolution: 'INVALID_RESOLUTION' as any };

      expect(() => {
        ForecastValidator.validateGenerateForecastRequest(invalidRequest);
      }).toThrow(BadRequestError);

      expect(() => {
        ForecastValidator.validateGenerateForecastRequest(invalidRequest);
      }).toThrow('Invalid resolution');
    });

    it('should reject startTime in the past', () => {
      const pastTime = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 minutes ago
      const invalidRequest = { ...validRequest, startTime: pastTime };

      expect(() => {
        ForecastValidator.validateGenerateForecastRequest(invalidRequest);
      }).toThrow(BadRequestError);

      expect(() => {
        ForecastValidator.validateGenerateForecastRequest(invalidRequest);
      }).toThrow('Start time cannot be in the past');
    });

    it('should accept startTime in near past within buffer', () => {
      const nearPastTime = new Date(Date.now() - 2 * 60 * 1000).toISOString(); // 2 minutes ago (within 5min buffer)
      const validRequestWithNearPast = { ...validRequest, startTime: nearPastTime };

      expect(() => {
        ForecastValidator.validateGenerateForecastRequest(validRequestWithNearPast);
      }).not.toThrow();
    });

    it('should accept future startTime', () => {
      const futureTime = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour in future
      const validRequestWithFuture = { ...validRequest, startTime: futureTime };

      expect(() => {
        ForecastValidator.validateGenerateForecastRequest(validRequestWithFuture);
      }).not.toThrow();
    });

    it('should reject invalid ISO date format for startTime', () => {
      const invalidRequest = { ...validRequest, startTime: 'not-a-date' };

      expect(() => {
        ForecastValidator.validateGenerateForecastRequest(invalidRequest);
      }).toThrow(BadRequestError);

      expect(() => {
        ForecastValidator.validateGenerateForecastRequest(invalidRequest);
      }).toThrow('Invalid startTime format');
    });

    it('should reject description that is too long', () => {
      const longDescription = 'a'.repeat(501); // Exceeds 500 char limit
      const invalidRequest = { ...validRequest, description: longDescription };

      expect(() => {
        ForecastValidator.validateGenerateForecastRequest(invalidRequest);
      }).toThrow(BadRequestError);

      expect(() => {
        ForecastValidator.validateGenerateForecastRequest(invalidRequest);
      }).toThrow('Description too long');
    });

    it('should validate modelParameters learning rate range', () => {
      const invalidRequest = {
        ...validRequest,
        modelParameters: {
          learningRate: 1.5 // Above max of 1.0
        }
      };

      expect(() => {
        ForecastValidator.validateGenerateForecastRequest(invalidRequest);
      }).toThrow(BadRequestError);

      expect(() => {
        ForecastValidator.validateGenerateForecastRequest(invalidRequest);
      }).toThrow('modelParameters.learningRate');
    });

    it('should reject too many features in modelParameters', () => {
      const tooManyFeatures = Array.from({ length: 51 }, (_, i) => `feature_${i}`);
      const invalidRequest = {
        ...validRequest,
        modelParameters: {
          features: tooManyFeatures
        }
      };

      expect(() => {
        ForecastValidator.validateGenerateForecastRequest(invalidRequest);
      }).toThrow(BadRequestError);

      expect(() => {
        ForecastValidator.validateGenerateForecastRequest(invalidRequest);
      }).toThrow('Too many features');
    });

    it('should accept valid modelParameters', () => {
      const validRequestWithParams = {
        ...validRequest,
        modelParameters: {
          learningRate: 0.05,
          features: ['temperature', 'humidity', 'irradiance'],
          includeWeather: true
        }
      };

      expect(() => {
        ForecastValidator.validateGenerateForecastRequest(validRequestWithParams);
      }).not.toThrow();
    });
  });

  describe('validateListForecastsRequest', () => {
    it('should validate empty request (all optional)', () => {
      const emptyRequest: ListForecastsRequest = {};

      expect(() => {
        ForecastValidator.validateListForecastsRequest(emptyRequest);
      }).not.toThrow();
    });

    it('should validate valid complete request', () => {
      const validRequest: ListForecastsRequest = {
        locationId: '550e8400-e29b-41d4-a716-446655440001',
        modelType: 'ML_LSTM' as any,
        forecastType: 'OPERATIONAL' as any,
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-12-31T23:59:59.999Z',
        search: 'test',
        limit: 25,
        offset: 50,
        sortBy: 'accuracy',
        sortOrder: 'desc',
        includeData: true,
        includeAccuracy: true,
        activeOnly: true
      };

      expect(() => {
        ForecastValidator.validateListForecastsRequest(validRequest);
      }).not.toThrow();
    });

    it('should reject invalid locationId format', () => {
      const invalidRequest: ListForecastsRequest = {
        locationId: 'not-a-uuid'
      };

      expect(() => {
        ForecastValidator.validateListForecastsRequest(invalidRequest);
      }).toThrow(BadRequestError);

      expect(() => {
        ForecastValidator.validateListForecastsRequest(invalidRequest);
      }).toThrow('Invalid locationId format');
    });

    it('should reject invalid modelType', () => {
      const invalidRequest: ListForecastsRequest = {
        modelType: 'INVALID_MODEL' as any
      };

      expect(() => {
        ForecastValidator.validateListForecastsRequest(invalidRequest);
      }).toThrow(BadRequestError);

      expect(() => {
        ForecastValidator.validateListForecastsRequest(invalidRequest);
      }).toThrow('Invalid modelType');
    });

    it('should reject invalid forecastType', () => {
      const invalidRequest: ListForecastsRequest = {
        forecastType: 'INVALID_TYPE' as any
      };

      expect(() => {
        ForecastValidator.validateListForecastsRequest(invalidRequest);
      }).toThrow(BadRequestError);

      expect(() => {
        ForecastValidator.validateListForecastsRequest(invalidRequest);
      }).toThrow('Invalid forecastType');
    });

    it('should reject invalid date format', () => {
      const invalidRequest: ListForecastsRequest = {
        startDate: 'not-a-date'
      };

      expect(() => {
        ForecastValidator.validateListForecastsRequest(invalidRequest);
      }).toThrow(BadRequestError);

      expect(() => {
        ForecastValidator.validateListForecastsRequest(invalidRequest);
      }).toThrow('Invalid startDate format');
    });

    it('should reject date range where start is after end', () => {
      const invalidRequest: ListForecastsRequest = {
        startDate: '2024-12-31T23:59:59.999Z',
        endDate: '2024-01-01T00:00:00.000Z'
      };

      expect(() => {
        ForecastValidator.validateListForecastsRequest(invalidRequest);
      }).toThrow(BadRequestError);

      expect(() => {
        ForecastValidator.validateListForecastsRequest(invalidRequest);
      }).toThrow('Invalid date range');
    });

    it('should reject date range exceeding 1 year', () => {
      const invalidRequest: ListForecastsRequest = {
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2025-12-31T23:59:59.999Z' // Nearly 2 years
      };

      expect(() => {
        ForecastValidator.validateListForecastsRequest(invalidRequest);
      }).toThrow(BadRequestError);

      expect(() => {
        ForecastValidator.validateListForecastsRequest(invalidRequest);
      }).toThrow('Date range too large');
    });

    it('should reject limit outside valid range', () => {
      const invalidRequest: ListForecastsRequest = {
        limit: 0
      };

      expect(() => {
        ForecastValidator.validateListForecastsRequest(invalidRequest);
      }).toThrow(BadRequestError);

      expect(() => {
        ForecastValidator.validateListForecastsRequest(invalidRequest);
      }).toThrow('limit must be between');

      const invalidRequest2: ListForecastsRequest = {
        limit: 150
      };

      expect(() => {
        ForecastValidator.validateListForecastsRequest(invalidRequest2);
      }).toThrow(BadRequestError);
    });

    it('should reject negative offset', () => {
      const invalidRequest: ListForecastsRequest = {
        offset: -5
      };

      expect(() => {
        ForecastValidator.validateListForecastsRequest(invalidRequest);
      }).toThrow(BadRequestError);

      expect(() => {
        ForecastValidator.validateListForecastsRequest(invalidRequest);
      }).toThrow('offset must be non-negative');
    });

    it('should reject invalid sortBy field', () => {
      const invalidRequest: ListForecastsRequest = {
        sortBy: 'invalidField' as any
      };

      expect(() => {
        ForecastValidator.validateListForecastsRequest(invalidRequest);
      }).toThrow(BadRequestError);

      expect(() => {
        ForecastValidator.validateListForecastsRequest(invalidRequest);
      }).toThrow('Invalid sort field');
    });

    it('should reject invalid sortOrder', () => {
      const invalidRequest: ListForecastsRequest = {
        sortOrder: 'invalidOrder' as any
      };

      expect(() => {
        ForecastValidator.validateListForecastsRequest(invalidRequest);
      }).toThrow(BadRequestError);

      expect(() => {
        ForecastValidator.validateListForecastsRequest(invalidRequest);
      }).toThrow('Invalid sort order');
    });

    it('should reject search query that is too long', () => {
      const longSearch = 'a'.repeat(256);
      const invalidRequest: ListForecastsRequest = {
        search: longSearch
      };

      expect(() => {
        ForecastValidator.validateListForecastsRequest(invalidRequest);
      }).toThrow(BadRequestError);

      expect(() => {
        ForecastValidator.validateListForecastsRequest(invalidRequest);
      }).toThrow('Search query too long');
    });
  });

  describe('validateForecastId', () => {
    it('should validate correct UUID', () => {
      const validId = '550e8400-e29b-41d4-a716-446655440001';

      expect(() => {
        ForecastValidator.validateForecastId(validId);
      }).not.toThrow();
    });

    it('should reject empty ID', () => {
      expect(() => {
        ForecastValidator.validateForecastId('');
      }).toThrow(BadRequestError);

      expect(() => {
        ForecastValidator.validateForecastId('');
      }).toThrow('Forecast ID is required');
    });

    it('should reject invalid UUID format', () => {
      const invalidId = 'not-a-uuid';

      expect(() => {
        ForecastValidator.validateForecastId(invalidId);
      }).toThrow(BadRequestError);

      expect(() => {
        ForecastValidator.validateForecastId(invalidId);
      }).toThrow('Invalid id format');
    });
  });

  describe('normalizeListForecastsRequest', () => {
    it('should apply default values to empty request', () => {
      const emptyRequest: ListForecastsRequest = {};

      const normalized = ForecastValidator.normalizeListForecastsRequest(emptyRequest);

      expect(normalized.limit).toBe(50);
      expect(normalized.offset).toBe(0);
      expect(normalized.sortBy).toBe('createdAt');
      expect(normalized.sortOrder).toBe('desc');
      expect(normalized.activeOnly).toBe(true);
      expect(normalized.includeData).toBe(false);
      expect(normalized.includeAccuracy).toBe(false);
    });

    it('should preserve provided values', () => {
      const request: ListForecastsRequest = {
        limit: 25,
        offset: 10,
        sortBy: 'accuracy',
        sortOrder: 'asc',
        activeOnly: false,
        includeData: true,
        includeAccuracy: true,
        search: '  test search  '
      };

      const normalized = ForecastValidator.normalizeListForecastsRequest(request);

      expect(normalized.limit).toBe(25);
      expect(normalized.offset).toBe(10);
      expect(normalized.sortBy).toBe('accuracy');
      expect(normalized.sortOrder).toBe('asc');
      expect(normalized.activeOnly).toBe(false);
      expect(normalized.includeData).toBe(true);
      expect(normalized.includeAccuracy).toBe(true);
      expect(normalized.search).toBe('test search'); // Trimmed
    });

    it('should trim and sanitize search field', () => {
      const request: ListForecastsRequest = {
        search: '   trimmed search   '
      };

      const normalized = ForecastValidator.normalizeListForecastsRequest(request);

      expect(normalized.search).toBe('trimmed search');
    });

    it('should remove empty search field', () => {
      const request: ListForecastsRequest = {
        search: '   '
      };

      const normalized = ForecastValidator.normalizeListForecastsRequest(request);

      expect(normalized.search).toBeUndefined();
    });
  });

  describe('validateHorizonForLocation', () => {
    it('should warn for long horizons on small installations', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      ForecastValidator.validateHorizonForLocation(72, 5); // 72h for 5MW installation

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Long forecast horizon')
      );

      consoleSpy.mockRestore();
    });

    it('should warn for very long horizons', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      ForecastValidator.validateHorizonForLocation(96, 50); // 96h horizon

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Very long forecast horizon')
      );

      consoleSpy.mockRestore();
    });

    it('should not warn for reasonable combinations', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      ForecastValidator.validateHorizonForLocation(24, 50); // 24h for 50MW

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});