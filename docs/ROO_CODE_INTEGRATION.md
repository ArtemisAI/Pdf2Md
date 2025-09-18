# Roo Code Integration Guide

This guide explains how to configure Roo Code to work with the Pdf2Md MCP Server deployed via Docker Compose.

## Prerequisites

- Roo Code IDE installed
- Docker and Docker Compose installed  
- Pdf2Md MCP Server running via Docker Compose

## Quick Setup

### 1. Start the MCP Server

```bash
# Clone and start the server
git clone https://github.com/ArtemisAI/Pdf2Md.git
cd Pdf2Md
cp .env.example .env
docker-compose up -d

# Verify server is running
curl http://localhost:3000/health
```

### 2. Configure Roo Code MCP Settings

The project already includes a Roo Code configuration at `.roo/mcp.json`. Update it for your Docker deployment:

```json
{
  "mcpServers": {
    "Pdf2Md-Docker": {
      "type": "streamable-http",
      "url": "http://localhost:3000/mcp/",
      "alwaysAllow": [
        "audio-to-markdown",
        "bing-search-to-markdown",
        "docx-to-markdown",
        "get-markdown-file",
        "image-to-markdown", 
        "pdf-to-markdown",
        "pptx-to-markdown",
        "webpage-to-markdown",
        "xlsx-to-markdown",
        "youtube-to-markdown",
        "cpu-audio-to-markdown",
        "gpu-audio-to-markdown", 
        "enhanced-audio-to-markdown",
        "audio-transcription-status"
      ],
      "headers": {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "User-Agent": "Roo-MCP-Client/1.0",
        "X-MCP-Client": "Roo"
      },
      "timeout": 300
    }
  }
}
```

### 3. Restart Roo Code

Restart Roo Code to load the new MCP configuration.

## Configuration Options

### Local Docker Deployment (Development)

For local development, use the default configuration:

```json
{
  "mcpServers": {
    "Pdf2Md-Local": {
      "type": "streamable-http",
      "url": "http://localhost:3000/mcp/",
      "timeout": 300,
      "retries": 3,
      "headers": {
        "User-Agent": "Roo-MCP-Client/1.0"
      }
    }
  }
}
```

### Remote Docker Deployment (Team/Production)

For remote deployments:

```json
{
  "mcpServers": {
    "Pdf2Md-Remote": {
      "type": "streamable-http", 
      "url": "http://your-server-ip:3000/mcp/",
      "timeout": 600,
      "retries": 2,
      "headers": {
        "User-Agent": "Roo-MCP-Client/1.0",
        "X-Team": "your-team-name"
      },
      "alwaysAllow": [
        "pdf-to-markdown",
        "audio-to-markdown",
        "image-to-markdown",
        "docx-to-markdown",
        "webpage-to-markdown"
      ]
    }
  }
}
```

### Multiple Environments

Configure different environments:

```json
{
  "mcpServers": {
    "Pdf2Md-Dev": {
      "type": "streamable-http",
      "url": "http://localhost:3000/mcp/",
      "timeout": 300
    },
    "Pdf2Md-Staging": {
      "type": "streamable-http", 
      "url": "http://staging.your-domain.com:3000/mcp/",
      "timeout": 300
    },
    "Pdf2Md-Production": {
      "type": "streamable-http",
      "url": "https://pdf2md.your-domain.com/mcp/",
      "timeout": 600
    }
  }
}
```

## Available MCP Tools

The Pdf2Md MCP Server provides these tools for Roo Code:

### File Processing
- **`pdf-to-markdown`** - Convert PDF documents
- **`docx-to-markdown`** - Convert Word documents
- **`xlsx-to-markdown`** - Convert Excel spreadsheets  
- **`pptx-to-markdown`** - Convert PowerPoint presentations
- **`image-to-markdown`** - OCR text extraction from images

### Audio Processing
- **`audio-to-markdown`** - Basic audio transcription
- **`enhanced-audio-to-markdown`** - GPU-accelerated transcription
- **`cpu-audio-to-markdown`** - CPU-only transcription
- **`gpu-audio-to-markdown`** - GPU-only transcription
- **`audio-transcription-status`** - Check async transcription status

### Web Content  
- **`webpage-to-markdown`** - Convert web pages
- **`youtube-to-markdown`** - YouTube video transcripts
- **`bing-search-to-markdown`** - Search results conversion

