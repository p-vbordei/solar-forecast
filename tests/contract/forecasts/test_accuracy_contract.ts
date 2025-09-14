import { describe, it, expect, beforeAll } from 'vitest';

/**
 * Contract test for GET /api/forecasts/accuracy
 * This test MUST FAIL until the endpoint is implemented
 */
describe('GET /api/forecasts/accuracy - Contract Test', () => {
  const BASE_URL = 'http://localhost:5173';
  const ENDPOINT = '/api/forecasts/accuracy';

  beforeAll(() => {
    // Ensure test environment is set up
    expect(BASE_URL).toBeDefined();
  });

  it('should return overall accuracy metrics', async () => {
    const response = await fetch(`${BASE_URL}${ENDPOINT}`);

    expect(response.status).toBe(200);

    const responseData = await response.json();

    // Validate response structure
    expect(responseData).toHaveProperty('success', true);
    expect(responseData).toHaveProperty('data');

    const data = responseData.data;
    expect(data).toHaveProperty('summary');
    expect(data.summary).toHaveProperty('overallAccuracy');
    expect(data.summary).toHaveProperty('bestModel');
    expect(data.summary).toHaveProperty('totalForecasts');
    expect(data.summary).toHaveProperty('period');
    expect(data.summary.period).toHaveProperty('start');
    expect(data.summary.period).toHaveProperty('end');

    expect(typeof data.summary.overallAccuracy).toBe('number');
    expect(data.summary.overallAccuracy).toBeGreaterThanOrEqual(0);
    expect(data.summary.overallAccuracy).toBeLessThanOrEqual(100);
    expect(typeof data.summary.totalForecasts).toBe('number');
  });

  it('should return model performance breakdown', async () => {
    const response = await fetch(`${BASE_URL}${ENDPOINT}`);

    expect(response.status).toBe(200);

    const responseData = await response.json();
    const data = responseData.data;

    expect(data).toHaveProperty('modelPerformance');
    expect(Array.isArray(data.modelPerformance)).toBe(true);

    if (data.modelPerformance.length > 0) {
      const modelPerf = data.modelPerformance[0];
      expect(modelPerf).toHaveProperty('modelType');
      expect(modelPerf).toHaveProperty('overall');
      expect(modelPerf.overall).toHaveProperty('mape');
      expect(modelPerf.overall).toHaveProperty('rmse');
      expect(modelPerf.overall).toHaveProperty('mae');
      expect(modelPerf).toHaveProperty('byHorizon');
      expect(Array.isArray(modelPerf.byHorizon)).toBe(true);
      expect(modelPerf).toHaveProperty('forecastCount');
      expect(modelPerf).toHaveProperty('dateRange');
      expect(modelPerf.dateRange).toHaveProperty('start');
      expect(modelPerf.dateRange).toHaveProperty('end');
    }
  });

  it('should return location accuracy breakdown', async () => {
    const response = await fetch(`${BASE_URL}${ENDPOINT}`);

    expect(response.status).toBe(200);

    const responseData = await response.json();
    const data = responseData.data;

    expect(data).toHaveProperty('locationAccuracy');
    expect(Array.isArray(data.locationAccuracy)).toBe(true);

    if (data.locationAccuracy.length > 0) {
      const locationAcc = data.locationAccuracy[0];
      expect(locationAcc).toHaveProperty('location');
      expect(locationAcc.location).toHaveProperty('id');
      expect(locationAcc.location).toHaveProperty('name');
      expect(locationAcc.location).toHaveProperty('capacityMW');
      expect(locationAcc).toHaveProperty('accuracy');
      expect(locationAcc.accuracy).toHaveProperty('mape');
      expect(locationAcc.accuracy).toHaveProperty('rmse');
      expect(locationAcc.accuracy).toHaveProperty('mae');
      expect(locationAcc.accuracy).toHaveProperty('confidence');
      expect(locationAcc).toHaveProperty('bestModel');
      expect(locationAcc).toHaveProperty('forecastCount');
    }
  });

  it('should return accuracy trends over time', async () => {
    const response = await fetch(`${BASE_URL}${ENDPOINT}`);

    expect(response.status).toBe(200);

    const responseData = await response.json();
    const data = responseData.data;

    expect(data).toHaveProperty('trends');
    expect(Array.isArray(data.trends)).toBe(true);

    if (data.trends.length > 0) {
      const trend = data.trends[0];
      expect(trend).toHaveProperty('period');
      expect(trend).toHaveProperty('accuracy');
      expect(trend).toHaveProperty('mape');
      expect(trend).toHaveProperty('forecastCount');
      expect(typeof trend.accuracy).toBe('number');
      expect(typeof trend.mape).toBe('number');
      expect(typeof trend.forecastCount).toBe('number');
    }
  });

  it('should accept location filter for accuracy', async () => {
    const locationId = '550e8400-e29b-41d4-a716-446655440001';
    const queryParams = new URLSearchParams({
      locationId: locationId
    });

    const response = await fetch(`${BASE_URL}${ENDPOINT}?${queryParams}`);

    expect(response.status).toBe(200);

    const responseData = await response.json();
    expect(responseData.success).toBe(true);

    // Should filter results to specific location
    const data = responseData.data;
    if (data.locationAccuracy.length > 0) {
      expect(data.locationAccuracy.every((loc: any) => loc.location.id === locationId)).toBe(true);
    }
  });

  it('should accept date range filters for accuracy', async () => {
    const startDate = '2024-01-01T00:00:00.000Z';
    const endDate = '2024-12-31T23:59:59.999Z';
    const queryParams = new URLSearchParams({
      startDate: startDate,
      endDate: endDate
    });

    const response = await fetch(`${BASE_URL}${ENDPOINT}?${queryParams}`);

    expect(response.status).toBe(200);

    const responseData = await response.json();
    expect(responseData.success).toBe(true);

    // Verify period is reflected in response
    const data = responseData.data;
    expect(data.summary.period.start).toBe(startDate);
    expect(data.summary.period.end).toBe(endDate);
  });

  it('should accept model type filter for accuracy', async () => {
    const queryParams = new URLSearchParams({
      modelType: 'ML_LSTM'
    });

    const response = await fetch(`${BASE_URL}${ENDPOINT}?${queryParams}`);

    expect(response.status).toBe(200);

    const responseData = await response.json();
    expect(responseData.success).toBe(true);

    // Should filter model performance to specific type
    const data = responseData.data;
    if (data.modelPerformance.length > 0) {
      expect(data.modelPerformance.every((model: any) => model.modelType === 'ML_LSTM')).toBe(true);
    }
  });

  it('should reject invalid location ID format', async () => {
    const queryParams = new URLSearchParams({
      locationId: 'not-a-uuid'
    });

    const response = await fetch(`${BASE_URL}${ENDPOINT}?${queryParams}`);

    expect(response.status).toBe(400);

    const responseData = await response.json();
    expect(responseData.success).toBe(false);
    expect(responseData.error).toContain('locationId');
  });

  it('should reject invalid date range', async () => {
    const queryParams = new URLSearchParams({
      startDate: '2024-12-31T23:59:59.999Z',
      endDate: '2024-01-01T00:00:00.000Z' // End before start
    });

    const response = await fetch(`${BASE_URL}${ENDPOINT}?${queryParams}`);

    expect(response.status).toBe(400);

    const responseData = await response.json();
    expect(responseData.success).toBe(false);
    expect(responseData.error).toContain('date range');
  });

  it('should handle empty accuracy data gracefully', async () => {
    // Request accuracy for a very old date range where no data exists
    const queryParams = new URLSearchParams({
      startDate: '2020-01-01T00:00:00.000Z',
      endDate: '2020-01-02T00:00:00.000Z'
    });

    const response = await fetch(`${BASE_URL}${ENDPOINT}?${queryParams}`);

    expect(response.status).toBe(200);

    const responseData = await response.json();
    expect(responseData.success).toBe(true);

    const data = responseData.data;
    expect(data.summary.totalForecasts).toBe(0);
    expect(data.modelPerformance).toEqual([]);
    expect(data.locationAccuracy).toEqual([]);
    expect(data.trends).toEqual([]);
  });

  it('should include recommendations when available', async () => {
    const response = await fetch(`${BASE_URL}${ENDPOINT}`);

    expect(response.status).toBe(200);

    const responseData = await response.json();
    const data = responseData.data;

    if (data.recommendations) {
      expect(data.recommendations).toHaveProperty('modelSuggestions');
      expect(data.recommendations).toHaveProperty('dataQualityIssues');
      expect(data.recommendations).toHaveProperty('calibrationNeeds');
      expect(Array.isArray(data.recommendations.modelSuggestions)).toBe(true);
      expect(Array.isArray(data.recommendations.dataQualityIssues)).toBe(true);
      expect(Array.isArray(data.recommendations.calibrationNeeds)).toBe(true);
    }
  });

  it('should handle horizon-specific accuracy metrics', async () => {
    const response = await fetch(`${BASE_URL}${ENDPOINT}`);

    expect(response.status).toBe(200);

    const responseData = await response.json();
    const data = responseData.data;

    if (data.modelPerformance.length > 0 && data.modelPerformance[0].byHorizon.length > 0) {
      const horizonMetric = data.modelPerformance[0].byHorizon[0];
      expect(horizonMetric).toHaveProperty('horizonHours');
      expect(horizonMetric).toHaveProperty('mape');
      expect(horizonMetric).toHaveProperty('rmse');
      expect(horizonMetric).toHaveProperty('mae');
      expect(horizonMetric).toHaveProperty('sampleCount');
      expect(typeof horizonMetric.horizonHours).toBe('number');
      expect(typeof horizonMetric.mape).toBe('number');
      expect(typeof horizonMetric.rmse).toBe('number');
      expect(typeof horizonMetric.mae).toBe('number');
      expect(typeof horizonMetric.sampleCount).toBe('number');
    }
  });
});