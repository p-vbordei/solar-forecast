#!/usr/bin/env node

/**
 * System Integration Test Script
 * Tests the complete architecture: Database, SvelteKit API, and Python Worker
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SVELTEKIT_URL = 'http://localhost:5173';
const PYTHON_WORKER_URL = 'http://localhost:8001';

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testDatabaseConnection() {
  log('\n========== Testing Database Connection ==========', 'blue');
  
  try {
    await prisma.$connect();
    log('✅ Database connected successfully', 'green');
    
    // Test query
    const clientCount = await prisma.client.count();
    log(`✅ Can query database - Found ${clientCount} clients`, 'green');
    
    return true;
  } catch (error) {
    log(`❌ Database connection failed: ${error.message}`, 'red');
    return false;
  }
}

async function testPrismaSchema() {
  log('\n========== Testing Prisma Schema ==========', 'blue');
  
  try {
    // Test creating a client
    const testClient = await prisma.client.create({
      data: {
        name: 'Test Client',
        code: `TEST-${Date.now()}`,
        contactEmail: 'test@example.com',
        isActive: true
      }
    });
    log(`✅ Created test client: ${testClient.name}`, 'green');
    
    // Test creating a location
    const testLocation = await prisma.location.create({
      data: {
        clientId: testClient.id,
        name: 'Test Solar Farm',
        code: `LOC-${Date.now()}`,
        latitude: 45.5,
        longitude: 25.5,
        timezone: 'UTC',
        capacityMW: 10.5,
        panelCount: 2000,
        status: 'ACTIVE'
      }
    });
    log(`✅ Created test location: ${testLocation.name}`, 'green');
    
    // Test querying with relations
    const locationWithClient = await prisma.location.findUnique({
      where: { id: testLocation.id },
      include: { client: true }
    });
    log(`✅ Can query with relations: Location "${locationWithClient.name}" belongs to "${locationWithClient.client.name}"`, 'green');
    
    // Cleanup
    await prisma.location.delete({ where: { id: testLocation.id } });
    await prisma.client.delete({ where: { id: testClient.id } });
    log('✅ Test data cleaned up', 'green');
    
    return true;
  } catch (error) {
    log(`❌ Prisma schema test failed: ${error.message}`, 'red');
    return false;
  }
}

async function testPythonWorker() {
  log('\n========== Testing Python Worker ==========', 'blue');
  
  try {
    // Test health endpoint
    const healthResponse = await fetch(`${PYTHON_WORKER_URL}/health`);
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      log(`✅ Python worker is healthy: ${JSON.stringify(health)}`, 'green');
    } else {
      throw new Error(`Health check failed with status ${healthResponse.status}`);
    }
    
    // Test API docs availability
    const docsResponse = await fetch(`${PYTHON_WORKER_URL}/api/docs`);
    if (docsResponse.ok) {
      log('✅ Python worker API docs available', 'green');
    }
    
    return true;
  } catch (error) {
    log(`❌ Python worker test failed: ${error.message}`, 'red');
    log('Make sure Python worker is running: cd python-worker && uv run uvicorn app.main:app --port 8001', 'yellow');
    return false;
  }
}

async function testSvelteKitAPI() {
  log('\n========== Testing SvelteKit API Routes ==========', 'blue');
  
  try {
    // Test locations API
    const response = await fetch(`${SVELTEKIT_URL}/api/locations`);
    if (response.ok) {
      const locations = await response.json();
      log(`✅ SvelteKit API working - Retrieved ${locations.length} locations`, 'green');
    } else {
      throw new Error(`API call failed with status ${response.status}`);
    }
    
    return true;
  } catch (error) {
    log(`❌ SvelteKit API test failed: ${error.message}`, 'red');
    log('Make sure SvelteKit is running: npm run dev', 'yellow');
    return false;
  }
}

async function testCSRArchitecture() {
  log('\n========== Testing CSR Architecture ==========', 'blue');
  
  try {
    // Check if service files exist
    const fs = await import('fs');
    const path = await import('path');
    
    const files = {
      'Repository': './src/lib/server/repositories/location.repository.ts',
      'Service': './src/lib/server/services/location.service.ts',
      'Controller': './src/routes/api/locations/+server.ts',
      'Database': './src/lib/server/database.ts'
    };
    
    for (const [layer, filePath] of Object.entries(files)) {
      if (fs.existsSync(filePath)) {
        log(`✅ ${layer} layer implemented: ${filePath}`, 'green');
      } else {
        log(`⚠️  ${layer} layer missing: ${filePath}`, 'yellow');
      }
    }
    
    return true;
  } catch (error) {
    log(`❌ CSR architecture test failed: ${error.message}`, 'red');
    return false;
  }
}

async function runAllTests() {
  log('\n🚀 Starting Solar Forecast Platform System Tests', 'blue');
  log('================================================\n', 'blue');
  
  const results = {
    database: await testDatabaseConnection(),
    schema: await testPrismaSchema(),
    pythonWorker: await testPythonWorker(),
    svelteKit: await testSvelteKitAPI(),
    architecture: await testCSRArchitecture()
  };
  
  log('\n========== Test Summary ==========', 'blue');
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.values(results).length;
  
  if (passed === total) {
    log(`✅ All tests passed (${passed}/${total})`, 'green');
    log('\n🎉 System is fully operational!', 'green');
  } else {
    log(`⚠️  Some tests failed (${passed}/${total} passed)`, 'yellow');
    
    log('\nFailed tests:', 'red');
    for (const [test, result] of Object.entries(results)) {
      if (!result) {
        log(`  - ${test}`, 'red');
      }
    }
    
    log('\n📋 Next steps:', 'yellow');
    if (!results.database || !results.schema) {
      log('1. Make sure PostgreSQL is running', 'yellow');
      log('2. Run: npx prisma db push', 'yellow');
    }
    if (!results.pythonWorker) {
      log('3. Start Python worker: cd python-worker && uv run uvicorn app.main:app --port 8001', 'yellow');
    }
    if (!results.svelteKit) {
      log('4. Start SvelteKit: npm run dev', 'yellow');
    }
  }
  
  await prisma.$disconnect();
  process.exit(passed === total ? 0 : 1);
}

// Run tests
runAllTests().catch((error) => {
  log(`\n❌ Test runner failed: ${error.message}`, 'red');
  process.exit(1);
});