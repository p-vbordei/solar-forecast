// Test the forecast generation endpoint

async function testForecast() {
  console.log('Testing forecast generation...');

  const response = await fetch('http://localhost:5174/api/forecast/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      locationId: "d7468e2c-5fdd-4867-b7cf-1696a9565eee",
      horizonHours: 24,
      modelType: "ML_ENSEMBLE",
      useWeather: true
    })
  });

  const result = await response.json();

  if (result.success) {
    console.log('✅ Forecast generated successfully!');
    console.log('Forecast ID:', result.data.forecastId);
    console.log('Data points:', result.data.data?.length || 0);

    if (result.data.data && result.data.data.length > 0) {
      console.log('\nFirst 3 data points:');
      result.data.data.slice(0, 3).forEach((point, index) => {
        console.log(`${index + 1}. Time: ${point.timestamp}, Power: ${point.powerForecastMw} MW`);
      });

      // Check if all timestamps are unique
      const timestamps = result.data.data.map(d => d.timestamp);
      const uniqueTimestamps = [...new Set(timestamps)];

      if (uniqueTimestamps.length === timestamps.length) {
        console.log('✅ All timestamps are unique');
      } else {
        console.log('❌ Duplicate timestamps found!');
        console.log(`Unique: ${uniqueTimestamps.length}, Total: ${timestamps.length}`);
      }
    }

    if (result.data.metadata?.isMockData) {
      console.log('⚠️  Using mock data (Python worker not available)');
    }
  } else {
    console.log('❌ Forecast generation failed!');
    console.log('Error:', result.error);
    if (result.details) {
      // Extract just the error message, not the full stack
      const errorMsg = result.details.split('\n')[0];
      console.log('Details:', errorMsg);
    }
  }
}

testForecast().catch(console.error);