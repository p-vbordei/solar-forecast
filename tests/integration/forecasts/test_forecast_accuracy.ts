import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * Integration test for forecast accuracy calculation and metrics
 * This test MUST FAIL until accuracy calculation is implemented
 */
describe('Forecast Accuracy Integration Test', () => {
  const BASE_URL = 'http://localhost:5173';

  let testLocationId: string;
  let testForecastIds: string[] = [];

  beforeAll(async () => {
    // Get a test location ID
    const locationsResponse = await fetch(`${BASE_URL}/api/locations?limit=1`);
    expect(locationsResponse.status).toBe(200);

    const locationsData = await locationsResponse.json();
    testLocationId = locationsData.data.locations[0].id;

    // Generate a few test forecasts with different models for accuracy testing
    const modelTypes = ['ML_LSTM', 'ML_XGBOOST', 'ML_RANDOMFOREST'];

    for (const modelType of modelTypes) {
      const generateResponse = await fetch(`${BASE_URL}/api/forecasts/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          locationId: testLocationId,
          horizonHours: 24,
          modelType: modelType,
          resolution: 'HOURLY',
          description: `Accuracy test - ${modelType}`,
          forceRegenerate: true
        })
      });

      if (generateResponse.status === 201) {
        const generateData = await generateResponse.json();
        testForecastIds.push(generateData.data.id);
      }
    }
  });

  afterAll(async () => {
    // Clean up test forecasts
    for (const id of testForecastIds) {
      await fetch(`${BASE_URL}/api/forecasts/${id}`, {
        method: 'DELETE'
      });
    }
  });

  it('should retrieve overall system accuracy metrics', async () => {
    const response = await fetch(`${BASE_URL}/api/forecasts/accuracy`);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('summary');

    const summary = data.data.summary;
    expect(summary).toHaveProperty('overallAccuracy');
    expect(summary).toHaveProperty('bestModel');
    expect(summary).toHaveProperty('totalForecasts');

    expect(typeof summary.overallAccuracy).toBe('number');
    expect(summary.overallAccuracy).toBeGreaterThanOrEqual(0);
    expect(summary.overallAccuracy).toBeLessThanOrEqual(100);
    expect(typeof summary.totalForecasts).toBe('number');
    expect(summary.totalForecasts).toBeGreaterThanOrEqual(0);
  });

  it('should provide model performance comparison', async () => {
    const response = await fetch(`${BASE_URL}/api/forecasts/accuracy`);
    const data = await response.json();

    expect(data.data).toHaveProperty('modelPerformance');
    expect(Array.isArray(data.data.modelPerformance)).toBe(true);

    if (data.data.modelPerformance.length > 0) {
      const modelPerf = data.data.modelPerformance[0];

      // Validate structure
      expect(modelPerf).toHaveProperty('modelType');
      expect(modelPerf).toHaveProperty('overall');
      expect(modelPerf.overall).toHaveProperty('mape');
      expect(modelPerf.overall).toHaveProperty('rmse');
      expect(modelPerf.overall).toHaveProperty('mae');

      // Validate accuracy metrics are reasonable
      expect(typeof modelPerf.overall.mape).toBe('number');
      expect(modelPerf.overall.mape).toBeGreaterThanOrEqual(0);
      expect(typeof modelPerf.overall.rmse).toBe('number');
      expect(modelPerf.overall.rmse).toBeGreaterThanOrEqual(0);
      expect(typeof modelPerf.overall.mae).toBe('number');
      expect(modelPerf.overall.mae).toBeGreaterThanOrEqual(0);

      // Validate horizon-specific metrics
      expect(modelPerf).toHaveProperty('byHorizon');
      expect(Array.isArray(modelPerf.byHorizon)).toBe(true);

      if (modelPerf.byHorizon.length > 0) {
        const horizonMetric = modelPerf.byHorizon[0];
        expect(horizonMetric).toHaveProperty('horizonHours');
        expect(horizonMetric).toHaveProperty('mape');
        expect(horizonMetric).toHaveProperty('rmse');
        expect(horizonMetric).toHaveProperty('mae');
        expect(horizonMetric).toHaveProperty('sampleCount');
        expect(typeof horizonMetric.horizonHours).toBe('number');
        expect(typeof horizonMetric.sampleCount).toBe('number');
        expect(horizonMetric.sampleCount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('should provide location-specific accuracy metrics', async () => {
    const response = await fetch(`${BASE_URL}/api/forecasts/accuracy?locationId=${testLocationId}`);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.data).toHaveProperty('locationAccuracy');
    expect(Array.isArray(data.data.locationAccuracy)).toBe(true);

    if (data.data.locationAccuracy.length > 0) {
      const locationAcc = data.data.locationAccuracy[0];

      expect(locationAcc).toHaveProperty('location');
      expect(locationAcc.location).toHaveProperty('id', testLocationId);
      expect(locationAcc.location).toHaveProperty('name');

      expect(locationAcc).toHaveProperty('accuracy');
      expect(locationAcc.accuracy).toHaveProperty('mape');
      expect(locationAcc.accuracy).toHaveProperty('rmse');
      expect(locationAcc.accuracy).toHaveProperty('mae');
      expect(locationAcc.accuracy).toHaveProperty('confidence');

      expect(typeof locationAcc.accuracy.mape).toBe('number');
      expect(typeof locationAcc.accuracy.rmse).toBe('number');
      expect(typeof locationAcc.accuracy.mae).toBe('number');
      expect(typeof locationAcc.accuracy.confidence).toBe('number');

      expect(locationAcc).toHaveProperty('bestModel');
      expect(locationAcc).toHaveProperty('forecastCount');
      expect(typeof locationAcc.forecastCount).toBe('number');
    }
  });

  it('should show accuracy trends over time', async () => {
    const response = await fetch(`${BASE_URL}/api/forecasts/accuracy`);
    const data = await response.json();

    expect(data.data).toHaveProperty('trends');
    expect(Array.isArray(data.data.trends)).toBe(true);

    if (data.data.trends.length > 0) {
      const trend = data.data.trends[0];

      expect(trend).toHaveProperty('period');
      expect(trend).toHaveProperty('accuracy');
      expect(trend).toHaveProperty('mape');
      expect(trend).toHaveProperty('forecastCount');

      expect(typeof trend.period).toBe('string');
      expect(typeof trend.accuracy).toBe('number');
      expect(typeof trend.mape).toBe('number');
      expect(typeof trend.forecastCount).toBe('number');

      expect(trend.accuracy).toBeGreaterThanOrEqual(0);
      expect(trend.accuracy).toBeLessThanOrEqual(100);
      expect(trend.mape).toBeGreaterThanOrEqual(0);
      expect(trend.forecastCount).toBeGreaterThanOrEqual(0);
    }
  });

  it('should filter accuracy by date range', async () => {
    const startDate = '2024-01-01T00:00:00.000Z';
    const endDate = '2024-12-31T23:59:59.999Z';

    const response = await fetch(
      `${BASE_URL}/api/forecasts/accuracy?startDate=${startDate}&endDate=${endDate}`
    );

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.data.summary.period.start).toBe(startDate);
    expect(data.data.summary.period.end).toBe(endDate);
  });

  it('should filter accuracy by model type', async () => {
    const response = await fetch(`${BASE_URL}/api/forecasts/accuracy?modelType=ML_LSTM`);

    expect(response.status).toBe(200);

    const data = await response.json();

    // Should only return ML_LSTM model performance
    if (data.data.modelPerformance.length > 0) {
      const models = data.data.modelPerformance.map((m: any) => m.modelType);
      expect(models.every((type: string) => type === 'ML_LSTM')).toBe(true);
    }
  });

  it('should calculate accuracy metrics consistently', async () => {
    // Get accuracy metrics multiple times to ensure consistency
    const responses = await Promise.all([
      fetch(`${BASE_URL}/api/forecasts/accuracy`),
      fetch(`${BASE_URL}/api/forecasts/accuracy`),
      fetch(`${BASE_URL}/api/forecasts/accuracy`)
    ]);

    for (const response of responses) {
      expect(response.status).toBe(200);
    }

    const dataArrays = await Promise.all(responses.map(r => r.json()));

    // Compare overall accuracy across calls
    const accuracies = dataArrays.map(d => d.data.summary.overallAccuracy);
    const totalForecasts = dataArrays.map(d => d.data.summary.totalForecasts);

    // Should be identical (assuming no new forecasts generated during test)
    expect(new Set(accuracies).size).toBe(1); // All values identical
    expect(new Set(totalForecasts).size).toBe(1); // All values identical
  });

  it('should handle accuracy calculation for different time horizons', async () => {
    const response = await fetch(`${BASE_URL}/api/forecasts/accuracy`);
    const data = await response.json();

    if (data.data.modelPerformance.length > 0) {
      const modelPerf = data.data.modelPerformance[0];

      if (modelPerf.byHorizon.length > 1) {
        // Sort by horizon to validate trend
        const horizonMetrics = modelPerf.byHorizon.sort((a: any, b: any) => a.horizonHours - b.horizonHours);

        // Generally, accuracy should decrease with longer horizons (higher MAPE)
        for (let i = 1; i < horizonMetrics.length; i++) {
          const prev = horizonMetrics[i - 1];
          const curr = horizonMetrics[i];

          expect(curr.horizonHours).toBeGreaterThan(prev.horizonHours);

          // MAPE typically increases with horizon (less accuracy)
          // Note: This is a general trend but not strict rule due to weather patterns
          expect(curr.mape).toBeGreaterThanOrEqual(0);
          expect(prev.mape).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('should provide accuracy recommendations', async () => {
    const response = await fetch(`${BASE_URL}/api/forecasts/accuracy`);
    const data = await response.json();

    // Recommendations are optional but if present should be well-formed
    if (data.data.recommendations) {
      expect(data.data.recommendations).toHaveProperty('modelSuggestions');
      expect(data.data.recommendations).toHaveProperty('dataQualityIssues');
      expect(data.data.recommendations).toHaveProperty('calibrationNeeds');

      expect(Array.isArray(data.data.recommendations.modelSuggestions)).toBe(true);
      expect(Array.isArray(data.data.recommendations.dataQualityIssues)).toBe(true);
      expect(Array.isArray(data.data.recommendations.calibrationNeeds)).toBe(true);
    }
  });

  it('should handle edge cases in accuracy calculation', async () => {
    // Test with very restrictive date range
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const today = new Date().toISOString();

    const response = await fetch(
      `${BASE_URL}/api/forecasts/accuracy?startDate=${yesterday}&endDate=${today}`
    );

    expect(response.status).toBe(200);

    const data = await response.json();

    // Should handle case with no or few forecasts gracefully
    expect(data.data.summary.totalForecasts).toBeGreaterThanOrEqual(0);

    if (data.data.summary.totalForecasts === 0) {
      expect(data.data.modelPerformance).toEqual([]);
      expect(data.data.locationAccuracy).toEqual([]);
      expect(data.data.trends).toEqual([]);
    }
  });

  it('should validate accuracy metrics are mathematically sound', async () => {
    const response = await fetch(`${BASE_URL}/api/forecasts/accuracy`);
    const data = await response.json();

    if (data.data.modelPerformance.length > 0) {
      for (const modelPerf of data.data.modelPerformance) {
        const overall = modelPerf.overall;

        // MAPE should be non-negative percentage
        expect(overall.mape).toBeGreaterThanOrEqual(0);

        // RMSE should be non-negative
        expect(overall.rmse).toBeGreaterThanOrEqual(0);

        // MAE should be non-negative
        expect(overall.mae).toBeGreaterThanOrEqual(0);

        // MAE should be <= RMSE (mathematical property)
        expect(overall.mae).toBeLessThanOrEqual(overall.rmse);

        // R2 if present should be <= 1
        if (overall.r2 !== undefined && overall.r2 !== null) {
          expect(overall.r2).toBeLessThanOrEqual(1);
        }

        // Skill score if present should be reasonable
        if (overall.skillScore !== undefined && overall.skillScore !== null) {
          expect(overall.skillScore).toBeGreaterThanOrEqual(-1);
          expect(overall.skillScore).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('should aggregate accuracy across multiple forecasts correctly', async () => {
    // Generate multiple forecasts to test aggregation
    const newForecastIds: string[] = [];

    try {
      for (let i = 0; i < 3; i++) {
        const generateResponse = await fetch(`${BASE_URL}/api/forecasts/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            locationId: testLocationId,
            horizonHours: 24,
            modelType: 'ML_LSTM',
            resolution: 'HOURLY',
            description: `Aggregation test ${i}`,
            forceRegenerate: true
          })
        });

        if (generateResponse.status === 201) {
          const generateData = await generateResponse.json();
          newForecastIds.push(generateData.data.id);
        }
      }

      // Wait a bit for forecasts to potentially complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get accuracy for the test location
      const response = await fetch(`${BASE_URL}/api/forecasts/accuracy?locationId=${testLocationId}`);
      expect(response.status).toBe(200);

      const data = await response.json();

      if (data.data.locationAccuracy.length > 0) {
        const locationAcc = data.data.locationAccuracy.find((la: any) => la.location.id === testLocationId);

        if (locationAcc) {
          // Should have at least the forecasts we generated
          expect(locationAcc.forecastCount).toBeGreaterThanOrEqual(newForecastIds.length);
        }
      }

    } finally {
      // Clean up
      for (const id of newForecastIds) {
        await fetch(`${BASE_URL}/api/forecasts/${id}`, {
          method: 'DELETE'
        });
      }
    }
  });
});