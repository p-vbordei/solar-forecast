#!/bin/bash

# Complete TimescaleDB Setup Script for Railway
# This script automates the setup process for TimescaleDB integration

set -e  # Exit on error

echo "🚀 TimescaleDB Integration Setup for Railway"
echo "============================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Function to check command availability
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 is not installed${NC}"
        echo "Please install $1 and try again"
        exit 1
    fi
}

# Check prerequisites
echo -e "${BLUE}📋 Checking prerequisites...${NC}"
check_command railway
check_command npm
check_command python3

# Check Railway login
railway whoami &> /dev/null
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}🔑 Please login to Railway${NC}"
    railway login
fi

# Set environment
export RAILWAY_ENV="timescale-integration"

# Show current status
echo -e "${BLUE}📊 Current Railway Configuration:${NC}"
railway status

echo ""
echo -e "${GREEN}✅ Prerequisites checked${NC}"
echo ""

# Instructions for manual steps
echo -e "${YELLOW}📝 MANUAL STEPS REQUIRED:${NC}"
echo ""
echo "Please complete these steps in the Railway Dashboard:"
echo ""
echo "1. Go to: https://railway.app/dashboard"
echo "2. Select project: solar-forecast"
echo "3. Switch to environment: timescale-integration"
echo "4. If PostgreSQL service doesn't exist:"
echo "   - Click '+ New' → 'Database' → 'Add PostgreSQL'"
echo "   - Wait for deployment (~1 minute)"
echo "5. Click on the PostgreSQL service"
echo "6. Go to 'Connect' tab"
echo "7. Copy the DATABASE_URL value"
echo ""
echo -e "${YELLOW}Press Enter after completing the above steps...${NC}"
read -p ""

# Get DATABASE_URL from user
echo -e "${BLUE}Please paste the DATABASE_URL (it starts with postgresql://):${NC}"
read -p "DATABASE_URL: " DATABASE_URL

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL cannot be empty${NC}"
    exit 1
fi

# Set environment variables
echo -e "${BLUE}🔧 Setting environment variables...${NC}"
railway variables set DATABASE_URL="$DATABASE_URL"
railway variables set DIRECT_URL="$DATABASE_URL"

echo -e "${GREEN}✅ Environment variables set${NC}"

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

# Run Prisma migrations
echo -e "${BLUE}🗄️ Running database migrations...${NC}"
npx prisma db push

# Setup TimescaleDB
echo -e "${BLUE}📊 Setting up TimescaleDB...${NC}"
railway run python3 setup_timescaledb.py

# Deploy application
echo -e "${BLUE}🚀 Deploying application...${NC}"
railway up

echo ""
echo -e "${GREEN}🎉 SETUP COMPLETE!${NC}"
echo ""
echo "Your application is now available at:"
echo -e "${BLUE}https://solar-forecast-timescale-timescale-integration.up.railway.app${NC}"
echo ""
echo "Next steps:"
echo "1. Check deployment logs: railway logs"
echo "2. Test the application: curl https://solar-forecast-timescale-timescale-integration.up.railway.app/health"
echo "3. Monitor performance improvements in your dashboard"
echo ""
echo -e "${GREEN}✨ TimescaleDB is now active and optimizing your time-series data!${NC}"
