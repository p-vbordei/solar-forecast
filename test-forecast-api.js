#!/usr/bin/env node

/**
 * Test script for forecast API endpoints
 * Run with: node test-forecast-api.js
 */

const BASE_URL = 'http://localhost:5173/api';

// Test colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

// Helper function to make requests
async function testEndpoint(name, url, options = {}) {
  console.log(`\n${colors.yellow}Testing: ${name}${colors.reset}`);
  console.log(`URL: ${url}`);

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (response.ok) {
      console.log(`${colors.green}✓ Success (${response.status})${colors.reset}`);
      console.log('Response:', JSON.stringify(data, null, 2).substring(0, 200) + '...');
    } else {
      console.log(`${colors.red}✗ Failed (${response.status})${colors.reset}`);
      console.log('Error:', data);
    }

    return { success: response.ok, data };
  } catch (error) {
    console.log(`${colors.red}✗ Network Error${colors.reset}`);
    console.log('Error:', error.message);
    return { success: false, error };
  }
}

// Main test function
async function runTests() {
  console.log(`${colors.yellow}=== FORECAST API TESTS ===${colors.reset}`);

  // Use a valid GUID for testing
  const testLocationId = '123e4567-e89b-12d3-a456-426614174000';

  // Test 1: Get forecast data
  await testEndpoint(
    'GET Forecast Data',
    `${BASE_URL}/forecasts?location_id=${testLocationId}&interval=hourly`
  );

  // Test 2: Generate forecast
  await testEndpoint(
    'Generate Forecast',
    `${BASE_URL}/forecasts/generate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locationId: testLocationId,
        horizonHours: 24,
        modelType: 'lstm',
        resolution: 'hourly'
      })
    }
  );

  // Test 3: Get accuracy metrics
  await testEndpoint(
    'Get Accuracy Metrics',
    `${BASE_URL}/forecasts/accuracy?location_id=${testLocationId}`
  );

  // Test 4: Get statistics
  await testEndpoint(
    'Get Forecast Statistics',
    `${BASE_URL}/forecasts/statistics?location_id=${testLocationId}&days=30`
  );

  // Test 5: Export CSV
  await testEndpoint(
    'Export Forecast (CSV)',
    `${BASE_URL}/forecasts/export?location_id=${testLocationId}&interval=hourly&format=csv`
  );

  // Test 6: Export Excel
  console.log(`\n${colors.yellow}Testing: Export Forecast (Excel)${colors.reset}`);
  const excelUrl = `${BASE_URL}/forecasts/export?location_id=${testLocationId}&interval=hourly&format=excel`;
  console.log(`URL: ${excelUrl}`);

  try {
    const response = await fetch(excelUrl);

    if (response.ok) {
      const contentType = response.headers.get('content-type');
      const contentDisposition = response.headers.get('content-disposition');

      console.log(`${colors.green}✓ Success (${response.status})${colors.reset}`);
      console.log('Content-Type:', contentType);
      console.log('Content-Disposition:', contentDisposition);
      console.log('File size:', response.headers.get('content-length') || 'Unknown');
    } else {
      console.log(`${colors.red}✗ Failed (${response.status})${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}✗ Network Error${colors.reset}`);
    console.log('Error:', error.message);
  }

  console.log(`\n${colors.yellow}=== TESTS COMPLETE ===${colors.reset}\n`);
}

// Run tests
runTests().catch(console.error);