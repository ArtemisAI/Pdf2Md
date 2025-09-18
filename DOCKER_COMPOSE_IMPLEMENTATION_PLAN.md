# Docker Compose Implementation Plan for Pdf2Md HTTP-MCP Server

## 🎯 Project Overview

**Objective**: Implement a complete Docker Compose setup to serve the Pdf2Md MCP (Model Context Protocol) server as an HTTP-streamable service accessible from external clients.

**Repository**: https://github.com/ArtemisAI/Pdf2Md  
**Branch**: HTTP-MCP  
**Current Status**: HTTP server implementation exists but lacks containerized deployment

---

## 📊 Current State Analysis

### ✅ What Exists
- **HTTP Server Implementation**: `src/http-server.ts` with Express.js
- **Health Check Endpoints**: `src/health.ts` with `/health`, `/health/detailed`, `/health/gpu`
- **Dual Transport Support**: `src/index.ts` supports both stdio and HTTP modes
- **Security Middleware**: CORS, Helmet, Rate limiting, Request validation
- **Basic Dockerfile**: Multi-stage build with Node.js and Python
- **MCP Tools**: File conversion (PDF, DOCX, images, audio) and web content tools

### ❌ What's Missing
- Docker Compose configuration file
- Environment variables configuration (`.env.example`)
- Enhanced Dockerfile with HTTP-specific optimizations
- Port exposure and volume mount configuration
- Production deployment documentation
- Health check integration in Docker

---

## 🛠️ Implementation Requirements

### 1. Enhanced Dockerfile

**Current Dockerfile Location**: `/Dockerfile`

**Required Enhancements**:

```dockerfile
# Add to existing Dockerfile after the current content:

# Expose the HTTP port
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Set environment variables for HTTP mode
ENV MCP_TRANSPORT=http
ENV HOST=0.0.0.0
ENV PORT=3000
ENV PYTHONUTF8=1
ENV NODE_ENV=production

# Create directories for file processing
RUN mkdir -p /app/uploads /app/output /app/temp

# Change the default command to HTTP mode
CMD ["node", "dist/index.js", "--http"]
```

### 2. Docker Compose Configuration

**File**: `docker-compose.yml` (create new)

**Required Configuration**:

```yaml
version: '3.8'

services:
  pdf2md-mcp:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: pdf2md-mcp-server
    ports:
      - "3000:3000"
    environment:
      - MCP_TRANSPORT=http
      - PORT=3000
      - HOST=0.0.0.0
      - PYTHONUTF8=1
      - NODE_ENV=production
      - CORS_ORIGIN=${CORS_ORIGIN:-*}
    volumes:
      # Volume mounts for file processing
      - ./uploads:/app/uploads
      - ./output:/app/output
      - ./temp:/app/temp
      # Optional: Mount for custom configurations
      - ./.env:/app/.env:ro
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.25'
    networks:
      - pdf2md-network

networks:
  pdf2md-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

# Optional: Add Redis for session storage (if needed for scaling)
  # redis:
  #   image: redis:7-alpine
  #   container_name: pdf2md-redis
  #   ports:
  #     - "6379:6379"
  #   volumes:
  #     - redis-data:/data
  #   restart: unless-stopped
  #   networks:
  #     - pdf2md-network

# volumes:
#   redis-data:
```

### 3. Environment Configuration

**File**: `.env.example` (create new)

**Required Environment Variables**:

```bash
# ==============================================
# Pdf2Md MCP Server Configuration
# ==============================================

# Server Configuration
PORT=3000
HOST=0.0.0.0
MCP_TRANSPORT=http
NODE_ENV=production

# Python Configuration
PYTHONUTF8=1

# CORS Configuration
CORS_ORIGIN=*

# Security Configuration (optional)
# JWT_SECRET=your-secret-key-here
# RATE_LIMIT_WINDOW_MS=900000
# RATE_LIMIT_MAX_REQUESTS=100

# File Processing Configuration
MAX_FILE_SIZE=100MB
UPLOAD_DIR=/app/uploads
OUTPUT_DIR=/app/output
TEMP_DIR=/app/temp

# OCR Configuration (for image processing)
TESSERACT_CMD=tesseract
POPPLER_PATH=/usr/bin

# Audio Processing Configuration
WHISPER_MODEL=base
AUDIO_MAX_DURATION=300

# GPU Configuration (optional)
CUDA_VISIBLE_DEVICES=0
ENABLE_GPU=false

# Redis Configuration (optional, for session storage)
# REDIS_URL=redis://redis:6379
# REDIS_TTL=3600

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=combined

# Health Check Configuration
HEALTH_CHECK_INTERVAL=30
HEALTH_CHECK_TIMEOUT=10
```

### 4. Production Docker Compose

**File**: `docker-compose.prod.yml` (create new)

**Enhanced Production Configuration**:

