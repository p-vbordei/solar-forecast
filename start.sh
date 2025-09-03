#!/bin/bash

echo "🚀 Starting Solar Forecast Platform..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check for npm
if ! command -v npm &> /dev/null; then
    echo -e "${YELLOW}npm is not installed. Installing Node.js dependencies will be skipped.${NC}"
    SKIP_NPM=true
else
    SKIP_NPM=false
fi

# Check for Python
if ! command -v python3 &> /dev/null; then
    echo -e "${YELLOW}Python is not installed. Python worker will not start.${NC}"
    SKIP_PYTHON=true
else
    SKIP_PYTHON=false
fi

# Start Docker services
echo -e "${GREEN}Starting Docker services (PostgreSQL + Redis)...${NC}"
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 5

# Install and start SvelteKit
if [ "$SKIP_NPM" = false ]; then
    echo -e "${GREEN}Installing SvelteKit dependencies...${NC}"
    npm install
    
    echo -e "${GREEN}Starting SvelteKit development server...${NC}"
    npm run dev &
    SVELTEKIT_PID=$!
    echo "SvelteKit running with PID: $SVELTEKIT_PID"
fi

# Install and start Python worker
if [ "$SKIP_PYTHON" = false ]; then
    echo -e "${GREEN}Setting up Python worker...${NC}"
    cd python-worker
    
    # Check for UV
    if ! command -v uv &> /dev/null; then
        echo "Installing UV package manager..."
        curl -LsSf https://astral.sh/uv/install.sh | sh
        export PATH="$HOME/.cargo/bin:$PATH"
    fi
    
    # Create virtual environment and install dependencies
    if [ ! -d ".venv" ]; then
        echo "Creating Python virtual environment..."
        python3 -m venv .venv
    fi
    
    source .venv/bin/activate
    
    # Install dependencies
    echo "Installing Python dependencies..."
    pip install fastapi uvicorn sqlalchemy asyncpg redis pydantic pydantic-settings prometheus-client structlog aiohttp
    
    echo -e "${GREEN}Starting Python worker...${NC}"
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
    PYTHON_PID=$!
    echo "Python worker running with PID: $PYTHON_PID"
    
    cd ..
fi

echo -e "${GREEN}✅ All services started!${NC}"
echo ""
echo "📍 Access points:"
echo "  - Frontend: http://localhost:5173"
echo "  - Python API: http://localhost:8000"
echo "  - API Docs: http://localhost:8000/api/docs"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    
    if [ "$SKIP_NPM" = false ] && [ ! -z "$SVELTEKIT_PID" ]; then
        kill $SVELTEKIT_PID 2>/dev/null
    fi
    
    if [ "$SKIP_PYTHON" = false ] && [ ! -z "$PYTHON_PID" ]; then
        kill $PYTHON_PID 2>/dev/null
    fi
    
    docker-compose down
    
    echo -e "${GREEN}All services stopped.${NC}"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup EXIT INT TERM

# Keep script running
while true; do
    sleep 1
done