### File Management
- **`get-markdown-file`** - Retrieve shared markdown files

## Usage in Roo Code

### Interactive Commands

Use Roo Code's command interface:

```
> Pdf2Md: Convert PDF to Markdown
File: /path/to/document.pdf

> Pdf2Md: Transcribe Audio  
File: /path/to/audio.mp3
Language: auto
Model: tiny

> Pdf2Md: Extract Text from Image
File: /path/to/image.png
```

### Chat Integration

In Roo Code chat:

```
@pdf2md Convert this PDF file to markdown: /Users/me/document.pdf

@pdf2md Transcribe this audio with GPU acceleration: /Users/me/meeting.wav

@pdf2md Get me the YouTube transcript for: https://youtube.com/watch?v=abc123

@pdf2md Extract text from this screenshot: /Users/me/screenshot.png
```

### Code Generation

Roo Code can use the tools for code generation:

```
Generate Python code to:
1. Convert a PDF to markdown using the @pdf2md tool
2. Save the result to a file
3. Print a summary
```

## Advanced Configuration

### Authentication

Add API keys or authentication:

```json
{
  "mcpServers": {
    "Pdf2Md": {
      "type": "streamable-http",
      "url": "http://localhost:3000/mcp/",
      "headers": {
        "Authorization": "Bearer your-api-token",
        "X-API-Key": "your-api-key"
      }
    }
  }
}
```

### Custom Timeouts

Configure timeouts for different operations:

```json
{
  "mcpServers": {
    "Pdf2Md": {
      "type": "streamable-http",
      "url": "http://localhost:3000/mcp/",
      "timeout": 900,  // 15 minutes for large files
      "retries": 1,    // Fewer retries for long operations
      "toolTimeouts": {
        "enhanced-audio-to-markdown": 1800,  // 30 minutes for GPU audio
        "pdf-to-markdown": 600,              // 10 minutes for large PDFs
        "image-to-markdown": 120             // 2 minutes for OCR
      }
    }
  }
}
```

### Connection Pooling

For high-throughput scenarios:

```json
{
  "mcpServers": {
    "Pdf2Md": {
      "type": "streamable-http",
      "url": "http://localhost:3000/mcp/",
      "maxConnections": 5,
      "keepAlive": true,
      "timeout": 300
    }
  }
}
```

## Docker Compose Integration

### Development Workflow

Integrate with your development docker-compose:

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  pdf2md-mcp:
    build: .
    ports:
      - "3000:3000"
    environment:
      - MCP_TRANSPORT=http
      - CORS_ORIGIN=*
      - NODE_ENV=development
    volumes:
      - ./uploads:/app/uploads
      - ./output:/app/output
      - ./shared:/app/shared
      - ./src:/app/src  # Live reload for development

  roo-workspace:
    image: your-roo-image
    volumes:
      - .:/workspace
      - ./.roo:/workspace/.roo
    depends_on:
      - pdf2md-mcp
```

### Production Deployment

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  pdf2md-mcp:
    image: pdf2md-mcp:latest
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      - MCP_TRANSPORT=http
      - CORS_ORIGIN=https://your-domain.com
      - NODE_ENV=production
    volumes:
      - pdf2md_uploads:/app/uploads
      - pdf2md_output:/app/output
      - pdf2md_shared:/app/shared
    restart: unless-stopped
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - pdf2md-mcp

volumes:
  pdf2md_uploads:
  pdf2md_output: 
  pdf2md_shared:
```

## Monitoring and Health Checks

### Health Check Commands

Use these in Roo Code terminal:

```bash
# Basic health check
curl http://localhost:3000/health

# Detailed system info
curl http://localhost:3000/health/detailed

# Check Docker container status
docker-compose ps

# View logs
docker-compose logs -f pdf2md-mcp
```

### Automated Monitoring

Create a monitoring script for Roo Code:

```javascript
// monitor-mcp.js
const fetch = require('node-fetch');

async function checkMCPHealth() {
  try {
    const response = await fetch('http://localhost:3000/health');
    const health = await response.json();
    
    console.log(`MCP Server Status: ${health.status}`);
    console.log(`Uptime: ${Math.round(health.uptime)}s`);
    console.log(`Version: ${health.version}`);
    
    return health.status === 'healthy';
  } catch (error) {
    console.error('MCP Server is not responding:', error.message);
    return false;
  }
}

// Run health check every 30 seconds
setInterval(checkMCPHealth, 30000);
checkMCPHealth();
```

