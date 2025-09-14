import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create clients
  const client1 = await prisma.client.upsert({
    where: { code: 'SOLAR-001' },
    update: {},
    create: {
      name: 'Green Energy Corp',
      code: 'SOLAR-001',
      contactEmail: 'contact@greenenergy.com',
      contactPhone: '+40 21 123 4567',
      address: 'Bucharest, Romania',
      isActive: true
    }
  });

  const client2 = await prisma.client.upsert({
    where: { code: 'SOLAR-002' },
    update: {},
    create: {
      name: 'Renewable Power Systems',
      code: 'SOLAR-002',
      contactEmail: 'info@renewablepower.com',
      contactPhone: '+40 21 987 6543',
      address: 'Cluj-Napoca, Romania',
      isActive: true
    }
  });

  console.log('✅ Clients created');

  // Create locations
  const locations = [
    {
      clientId: client1.id,
      name: 'Solar Farm Alpha',
      code: 'LOC-001',
      latitude: 44.4268,
      longitude: 26.1025,
      timezone: 'Europe/Bucharest',
      altitude: 85,
      capacityMW: 25.5,
      panelCount: 50000,
      panelType: 'Monocrystalline Silicon',
      inverterType: 'Central Inverter',
      installationDate: new Date('2022-01-15'),
      commissioningDate: new Date('2022-03-01'),
      status: 'ACTIVE' as const,
      lastMaintenance: new Date('2024-10-15'),
      nextMaintenance: new Date('2025-01-15')
    },
    {
      clientId: client1.id,
      name: 'Solar Station Beta',
      code: 'LOC-002',
      latitude: 45.6578,
      longitude: 25.6012,
      timezone: 'Europe/Bucharest',
      altitude: 120,
      capacityMW: 18.3,
      panelCount: 35000,
      panelType: 'Polycrystalline Silicon',
      inverterType: 'String Inverter',
      installationDate: new Date('2021-06-20'),
      commissioningDate: new Date('2021-08-01'),
      status: 'ACTIVE' as const,
      lastMaintenance: new Date('2024-09-10'),
      nextMaintenance: new Date('2024-12-10')
    },
    {
      clientId: client2.id,
      name: 'Green Energy Park',
      code: 'LOC-003',
      latitude: 46.7712,
      longitude: 23.6236,
      timezone: 'Europe/Bucharest',
      altitude: 350,
      capacityMW: 42.0,
      panelCount: 80000,
      panelType: 'Bifacial Solar Panels',
      inverterType: 'Central Inverter',
      installationDate: new Date('2023-03-10'),
      commissioningDate: new Date('2023-05-01'),
      status: 'MAINTENANCE' as const,
      lastMaintenance: new Date('2024-11-01'),
      nextMaintenance: new Date('2024-11-15')
    },
    {
      clientId: client2.id,
      name: 'Coastal Solar Array',
      code: 'LOC-004',
      latitude: 44.1598,
      longitude: 28.6348,
      timezone: 'Europe/Bucharest',
      altitude: 10,
      capacityMW: 35.7,
      panelCount: 70000,
      panelType: 'Thin-Film Solar Cells',
      inverterType: 'String Inverter',
      installationDate: new Date('2023-08-15'),
      commissioningDate: new Date('2023-10-01'),
      status: 'ACTIVE' as const,
      lastMaintenance: new Date('2024-10-20'),
      nextMaintenance: new Date('2025-01-20')
    }
  ];

  for (const location of locations) {
    await prisma.location.upsert({
      where: { code: location.code },
      update: {},
      create: location
    });
  }

  console.log('✅ Locations created');

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@solarforecast.com' },
    update: {},
    create: {
      email: 'admin@solarforecast.com',
      name: 'System Administrator',
      role: 'ADMIN',
      passwordHash: '$2a$10$placeholder', // Will be replaced with proper auth
      isActive: true,
      clientId: client1.id
    }
  });

  console.log('✅ Admin user created');

  // Get created locations to reference their IDs
  const createdLocations = await prisma.location.findMany();

  // Create sample alerts
  const alerts = [
    {
      locationId: createdLocations[0]?.id,
      userId: adminUser.id,
      type: 'PRODUCTION_LOW' as const,
      severity: 'WARNING' as const,
      title: 'Low Production Detected',
      message: 'Production is 15% below expected levels at Solar Farm Alpha',
      status: 'ACTIVE' as const,
      triggeredAt: new Date(Date.now() - 1000 * 60 * 30) // 30 minutes ago
    },
    {
      locationId: createdLocations[2]?.id,
      userId: adminUser.id,
      type: 'MAINTENANCE_DUE' as const,
      severity: 'INFO' as const,
      title: 'Scheduled Maintenance',
      message: 'Green Energy Park is undergoing scheduled maintenance',
      status: 'ACKNOWLEDGED' as const,
      triggeredAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      acknowledgedAt: new Date(Date.now() - 1000 * 60 * 60) // 1 hour ago
    },
    {
      locationId: null,
      userId: adminUser.id,
      type: 'WEATHER_WARNING' as const,
      severity: 'CRITICAL' as const,
      title: 'Severe Weather Alert',
      message: 'Storm warning issued for southern region. Possible impact on production.',
      status: 'ACTIVE' as const,
      triggeredAt: new Date(Date.now() - 1000 * 60 * 5) // 5 minutes ago
    }
  ];

  for (const alert of alerts) {
    await prisma.alert.create({
      data: alert
    });
  }

  console.log('✅ Sample alerts created');

  // Create sample ML models
  const models = [
    {
      name: 'solar-forecast-lstm',
      version: '1.0.0',
      type: 'ML_LSTM' as const,
      description: 'LSTM-based solar production forecasting model',
      algorithm: 'Long Short-Term Memory (LSTM)',
      framework: 'TensorFlow',
      modelPath: '/models/lstm_v1.0.0.pkl',
      status: 'ACTIVE' as const,
      isDefault: true,
      trainDataStart: new Date('2023-01-01'),
      trainDataEnd: new Date('2024-09-30'),
      features: ['temperature', 'irradiance', 'wind_speed', 'cloud_cover'],
      targetVariable: 'power_output_mw',
      trainedBy: 'system'
    },
    {
      name: 'solar-forecast-physical',
      version: '1.0.0',
      type: 'PHYSICAL' as const,
      description: 'Physics-based solar irradiance model',
      algorithm: 'Clear Sky Model with Cloud Cover Correction',
      framework: 'Scikit-learn',
      modelPath: '/models/physical_v1.0.0.pkl',
      status: 'ACTIVE' as const,
      isDefault: false,
      features: ['ghi', 'dni', 'dhi', 'solar_zenith_angle'],
      targetVariable: 'power_output_mw',
      trainedBy: 'system'
    },
    {
      name: 'solar-forecast-hybrid',
      version: '2.0.0',
      type: 'HYBRID' as const,
      description: 'Hybrid model combining ML and physical approaches',
      algorithm: 'Ensemble (LSTM + Physical)',
      framework: 'PyTorch',
      modelPath: '/models/hybrid_v2.0.0.pkl',
      status: 'TRAINING' as const,
      isDefault: false,
      features: ['temperature', 'irradiance', 'wind_speed', 'ghi', 'dni'],
      targetVariable: 'power_output_mw',
      trainedBy: 'system'
    }
  ];

  for (const model of models) {
    await prisma.mLModel.upsert({
      where: {
        name_version: {
          name: model.name,
          version: model.version
        }
      },
      update: {},
      create: model
    });
  }

  console.log('✅ ML models registered');

  // Generate sample production data for the last 24 hours
  const now = new Date();
  const locations_db = await prisma.location.findMany();
  
  for (const location of locations_db) {
    if (location.status === 'ACTIVE') {
      const productionData = [];
      
      for (let i = 23; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000);
        const hour = time.getHours();
        
        // Simulate solar production curve
        let powerOutput = 0;
        if (hour >= 6 && hour <= 18) {
          const peakHour = 12;
          const maxOutput = location.capacityMW * 0.85; // 85% efficiency
          const hourDiff = Math.abs(hour - peakHour);
          powerOutput = maxOutput * Math.max(0, 1 - (hourDiff / 6));
          
          // Add some random variation
          powerOutput *= (0.9 + Math.random() * 0.2);
        }
        
        productionData.push({
          timestamp: time,
          time: time,
          locationId: location.id,
          powerMW: parseFloat(powerOutput.toFixed(2)),
          powerOutputMW: parseFloat(powerOutput.toFixed(2)),
          energyMWh: parseFloat((powerOutput * 1).toFixed(2)), // 1 hour
          efficiency: powerOutput > 0 ? parseFloat((powerOutput / location.capacityMW * 100).toFixed(1)) : 0,
          availability: 100,
          temperature: 20 + Math.random() * 10,
          dataQuality: 'GOOD' as const
        });
      }
      
      await prisma.production.createMany({
        data: productionData,
        skipDuplicates: true
      });
    }
  }

  console.log('✅ Sample production data generated');

  // Generate sample forecast data for the next 48 hours
  for (const location of locations_db) {
    if (location.status === 'ACTIVE') {
      const forecastData = [];
      
      for (let i = 1; i <= 48; i++) {
        const time = new Date(now.getTime() + i * 60 * 60 * 1000);
        const hour = time.getHours();
        
        // Simulate solar forecast curve
        let powerOutput = 0;
        if (hour >= 6 && hour <= 18) {
          const peakHour = 12;
          const maxOutput = location.capacityMW * 0.82; // Slightly lower for forecast
          const hourDiff = Math.abs(hour - peakHour);
          powerOutput = maxOutput * Math.max(0, 1 - (hourDiff / 6));
          
          // Add uncertainty
          powerOutput *= (0.85 + Math.random() * 0.3);
        }
        
        forecastData.push({
          timestamp: time,
          time: time,
          locationId: location.id,
          powerMW: parseFloat(powerOutput.toFixed(2)),
          powerOutputMW: parseFloat(powerOutput.toFixed(2)),
          energyMWh: parseFloat((powerOutput * 1).toFixed(2)),
          confidence: parseFloat((85 + Math.random() * 10).toFixed(1)),
          modelType: 'ML_LSTM' as const,
          modelVersion: '1.0.0',
          horizonMinutes: i * 60, // Convert hours to minutes
          resolution: 'HOURLY',
          temperature: 18 + Math.random() * 12,
          createdBy: adminUser.id
        });
      }
      
      await prisma.forecast.createMany({
        data: forecastData,
        skipDuplicates: true
      });
    }
  }

  console.log('✅ Sample forecast data generated');

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });