#!/bin/bash

# Forecast API Testing Script
# Tests all model types and scenarios

BASE_URL="http://localhost:5176"
PYTHON_WORKER="http://localhost:8001"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "======================================"
echo "   FORECAST API COMPREHENSIVE TEST   "
echo "======================================"

# Get first location ID
echo -e "\n${YELLOW}Getting location ID...${NC}"
LOCATION_ID=$(curl -s "$BASE_URL/api/locations" | jq -r '.data[0].id')
echo "Location ID: $LOCATION_ID"

# Check Python Worker Health
echo -e "\n${YELLOW}Checking Python Worker health...${NC}"
WORKER_HEALTH=$(curl -s "$PYTHON_WORKER/health" | jq -r '.status' 2>/dev/null || echo "offline")
if [ "$WORKER_HEALTH" = "healthy" ]; then
    echo -e "${GREEN}✓ Python Worker is healthy${NC}"
else
    echo -e "${RED}✗ Python Worker is not available${NC}"
fi

# Test 1: ML_ENSEMBLE Model
echo -e "\n${YELLOW}Test 1: ML_ENSEMBLE Model${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/forecast/generate" \
    -H "Content-Type: application/json" \
    -d "{
        \"locationId\": \"$LOCATION_ID\",
        \"horizonHours\": 24,
        \"modelType\": \"ML_ENSEMBLE\",
        \"useWeather\": true
    }")

SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
IS_MOCK=$(echo "$RESPONSE" | jq -r '.data.metadata.isMockData')
DATA_POINTS=$(echo "$RESPONSE" | jq -r '.data.metadata.dataPoints')

if [ "$SUCCESS" = "true" ]; then
    if [ "$IS_MOCK" = "false" ]; then
        echo -e "${GREEN}✓ ML_ENSEMBLE: Real forecast generated ($DATA_POINTS data points)${NC}"
    else
        echo -e "${YELLOW}⚠ ML_ENSEMBLE: Mock data used ($DATA_POINTS data points)${NC}"
    fi
else
    echo -e "${RED}✗ ML_ENSEMBLE: Failed to generate forecast${NC}"
fi

sleep 2

# Test 2: PHYSICS Model
echo -e "\n${YELLOW}Test 2: PHYSICS Model${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/forecast/generate" \
    -H "Content-Type: application/json" \
    -d "{
        \"locationId\": \"$LOCATION_ID\",
        \"horizonHours\": 24,
        \"modelType\": \"PHYSICS\",
        \"useWeather\": true
    }")

SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
IS_MOCK=$(echo "$RESPONSE" | jq -r '.data.metadata.isMockData')
DATA_POINTS=$(echo "$RESPONSE" | jq -r '.data.metadata.dataPoints')

if [ "$SUCCESS" = "true" ]; then
    if [ "$IS_MOCK" = "false" ]; then
        echo -e "${GREEN}✓ PHYSICS: Real forecast generated ($DATA_POINTS data points)${NC}"
    else
        echo -e "${YELLOW}⚠ PHYSICS: Mock data used ($DATA_POINTS data points)${NC}"
    fi
else
    echo -e "${RED}✗ PHYSICS: Failed to generate forecast${NC}"
fi

sleep 2

# Test 3: HYBRID Model
echo -e "\n${YELLOW}Test 3: HYBRID Model${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/forecast/generate" \
    -H "Content-Type: application/json" \
    -d "{
        \"locationId\": \"$LOCATION_ID\",
        \"horizonHours\": 24,
        \"modelType\": \"HYBRID\",
        \"useWeather\": true
    }")

SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
IS_MOCK=$(echo "$RESPONSE" | jq -r '.data.metadata.isMockData')
DATA_POINTS=$(echo "$RESPONSE" | jq -r '.data.metadata.dataPoints')

if [ "$SUCCESS" = "true" ]; then
    if [ "$IS_MOCK" = "false" ]; then
        echo -e "${GREEN}✓ HYBRID: Real forecast generated ($DATA_POINTS data points)${NC}"
    else
        echo -e "${YELLOW}⚠ HYBRID: Mock data used ($DATA_POINTS data points)${NC}"
    fi
