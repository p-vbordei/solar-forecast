#!/bin/bash

echo "🧪 Solar Forecast Platform - Test Suite"
echo "======================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if services are running
check_service() {
    local url=$1
    local name=$2
    
    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200\|301\|302"; then
        echo -e "${GREEN}✓${NC} $name is running"
        return 0
    else
        echo -e "${RED}✗${NC} $name is not running"
        return 1
    fi
}

echo -e "\n${YELLOW}Checking services...${NC}"
SERVICES_OK=true

# Check SvelteKit
if ! check_service "http://localhost:5173" "SvelteKit Frontend"; then
    SERVICES_OK=false
fi

# Check Python Worker
if ! check_service "http://localhost:8000/health" "Python Worker"; then
    SERVICES_OK=false
fi

# Check PostgreSQL
if docker ps | grep -q "solar_postgres"; then
    echo -e "${GREEN}✓${NC} PostgreSQL is running"
else
    echo -e "${RED}✗${NC} PostgreSQL is not running"
    SERVICES_OK=false
fi

# Check Redis
if docker ps | grep -q "solar_redis"; then
    echo -e "${GREEN}✓${NC} Redis is running"
else
    echo -e "${RED}✗${NC} Redis is not running"
    SERVICES_OK=false
fi

if [ "$SERVICES_OK" = false ]; then
    echo -e "\n${RED}Some services are not running. Please run ./start.sh first.${NC}"
    exit 1
fi

echo -e "\n${GREEN}All services are running!${NC}"

# Run API tests
echo -e "\n${YELLOW}Running API tests...${NC}"

# Test locations endpoint
echo -n "Testing /api/locations... "
if curl -s http://localhost:5173/api/locations | grep -q "success"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# Test forecast endpoint
echo -n "Testing /api/forecast... "
if curl -s "http://localhost:5173/api/forecast?locationId=1" | grep -q "success"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# Test alerts endpoint
echo -n "Testing /api/alerts... "
if curl -s http://localhost:5173/api/alerts | grep -q "success"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# Test analysis endpoint
echo -n "Testing /api/analysis... "
if curl -s "http://localhost:5173/api/analysis?locationId=1" | grep -q "success"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# Test Python worker health
echo -n "Testing Python worker /health... "
if curl -s http://localhost:8000/health | grep -q "healthy"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# Run Playwright tests if available
if command -v npx &> /dev/null; then
    echo -e "\n${YELLOW}Running Playwright E2E tests...${NC}"
    
    # Install Playwright if not installed
    if [ ! -d "node_modules/@playwright" ]; then
        echo "Installing Playwright..."
        npm install -D @playwright/test
        npx playwright install
    fi
    
    # Run tests
    npx playwright test --reporter=list
else
    echo -e "\n${YELLOW}Skipping Playwright tests (npm not available)${NC}"
fi

echo -e "\n${GREEN}✅ Test suite completed!${NC}"