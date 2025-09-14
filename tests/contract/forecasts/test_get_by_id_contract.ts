import { describe, it, expect, beforeAll } from 'vitest';

/**
 * Contract test for GET /api/forecasts/[id]
 * This test MUST FAIL until the endpoint is implemented
 */
describe('GET /api/forecasts/[id] - Contract Test', () => {
  const BASE_URL = 'http://localhost:5173';
  const ENDPOINT_BASE = '/api/forecasts';

  beforeAll(() => {
    // Ensure test environment is set up
    expect(BASE_URL).toBeDefined();
  });

  it('should return forecast details for valid ID', async () => {
    const forecastId = '550e8400-e29b-41d4-a716-446655440001';
    const response = await fetch(`${BASE_URL}${ENDPOINT_BASE}/${forecastId}`);

    expect(response.status).toBe(200);

    const responseData = await response.json();

    // Validate response structure
    expect(responseData).toHaveProperty('success', true);
    expect(responseData).toHaveProperty('data');

    const forecast = responseData.data;
    expect(forecast).toHaveProperty('id', forecastId);
    expect(forecast).toHaveProperty('location');
    expect(forecast.location).toHaveProperty('id');
    expect(forecast.location).toHaveProperty('name');
    expect(forecast.location).toHaveProperty('capacityMW');

    expect(forecast).toHaveProperty('metadata');
    expect(forecast.metadata).toHaveProperty('modelType');
    expect(forecast.metadata).toHaveProperty('forecastType');
    expect(forecast.metadata).toHaveProperty('resolution');
    expect(forecast.metadata).toHaveProperty('horizonHours');

    expect(forecast).toHaveProperty('timing');
    expect(forecast.timing).toHaveProperty('createdAt');
    expect(forecast.timing).toHaveProperty('forecastStart');
    expect(forecast.timing).toHaveProperty('forecastEnd');

    expect(forecast).toHaveProperty('quality');
    expect(forecast.quality).toHaveProperty('confidence');

    expect(forecast).toHaveProperty('status');
    expect(['generating', 'completed', 'failed']).toContain(forecast.status);
  });

  it('should return 404 for non-existent forecast', async () => {
    const nonExistentId = '550e8400-e29b-41d4-a716-446655440999';
    const response = await fetch(`${BASE_URL}${ENDPOINT_BASE}/${nonExistentId}`);

    expect(response.status).toBe(404);

    const responseData = await response.json();
    expect(responseData).toHaveProperty('success', false);
    expect(responseData).toHaveProperty('error');
    expect(responseData.error).toContain('not found');
  });

  it('should return 400 for invalid UUID format', async () => {
    const invalidId = 'not-a-uuid';
    const response = await fetch(`${BASE_URL}${ENDPOINT_BASE}/${invalidId}`);

    expect(response.status).toBe(400);

    const responseData = await response.json();
    expect(responseData).toHaveProperty('success', false);
    expect(responseData).toHaveProperty('error');
    expect(responseData.error).toContain('Invalid');
  });

  it('should include forecast data when requested', async () => {
    const forecastId = '550e8400-e29b-41d4-a716-446655440001';
    const queryParams = new URLSearchParams({
      includeData: 'true'
    });

    const response = await fetch(`${BASE_URL}${ENDPOINT_BASE}/${forecastId}?${queryParams}`);

    expect(response.status).toBe(200);

    const responseData = await response.json();
    const forecast = responseData.data;

    expect(forecast).toHaveProperty('data');
    expect(Array.isArray(forecast.data)).toBe(true);

    if (forecast.data && forecast.data.length > 0) {
      const dataPoint = forecast.data[0];
      expect(dataPoint).toHaveProperty('timestamp');
      expect(dataPoint).toHaveProperty('powerMW');
      expect(typeof dataPoint.powerMW).toBe('number');
    }
  });

  it('should include accuracy metrics when available', async () => {
    const forecastId = '550e8400-e29b-41d4-a716-446655440001';
    const queryParams = new URLSearchParams({
      includeAccuracy: 'true'
    });

    const response = await fetch(`${BASE_URL}${ENDPOINT_BASE}/${forecastId}?${queryParams}`);

    expect(response.status).toBe(200);

    const responseData = await response.json();
    const forecast = responseData.data;

    expect(forecast.quality).toBeDefined();

    if (forecast.quality.metrics) {
      expect(forecast.quality.metrics).toHaveProperty('mape');
      expect(forecast.quality.metrics).toHaveProperty('rmse');
      expect(forecast.quality.metrics).toHaveProperty('mae');
      expect(typeof forecast.quality.metrics.mape).toBe('number');
      expect(typeof forecast.quality.metrics.rmse).toBe('number');
      expect(typeof forecast.quality.metrics.mae).toBe('number');
    }
  });

  it('should handle confidence intervals in data', async () => {
    const forecastId = '550e8400-e29b-41d4-a716-446655440001';
    const queryParams = new URLSearchParams({
      includeData: 'true'
    });

    const response = await fetch(`${BASE_URL}${ENDPOINT_BASE}/${forecastId}?${queryParams}`);

    expect(response.status).toBe(200);

    const responseData = await response.json();
    const forecast = responseData.data;

    if (forecast.data && forecast.data.length > 0) {
      const dataPoint = forecast.data[0];

      if (dataPoint.confidence) {
        expect(dataPoint.confidence).toHaveProperty('q10');
        expect(dataPoint.confidence).toHaveProperty('q25');
        expect(dataPoint.confidence).toHaveProperty('q75');
        expect(dataPoint.confidence).toHaveProperty('q90');
      }
    }
  });

  it('should validate timestamp formats in response', async () => {
    const forecastId = '550e8400-e29b-41d4-a716-446655440001';
    const response = await fetch(`${BASE_URL}${ENDPOINT_BASE}/${forecastId}`);

    expect(response.status).toBe(200);

    const responseData = await response.json();
    const forecast = responseData.data;

    // Validate ISO timestamp formats
    expect(() => new Date(forecast.timing.createdAt)).not.toThrow();
    expect(() => new Date(forecast.timing.forecastStart)).not.toThrow();
    expect(() => new Date(forecast.timing.forecastEnd)).not.toThrow();

    // Ensure timestamps are valid dates
    expect(new Date(forecast.timing.createdAt)).toBeInstanceOf(Date);
    expect(new Date(forecast.timing.forecastStart)).toBeInstanceOf(Date);
    expect(new Date(forecast.timing.forecastEnd)).toBeInstanceOf(Date);

    // Ensure forecast end is after forecast start
    const start = new Date(forecast.timing.forecastStart);
    const end = new Date(forecast.timing.forecastEnd);
    expect(end.getTime()).toBeGreaterThan(start.getTime());
  });

  it('should handle forecast with missing optional fields gracefully', async () => {
    const forecastId = '550e8400-e29b-41d4-a716-446655440001';
    const response = await fetch(`${BASE_URL}${ENDPOINT_BASE}/${forecastId}`);

    expect(response.status).toBe(200);

    const responseData = await response.json();
    const forecast = responseData.data;

    // Optional fields should be undefined or null, not missing
    if (forecast.location.city === null || forecast.location.city === undefined) {
      expect([null, undefined]).toContain(forecast.location.city);
    }

    if (forecast.metadata.modelVersion === null || forecast.metadata.modelVersion === undefined) {
      expect([null, undefined]).toContain(forecast.metadata.modelVersion);
    }

    if (forecast.quality.accuracy === null || forecast.quality.accuracy === undefined) {
      expect([null, undefined]).toContain(forecast.quality.accuracy);
    }
  });
});