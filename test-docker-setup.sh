#!/bin/bash

# Test script for Docker Compose deployment
# This script verifies that the Docker Compose setup works correctly

set -e

echo "🚀 Testing Pdf2Md MCP Server Docker Compose Deployment"
echo "======================================================="

# Check if Docker and Docker Compose are available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not in PATH"
    exit 1
fi

# Check for modern Docker Compose (docker compose) or legacy (docker-compose)
COMPOSE_CMD=""
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo "❌ Docker Compose is not installed or not in PATH"
    exit 1
fi

echo "✅ Docker and Docker Compose are available ($COMPOSE_CMD)"

# Create required directories
echo "📁 Creating required directories..."
mkdir -p uploads output shared
echo "✅ Directories created"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📋 Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created"
fi

# Test Docker Compose configuration
echo "🔧 Testing Docker Compose configuration..."
$COMPOSE_CMD config > /dev/null
echo "✅ Docker Compose configuration is valid"

# Validate environment variables
echo "🔍 Validating environment configuration..."
source .env
if [ -z "$MCP_PORT" ]; then
    echo "⚠️ MCP_PORT not set, using default 3000"
    MCP_PORT=3000
fi
echo "✅ Environment variables validated"

# Check port availability
if command -v lsof &> /dev/null && lsof -Pi :$MCP_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️ Port $MCP_PORT is already in use"
    echo "   You may need to stop other services or change MCP_PORT in .env"
else
    echo "✅ Port $MCP_PORT is available"
fi

echo ""
echo "🎉 Docker Compose setup validation completed successfully!"
echo ""
echo "To start the MCP server:"
echo "  $COMPOSE_CMD up -d"
echo ""
echo "To check health:"
echo "  curl http://localhost:$MCP_PORT/health"
echo ""
echo "To view logs:"
echo "  $COMPOSE_CMD logs -f pdf2md-mcp"
echo ""
echo "MCP Server URL: http://localhost:$MCP_PORT/mcp"