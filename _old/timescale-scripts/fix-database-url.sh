#!/bin/bash

echo "🚀 Railway TimescaleDB Setup - Fix Database URL"
echo "============================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

cd /Users/vladbordei/Documents/Development/solar

# Check current status
echo -e "${BLUE}📊 Current Configuration:${NC}"
railway status

echo ""
echo -e "${YELLOW}⚠️  DATABASE_URL is not properly configured${NC}"
echo ""
echo -e "${RED}📝 URGENT: Manual Steps Required${NC}"
echo ""
echo "1. Go to: https://railway.app/dashboard"
echo "2. Find your project: solar-forecast"
echo "3. Switch to environment: timescale-integration"
echo ""
echo -e "${YELLOW}Option A: Add PostgreSQL Service (Recommended)${NC}"
echo "4. Click '+ New' → 'Database' → 'Add PostgreSQL'"
echo "5. Wait for deployment (1-2 minutes)"
echo "6. Click on the new PostgreSQL service"
echo "7. Go to 'Connect' tab"
echo "8. Copy the full DATABASE_URL"
echo ""
echo -e "${YELLOW}Option B: Use existing Postgres service${NC}"
echo "4. Click on 'Postgres' service (if exists)"
echo "5. Go to 'Variables' tab"
echo "6. Copy DATABASE_URL value"
echo ""
echo "Once you have the DATABASE_URL, run:"
echo -e "${GREEN}railway variables set DATABASE_URL='<paste-url-here>'${NC}"
echo -e "${GREEN}railway variables set DIRECT_URL='<paste-url-here>'${NC}"
echo ""
echo "Then deploy again with:"
echo -e "${GREEN}railway up${NC}"
