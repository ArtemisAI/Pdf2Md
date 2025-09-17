#!/bin/bash

echo "🐳 MCP Docker Build and Test Script"
echo "===================================="

# Test Docker availability
echo "📋 Testing Docker availability..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not in PATH"
    exit 1
fi

echo "✅ Docker version: $(docker --version)"

# Test docker-compose availability
if command -v docker-compose &> /dev/null; then
    echo "✅ Docker Compose version: $(docker-compose --version)"
elif docker compose version &> /dev/null; then
    echo "✅ Docker Compose (plugin) version: $(docker compose version)"
else
    echo "⚠️  Docker Compose not available - using docker run commands"
fi

# Check if we can build the image
echo ""
echo "📦 Testing Docker build..."
echo "Note: This may take several minutes for the first build due to CUDA base image download"

# Build just the Node.js stages first (faster)
if docker build --target builder -t mcp-server:builder . &> build.log; then
    echo "✅ Node.js build stage completed successfully"
else
    echo "❌ Node.js build stage failed. Check build.log for details:"
    tail -20 build.log
    exit 1
fi

# Test production dependencies
if docker build --target prod-deps -t mcp-server:prod-deps . &> build-prod.log; then
    echo "✅ Production dependencies stage completed successfully"
else
    echo "❌ Production dependencies stage failed. Check build-prod.log for details:"
    tail -20 build-prod.log
    exit 1
fi

echo ""
echo "🎯 Docker build test completed successfully!"
echo "📝 To build the full runtime image:"
echo "   docker build -t mcp-server:latest ."
echo ""
echo "🚀 To run with Docker Compose:"
echo "   docker-compose up -d"
echo ""
echo "🌐 To run standalone (without Redis):"
echo "   docker run -p 3000:3000 -e DISABLE_REDIS=true mcp-server:latest"
echo ""
echo "📊 To test with GPU support:"
echo "   docker run --gpus all -p 3000:3000 -e DISABLE_REDIS=true mcp-server:latest"