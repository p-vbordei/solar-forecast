#!/bin/sh
# Railway deployment start script

echo "Starting deployment process..."

# Setup database schema (for development databases without migration files)
echo "Setting up database schema..."
npx prisma db push --accept-data-loss

# Start the application
echo "Starting the application..."
node build/index.js
