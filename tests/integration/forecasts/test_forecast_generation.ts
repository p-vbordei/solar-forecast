import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * Integration test for complete forecast generation flow
 * This test MUST FAIL until the full implementation is complete
 */
describe('Forecast Generation Integration Test', () => {
  const BASE_URL = 'http://localhost:5173';

  let testLocationId: string;
  let generatedForecastId: string;

  beforeAll(async () => {
    // Get a test location ID from the locations API
    const locationsResponse = await fetch(`${BASE_URL}/api/locations?limit=1`);
    expect(locationsResponse.status).toBe(200);

    const locationsData = await locationsResponse.json();
    expect(locationsData.success).toBe(true);
    expect(locationsData.data.locations.length).toBeGreaterThan(0);

    testLocationId = locationsData.data.locations[0].id;
    expect(testLocationId).toBeDefined();
  });

  afterAll(async () => {
    // Clean up generated forecast if it exists
    if (generatedForecastId) {
      await fetch(`${BASE_URL}/api/forecasts/${generatedForecastId}`, {
        method: 'DELETE'
      });
    }
  });

  it('should complete full forecast generation workflow', async () => {
    // Step 1: Generate forecast
    const generateRequest = {
      locationId: testLocationId,
      horizonHours: 24,
      modelType: 'ML_LSTM',
      resolution: 'FIFTEEN_MINUTES',
      description: 'Integration test forecast',
      forceRegenerate: true
    };

    const generateResponse = await fetch(`${BASE_URL}/api/forecasts/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(generateRequest)
    });

    expect(generateResponse.status).toBe(201);

    const generateData = await generateResponse.json();
    expect(generateData.success).toBe(true);
    expect(generateData.data).toHaveProperty('id');
    expect(generateData.data.status).toBe('generating');

    generatedForecastId = generateData.data.id;

    // Step 2: Wait for processing (with timeout)
    let forecastCompleted = false;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout

    while (!forecastCompleted && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      attempts++;

      const statusResponse = await fetch(`${BASE_URL}/api/forecasts/${generatedForecastId}`);
      expect(statusResponse.status).toBe(200);

      const statusData = await statusResponse.json();
      expect(statusData.success).toBe(true);

      if (statusData.data.status === 'completed') {
        forecastCompleted = true;

        // Verify forecast has data
        expect(statusData.data.quality).toBeDefined();
        expect(statusData.data.quality.confidence).toBeGreaterThan(0);

      } else if (statusData.data.status === 'failed') {
        throw new Error(`Forecast generation failed: ${statusData.data.message}`);
      }
    }

    expect(forecastCompleted).toBe(true);

    // Step 3: Retrieve detailed forecast with data
    const detailResponse = await fetch(`${BASE_URL}/api/forecasts/${generatedForecastId}?includeData=true&includeAccuracy=true`);
    expect(detailResponse.status).toBe(200);

    const detailData = await detailResponse.json();
    expect(detailData.success).toBe(true);
    expect(detailData.data).toHaveProperty('data');
    expect(Array.isArray(detailData.data.data)).toBe(true);
    expect(detailData.data.data.length).toBeGreaterThan(0);

    // Verify forecast data structure
    const firstDataPoint = detailData.data.data[0];
    expect(firstDataPoint).toHaveProperty('timestamp');
    expect(firstDataPoint).toHaveProperty('powerMW');
    expect(typeof firstDataPoint.powerMW).toBe('number');
    expect(firstDataPoint.powerMW).toBeGreaterThanOrEqual(0);

    // Step 4: Verify forecast appears in list
    const listResponse = await fetch(`${BASE_URL}/api/forecasts?locationId=${testLocationId}&limit=10`);
    expect(listResponse.status).toBe(200);

    const listData = await listResponse.json();
    expect(listData.success).toBe(true);

    const foundForecast = listData.data.forecasts.find((f: any) => f.id === generatedForecastId);
    expect(foundForecast).toBeDefined();
    expect(foundForecast.status).toBe('completed');
  });

  it('should handle forecast with different model types', async () => {
    const modelTypes = ['ML_LSTM', 'ML_XGBOOST', 'ML_RANDOMFOREST'];
    const forecastIds: string[] = [];

    try {
      for (const modelType of modelTypes) {
        const generateRequest = {
          locationId: testLocationId,
          horizonHours: 24,
          modelType: modelType,
          resolution: 'HOURLY',
          description: `Integration test - ${modelType}`,
          forceRegenerate: true
        };

        const response = await fetch(`${BASE_URL}/api/forecasts/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(generateRequest)
        });

        expect(response.status).toBe(201);

        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.metadata.modelType).toBe(modelType);

        forecastIds.push(data.data.id);
      }

      // Verify all forecasts were created with different model types
      expect(forecastIds.length).toBe(modelTypes.length);
      expect(new Set(forecastIds).size).toBe(modelTypes.length); // All unique

    } finally {
      // Clean up test forecasts
      for (const id of forecastIds) {
        await fetch(`${BASE_URL}/api/forecasts/${id}`, {
          method: 'DELETE'
        });
      }
    }
  });

  it('should handle forecast with different time horizons', async () => {
    const horizons = [24, 48, 72];
    const forecastIds: string[] = [];

    try {
      for (const horizonHours of horizons) {
        const generateRequest = {
          locationId: testLocationId,
          horizonHours: horizonHours,
          modelType: 'ML_LSTM',
          resolution: 'HOURLY',
          description: `Integration test - ${horizonHours}h horizon`,
          forceRegenerate: true
        };

        const response = await fetch(`${BASE_URL}/api/forecasts/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(generateRequest)
        });

        expect(response.status).toBe(201);

        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.metadata.horizonHours).toBe(horizonHours);

        forecastIds.push(data.data.id);
      }

    } finally {
      // Clean up test forecasts
      for (const id of forecastIds) {
        await fetch(`${BASE_URL}/api/forecasts/${id}`, {
          method: 'DELETE'
        });
      }
    }
  });

  it('should prevent duplicate forecasts without forceRegenerate', async () => {
    let firstForecastId: string;
    let secondForecastId: string;

    try {
      const generateRequest = {
        locationId: testLocationId,
        horizonHours: 24,
        modelType: 'ML_LSTM',
        resolution: 'HOURLY',
        description: 'Duplicate prevention test',
        forceRegenerate: false
      };

      // First forecast
      const firstResponse = await fetch(`${BASE_URL}/api/forecasts/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(generateRequest)
      });

      expect(firstResponse.status).toBe(201);
      const firstData = await firstResponse.json();
      firstForecastId = firstData.data.id;

      // Second identical forecast (should be rejected or return existing)
      const secondResponse = await fetch(`${BASE_URL}/api/forecasts/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(generateRequest)
      });

      // Should either return existing forecast or reject with 409
      expect([201, 409]).toContain(secondResponse.status);

      if (secondResponse.status === 201) {
        const secondData = await secondResponse.json();
        // Should return the same forecast ID (existing one)
        expect(secondData.data.id).toBe(firstForecastId);
      } else {
        const secondData = await secondResponse.json();
        expect(secondData.success).toBe(false);
        expect(secondData.error).toContain('recent forecast exists');
      }

    } finally {
      // Clean up
      if (firstForecastId) {
        await fetch(`${BASE_URL}/api/forecasts/${firstForecastId}`, {
          method: 'DELETE'
        });
      }
      if (secondForecastId && secondForecastId !== firstForecastId) {
        await fetch(`${BASE_URL}/api/forecasts/${secondForecastId}`, {
          method: 'DELETE'
        });
      }
    }
  });

  it('should handle forecast deletion workflow', async () => {
    // Generate forecast
    const generateRequest = {
      locationId: testLocationId,
      horizonHours: 24,
      modelType: 'ML_LSTM',
      resolution: 'HOURLY',
      description: 'Deletion test forecast'
    };

    const generateResponse = await fetch(`${BASE_URL}/api/forecasts/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(generateRequest)
    });

    expect(generateResponse.status).toBe(201);
    const generateData = await generateResponse.json();
    const forecastId = generateData.data.id;

    // Verify forecast exists
    const getResponse = await fetch(`${BASE_URL}/api/forecasts/${forecastId}`);
    expect(getResponse.status).toBe(200);

    // Delete forecast
    const deleteResponse = await fetch(`${BASE_URL}/api/forecasts/${forecastId}`, {
      method: 'DELETE'
    });
    expect(deleteResponse.status).toBe(200);

    // Verify forecast is deleted (soft delete)
    const getDeletedResponse = await fetch(`${BASE_URL}/api/forecasts/${forecastId}`);
    expect(getDeletedResponse.status).toBe(404);

    // Verify forecast doesn't appear in list
    const listResponse = await fetch(`${BASE_URL}/api/forecasts?locationId=${testLocationId}`);
    expect(listResponse.status).toBe(200);

    const listData = await listResponse.json();
    const foundForecast = listData.data.forecasts.find((f: any) => f.id === forecastId);
    expect(foundForecast).toBeUndefined();
  });

  it('should maintain data consistency during concurrent operations', async () => {
    const promises = [];
    const forecastIds: string[] = [];

    // Generate multiple forecasts concurrently
    for (let i = 0; i < 5; i++) {
      const promise = fetch(`${BASE_URL}/api/forecasts/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          locationId: testLocationId,
          horizonHours: 24,
          modelType: 'ML_LSTM',
          resolution: 'HOURLY',
          description: `Concurrent test ${i}`,
          forceRegenerate: true
        })
      }).then(async (response) => {
        expect(response.status).toBe(201);
        const data = await response.json();
        forecastIds.push(data.data.id);
        return data;
      });

      promises.push(promise);
    }

    try {
      // Wait for all forecasts to be created
      await Promise.all(promises);

      // Verify all forecasts have unique IDs
      expect(forecastIds.length).toBe(5);
      expect(new Set(forecastIds).size).toBe(5);

      // Verify all forecasts appear in list
      const listResponse = await fetch(`${BASE_URL}/api/forecasts?locationId=${testLocationId}&limit=10`);
      expect(listResponse.status).toBe(200);

      const listData = await listResponse.json();
      const foundForecastIds = listData.data.forecasts.map((f: any) => f.id);

      for (const id of forecastIds) {
        expect(foundForecastIds).toContain(id);
      }

    } finally {
      // Clean up all test forecasts
      for (const id of forecastIds) {
        await fetch(`${BASE_URL}/api/forecasts/${id}`, {
          method: 'DELETE'
        });
      }
    }
  });
});