## Performance Optimization

### For Large File Processing

```json
{
  "mcpServers": {
    "Pdf2Md": {
      "type": "streamable-http",
      "url": "http://localhost:3000/mcp/",
      "timeout": 1800,        // 30 minutes for very large files
      "maxConcurrent": 2,     // Limit concurrent operations  
      "retries": 1,           // Reduce retries for large ops
      "chunkSize": 1048576    // 1MB chunks for streaming
    }
  }
}
```

### GPU Acceleration

Enable GPU processing in Docker:

```yaml
services:
  pdf2md-mcp:
    runtime: nvidia
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
      - CUDA_VISIBLE_DEVICES=0
      - KMP_DUPLICATE_LIB_OK=TRUE
      - OMP_NUM_THREADS=4
```

And configure Roo Code to use GPU tools:

```json
{
  "mcpServers": {
    "Pdf2Md": {
      "preferredTools": [
        "gpu-audio-to-markdown",    // Use GPU version first
        "enhanced-audio-to-markdown",
        "audio-to-markdown"         // Fallback to CPU
      ]
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **Connection Failed:**
   ```bash
   # Check if Docker container is running
   docker-compose ps
   
   # Check port availability
   netstat -tulpn | grep 3000
   ```

2. **CORS Errors:**
   ```bash
   # Update CORS in .env
   CORS_ORIGIN=*
   docker-compose restart pdf2md-mcp
   ```

3. **Timeout Issues:**
   ```json
   // Increase timeout in .roo/mcp.json
   {
     "mcpServers": {
       "Pdf2Md": {
         "timeout": 900  // 15 minutes
       }
     }
   }
   ```

4. **File Processing Errors:**
   ```bash
   # Check volume mounts
   docker-compose logs pdf2md-mcp
   
   # Verify permissions
   ls -la uploads/ output/ shared/
   ```

### Debug Mode

Enable debug logging:

```yaml
# In docker-compose.yml
services:
  pdf2md-mcp:
    environment:
      - NODE_ENV=development
      - DEBUG=mcp:*
```

Then view detailed logs:

```bash
docker-compose logs -f pdf2md-mcp | grep DEBUG
```

### Tool Testing

Test individual tools:

```bash
# Test PDF conversion
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "pdf-to-markdown",
      "arguments": {"filepath": "/app/test.pdf"}
    }
  }'
```

## Security Best Practices

1. **Network Security:**
   ```yaml
   # Production: bind to localhost only
   ports:
     - "127.0.0.1:3000:3000"
   ```

2. **CORS Configuration:**
   ```bash
   # Restrict to Roo Code domains
   CORS_ORIGIN=https://roo.dev,https://app.roo.dev
   ```

3. **File Access Controls:**
   ```bash
   # Restrict shared directory access
   MD_SHARE_DIR=/app/safe-shared-dir
   ```

4. **Rate Limiting:**
   The server includes automatic rate limiting (100 requests/15min per IP).

## Integration Examples

### Automated Document Processing

```javascript
// Roo Code automation script
const processDocuments = async () => {
  const mcpClient = getRooMCPClient('Pdf2Md');
  
  const files = await getFilesToProcess();
  
  for (const file of files) {
    const result = await mcpClient.call('pdf-to-markdown', {
      filepath: file.path
    });
    
    await saveProcessedDocument(result.content);
  }
};
```

### Batch Audio Transcription

```javascript
// Batch process audio files
const transcribeAudioBatch = async (audioFiles) => {
  const mcpClient = getRooMCPClient('Pdf2Md');
  
  for (const audioFile of audioFiles) {
    // Use enhanced GPU transcription if available
    const result = await mcpClient.call('enhanced-audio-to-markdown', {
      filepath: audioFile,
      modelSize: 'base',
      device: 'auto'
    });
    
    console.log(`Transcribed: ${audioFile} -> ${result.content.length} chars`);
  }
};
```

## Support and Resources

- **GitHub Repository:** https://github.com/ArtemisAI/Pdf2Md
- **Docker Guide:** [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md)  
- **Roo Code Documentation:** https://roo.dev/docs
- **MCP Protocol:** https://modelcontextprotocol.io/
- **Health Check:** `curl http://localhost:3000/health`