else
    echo -e "${RED}✗ HYBRID: Failed to generate forecast${NC}"
fi

# Test 4: Validation Endpoint
echo -e "\n${YELLOW}Test 4: Validation Endpoint${NC}"
VALIDATION=$(curl -s -X POST "$BASE_URL/api/forecast/worker/validate" \
    -H "Content-Type: application/json" \
    -d "{
        \"location_id\": \"$LOCATION_ID\",
        \"forecast_hours\": 24,
        \"model_type\": \"ML_ENSEMBLE\"
    }")

VAL_SUCCESS=$(echo "$VALIDATION" | jq -r '.success')
if [ "$VAL_SUCCESS" = "true" ]; then
    echo -e "${GREEN}✓ Validation passed${NC}"
    echo "  Worker connection: $(echo "$VALIDATION" | jq -r '.validation.worker_connection')"
    echo "  Weather data points: $(echo "$VALIDATION" | jq -r '.validation.data_quality.weather_data_points')"
    echo "  Production data points: $(echo "$VALIDATION" | jq -r '.validation.data_quality.production_data_points')"
else
    echo -e "${RED}✗ Validation failed${NC}"
fi

# Test 5: Check Forecast Data
echo -e "\n${YELLOW}Test 5: Retrieving Forecast Data${NC}"
FORECAST_DATA=$(curl -s "$BASE_URL/api/analysis/forecast?location=$LOCATION_ID&interval=hourly&start=$(date '+%Y-%m-%d')&end=$(date -v+1d '+%Y-%m-%d' 2>/dev/null || date -d tomorrow '+%Y-%m-%d')")

FORECAST_COUNT=$(echo "$FORECAST_DATA" | jq '.data | length')
if [ "$FORECAST_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Found $FORECAST_COUNT forecast records in database${NC}"

    # Show sample forecast
    echo -e "\n  Sample forecast data:"
    echo "$FORECAST_DATA" | jq '.data[0] | {timestamp, forecast, confidence}'
else
    echo -e "${RED}✗ No forecast data found${NC}"
fi

# Test 6: Error Handling - Invalid Model Type
echo -e "\n${YELLOW}Test 6: Error Handling - Invalid Model Type${NC}"
ERROR_RESPONSE=$(curl -s -X POST "$BASE_URL/api/forecast/generate" \
    -H "Content-Type: application/json" \
    -d "{
        \"locationId\": \"$LOCATION_ID\",
        \"horizonHours\": 24,
        \"modelType\": \"INVALID_MODEL\",
        \"useWeather\": true
    }")

ERROR_SUCCESS=$(echo "$ERROR_RESPONSE" | jq -r '.success')
if [ "$ERROR_SUCCESS" = "false" ]; then
    echo -e "${GREEN}✓ Correctly rejected invalid model type${NC}"
else
    echo -e "${RED}✗ Should have rejected invalid model type${NC}"
fi

# Test 7: Performance Test
echo -e "\n${YELLOW}Test 7: Performance Test${NC}"
START_TIME=$(date +%s)
curl -s -X POST "$BASE_URL/api/forecast/generate" \
    -H "Content-Type: application/json" \
    -d "{
        \"locationId\": \"$LOCATION_ID\",
        \"horizonHours\": 48,
        \"modelType\": \"ML_ENSEMBLE\",
        \"useWeather\": true
    }" > /dev/null
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

if [ "$DURATION" -lt 60 ]; then
    echo -e "${GREEN}✓ 48-hour forecast generated in ${DURATION} seconds${NC}"
else
    echo -e "${YELLOW}⚠ 48-hour forecast took ${DURATION} seconds (slow)${NC}"
fi

# Summary
echo -e "\n======================================"
echo -e "           TEST SUMMARY               "
echo -e "======================================"

if [ "$WORKER_HEALTH" = "healthy" ]; then
    echo -e "${GREEN}Python Worker: ONLINE${NC}"
else
    echo -e "${RED}Python Worker: OFFLINE${NC}"
fi

echo -e "\nRun this script periodically to ensure the forecast system is working correctly."