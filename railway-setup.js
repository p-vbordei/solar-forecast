/**
 * Railway deployment setup script
 * This script runs during Railway deployment to setup TimescaleDB
 */

const { PrismaClient } = require('@prisma/client');

async function setupTimescaleDB() {
  console.log('🚀 Starting TimescaleDB setup...');
  
  const prisma = new PrismaClient();
  
  try {
    // Test database connection
    console.log('📊 Testing database connection...');
    await prisma.$queryRaw`SELECT version();`;
    console.log('✅ Database connection successful');
    
    // Enable TimescaleDB extension
    console.log('📊 Enabling TimescaleDB extension...');
    await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS timescaledb;`;
    console.log('✅ TimescaleDB extension enabled');
    
    // Push Prisma schema
    console.log('📊 Setting up database schema...');
    // This will be handled by the build process
    
    console.log('🎉 TimescaleDB setup completed successfully!');
    
  } catch (error) {
    console.error('❌ TimescaleDB setup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run setup if this script is executed directly
if (require.main === module) {
  setupTimescaleDB();
}

module.exports = { setupTimescaleDB };