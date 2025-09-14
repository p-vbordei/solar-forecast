import { db } from '../src/lib/server/database';

async function initDatabase() {
  console.log('Initializing database with test data...');

  try {
    // Check if user already exists
    const existingUser = await db.user.findFirst({
      where: {
        email: 'admin@solarforecast.com'
      }
    });

    if (!existingUser) {
      // Create a test user
      const user = await db.user.create({
        data: {
          email: 'admin@solarforecast.com',
          name: 'Admin User',
          role: 'ADMIN',
          isActive: true
        }
      });

      console.log('Created test user:', user);
    } else {
      console.log('User already exists:', existingUser);
    }

    // Check if client exists
    const existingClient = await db.client.findFirst({
      where: {
        code: 'DEMO'
      }
    });

    if (!existingClient) {
      // Create a test client
      const client = await db.client.create({
        data: {
          name: 'Demo Client',
          code: 'DEMO',
          contactEmail: 'demo@solarforecast.com',
          timezone: 'UTC',
          currency: 'EUR',
          isActive: true
        }
      });

      console.log('Created test client:', client);
    } else {
      console.log('Client already exists:', existingClient);
    }

    console.log('Database initialization complete!');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await db.$disconnect();
  }
}

initDatabase();