#!/bin/bash

# Setup TimescaleDB Integration for Railway
# Environment: timescale-integration

echo "🚀 Setting up TimescaleDB integration environment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI is not installed${NC}"
    echo "Please install Railway CLI: npm install -g @railway/cli"
    exit 1
fi

# Check if logged in
railway whoami &> /dev/null
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Not logged in to Railway${NC}"
    echo "Please run: railway login"
    exit 1
fi

echo -e "${GREEN}✅ Railway CLI ready${NC}"

# Set environment to timescale-integration
export RAILWAY_ENV="timescale-integration"

# Get project info
echo -e "${YELLOW}📋 Current Railway status:${NC}"
railway status

# Database connection instructions
echo -e "${YELLOW}📌 Manual Steps Required in Railway Dashboard:${NC}"
echo ""
echo "1. Go to: https://railway.app/dashboard"
echo "2. Select your project: solar-forecast"
echo "3. Switch to environment: timescale-integration"
echo "4. Click '+ New' → 'Database' → 'Add PostgreSQL'"
echo "5. Wait for PostgreSQL to deploy"
echo "6. Click on the PostgreSQL service"
echo "7. Go to 'Connect' tab and copy DATABASE_URL"
echo ""
echo -e "${YELLOW}Once PostgreSQL is added, continue with these steps:${NC}"
echo ""
echo "8. Set environment variables:"
echo "   railway variables set DATABASE_URL='<your-database-url>'"
echo "   railway variables set DIRECT_URL='<your-database-url>'"
echo ""
echo "9. Run database migration:"
echo "   npx prisma db push"
echo ""
echo "10. Initialize TimescaleDB:"
echo "   railway run --service=postgres psql \$DATABASE_URL < init.sql"
echo ""
echo "11. Deploy the application:"
echo "   railway up"
echo ""
echo -e "${GREEN}🎯 Your TimescaleDB environment URL will be:${NC}"
echo "https://solar-forecast-timescale-timescale-integration.up.railway.app"
