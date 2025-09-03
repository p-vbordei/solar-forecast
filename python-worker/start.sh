#!/bin/bash

# Install UV if not already installed
if ! command -v uv &> /dev/null; then
    echo "Installing UV..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
fi

# Create virtual environment and install dependencies
echo "Setting up Python environment..."
uv venv
source .venv/bin/activate
uv pip install -e .

# Copy .env if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env file from .env.example - please update with your configuration"
fi

# Start the FastAPI application
echo "Starting Solar Forecast Worker..."
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload