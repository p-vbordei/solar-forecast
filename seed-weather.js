// Quick weather data seeding to fix the infinite loop issue
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function main() {
  console.log('🌱 Seeding weather data to fix infinite loop...');

  // Get existing locations
  const locations = await db.location.findMany();
  console.log(`Found ${locations.length} locations`);

  if (locations.length === 0) {
    console.log('❌ No locations found. Please run the main seed first.');
    return;
  }

  // Generate weather data for the past 24 hours and next 24 hours
  const weatherData = [];
  const now = new Date();

  for (const location of locations.slice(0, 3)) { // Only first 3 locations
    for (let hour = -24; hour <= 24; hour++) {
      const timestamp = new Date(now);
      timestamp.setHours(now.getHours() + hour, 0, 0, 0);

      // Generate realistic weather patterns
      const sunAngle = Math.max(0, Math.sin((timestamp.getHours() - 6) * Math.PI / 12));

      weatherData.push({
        timestamp,
        locationId: location.id,
        temperature: 15 + sunAngle * 15 + Math.random() * 3 - 1.5, // 15°C base + solar heating
        humidity: 60 + Math.sin(hour * 0.3) * 20 + Math.random() * 10,
        windSpeed: 3 + Math.random() * 8,
        cloudCover: 20 + Math.random() * 40,
        ghi: Math.max(0, sunAngle * 800 + Math.random() * 100), // Global Horizontal Irradiance
        dni: Math.max(0, sunAngle * 600 + Math.random() * 80),  // Direct Normal Irradiance
        dhi: Math.max(0, sunAngle * 200 + Math.random() * 50),  // Diffuse Horizontal Irradiance
        source: 'seed-script',
        dataQuality: 'GOOD'
      });
    }
  }

  // Insert weather data in batches
  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < weatherData.length; i += batchSize) {
    const batch = weatherData.slice(i, i + batchSize);
    try {
      const result = await db.weatherData.createMany({
        data: batch,
        skipDuplicates: true
      });
      inserted += result.count;
    } catch (error) {
      console.error('Error inserting batch:', error);
    }
  }

  console.log(`✅ Inserted ${inserted} weather data records`);
  console.log('✅ Weather data seeding complete!');
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());