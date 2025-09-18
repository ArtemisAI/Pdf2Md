# VS Code and GitHub Copilot Integration Guide

This guide explains how to configure VS Code and GitHub Copilot to work with the Pdf2Md MCP Server deployed via Docker Compose.

## Prerequisites

- VS Code with GitHub Copilot extension
- Docker and Docker Compose installed
- Pdf2Md MCP Server running via Docker Compose

## Configuration Options

### Option 1: Local Docker Deployment (Recommended)

This is the most straightforward setup for development and testing.

#### 1. Start the MCP Server

```bash
# Clone and start the server
git clone https://github.com/ArtemisAI/Pdf2Md.git
cd Pdf2Md
cp .env.example .env
docker-compose up -d

# Verify it's running
curl http://localhost:3000/health
```

#### 2. Configure VS Code MCP Settings

Create or update `.vscode/mcp.json` in your project:

```json
{
  "inputs": [
    {
      "id": "pdf2md-input",
      "type": "promptString",
      "description": "Input configuration for Pdf2Md MCP server"
    }
  ],
  "servers": {
    "Pdf2Md-Local": {
      "url": "http://localhost:3000/mcp",
      "type": "http",
      "headers": {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "User-Agent": "VSCode-MCP-Client/1.0"
      },
      "timeout": 300
    }
  }
}
```

#### 3. GitHub Copilot Configuration

Add to your VS Code `settings.json`:

```json
{
  "github.copilot.mcp.servers": {
    "pdf2md": {
      "url": "http://localhost:3000/mcp",
      "type": "streamable-http",
      "capabilities": [
        "audio-to-markdown",
        "pdf-to-markdown",
        "image-to-markdown",
        "docx-to-markdown",
        "xlsx-to-markdown",
        "pptx-to-markdown",
        "webpage-to-markdown",
        "youtube-to-markdown",
        "bing-search-to-markdown",
        "get-markdown-file",
        "enhanced-audio-to-markdown",
        "audio-transcription-status"
      ],
      "timeout": 300,
      "retries": 3
    }
  }
}
```

### Option 2: Remote Docker Deployment

For team environments or remote development.

#### 1. Deploy to Remote Server

```bash
# On your remote server
git clone https://github.com/ArtemisAI/Pdf2Md.git
cd Pdf2Md

# Configure for remote access
cp .env.example .env
# Edit .env and set:
# MCP_PORT=3000
# CORS_ORIGIN=*  # Or your specific domain

# Start the server
docker-compose up -d

# Verify external access
curl http://your-server-ip:3000/health
```

#### 2. Configure VS Code for Remote Server

Update `.vscode/mcp.json`:

```json
{
  "servers": {
    "Pdf2Md-Remote": {
      "url": "http://your-server-ip:3000/mcp",
      "type": "http",
      "headers": {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "User-Agent": "VSCode-MCP-Client/1.0"
      },
      "timeout": 300
    }
  }
}
```

### Option 3: Cloud Deployment with Load Balancing

For production environments.

#### 1. Nginx Configuration

Create `nginx.conf`:

```nginx
upstream pdf2md_backend {
    server pdf2md-mcp:3000;
}

server {
    listen 80;
    server_name your-domain.com;

    location /mcp {
        proxy_pass http://pdf2md_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
    
    location /health {
        proxy_pass http://pdf2md_backend;
        proxy_set_header Host $host;
    }
}
```

#### 2. Docker Compose with Nginx

```yaml
version: '3.8'

services:
  pdf2md-mcp:
    build: .
    environment:
      - MCP_TRANSPORT=http
      - PORT=3000
      - HOST=0.0.0.0
      - CORS_ORIGIN=https://your-domain.com
    volumes:
      - ./uploads:/app/uploads
      - ./output:/app/output
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - pdf2md-mcp
    restart: unless-stopped
```

## Available MCP Tools

The Pdf2Md MCP Server provides the following tools for GitHub Copilot:

### File Processing Tools

- **`pdf-to-markdown`** - Convert PDF files to Markdown
- **`docx-to-markdown`** - Convert DOCX files to Markdown  
- **`xlsx-to-markdown`** - Convert Excel files to Markdown
- **`pptx-to-markdown`** - Convert PowerPoint files to Markdown
- **`image-to-markdown`** - Extract text from images using OCR

### Audio Processing Tools

- **`audio-to-markdown`** - Convert audio files to Markdown with transcription
- **`enhanced-audio-to-markdown`** - GPU-accelerated audio transcription (if enabled)
- **`audio-transcription-status`** - Check status of async audio processing

