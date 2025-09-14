import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function seedLocations() {
  console.log('Seeding locations...');

  const locations = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      code: 'SFA-BUC-001',
      name: 'Solar Farm Alpha - Bucharest',
      address: 'Bucharest, Romania',
      latitude: 44.4268,
      longitude: 26.1025,
      capacityMW: 100.0,
      status: 'ACTIVE',
      clientId: 1
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      code: 'SSB-CLJ-002',
      name: 'Solar Station Beta - Cluj',
      address: 'Cluj-Napoca, Romania',
      latitude: 46.7712,
      longitude: 23.6236,
      capacityMW: 75.0,
      status: 'ACTIVE',
      clientId: 1
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      code: 'GEP-TIM-003',
      name: 'Green Energy Park - Timisoara',
      address: 'Timisoara, Romania',
      latitude: 45.7489,
      longitude: 21.2087,
      capacityMW: 120.0,
      status: 'ACTIVE',
      clientId: 1
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440004',
      code: 'CSA-CON-004',
      name: 'Coastal Solar Array - Constanta',
      address: 'Constanta, Romania',
      latitude: 44.1598,
      longitude: 28.6348,
      capacityMW: 90.0,
      status: 'ACTIVE',
      clientId: 1
    }
  ];

  try {
    // Create locations
    for (const location of locations) {
      await db.location.upsert({
        where: { id: location.id },
        update: location,
        create: location
      });
      console.log(`Created/Updated location: ${location.name}`);
    }

    console.log('Locations seeded successfully!');
  } catch (error) {
    console.error('Error seeding locations:', error);
  } finally {
    await db.$disconnect();
  }
}

seedLocations();