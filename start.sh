#!/bin/sh
# Railway deployment start script - Simplified and robust

echo "🚀 Starting Solar Forecast Platform..."
echo "Environment: ${NODE_ENV:-development}"
echo "Database: ${DATABASE_URL:+Connected}"

# Step 1: Wait for database to be ready (with timeout)
echo "📊 Checking database connection..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if echo "SELECT 1;" | npx prisma db execute --stdin 2>/dev/null; then
        echo "✅ Database connected!"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "⏳ Waiting for database... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "❌ Database connection timeout. Starting anyway..."
fi

# Step 2: Apply Prisma schema (creates tables)
echo "📋 Setting up database schema..."
npx prisma generate 2>/dev/null || echo "⚠️  Prisma generate failed (may be OK in production)"

# Try to push schema (idempotent - won't hurt if already done)
if npx prisma db push --skip-generate 2>/dev/null; then
    echo "✅ Database schema applied!"
else
    echo "⚠️  Schema push failed - may already be applied"
fi

# Step 3: Enable TimescaleDB extension (optional but recommended)
echo "🔧 Checking TimescaleDB extension..."
if [ -n "$DATABASE_URL" ]; then
    # Try to enable TimescaleDB (will fail gracefully if not available)
    psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;" 2>/dev/null && \
        echo "✅ TimescaleDB extension enabled!" || \
        echo "⚠️  TimescaleDB extension not available (using standard PostgreSQL)"
    
    # Try to set up hypertables if script exists and TimescaleDB is enabled
    if [ -f "scripts/init-timescaledb.sql" ]; then
        echo "📊 Setting up TimescaleDB hypertables..."
        psql "$DATABASE_URL" -f scripts/init-timescaledb.sql 2>/dev/null && \
            echo "✅ TimescaleDB hypertables configured!" || \
            echo "⚠️  Hypertables setup skipped (may already exist or TimescaleDB not available)"
    fi
fi

# Step 4: Start the application
echo "🎯 Starting application server..."
echo "🌐 App will be available at port ${PORT:-3000}"

# Use exec to replace shell process with node
exec node build/index.js