### Web Content Tools

- **`webpage-to-markdown`** - Convert web pages to Markdown
- **`youtube-to-markdown`** - Extract YouTube video transcripts
- **`bing-search-to-markdown`** - Convert Bing search results to Markdown

### File Management Tools

- **`get-markdown-file`** - Retrieve existing Markdown files from shared directory

## Usage Examples

### In GitHub Copilot Chat

Once configured, you can use these tools directly in Copilot Chat:

```
@copilot /pdf2md Convert this PDF file to markdown: /path/to/document.pdf

@copilot /pdf2md Transcribe this audio file: /path/to/audio.mp3

@copilot /pdf2md Get me the transcript for this YouTube video: https://youtube.com/watch?v=...

@copilot /pdf2md Extract text from this image: /path/to/image.png
```

### Programmatic Usage

You can also interact with the MCP server programmatically:

```javascript
// Example MCP request to convert PDF
const response = await fetch('http://localhost:3000/mcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream'
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'pdf-to-markdown',
      arguments: {
        filepath: '/path/to/document.pdf'
      }
    }
  })
});
```

## Troubleshooting

### Common Issues

1. **Connection Refused:**
   ```bash
   # Check if server is running
   docker-compose ps
   curl http://localhost:3000/health
   ```

2. **CORS Errors:**
   ```bash
   # Update CORS_ORIGIN in .env
   CORS_ORIGIN=*
   docker-compose restart
   ```

3. **Timeout Issues:**
   ```json
   // Increase timeout in VS Code settings
   {
     "github.copilot.mcp.servers": {
       "pdf2md": {
         "timeout": 600  // 10 minutes for large files
       }
     }
   }
   ```

4. **File Processing Errors:**
   ```bash
   # Check volume mounts and permissions
   docker-compose logs pdf2md-mcp
   
   # Ensure directories exist
   mkdir -p uploads output shared
   chmod 755 uploads output shared
   ```

### Debug Mode

Enable verbose logging:

```bash
# Set debug environment variable
echo "NODE_ENV=development" >> .env
docker-compose restart

# View detailed logs
docker-compose logs -f pdf2md-mcp
```

### Health Check

Monitor server health:

```bash
# Basic health check
curl http://localhost:3000/health

# Detailed system information
curl http://localhost:3000/health/detailed
```

## Performance Optimization

### For Large Files

```json
{
  "github.copilot.mcp.servers": {
    "pdf2md": {
      "timeout": 900,      // 15 minutes for very large files
      "retries": 1,        // Reduce retries for large operations
      "maxConcurrent": 2   // Limit concurrent requests
    }
  }
}
```

### For Audio Processing

Enable GPU acceleration for faster audio transcription:

```bash
# In .env file
CUDA_VISIBLE_DEVICES=0
KMP_DUPLICATE_LIB_OK=TRUE
OMP_NUM_THREADS=4
```

## Security Best Practices

1. **Network Security:**
   ```yaml
   # Bind to specific interface in production
   ports:
     - "127.0.0.1:3000:3000"
   ```

2. **CORS Configuration:**
   ```bash
   # Restrict to specific domains
   CORS_ORIGIN=https://vscode.dev,https://github.dev
   ```

3. **Rate Limiting:**
   The server includes built-in rate limiting (100 requests per 15 minutes per IP).

4. **File Access:**
   ```bash
   # Restrict markdown file access
   MD_SHARE_DIR=/path/to/safe/directory
   ```

## Advanced Configuration

### Multiple Environments

Create environment-specific configurations:

```json
// .vscode/mcp.development.json
{
  "servers": {
    "Pdf2Md-Dev": {
      "url": "http://localhost:3000/mcp"
    }
  }
}

// .vscode/mcp.production.json  
{
  "servers": {
    "Pdf2Md-Prod": {
      "url": "https://your-domain.com/mcp"
    }
  }
}
```

### Custom Headers

Add authentication or custom headers:

```json
{
  "servers": {
    "Pdf2Md": {
      "url": "http://localhost:3000/mcp",
      "headers": {
        "Authorization": "Bearer your-token",
        "X-API-Key": "your-api-key",
        "User-Agent": "YourApp/1.0"
      }
    }
  }
}
```

## Support and Resources

- **GitHub Repository:** https://github.com/ArtemisAI/Pdf2Md
- **Docker Deployment Guide:** [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md)
- **MCP Protocol:** https://modelcontextprotocol.io/
- **VS Code MCP Extension:** Available in VS Code Marketplace