```yaml
version: '3.8'

services:
  pdf2md-mcp:
    build:
      context: .
      dockerfile: Dockerfile
      target: runner
    container_name: pdf2md-mcp-server
    ports:
      - "3000:3000"
    env_file:
      - .env
    volumes:
      - uploads-data:/app/uploads
      - output-data:/app/output
      - temp-data:/app/temp
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '2.0'
        reservations:
          memory: 1G
          cpus: '0.5'
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    networks:
      - pdf2md-network

  # Nginx reverse proxy for SSL termination and load balancing
  nginx:
    image: nginx:alpine
    container_name: pdf2md-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - pdf2md-mcp
    restart: unless-stopped
    networks:
      - pdf2md-network

networks:
  pdf2md-network:
    driver: bridge

volumes:
  uploads-data:
  output-data:
  temp-data:
```

### 5. Nginx Configuration

**File**: `nginx/nginx.conf` (create new)

```nginx
events {
    worker_connections 1024;
}

http {
    upstream pdf2md {
        server pdf2md-mcp:3000;
    }

    server {
        listen 80;
        server_name localhost;

        client_max_body_size 100M;

        location / {
            proxy_pass http://pdf2md;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket support for streaming
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            
            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        location /health {
            proxy_pass http://pdf2md/health;
            access_log off;
        }
    }
}
```

---

## 📋 Implementation Steps

### Phase 1: Core Docker Configuration

1. **Enhance Dockerfile**
   - Add port exposure (`EXPOSE 3000`)
   - Add health check with curl
   - Set environment variables for HTTP mode
   - Create necessary directories
   - Update CMD to use `--http` flag

2. **Create docker-compose.yml**
   - Service definition for pdf2md-mcp
   - Port mapping (3000:3000)
   - Volume mounts for file processing
   - Health check configuration
   - Resource limits and restart policies

3. **Create .env.example**
   - All configurable environment variables
   - Comments explaining each variable
   - Default values for development

### Phase 2: Testing and Validation

1. **Create test scripts**
   - `test-docker-compose.sh` for local testing
   - Health check validation
   - MCP endpoint functionality test

2. **Integration testing**
   - Verify MCP protocol compliance
   - Test file processing capabilities
   - Validate external client connectivity

### Phase 3: Production Enhancement

1. **Create production compose file**
   - Enhanced resource allocation
   - Logging configuration
   - Optional Nginx reverse proxy

2. **Add monitoring and observability**
   - Health check endpoints
   - Metrics collection (optional)
   - Log aggregation setup

### Phase 4: Documentation

1. **Quick Start Guide**
   - Installation and setup instructions
   - Basic usage examples
   - Troubleshooting guide

2. **Integration Examples**
   - VS Code configuration
   - Roo Code setup
   - Custom client integration

---

## 🔧 Technical Specifications

### Server Endpoints

The HTTP server exposes these endpoints:

```
POST   /mcp              # Main MCP protocol endpoint (streamable-http)
GET    /health           # Basic health check
GET    /health/detailed  # Comprehensive health info  
GET    /health/gpu       # GPU status for audio processing
```

### MCP Tools Available

Based on `src/tools.ts`, these tools are available:

1. **File Conversion Tools**
   - `convertPdfToMarkdown` - PDF to Markdown conversion
   - `convertDocxToMarkdown` - Word document conversion
   - `convertXlsxToMarkdown` - Excel spreadsheet conversion
   - `convertPptxToMarkdown` - PowerPoint presentation conversion
   - `convertImageToMarkdown` - Image OCR and conversion
   - `convertAudioToMarkdown` - Audio transcription

2. **Web Content Tools**
   - `convertWebpageToMarkdown` - Web page scraping and conversion
   - `searchBingAndConvert` - Bing search with result conversion
   - `convertYouTubeToMarkdown` - YouTube transcript extraction

3. **File Retrieval**
   - `getMarkdownFile` - Retrieve existing Markdown files

### Resource Requirements

**Minimum Requirements**:
- RAM: 512MB
- CPU: 0.25 cores
- Storage: 2GB for Docker image + processing space
- Network: HTTP port 3000

**Recommended Production**:
- RAM: 2GB (4GB with GPU processing)
- CPU: 1 core (2 cores for high load)
- Storage: 10GB+ for processing large files
- Network: Behind reverse proxy with SSL

### Security Considerations

The HTTP server includes:
- **CORS**: Configurable origin restrictions
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Request Size Limits**: 10MB JSON payload limit
- **Security Headers**: Helmet middleware for common vulnerabilities
- **Input Validation**: Request validation for all endpoints

---

## 📝 File Processing Capabilities

### Supported Input Formats

- **Documents**: PDF, DOCX, XLSX, PPTX
- **Images**: JPG, PNG, GIF, BMP, TIFF (with OCR)
- **Audio**: MP3, WAV, M4A, FLAC (transcription)
- **Web Content**: URLs, YouTube videos, Bing search results

