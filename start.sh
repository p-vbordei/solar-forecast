#!/bin/sh
# Railway deployment start script

echo "Starting deployment process..."

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Start the application
echo "Starting the application..."
node build/index.js
