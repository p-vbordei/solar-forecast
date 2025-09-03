#!/bin/sh
# Railway deployment start script

echo "Starting deployment process..."

# Setup database schema
echo "Setting up database schema..."

# Try migration first (production approach)
echo "Checking for migrations..."
if npx prisma migrate status 2>/dev/null | grep -q "No migrations found"; then
    echo "No migrations found, using db push for schema setup..."
    npx prisma db push --accept-data-loss --force-reset
else
    echo "Applying migrations..."
    npx prisma migrate deploy
fi

# Generate Prisma client to ensure it's up to date
echo "Generating Prisma client..."
npx prisma generate

# Start the application
echo "Starting the application..."
exec node build/index.js
