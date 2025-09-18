# Docker Deployment Guide for Pdf2Md MCP Server

This guide explains how to deploy the Pdf2Md MCP Server using Docker Compose for external access while maintaining the internal processing logic.

## Quick Start

1. **Clone and prepare the environment:**
   ```bash
   git clone https://github.com/ArtemisAI/Pdf2Md.git
   cd Pdf2Md
   cp .env.example .env
   ```

2. **Start the server:**
   ```bash
   docker-compose up -d
   ```

3. **Verify the deployment:**
   ```bash
   curl http://localhost:3000/health
   ```

The MCP server will be available at `http://localhost:3000/mcp` using the streamable-http transport.

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure as needed:

```bash
# Basic configuration
MCP_PORT=3000                    # Port to expose on host
CORS_ORIGIN=*                    # CORS policy (set to your domain in production)

# File processing directories
UPLOAD_DIR=./uploads             # Temporary upload directory  
OUTPUT_DIR=./output              # Processed files output
MD_SHARE_DIR=./shared            # Shared markdown files directory

# GPU support (optional)
CUDA_VISIBLE_DEVICES=0           # GPU device to use
KMP_DUPLICATE_LIB_OK=TRUE        # Required for faster-whisper GPU
OMP_NUM_THREADS=4                # Audio processing optimization
```

### Directory Structure

The Docker Compose setup creates and mounts the following directories:

```
├── uploads/          # Temporary file uploads
├── output/           # Processed output files
├── shared/           # Shared markdown files (for get-markdown-file tool)
└── docker-compose.yml
```

## Production Deployment

### Security Considerations

1. **CORS Configuration:**
   ```bash
   # Replace * with your specific domains
   CORS_ORIGIN=https://your-domain.com,https://app.your-domain.com
   ```

2. **Network Security:**
   ```yaml
   # In docker-compose.yml, bind to specific interface
   ports:
     - "127.0.0.1:3000:3000"  # Only localhost access
   ```

3. **Resource Limits:**
   ```yaml
   deploy:
     resources:
       limits:
         memory: 2G         # Adjust based on your needs
         cpus: '1.0'
   ```

### Reverse Proxy Setup

For production, use a reverse proxy like Nginx:

```nginx
server {
    listen 80;
    server_name your-mcp-server.com;
    
    location /mcp {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```

## Monitoring and Health Checks

### Health Endpoints

- **Basic health:** `GET /health`
- **Detailed health:** `GET /health/detailed`

### Docker Health Check

The container includes automatic health checks:

```bash
# Check container health
docker-compose ps

# View health check logs
docker-compose logs pdf2md-mcp
```

### Log Management

Access logs using Docker Compose:

```bash
# Follow logs
docker-compose logs -f pdf2md-mcp

# View recent logs
docker-compose logs --tail=100 pdf2md-mcp
```

## GPU Support (Optional)

For GPU-accelerated audio transcription, uncomment GPU configuration in `.env`:

```bash
# GPU configuration
CUDA_VISIBLE_DEVICES=0
KMP_DUPLICATE_LIB_OK=TRUE
OMP_NUM_THREADS=4
```

Then modify `docker-compose.yml` to add GPU runtime:

```yaml
services:
  pdf2md-mcp:
    runtime: nvidia  # Add this line
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
      # ... other environment variables
```

## Troubleshooting

### Common Issues

1. **Port already in use:**
   ```bash
   # Change the port in .env
   MCP_PORT=3001
   ```

2. **Permission errors with volumes:**
   ```bash
   # Ensure directories exist and have proper permissions
   mkdir -p uploads output shared
   chmod 755 uploads output shared
   ```

3. **CORS errors:**
   ```bash
   # Update CORS_ORIGIN in .env to match your client domain
   CORS_ORIGIN=https://your-client-domain.com
   ```

4. **Python/UV dependencies:**
   ```bash
   # Rebuild the container to reinstall dependencies
   docker-compose build --no-cache
   ```

### Debug Mode

Run the container in debug mode to see detailed logs:

```bash
# Start with debug output
docker-compose up

# Or check specific container logs
docker logs --follow pdf2md-mcp
```

## Scaling and Load Balancing

For high-traffic deployments, you can run multiple instances:

```yaml
version: '3.8'

services:
  pdf2md-mcp:
    # ... existing configuration
    scale: 3  # Run 3 instances
    
  load-balancer:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - pdf2md-mcp
```

## Backup and Maintenance

### Data Backup

Important directories to backup:
- `shared/` - Markdown files
- `output/` - Processed files
- Docker volumes (if using Redis)

### Updates

Update the server:

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose build
docker-compose up -d
```

## Support

- **Documentation:** [Pdf2Md Repository](https://github.com/ArtemisAI/Pdf2Md)
- **Issues:** [GitHub Issues](https://github.com/ArtemisAI/Pdf2Md/issues)
- **Health Check:** `curl http://localhost:3000/health`