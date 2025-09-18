import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addWeatherData() {
  console.log('Adding weather data for test locations...');

  // Get all locations
  const locations = await prisma.location.findMany();

  for (const location of locations) {
    console.log(`Adding weather data for ${location.name}`);

    // Generate weather data for the last 30 days and next 7 days
    const weatherData = [];
    const now = new Date();

    for (let i = -30 * 24; i <= 7 * 24; i++) {
      const timestamp = new Date(now.getTime() + i * 60 * 60 * 1000);
      const hour = timestamp.getHours();

      // Simulate realistic solar irradiance pattern
      let ghi = 0;
      let dni = 0;
      let dhi = 0;

      if (hour >= 6 && hour <= 18) {
        const solarHour = hour - 12;
        const solarIntensity = Math.max(0, 1 - Math.abs(solarHour) / 6);

        ghi = solarIntensity * 800 + Math.random() * 100;
        dni = solarIntensity * 700 + Math.random() * 100;
        dhi = solarIntensity * 100 + Math.random() * 20;
      }

      weatherData.push({
        locationId: location.id,
        timestamp,
        temperature: 20 + Math.sin(hour * Math.PI / 12) * 10 + Math.random() * 2,
        humidity: 50 + Math.random() * 30,
        windSpeed: 3 + Math.random() * 5,
        cloudCover: Math.random() * 30,
        ghi,
        dni,
        dhi,
        source: 'SEED_DATA',
        dataQuality: 'GOOD'
      });
    }

    // Bulk insert weather data
    await prisma.weatherData.createMany({
      data: weatherData,
      skipDuplicates: true
    });

    console.log(`Added ${weatherData.length} weather records for ${location.name}`);
  }

  // Also add some historical production data for ML model training
  for (const location of locations) {
    console.log(`Adding production data for ${location.name}`);

    const productionData = [];
    const now = new Date();

    for (let i = -30 * 24 * 4; i <= 0; i++) { // 15-minute intervals for 30 days
      const timestamp = new Date(now.getTime() + i * 15 * 60 * 1000);
      const hour = timestamp.getHours();

      // Simulate realistic production pattern
      let powerMW = 0;

      if (hour >= 6 && hour <= 18) {
        const solarHour = hour - 12;
        const solarIntensity = Math.max(0, 1 - Math.abs(solarHour) / 6);

        // Base production on capacity
        powerMW = location.capacityMW * solarIntensity * (0.8 + Math.random() * 0.2);
      }

      if (powerMW > 0) {
        productionData.push({
          locationId: location.id,
          timestamp,
          powerMW,
          capacityFactor: powerMW / location.capacityMW,
          availability: 0.95 + Math.random() * 0.05
        });
      }
    }

    // Bulk insert production data
    await prisma.production.createMany({
      data: productionData,
      skipDuplicates: true
    });

    console.log(`Added ${productionData.length} production records for ${location.name}`);
  }

  console.log('Weather and production data added successfully!');
}

addWeatherData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());