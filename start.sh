#!/bin/sh
# Railway deployment start script

echo "Starting deployment process..."

# Setup database schema
echo "Setting up database schema..."

# Ensure TimescaleDB extension is enabled
echo "Enabling TimescaleDB extension..."
if [ -n "$DATABASE_URL" ]; then
    psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;" 2>/dev/null || echo "TimescaleDB extension may already exist or permissions insufficient"
fi

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

# Initialize TimescaleDB hypertables if scripts exist
echo "Setting up TimescaleDB hypertables..."
if [ -f "scripts/init-timescaledb.sql" ] && [ -n "$DATABASE_URL" ]; then
    echo "Initializing TimescaleDB hypertables..."
    psql "$DATABASE_URL" -f scripts/init-timescaledb.sql 2>/dev/null || echo "Hypertable setup may have failed or already exists"
fi

# Start the application
echo "Starting the application..."
exec node build/index.js
