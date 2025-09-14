import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * Integration test for TimescaleDB bulk insert operations with forecast data
 * This test MUST FAIL until TimescaleDB integration is implemented
 */
describe('TimescaleDB Bulk Insert Integration Test', () => {
  const BASE_URL = 'http://localhost:5173';

  let testLocationId: string;
  let testForecastId: string;

  beforeAll(async () => {
    // Get a test location ID
    const locationsResponse = await fetch(`${BASE_URL}/api/locations?limit=1`);
    expect(locationsResponse.status).toBe(200);

    const locationsData = await locationsResponse.json();
    testLocationId = locationsData.data.locations[0].id;

    // Generate a test forecast
    const generateResponse = await fetch(`${BASE_URL}/api/forecasts/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        locationId: testLocationId,
        horizonHours: 72,
        modelType: 'ML_LSTM',
        resolution: 'FIFTEEN_MINUTES',
        description: 'Bulk insert test forecast',
        forceRegenerate: true
      })
    });

    if (generateResponse.status === 201) {
      const generateData = await generateResponse.json();
      testForecastId = generateData.data.id;
    }
  });

  afterAll(async () => {
    // Clean up test forecast
    if (testForecastId) {
      await fetch(`${BASE_URL}/api/forecasts/${testForecastId}`, {
        method: 'DELETE'
      });
    }
  });

  it('should handle large volume forecast data insertion', async () => {
    // Test bulk insert of forecast data (simulated by generating forecast with high resolution)
    expect(testForecastId).toBeDefined();

    // Wait for forecast to complete processing
    let forecastCompleted = false;
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds timeout for 72h forecast

    while (!forecastCompleted && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;

      const statusResponse = await fetch(`${BASE_URL}/api/forecasts/${testForecastId}`);
      expect(statusResponse.status).toBe(200);

      const statusData = await statusResponse.json();
      if (statusData.data.status === 'completed') {
        forecastCompleted = true;
      } else if (statusData.data.status === 'failed') {
        throw new Error(`Forecast generation failed: ${statusData.data.message}`);
      }
    }

    expect(forecastCompleted).toBe(true);

    // Retrieve forecast with full data
    const detailResponse = await fetch(`${BASE_URL}/api/forecasts/${testForecastId}?includeData=true`);
    expect(detailResponse.status).toBe(200);

    const detailData = await detailResponse.json();
    expect(detailData.data).toHaveProperty('data');

    if (detailData.data.data && detailData.data.data.length > 0) {
      const dataPoints = detailData.data.data;

      // With 15-minute resolution and 72-hour horizon, we should have ~288 data points
      const expectedPoints = (72 * 60) / 15; // 72 hours * 60 minutes / 15 minute intervals
      expect(dataPoints.length).toBeGreaterThan(expectedPoints * 0.9); // Allow 10% margin

      // Verify data point structure and ordering
      for (let i = 0; i < Math.min(10, dataPoints.length); i++) {
        const point = dataPoints[i];
        expect(point).toHaveProperty('timestamp');
        expect(point).toHaveProperty('powerMW');
        expect(typeof point.powerMW).toBe('number');
        expect(new Date(point.timestamp)).toBeInstanceOf(Date);

        // Verify chronological ordering
        if (i > 0) {
          const prevTime = new Date(dataPoints[i - 1].timestamp).getTime();
          const currTime = new Date(point.timestamp).getTime();
          expect(currTime).toBeGreaterThan(prevTime);
        }
      }
    }
  });

  it('should optimize TimescaleDB queries for large datasets', async () => {
    // Test query performance on large forecast dataset
    const startTime = Date.now();

    // Query forecasts for location with potential large data
    const response = await fetch(`${BASE_URL}/api/forecasts?locationId=${testLocationId}&includeData=true&limit=5`);

    const endTime = Date.now();
    const queryTime = endTime - startTime;

    expect(response.status).toBe(200);

    // Query should complete within reasonable time (< 2 seconds)
    expect(queryTime).toBeLessThan(2000);

    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it('should handle concurrent bulk insertions', async () => {
    // Generate multiple forecasts concurrently to test bulk insert concurrency
    const concurrentForecastIds: string[] = [];

    const promises = [];
    for (let i = 0; i < 3; i++) {
      const promise = fetch(`${BASE_URL}/api/forecasts/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          locationId: testLocationId,
          horizonHours: 24,
          modelType: 'ML_XGBOOST',
          resolution: 'FIFTEEN_MINUTES',
          description: `Concurrent bulk test ${i}`,
          forceRegenerate: true
        })
      }).then(async (response) => {
        if (response.status === 201) {
          const data = await response.json();
          concurrentForecastIds.push(data.data.id);
        }
        return response;
      });

      promises.push(promise);
    }

    try {
      // Wait for all concurrent generations to start
      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Verify all forecasts were created with unique IDs
      expect(concurrentForecastIds.length).toBe(3);
      expect(new Set(concurrentForecastIds).size).toBe(3);

    } finally {
      // Clean up concurrent forecasts
      for (const id of concurrentForecastIds) {
        await fetch(`${BASE_URL}/api/forecasts/${id}`, {
          method: 'DELETE'
        });
      }
    }
  });

  it('should validate data integrity after bulk operations', async () => {
    // Generate a forecast and validate data integrity
    const generateResponse = await fetch(`${BASE_URL}/api/forecasts/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        locationId: testLocationId,
        horizonHours: 24,
        modelType: 'ML_RANDOMFOREST',
        resolution: 'THIRTY_MINUTES',
        description: 'Data integrity test',
        forceRegenerate: true
      })
    });

    expect(generateResponse.status).toBe(201);
    const generateData = await generateResponse.json();
    const forecastId = generateData.data.id;

    try {
      // Wait for completion
      let completed = false;
      for (let i = 0; i < 30 && !completed; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const statusResponse = await fetch(`${BASE_URL}/api/forecasts/${forecastId}`);
        const statusData = await statusResponse.json();

        if (statusData.data.status === 'completed') {
          completed = true;
        }
      }

      if (completed) {
        // Verify data integrity
        const detailResponse = await fetch(`${BASE_URL}/api/forecasts/${forecastId}?includeData=true`);
        const detailData = await detailResponse.json();

        if (detailData.data.data && detailData.data.data.length > 0) {
          const dataPoints = detailData.data.data;

          // Validate each data point
          for (const point of dataPoints) {
            // Power should be non-negative
            expect(point.powerMW).toBeGreaterThanOrEqual(0);

            // Energy should be reasonable relative to power
            if (point.energyMWh !== undefined && point.energyMWh !== null) {
              expect(point.energyMWh).toBeGreaterThanOrEqual(0);
            }

            // Capacity factor should be between 0 and 1
            if (point.capacityFactor !== undefined && point.capacityFactor !== null) {
              expect(point.capacityFactor).toBeGreaterThanOrEqual(0);
              expect(point.capacityFactor).toBeLessThanOrEqual(1);
            }

            // Confidence intervals should be ordered
            if (point.confidence && point.confidence.q10 && point.confidence.q90) {
              expect(point.confidence.q10).toBeLessThanOrEqual(point.powerMW);
              expect(point.powerMW).toBeLessThanOrEqual(point.confidence.q90);
            }
          }

          // Validate time series continuity
          for (let i = 1; i < dataPoints.length; i++) {
            const prevTime = new Date(dataPoints[i - 1].timestamp).getTime();
            const currTime = new Date(dataPoints[i].timestamp).getTime();
            const timeDiff = currTime - prevTime;

            // 30-minute intervals = 30 * 60 * 1000 milliseconds
            const expectedInterval = 30 * 60 * 1000;
            expect(Math.abs(timeDiff - expectedInterval)).toBeLessThan(60000); // Allow 1 minute tolerance
          }
        }
      }

    } finally {
      // Clean up
      await fetch(`${BASE_URL}/api/forecasts/${forecastId}`, {
        method: 'DELETE'
      });
    }
  });

  it('should handle TimescaleDB hypertable partitioning correctly', async () => {
    // Test that data is correctly partitioned by time in TimescaleDB
    // This test verifies the data is stored efficiently across time chunks

    // Generate forecasts across different time periods
    const timeOffsets = [0, 24 * 60 * 60 * 1000, 48 * 60 * 60 * 1000]; // Now, +1 day, +2 days
    const partitionTestIds: string[] = [];

    try {
      for (const offset of timeOffsets) {
        const startTime = new Date(Date.now() + offset).toISOString();

        const response = await fetch(`${BASE_URL}/api/forecasts/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            locationId: testLocationId,
            horizonHours: 12,
            modelType: 'ML_LSTM',
            resolution: 'HOURLY',
            startTime: startTime,
            description: `Partition test - offset ${offset}`,
            forceRegenerate: true
          })
        });

        if (response.status === 201) {
          const data = await response.json();
          partitionTestIds.push(data.data.id);
        }
      }

      // Verify all forecasts were created successfully
      expect(partitionTestIds.length).toBe(timeOffsets.length);

      // Query forecasts to ensure they can be retrieved efficiently
      for (const id of partitionTestIds) {
        const response = await fetch(`${BASE_URL}/api/forecasts/${id}`);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.id).toBe(id);
      }

    } finally {
      // Clean up partition test forecasts
      for (const id of partitionTestIds) {
        await fetch(`${BASE_URL}/api/forecasts/${id}`, {
          method: 'DELETE'
        });
      }
    }
  });

  it('should handle error recovery in bulk operations', async () => {
    // Test error recovery when bulk insert encounters issues

    // Generate a forecast that might encounter processing errors
    const response = await fetch(`${BASE_URL}/api/forecasts/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        locationId: testLocationId,
        horizonHours: 168, // Very long horizon to potentially trigger timeout
        modelType: 'ML_LSTM',
        resolution: 'FIFTEEN_MINUTES',
        description: 'Error recovery test - long horizon',
        forceRegenerate: true
      })
    });

    // Should at least accept the request
    expect([201, 400, 409]).toContain(response.status);

    if (response.status === 201) {
      const data = await response.json();
      const forecastId = data.data.id;

      try {
        // Monitor for timeout or error
        let finalStatus = null;
        for (let i = 0; i < 60; i++) { // 60 second timeout
          await new Promise(resolve => setTimeout(resolve, 1000));

          const statusResponse = await fetch(`${BASE_URL}/api/forecasts/${forecastId}`);
          const statusData = await statusResponse.json();

          if (statusData.data.status === 'completed' || statusData.data.status === 'failed') {
            finalStatus = statusData.data.status;
            break;
          }
        }

        // Should either complete or fail gracefully (not hang indefinitely)
        expect(['completed', 'failed']).toContain(finalStatus);

        if (finalStatus === 'failed') {
          // Verify error message is provided
          const errorResponse = await fetch(`${BASE_URL}/api/forecasts/${forecastId}`);
          const errorData = await errorResponse.json();
          expect(errorData.data.message).toBeDefined();
        }

      } finally {
        // Clean up
        await fetch(`${BASE_URL}/api/forecasts/${forecastId}`, {
          method: 'DELETE'
        });
      }
    }
  });

  it('should maintain performance with increasing data volume', async () => {
    // Test that performance remains acceptable as forecast data volume grows

    const performanceTestIds: string[] = [];

    try {
      // Generate multiple forecasts to increase data volume
      for (let i = 0; i < 5; i++) {
        const response = await fetch(`${BASE_URL}/api/forecasts/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            locationId: testLocationId,
            horizonHours: 24,
            modelType: 'ML_XGBOOST',
            resolution: 'FIFTEEN_MINUTES',
            description: `Performance test ${i}`,
            forceRegenerate: true
          })
        });

        if (response.status === 201) {
          const data = await response.json();
          performanceTestIds.push(data.data.id);
        }
      }

      // Test query performance after data growth
      const queryStartTime = Date.now();

      const listResponse = await fetch(`${BASE_URL}/api/forecasts?locationId=${testLocationId}&limit=20`);

      const queryEndTime = Date.now();
      const queryDuration = queryEndTime - queryStartTime;

      expect(listResponse.status).toBe(200);

      // Query should complete within 5 seconds even with increased data
      expect(queryDuration).toBeLessThan(5000);

      const listData = await listResponse.json();
      expect(listData.success).toBe(true);

      // Should return forecasts efficiently
      expect(Array.isArray(listData.data.forecasts)).toBe(true);

    } finally {
      // Clean up performance test forecasts
      for (const id of performanceTestIds) {
        await fetch(`${BASE_URL}/api/forecasts/${id}`, {
          method: 'DELETE'
        });
      }
    }
  });
});