### Processing Pipeline

1. **File Upload** → Temporary storage in `/app/uploads`
2. **Format Detection** → Automatic format recognition
3. **Conversion** → Format-specific processing tools
4. **Markdown Generation** → Structured Markdown output
5. **Cleanup** → Temporary file removal

### Volume Mount Strategy

```
Host Directory     → Container Directory → Purpose
./uploads          → /app/uploads        → Input file storage
./output           → /app/output         → Processed file output
./temp             → /app/temp           → Temporary processing space
./.env             → /app/.env           → Environment configuration
```

---

## 🚀 Quick Start Commands

Once implemented, users can start the service with:

```bash
# Clone the repository
git clone https://github.com/ArtemisAI/Pdf2Md.git
cd Pdf2Md

# Create environment file
cp .env.example .env

# Start the service
docker-compose up -d

# Verify it's running
curl http://localhost:3000/health

# View logs
docker-compose logs -f pdf2md-mcp

# Stop the service
docker-compose down
```

### MCP Client Integration

**VS Code / GitHub Copilot**:
```json
{
  "servers": {
    "Pdf2Md": {
      "url": "http://localhost:3000/mcp",
      "type": "http"
    }
  }
}
```

**Roo Code** (already configured in `.roo/mcp.json`):
```json
{
  "servers": {
    "pdf2md": {
      "url": "http://localhost:3000/mcp",
      "name": "Pdf2Md Converter"
    }
  }
}
```

---

## 🐛 Troubleshooting Guide

### Common Issues

1. **Port Already in Use**
   ```bash
   # Change port in .env file
   PORT=3001
   ```

2. **Health Check Failures**
   ```bash
   # Check server logs
   docker-compose logs pdf2md-mcp
   
   # Test health endpoint directly
   curl -v http://localhost:3000/health
   ```

3. **File Processing Errors**
   ```bash
   # Check volume mounts
   docker-compose exec pdf2md-mcp ls -la /app/uploads
   
   # Verify permissions
   chmod 755 uploads output temp
   ```

4. **Memory Issues**
   ```bash
   # Increase memory limits in docker-compose.yml
   deploy:
     resources:
       limits:
         memory: 4G
   ```

### Monitoring Commands

```bash
# Service status
docker-compose ps

# Resource usage
docker stats pdf2md-mcp-server

# Health check
curl http://localhost:3000/health/detailed

# View active sessions
curl http://localhost:3000/health/detailed | jq '.sessions'
```

---

## 📚 Integration Examples

### Test MCP Protocol

```bash
# Initialize MCP session
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test", "version": "1.0"}
    }
  }'

# List available tools
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: YOUR_SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'
```

### File Conversion Example

```bash
# Convert PDF to Markdown
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: YOUR_SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "convertPdfToMarkdown",
      "arguments": {
        "path": "/app/uploads/document.pdf"
      }
    }
  }'
```

---

## 🎯 Success Criteria

### Functional Requirements

- ✅ HTTP MCP server starts successfully in Docker container
- ✅ Health checks pass (basic and detailed)
- ✅ MCP protocol compliance (initialize, tools/list, tools/call)
- ✅ File processing works for all supported formats
- ✅ External client connectivity (VS Code, Roo Code)
- ✅ Proper error handling and logging

### Performance Requirements

- ✅ Container starts within 30 seconds
- ✅ Health checks respond within 5 seconds
- ✅ File processing completes within reasonable time limits
- ✅ Memory usage stays within configured limits
- ✅ No memory leaks during extended operation

### Security Requirements

- ✅ CORS configuration works properly
- ✅ Rate limiting prevents abuse
- ✅ File uploads are properly validated
- ✅ No sensitive information exposed in logs
- ✅ Proper cleanup of temporary files

---

## 📋 Delegation Notes for Gemini 2.5-pro

### Priority Implementation Order

1. **HIGH PRIORITY**: Dockerfile enhancements (required for basic functionality)
2. **HIGH PRIORITY**: Basic docker-compose.yml (core service definition)
3. **HIGH PRIORITY**: .env.example (configuration template)
4. **MEDIUM PRIORITY**: Production docker-compose.prod.yml
5. **MEDIUM PRIORITY**: Nginx configuration
6. **LOW PRIORITY**: Monitoring and advanced features

### Key Validation Points

- Verify the HTTP server starts with `--http` flag
- Test health endpoints are accessible
- Confirm MCP protocol endpoints work
- Validate file processing pipeline
- Check volume mounts for file access

### Implementation Notes

- The codebase is in TypeScript and requires compilation (`pnpm run build`)
- Python dependencies are managed via the existing `setup.sh` script
- The server supports both stdio and HTTP transports
- Session management is built-in with UUID generation
- File processing includes OCR, audio transcription, and web scraping

This implementation plan provides a complete roadmap for creating a production-ready Docker Compose deployment of the Pdf2Md HTTP-MCP server.
