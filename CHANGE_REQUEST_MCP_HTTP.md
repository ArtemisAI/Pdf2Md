# Change Request: Convert MCP Server to HTTP-Streamable Architecture

## Executive Summary

Convert the current stdio-based Model Context Protocol (MCP) server to an HTTP-streamable architecture using **Fast MCP Protocol (Streamable HTTP Transport, spec version 2025-03-26)** that enables always-available access for other agents and systems. This transformation will modernize the server architecture while maintaining all existing functionality and enhancing accessibility, scalability, and integration capabilities through Docker containerization.

## Current State Analysis & Investigation

### Current Architecture Deep Dive
- **Transport Protocol**: `StdioServerTransport` from `@modelcontextprotocol/sdk/server/stdio.js`
- **Entry Point**: `src/index.ts` using `createServer()` and `StdioServerTransport()`
- **Server Implementation**: `src/server.ts` with comprehensive tool handlers
- **Deployment Model**: Local process execution via command line (`node dist/index.js`)
- **Access Pattern**: Direct process spawning for each client session via stdio pipes
- **Communication**: Synchronous stdio pipes between client and server (JSON-RPC over stdin/stdout)
- **Availability**: On-demand execution only, no persistent service

### Fast MCP Protocol Investigation

#### Streamable HTTP Transport Specification (2025-03-26)
Based on investigation of `@modelcontextprotocol/sdk`, the Fast MCP protocol uses:

**Transport Class**: `StreamableHTTPServerTransport` from `@modelcontextprotocol/sdk/server/streamableHttp.js`

**Key Features Discovered**:
- **HTTP Methods**: GET (SSE streams), POST (JSON-RPC requests), DELETE (session termination)
- **Session Management**: Cryptographically secure session IDs with `Mcp-Session-Id` header
- **Dual Response Modes**: 
  - SSE streaming (`text/event-stream`) for real-time responses
  - Direct JSON responses (`application/json`) for immediate results
- **Resumability**: Event storage with `Last-Event-ID` header support
- **Authentication**: OAuth 2.0 Bearer token support with resource metadata
- **Protocol Negotiation**: `Mcp-Protocol-Version` header (supports 2024-11-05, 2025-03-26)

#### Implementation Architecture
```typescript
// Current (stdio-based)
const transport = new StdioServerTransport();

// Target (HTTP-streamable)  
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => randomUUID(),
  enableJsonResponse: true,
  eventStore: new RedisEventStore(),
  onsessioninitialized: (sessionId) => {
    console.log(`Session ${sessionId} initialized`);
  },
  onsessionclosed: (sessionId) => {
    console.log(`Session ${sessionId} closed`);
  }
});
```

### Existing Capabilities Analysis
- **File Conversion Tools**: PDF, DOCX, XLSX, PPTX, images to Markdown
- **Web Content Processing**: YouTube transcripts, Bing search results, webpage conversion
- **Audio Transcription**: GPU-accelerated (RTX 3060) audio-to-text with faster-whisper
- **Performance**: 19.4x real-time audio processing speed
- **Python Integration**: UV package manager for Python script execution
- **Error Handling**: Comprehensive fallback mechanisms (GPU → CPU)
- **Tool Count**: 11 tools including enhanced audio transcription with async support

### Technical Stack Audit
- **Runtime**: Node.js with TypeScript (ES modules)
- **MCP SDK**: `@modelcontextprotocol/sdk` v1.0.1 ✅ **Supports StreamableHTTPServerTransport**
- **Dependencies**: Zod validation, private-ip security
- **Python Backend**: UV package manager for Python script execution
- **GPU Acceleration**: CUDA 12.1, PyTorch 2.5.1+cu121, faster-whisper
- **Build System**: TypeScript compiler with chmod for executable dist files

## Target Architecture: HTTP-Streamable MCP

### Core Requirements

#### 1. **Always-Available Service**
- **Persistent Server Process**: Background daemon/service operation via Docker containers
- **High Availability**: 99.9% uptime with automatic restart mechanisms via Docker Swarm/Kubernetes
- **Load Balancing**: Support for horizontal scaling across multiple Docker container instances
- **Health Monitoring**: Endpoint monitoring and automatic recovery through container orchestration

#### 2. **HTTP-Based Communication**
- **Streamable HTTP Transport**: Implement MCP Streamable HTTP specification (2025-03-26)
- **RESTful API**: Standard HTTP methods (GET, POST, DELETE) as per MCP spec
- **Server-Sent Events (SSE)**: Real-time streaming for long-running operations
- **JSON Response Mode**: Support for both streaming and direct JSON responses

#### 3. **Session Management**
- **Stateful Sessions**: Maintain context across multiple requests using Redis backend
- **Session Persistence**: Docker volume-mounted Redis for session storage
- **Concurrent Sessions**: Support multiple simultaneous client connections (100+ target)
- **Session Termination**: Graceful cleanup and resource management

#### 4. **Streaming Capabilities**
- **Real-time Progress**: Live updates for long-running transcriptions via SSE
- **Partial Results**: Incremental delivery of processing results
- **Resumability**: Continue interrupted operations from last checkpoint using event store
- **Backpressure Handling**: Manage client-server flow control

### Docker Compose Architecture

#### Core Services Configuration
```yaml
version: '3.8'
services:
  mcp-server:
    build: 
      context: .
      dockerfile: Dockerfile.http
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
      - MCP_SESSION_TIMEOUT=3600
      - GPU_ENABLED=true
      - CUDA_VISIBLE_DEVICES=0
    volumes:
      - ./temp:/app/temp
      - ./logs:/app/logs
    depends_on:
      - redis
    deploy:
      replicas: 2
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    deploy:
      replicas: 1

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - mcp-server
    deploy:
      replicas: 1

volumes:
  redis_data:
  temp_storage:
  log_storage:
```

#### Docker Environment Setup
```dockerfile
# Dockerfile.http - Optimized for HTTP-MCP server
FROM nvidia/cuda:12.1-runtime-ubuntu22.04 AS base

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# Install Python and UV package manager  
RUN apt-get update && apt-get install -y python3 python3-pip curl && \
    curl -LsSf https://astral.sh/uv/install.sh | sh

# GPU dependencies
ENV CUDA_VISIBLE_DEVICES=0
ENV KMP_DUPLICATE_LIB_OK=TRUE
ENV OMP_NUM_THREADS=4

WORKDIR /app

# Copy package files first for better caching
COPY package*.json pnpm-lock.yaml ./
COPY pyproject.toml uv.lock requirements-gpu.txt ./

# Install dependencies
RUN corepack enable pnpm && pnpm install --frozen-lockfile
RUN ~/.cargo/bin/uv pip install --system -r requirements-gpu.txt

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Build TypeScript
RUN pnpm run build

# Production stage
FROM base AS production
RUN pnpm install --prod --frozen-lockfile

# Create non-root user
RUN useradd -m -u 1001 mcpuser && \
    chown -R mcpuser:mcpuser /app
USER mcpuser

# Health check endpoint
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
```

### Implementation Strategy

#### Phase 1: Core HTTP Transport Migration

##### 1.1 **Replace Transport Layer**
```typescript
// Current: stdio transport (src/index.ts)
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
const transport = new StdioServerTransport();

// Target: HTTP streamable transport (src/index.ts)
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "node:crypto";
import { RedisEventStore } from "./redis-event-store.js";

const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => randomUUID(),
  enableJsonResponse: true,
  eventStore: new RedisEventStore({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  }),
  onsessioninitialized: async (sessionId) => {
    console.log(`HTTP-MCP session initialized: ${sessionId}`);
    // Store session metadata in Redis
    await sessionStore.create(sessionId);
  },
  onsessionclosed: async (sessionId) => {
    console.log(`HTTP-MCP session closed: ${sessionId}`);
    // Clean up session resources
    await sessionStore.delete(sessionId);
  },
  enableDnsRebindingProtection: true,
  allowedHosts: process.env.ALLOWED_HOSTS?.split(',') || ['localhost'],
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['*']
});
```

##### 1.2 **HTTP Server Implementation**
```typescript
// New file: src/http-server.ts
import express from 'express';
import cors from 'cors';
import { createServer } from './server.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'node:crypto';

const app = express();

// Middleware
app.use(express.json({ limit: '100mb' })); // Support large audio files
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  exposedHeaders: ['Mcp-Session-Id', 'Content-Type'],
  credentials: true
}));

// Session storage
const transports: Record<string, StreamableHTTPServerTransport> = {};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    sessions: Object.keys(transports).length,
    gpu: process.env.CUDA_VISIBLE_DEVICES !== undefined
  });
});

// Main MCP endpoint - POST for requests
app.post('/mcp', async (req, res) => {
  try {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      // Reuse existing session
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // New session initialization
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        enableJsonResponse: true,
        onsessioninitialized: (sessionId) => {
          transports[sessionId] = transport;
          console.log(`Session ${sessionId} initialized`);
        },
        onsessionclosed: (sessionId) => {
          delete transports[sessionId];
          console.log(`Session ${sessionId} closed`);
        }
      });

      // Connect MCP server to transport
      const mcpServer = createServer();
      await mcpServer.connect(transport);
    } else {
      return res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Invalid session or initialization required' },
        id: null
      });
    }

    // Handle the request
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('MCP request error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null
      });
    }
  }
});

// SSE endpoint - GET for streams
app.get('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  
  if (!sessionId || !transports[sessionId]) {
    return res.status(400).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Invalid session ID' },
      id: null
    });
  }

  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
});

// Session termination - DELETE
app.delete('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  
  if (sessionId && transports[sessionId]) {
    const transport = transports[sessionId];
    await transport.close();
    delete transports[sessionId];
    
    res.json({ 
      jsonrpc: '2.0',
      result: { message: 'Session terminated' },
      id: null 
    });
  } else {
    res.status(404).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Session not found' },
      id: null
    });
  }
});

export { app };
```

##### 1.3 **Session Storage Integration**
```typescript
// New file: src/session-store.ts
import Redis from 'ioredis';

interface SessionData {
  sessionId: string;
  createdAt: Date;
  lastAccessed: Date;
  metadata: Record<string, any>;
}

export class RedisSessionStore {
  private redis: Redis;

  constructor(options: { host: string; port: number }) {
    this.redis = new Redis(options);
  }

  async create(sessionId: string): Promise<SessionData> {
    const session: SessionData = {
      sessionId,
      createdAt: new Date(),
      lastAccessed: new Date(),
      metadata: {}
    };
    
    await this.redis.setex(
      `session:${sessionId}`,
      3600, // 1 hour TTL
      JSON.stringify(session)
    );
    
    return session;
  }

  async get(sessionId: string): Promise<SessionData | null> {
    const data = await this.redis.get(`session:${sessionId}`);
    if (!data) return null;
    
    const session = JSON.parse(data) as SessionData;
    
    // Update last accessed time
    session.lastAccessed = new Date();
    await this.redis.setex(`session:${sessionId}`, 3600, JSON.stringify(session));
    
    return session;
  }

  async update(sessionId: string, metadata: Record<string, any>): Promise<void> {
    const session = await this.get(sessionId);
    if (!session) return;
    
    session.metadata = { ...session.metadata, ...metadata };
    session.lastAccessed = new Date();
    
    await this.redis.setex(`session:${sessionId}`, 3600, JSON.stringify(session));
  }

  async delete(sessionId: string): Promise<void> {
    await this.redis.del(`session:${sessionId}`);
  }

  async cleanup(): Promise<void> {
    // Redis TTL handles automatic cleanup
    const keys = await this.redis.keys('session:*');
    console.log(`Active sessions: ${keys.length}`);
  }
}

// Event store for resumability
export class RedisEventStore {
  private redis: Redis;

  constructor(options: { host: string; port: number }) {
    this.redis = new Redis(options);
  }

  async storeEvent(streamId: string, message: any): Promise<string> {
    const eventId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const key = `events:${streamId}`;
    
    await this.redis.zadd(key, Date.now(), JSON.stringify({ eventId, message }));
    await this.redis.expire(key, 86400); // 24 hour TTL
    
    return eventId;
  }

  async getEventsAfter(streamId: string, afterEventId?: string): Promise<any[]> {
    const key = `events:${streamId}`;
    let minScore = 0;
    
    if (afterEventId) {
      // Extract timestamp from event ID to determine starting point
      const timestamp = parseInt(afterEventId.split('-')[0]);
      minScore = timestamp + 1;
    }
    
    const events = await this.redis.zrangebyscore(key, minScore, '+inf');
    return events.map(event => JSON.parse(event));
  }

  async cleanup(streamId: string): Promise<void> {
    await this.redis.del(`events:${streamId}`);
  }
}
```

#### Phase 2: Streaming Enhancement

##### 2.1 **Progress Streaming Implementation**
```typescript
interface StreamingResponse {
  type: 'progress' | 'partial' | 'complete' | 'error';
  data: any;
  timestamp: number;
  sessionId: string;
}

// Enhanced audio transcription with streaming progress
export class StreamingAudioTranscriber {
  private eventStore: RedisEventStore;
  
  constructor(eventStore: RedisEventStore) {
    this.eventStore = eventStore;
  }

  async transcribeWithProgress(
    audioPath: string,
    sessionId: string,
    progressCallback: (progress: StreamingResponse) => void
  ): Promise<string> {
    const taskId = randomUUID();
    
    // Initialize progress
    await this.sendProgress(sessionId, {
      type: 'progress',
      data: { taskId, status: 'initializing', progress: 0 },
      timestamp: Date.now(),
      sessionId
    }, progressCallback);

    try {
      // GPU detection and model loading
      await this.sendProgress(sessionId, {
        type: 'progress',
        data: { taskId, status: 'loading_model', progress: 10 },
        timestamp: Date.now(),
        sessionId
      }, progressCallback);

      // Audio preprocessing
      await this.sendProgress(sessionId, {
        type: 'progress',
        data: { taskId, status: 'preprocessing', progress: 30 },
        timestamp: Date.now(),
        sessionId
      }, progressCallback);

      // Transcription with real-time progress
      const result = await this.performTranscription(audioPath, (progress) => {
        this.sendProgress(sessionId, {
          type: 'progress',
          data: { taskId, status: 'transcribing', progress: 30 + (progress * 0.6) },
          timestamp: Date.now(),
          sessionId
        }, progressCallback);
      });

      // Completion
      await this.sendProgress(sessionId, {
        type: 'complete',
        data: { taskId, status: 'completed', result, progress: 100 },
        timestamp: Date.now(),
        sessionId
      }, progressCallback);

      return result;
    } catch (error) {
      await this.sendProgress(sessionId, {
        type: 'error',
        data: { taskId, status: 'failed', error: error.message, progress: 100 },
        timestamp: Date.now(),
        sessionId
      }, progressCallback);
      throw error;
    }
  }

  private async sendProgress(
    sessionId: string, 
    progress: StreamingResponse, 
    callback: (progress: StreamingResponse) => void
  ): Promise<void> {
    // Store in event store for resumability
    await this.eventStore.storeEvent(sessionId, progress);
    
    // Send to callback (SSE stream)
    callback(progress);
  }
}
```

##### 2.2 **Resumability Support**
```typescript
interface EventStore {
  storeEvent(sessionId: string, event: StreamEvent): Promise<EventId>;
  getEventsAfter(sessionId: string, afterId?: EventId): Promise<StreamEvent[]>;
  cleanup(sessionId: string): Promise<void>;
}

// Enhanced MCP server with resumability
export class ResumableHttpServer {
  private eventStore: RedisEventStore;
  private sessionStore: RedisSessionStore;

  constructor() {
    this.eventStore = new RedisEventStore({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379')
    });
    this.sessionStore = new RedisSessionStore({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379')
    });
  }

  async handleResumeRequest(sessionId: string, lastEventId?: string): Promise<StreamEvent[]> {
    // Validate session
    const session = await this.sessionStore.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Get events after the last received event
    const events = await this.eventStore.getEventsAfter(sessionId, lastEventId);
    
    // Update session last accessed time
    await this.sessionStore.update(sessionId, { 
      lastAccessed: new Date(),
      resumeCount: (session.metadata.resumeCount || 0) + 1
    });

    return events;
  }

  async handleSessionCleanup(): Promise<void> {
    // Clean up expired sessions and events
    await this.sessionStore.cleanup();
    
    // Clean up old events (Redis TTL handles this automatically)
    console.log('Session cleanup completed');
  }
}
```

#### Phase 3: Enhanced Integration Features

##### 3.1 **API Gateway Integration**
```typescript
// OpenAPI specification for external integration
const apiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Pdf2Md MCP HTTP Server',
    version: '2.0.0',
    description: 'HTTP-streamable MCP server for document conversion and audio transcription'
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Development server' },
    { url: 'https://api.pdf2md.io', description: 'Production server' }
  ],
  paths: {
    '/mcp': {
      post: {
        summary: 'MCP JSON-RPC over HTTP',
        description: 'Send MCP requests via HTTP POST',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                oneOf: [
                  { $ref: '#/components/schemas/InitializeRequest' },
                  { $ref: '#/components/schemas/ToolCallRequest' },
                  { $ref: '#/components/schemas/ListToolsRequest' }
                ]
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'MCP response',
            headers: {
              'Mcp-Session-Id': {
                description: 'Session identifier for stateful operations',
                schema: { type: 'string' }
              }
            },
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/MCPResponse' } },
              'text/event-stream': { schema: { type: 'string' } }
            }
          }
        }
      },
      get: {
        summary: 'Establish SSE stream for real-time updates',
        parameters: [
          {
            name: 'Mcp-Session-Id',
            in: 'header',
            required: true,
            schema: { type: 'string' }
          },
          {
            name: 'Last-Event-ID',
            in: 'header',
            description: 'Resume from this event ID',
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': {
            description: 'Server-Sent Events stream',
            content: {
              'text/event-stream': { schema: { type: 'string' } }
            }
          }
        }
      },
      delete: {
        summary: 'Terminate session',
        parameters: [
          {
            name: 'Mcp-Session-Id',
            in: 'header',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': { description: 'Session terminated successfully' },
          '404': { description: 'Session not found' }
        }
      }
    },
    '/health': {
      get: {
        summary: 'Health check endpoint',
        responses: {
          '200': {
            description: 'Service health status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['healthy', 'unhealthy'] },
                    timestamp: { type: 'string', format: 'date-time' },
                    sessions: { type: 'number' },
                    gpu: { type: 'boolean' }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      InitializeRequest: {
        type: 'object',
        properties: {
          jsonrpc: { type: 'string', enum: ['2.0'] },
          method: { type: 'string', enum: ['initialize'] },
          params: {
            type: 'object',
            properties: {
              protocolVersion: { type: 'string' },
              capabilities: { type: 'object' },
              clientInfo: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  version: { type: 'string' }
                }
              }
            }
          },
          id: { type: ['string', 'number'] }
        }
      }
    }
  }
};
```

##### 3.2 **Authentication & Authorization**
```typescript
// OAuth 2.0 integration for enterprise security
interface AuthProvider {
  validateToken(token: string): Promise<AuthResult>;
  getResourceMetadata(): ResourceMetadata;
}

// Bearer token authentication middleware
const authMiddleware = requireBearerAuth({
  verifier: tokenVerifier,
  requiredScopes: ['mcp:convert', 'mcp:transcribe'],
  resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl()
});

// Enhanced HTTP server with authentication
app.use('/mcp', authMiddleware);

// Token validation function
async function tokenVerifier(token: string): Promise<AuthInfo> {
  try {
    // JWT validation
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    
    // Additional validation against user database
    const user = await getUserByToken(token);
    if (!user || !user.active) {
      throw new Error('Invalid or inactive user');
    }

    return {
      token,
      userId: user.id,
      scopes: user.scopes,
      metadata: {
        name: user.name,
        email: user.email,
        tier: user.subscriptionTier
      }
    };
  } catch (error) {
    throw new UnauthorizedError('Invalid token');
  }
}

// Rate limiting by user tier
const createRateLimiter = (tier: string) => {
  const limits = {
    free: { windowMs: 15 * 60 * 1000, max: 10 }, // 10 requests per 15 minutes
    pro: { windowMs: 15 * 60 * 1000, max: 100 }, // 100 requests per 15 minutes
    enterprise: { windowMs: 15 * 60 * 1000, max: 1000 } // 1000 requests per 15 minutes
  };

  return rateLimit(limits[tier] || limits.free);
};
```

#### Phase 4: Deployment & Operations

##### 4.1 **Containerization**
```dockerfile
# Multi-stage Dockerfile for HTTP-MCP server
FROM nvidia/cuda:12.1-runtime-ubuntu22.04 AS base

# Install Node.js 20 and system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    python3 \
    python3-pip \
    build-essential \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install UV package manager
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.cargo/bin:$PATH"

# GPU environment configuration
ENV CUDA_VISIBLE_DEVICES=0
ENV KMP_DUPLICATE_LIB_OK=TRUE
ENV OMP_NUM_THREADS=4

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json pnpm-lock.yaml ./
COPY pyproject.toml uv.lock ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Install Python GPU dependencies
COPY requirements-gpu.txt ./
RUN uv pip install --system -r requirements-gpu.txt

# Copy source and build
COPY . .
RUN pnpm run build

# Production stage
FROM base AS production
RUN pnpm install --prod --frozen-lockfile

# Create non-root user for security
RUN groupadd -r mcpuser && useradd -r -g mcpuser mcpuser
RUN chown -R mcpuser:mcpuser /app
USER mcpuser

# Expose HTTP port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start HTTP server
CMD ["node", "dist/http-server.js"]
```

##### 4.2 **Service Discovery & Orchestration**
```yaml
# docker-compose.yml for complete deployment
version: '3.8'

services:
  mcp-server:
    build: .
    ports:
      - "3000:3000"
    environment:
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=production
    depends_on:
      - redis
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

### Technical Specifications

#### HTTP Endpoints

##### Core MCP Protocol
- **POST /mcp**: Primary MCP communication endpoint
- **GET /mcp**: Server-Sent Events stream establishment
- **DELETE /mcp**: Session termination

##### RESTful API (Optional)
- **POST /api/v1/convert/pdf**: Direct PDF conversion
- **POST /api/v1/convert/audio**: Direct audio transcription
- **GET /api/v1/status/{taskId}**: Task status checking
- **GET /api/v1/health**: Health check endpoint

#### Message Protocol

##### Request Format
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "enhanced-audio-to-markdown",
    "arguments": {
      "filepath": "/path/to/audio.mp3",
      "language": "en",
      "device": "auto",
      "asyncMode": true
    }
  },
  "id": "req-123"
}
```

##### Streaming Response Format
```json
{
  "jsonrpc": "2.0",
  "result": {
    "taskId": "task-456",
    "status": "processing",
    "progress": 0.25,
    "partialResult": "Transcription in progress...",
    "estimatedCompletion": "2025-09-17T14:30:00Z"
  },
  "id": "req-123"
}
```

#### Performance Requirements

##### Scalability Targets
- **Concurrent Sessions**: Support 100+ simultaneous connections
- **Request Throughput**: Handle 1000+ requests per minute
- **Memory Usage**: <2GB base + 4GB per GPU processing session
- **Response Time**: <100ms for non-processing endpoints

##### GPU Acceleration Preservation
- **Processing Speed**: Maintain 19.4x real-time audio transcription
- **Model Loading**: <1.2s initialization time
- **Memory Management**: Efficient CUDA memory cleanup
- **Fallback Mechanism**: Graceful GPU→CPU degradation

### Security Considerations

#### Network Security
- **HTTPS Only**: TLS 1.3 encryption for all communications
- **CORS Policy**: Configurable origin restrictions
- **Rate Limiting**: Per-IP and per-session request limits
- **Input Validation**: Comprehensive request sanitization

#### File Security
- **Upload Limits**: Maximum file size restrictions (100MB default)
- **File Type Validation**: MIME type and extension verification
- **Temporary Storage**: Secure cleanup of processed files
- **Path Traversal Protection**: Sandboxed file access

#### Authentication Integration
- **OAuth 2.0**: Industry-standard authorization
- **JWT Tokens**: Stateless authentication support
- **API Keys**: Simple authentication for service-to-service
- **Session Security**: Secure session ID generation and validation

### Monitoring & Observability

#### Metrics Collection
- **Request Metrics**: Response times, error rates, throughput
- **Resource Metrics**: CPU, memory, GPU utilization
- **Business Metrics**: Conversion success rates, processing speeds
- **Session Metrics**: Active sessions, session duration, concurrency

#### Logging Strategy
- **Structured Logging**: JSON format with correlation IDs
- **Log Levels**: DEBUG, INFO, WARN, ERROR with configurable thresholds
- **Security Logging**: Authentication attempts, suspicious activities
- **Performance Logging**: Processing times, GPU utilization patterns

#### Health Checks
- **Readiness Probe**: Server startup completion
- **Liveness Probe**: Ongoing service health
- **GPU Health**: CUDA availability and memory status
- **Dependency Health**: Redis connectivity, Python environment

### Migration Strategy

#### Phase 1: Parallel Implementation (Weeks 1-2)
1. **Create HTTP Transport**: Implement alongside existing stdio transport
2. **Basic Endpoints**: GET, POST, DELETE with session management
3. **Existing Tool Integration**: Migrate all current tools to HTTP
4. **Testing Framework**: Comprehensive test suite for HTTP endpoints

#### Phase 2: Streaming Enhancement (Weeks 3-4)
1. **SSE Implementation**: Real-time progress streaming
2. **Resumability**: Event storage and continuation support
3. **Performance Optimization**: Connection pooling, caching
4. **Load Testing**: Validate concurrent session handling

#### Phase 3: Production Readiness (Weeks 5-6)
1. **Security Hardening**: Authentication, authorization, input validation
2. **Monitoring Integration**: Metrics, logging, alerting
3. **Documentation**: API documentation, deployment guides
4. **Deployment Automation**: CI/CD pipelines, containerization

#### Phase 4: Legacy Deprecation (Weeks 7-8)
1. **Backward Compatibility**: Maintain stdio support temporarily
2. **Migration Tools**: Client migration assistance utilities
3. **Performance Validation**: Confirm feature parity and performance
4. **Production Deployment**: Full rollout with monitoring

### Success Criteria

#### Functional Requirements
- ✅ **API Compatibility**: All existing tools accessible via HTTP
- ✅ **Performance Parity**: Maintain GPU acceleration benefits
- ✅ **Session Management**: Support multiple concurrent clients
- ✅ **Streaming Support**: Real-time progress for long operations

#### Non-Functional Requirements
- ✅ **Availability**: 99.9% uptime with automatic recovery
- ✅ **Scalability**: Support 100+ concurrent sessions
- ✅ **Security**: Enterprise-grade authentication and authorization
- ✅ **Observability**: Comprehensive monitoring and alerting

#### Business Objectives
- ✅ **Agent Integration**: Enable seamless third-party agent access
- ✅ **Service Reliability**: Always-available processing capabilities
- ✅ **Developer Experience**: Simple HTTP API for easy integration
- ✅ **Operational Excellence**: Reduced deployment and maintenance overhead

### Risk Assessment & Mitigation

#### Technical Risks
| Risk | Impact | Probability | Mitigation |
|------|---------|-------------|------------|
| GPU Driver Compatibility | High | Medium | Docker GPU runtime, fallback mechanisms |
| Session State Management | Medium | Low | Redis clustering, session replication |
| Memory Leaks | High | Low | Comprehensive testing, monitoring |
| Performance Regression | High | Low | Benchmarking, load testing |

#### Operational Risks
| Risk | Impact | Probability | Mitigation |
|------|---------|-------------|------------|
| Deployment Complexity | Medium | Medium | Containerization, automation |
| Client Migration | Medium | High | Backward compatibility, migration tools |
| Security Vulnerabilities | High | Low | Security audits, penetration testing |
| Scaling Challenges | Medium | Medium | Load testing, horizontal scaling design |

### Development Timeline

#### Week 1-2: Foundation
- [ ] HTTP transport implementation
- [ ] Basic session management
- [ ] Tool migration to HTTP endpoints
- [ ] Unit test coverage

#### Week 3-4: Enhancement
- [ ] SSE streaming implementation
- [ ] Resumability support
- [ ] Performance optimization
- [ ] Integration testing

#### Week 5-6: Production Readiness
- [ ] Security implementation
- [ ] Monitoring integration
- [ ] Load testing
- [ ] Documentation completion

#### Week 7-8: Deployment
- [ ] CI/CD pipeline setup
- [ ] Production deployment
- [ ] Performance validation
- [ ] Legacy deprecation planning

### Comprehensive Testing Strategy

#### Unit Testing Framework
```typescript
// tests/http-transport.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from '../src/server.js';
import supertest from 'supertest';
import { app } from '../src/http-server.js';

describe('HTTP-MCP Transport', () => {
  let request: supertest.SuperTest<supertest.Test>;
  
  beforeEach(() => {
    request = supertest(app);
  });

  test('should handle initialize request', async () => {
    const response = await request
      .post('/mcp')
      .send({
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' }
        },
        id: 1
      })
      .expect(200);

    expect(response.headers['mcp-session-id']).toBeDefined();
    expect(response.body.result).toBeDefined();
  });

  test('should list all tools', async () => {
    // First initialize
    const initResponse = await request
      .post('/mcp')
      .send({
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' }
        },
        id: 1
      });

    const sessionId = initResponse.headers['mcp-session-id'];

    // Then list tools
    const response = await request
      .post('/mcp')
      .set('mcp-session-id', sessionId)
      .send({
        jsonrpc: '2.0',
        method: 'tools/list',
        id: 2
      })
      .expect(200);

    expect(response.body.result.tools).toHaveLength(11);
    expect(response.body.result.tools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'enhanced-audio-to-markdown' }),
        expect.objectContaining({ name: 'pdf-to-markdown' }),
        expect.objectContaining({ name: 'image-to-markdown' })
      ])
    );
  });

  test('should handle SSE stream establishment', async () => {
    // Initialize session first
    const initResponse = await request
      .post('/mcp')
      .send({
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' }
        },
        id: 1
      });

    const sessionId = initResponse.headers['mcp-session-id'];

    // Establish SSE stream
    const response = await request
      .get('/mcp')
      .set('mcp-session-id', sessionId)
      .set('accept', 'text/event-stream')
      .expect(200);

    expect(response.headers['content-type']).toContain('text/event-stream');
  });
});
```

#### Integration Testing
```typescript
// tests/integration/audio-transcription.test.ts
import { describe, test, expect } from 'vitest';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import path from 'path';

describe('Audio Transcription Integration', () => {
  test('should transcribe audio with streaming progress', async () => {
    const transport = new StreamableHTTPClientTransport(
      new URL('http://localhost:3000/mcp')
    );
    
    const client = new Client(
      { name: 'test-client', version: '1.0.0' },
      { capabilities: {} }
    );

    const progressEvents: any[] = [];
    
    transport.onmessage = (message) => {
      if (message.method === 'notifications/progress') {
        progressEvents.push(message.params);
      }
    };

    await client.connect(transport);

    const testAudioPath = path.join(__dirname, '../fixtures/test_audio.mp3');
    
    const result = await client.callTool('enhanced-audio-to-markdown', {
      filepath: testAudioPath,
      language: 'en',
      device: 'auto',
      asyncMode: false
    });

    expect(result.content).toBeDefined();
    expect(result.content[0].text).toContain('transcription');
    
    await client.close();
  });
});
```

#### Load Testing
```typescript
// tests/load/concurrent-sessions.test.ts
import { describe, test, expect } from 'vitest';
import { Worker } from 'worker_threads';
import path from 'path';

describe('Load Testing', () => {
  test('should handle 100 concurrent sessions', async () => {
    const workerCount = 10;
    const sessionsPerWorker = 10;
    const workers: Worker[] = [];
    const results: Promise<any>[] = [];

    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker(path.join(__dirname, 'session-worker.js'), {
        workerData: { 
          sessionsPerWorker,
          serverUrl: 'http://localhost:3000/mcp'
        }
      });

      workers.push(worker);
      
      results.push(new Promise((resolve, reject) => {
        worker.on('message', resolve);
        worker.on('error', reject);
      }));
    }

    const allResults = await Promise.all(results);
    
    // Cleanup
    workers.forEach(worker => worker.terminate());

    // Verify all sessions completed successfully
    const totalSessions = allResults.reduce((sum, result) => sum + result.successfulSessions, 0);
    expect(totalSessions).toBe(workerCount * sessionsPerWorker);
  }, 60000);
});
```

### Monitoring & Observability Implementation

#### Prometheus Metrics
```typescript
// src/monitoring/metrics.ts
import client from 'prom-client';

export const metrics = {
  httpRequestDuration: new client.Histogram({
    name: 'mcp_http_request_duration_seconds',
    help: 'Duration of HTTP requests',
    labelNames: ['method', 'status', 'endpoint']
  }),

  activeConnections: new client.Gauge({
    name: 'mcp_active_connections',
    help: 'Number of active WebSocket connections'
  }),

  sessionCount: new client.Gauge({
    name: 'mcp_active_sessions',
    help: 'Number of active MCP sessions'
  }),

  toolInvocations: new client.Counter({
    name: 'mcp_tool_invocations_total',
    help: 'Total number of tool invocations',
    labelNames: ['tool_name', 'status']
  }),

  audioTranscriptionDuration: new client.Histogram({
    name: 'mcp_audio_transcription_duration_seconds',
    help: 'Duration of audio transcription operations',
    labelNames: ['model_size', 'device']
  }),

  gpuUtilization: new client.Gauge({
    name: 'mcp_gpu_utilization_percent',
    help: 'GPU utilization percentage'
  })
};

// Middleware to collect HTTP metrics
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    metrics.httpRequestDuration
      .labels(req.method, res.statusCode.toString(), req.path)
      .observe(duration);
  });
  
  next();
};
```

#### Health Check Implementation
```typescript
// src/health/health-check.ts
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    redis: 'pass' | 'fail';
    gpu: 'pass' | 'fail' | 'n/a';
    diskSpace: 'pass' | 'warn' | 'fail';
    memory: 'pass' | 'warn' | 'fail';
  };
  metrics: {
    activeSessions: number;
    uptime: number;
    memoryUsage: number;
    diskUsage: number;
  };
}

export class HealthChecker {
  async getHealth(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkRedis(),
      this.checkGPU(),
      this.checkDiskSpace(),
      this.checkMemory()
    ]);

    const [redisCheck, gpuCheck, diskCheck, memoryCheck] = checks;

    return {
      status: this.determineOverallStatus(checks),
      checks: {
        redis: redisCheck.status === 'fulfilled' ? 'pass' : 'fail',
        gpu: gpuCheck.status === 'fulfilled' ? 'pass' : 'fail',
        diskSpace: diskCheck.status === 'fulfilled' ? 'pass' : 'fail',
        memory: memoryCheck.status === 'fulfilled' ? 'pass' : 'fail'
      },
      metrics: {
        activeSessions: this.getActiveSessionCount(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
        diskUsage: await this.getDiskUsage()
      }
    };
  }

  private async checkRedis(): Promise<void> {
    // Redis connectivity check
    await this.redis.ping();
  }

  private async checkGPU(): Promise<void> {
    // GPU availability check
    if (process.env.CUDA_VISIBLE_DEVICES) {
      // Check CUDA availability
      const { execSync } = await import('child_process');
      execSync('nvidia-smi', { timeout: 5000 });
    }
  }

  private async checkDiskSpace(): Promise<void> {
    const { statSync } = await import('fs');
    const stats = statSync('.');
    // Check if disk usage is below 90%
    if (stats.size / stats.blocks > 0.9) {
      throw new Error('Disk usage too high');
    }
  }

  private async checkMemory(): Promise<void> {
    const usage = process.memoryUsage();
    const totalMem = require('os').totalmem();
    if (usage.heapUsed / totalMem > 0.8) {
      throw new Error('Memory usage too high');
    }
  }
}
```

### CI/CD Pipeline Implementation

#### GitHub Actions Workflow
```yaml
# .github/workflows/http-mcp-ci.yml
name: HTTP-MCP Server CI/CD

on:
  push:
    branches: [HTTP-MCP, main]
  pull_request:
    branches: [HTTP-MCP, main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}/http-mcp-server

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: |
          corepack enable pnpm
          pnpm install --frozen-lockfile
      
      - name: Setup Python and UV
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install UV and Python dependencies
        run: |
          curl -LsSf https://astral.sh/uv/install.sh | sh
          uv pip install --system -r requirements-gpu.txt
      
      - name: Build project
        run: pnpm run build
      
      - name: Run unit tests
        run: pnpm test
        env:
          REDIS_URL: redis://localhost:6379
      
      - name: Run integration tests
        run: pnpm test:integration
        env:
          REDIS_URL: redis://localhost:6379
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/HTTP-MCP'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha,prefix=sha-
      
      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile.http
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/HTTP-MCP'
    environment: production
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to production
        run: |
          echo "Deploying HTTP-MCP server to production"
          # Add actual deployment commands here
```

### Implementation Checklist

#### Phase 1: Foundation (Week 1-2)
- [ ] **HTTP Transport Layer**
  - [ ] Replace `StdioServerTransport` with `StreamableHTTPServerTransport`
  - [ ] Implement Express.js HTTP server (`src/http-server.ts`)
  - [ ] Add session management with Redis backend
  - [ ] Configure CORS and security headers

- [ ] **Tool Migration**
  - [ ] Verify all 11 existing tools work via HTTP
  - [ ] Test audio transcription with GPU acceleration
  - [ ] Validate file upload handling (100MB limit)
  - [ ] Test error handling and fallback mechanisms

- [ ] **Basic Testing**
  - [ ] Unit tests for HTTP transport
  - [ ] Integration tests for tool invocation
  - [ ] Basic load testing (10 concurrent sessions)

#### Phase 2: Streaming & Resumability (Week 3-4)
- [ ] **Server-Sent Events**
  - [ ] Implement SSE endpoint for real-time progress
  - [ ] Add progress reporting for audio transcription
  - [ ] Test streaming with large file uploads

- [ ] **Event Store & Resumability**
  - [ ] Implement Redis-based event storage
  - [ ] Add `Last-Event-ID` header support
  - [ ] Test session resumption after disconnection

- [ ] **Advanced Testing**
  - [ ] Load testing (100+ concurrent sessions)
  - [ ] Streaming performance tests
  - [ ] Resumability integration tests

#### Phase 3: Production Features (Week 5-6)
- [ ] **Security Implementation**
  - [ ] OAuth 2.0 Bearer token authentication
  - [ ] Rate limiting by user tier
  - [ ] Input validation and sanitization
  - [ ] DNS rebinding protection

- [ ] **Monitoring & Observability**
  - [ ] Prometheus metrics collection
  - [ ] Health check endpoint
  - [ ] Structured logging with correlation IDs
  - [ ] Grafana dashboards

- [ ] **Performance Optimization**
  - [ ] Connection pooling
  - [ ] Redis optimization
  - [ ] Memory leak detection and prevention

#### Phase 4: Deployment (Week 7-8)
- [ ] **Containerization**
  - [ ] Multi-stage Dockerfile with GPU support
  - [ ] Docker Compose with all services
  - [ ] Kubernetes deployment manifests
  - [ ] Nginx load balancer configuration

- [ ] **CI/CD Pipeline**
  - [ ] GitHub Actions workflow
  - [ ] Automated testing in CI
  - [ ] Docker image building and publishing
  - [ ] Automated deployment to staging/production

- [ ] **Documentation & Migration**
  - [ ] API documentation with OpenAPI spec
  - [ ] Migration guide from stdio to HTTP
  - [ ] Performance benchmarking results
  - [ ] Operational runbooks

#### Development Team
- **Backend Developer**: HTTP server implementation, session management
- **DevOps Engineer**: Containerization, deployment automation
- **Security Engineer**: Authentication, authorization, security hardening
- **QA Engineer**: Testing strategy, load testing, security testing

#### Infrastructure
- **Development Environment**: GPU-enabled development machines
- **Testing Environment**: Multi-node cluster for scalability testing
- **Production Environment**: Kubernetes cluster with GPU nodes
- **Monitoring Stack**: Prometheus, Grafana, ELK stack

### Conclusion

### Resource Requirements

#### Development Team
- **Senior Backend Developer**: HTTP server implementation, session management, StreamableHTTPServerTransport integration
- **DevOps Engineer**: Docker containerization, Kubernetes deployment, CI/CD pipeline setup
- **Security Engineer**: OAuth 2.0 implementation, rate limiting, input validation, penetration testing
- **QA Engineer**: Test automation, load testing, integration testing, performance validation

#### Infrastructure Requirements
- **Development Environment**: 
  - GPU-enabled development machines (RTX 3060 or better)
  - Redis instance for session/event storage testing
  - Docker with GPU runtime support

- **Testing Environment**: 
  - Multi-node Kubernetes cluster for scalability testing
  - Load testing tools (Artillery, k6)
  - GPU monitoring tools (nvidia-smi, nvtop)

- **Production Environment**: 
  - Kubernetes cluster with GPU nodes
  - Redis cluster for high availability
  - Nginx load balancer with SSL termination
  - Monitoring stack (Prometheus, Grafana, ELK)

#### Technical Dependencies
- **Required Packages**:
  ```json
  {
    "express": "^4.18.2",
    "cors": "^2.8.5", 
    "ioredis": "^5.3.2",
    "jsonwebtoken": "^9.0.2",
    "express-rate-limit": "^7.1.5",
    "prom-client": "^15.1.0",
    "helmet": "^7.1.0"
  }
  ```

- **Infrastructure Services**:
  - Redis 7+ for session/event storage
  - Nginx for load balancing and SSL termination
  - Prometheus for metrics collection
  - Grafana for monitoring dashboards

### Performance Benchmarks & Targets

#### Baseline Performance (Current stdio)
- **Tool Response Time**: ~100-500ms for simple conversions
- **Audio Transcription**: 19.4x real-time with GPU acceleration
- **Concurrent Sessions**: 1 (stdio limitation)
- **Memory Usage**: ~500MB base + 2GB per GPU operation

#### HTTP-MCP Performance Targets
- **Tool Response Time**: <200ms for simple conversions (maintain performance)
- **Audio Transcription**: ≥15x real-time with GPU (allow 20% degradation)
- **Concurrent Sessions**: 100+ simultaneous connections
- **Session Overhead**: <50MB per active session
- **HTTP Latency**: <50ms additional overhead vs stdio
- **Throughput**: 1000+ requests per minute per instance

#### Load Testing Scenarios
1. **Burst Load**: 50 concurrent PDF conversions
2. **Sustained Load**: 10 concurrent audio transcriptions for 1 hour
3. **Mixed Workload**: 30% audio, 40% PDF, 20% images, 10% web content
4. **Session Stress**: 500 sessions with periodic activity over 4 hours

### Security Considerations

#### Network Security
- **HTTPS Only**: TLS 1.3 encryption for all communications
- **CORS Policy**: Configurable origin restrictions for browser security
- **Rate Limiting**: Per-IP (10/min) and per-session (100/min) limits
- **Input Validation**: Comprehensive request sanitization and size limits

#### File Security  
- **Upload Limits**: Maximum 100MB file size per request
- **File Type Validation**: MIME type and extension verification
- **Temporary Storage**: Secure cleanup of processed files (auto-delete after 1 hour)
- **Path Traversal Protection**: Sandboxed file access with chroot

#### Authentication & Authorization
- **OAuth 2.0**: Industry-standard Bearer token authentication
- **JWT Tokens**: Stateless authentication with configurable expiration
- **Scope-based Access**: Fine-grained permissions (convert, transcribe, admin)
- **Session Security**: Cryptographically secure session IDs (UUID v4)

#### Data Privacy
- **No Data Persistence**: Files deleted immediately after processing
- **Session Isolation**: Complete separation between user sessions
- **Audit Logging**: Comprehensive security event logging
- **GDPR Compliance**: No user data retention beyond session lifetime

### Risk Assessment & Mitigation

#### Technical Risks
| Risk | Impact | Probability | Mitigation Strategy |
|------|---------|-------------|-------------------|
| GPU Driver Compatibility | High | Medium | Docker GPU runtime, CPU fallback, automated testing |
| Session State Management | Medium | Low | Redis clustering, session replication, health checks |
| Memory Leaks | High | Low | Automated testing, monitoring, memory profiling |
| Performance Regression | High | Low | Benchmarking, load testing, performance budgets |
| SSL Certificate Issues | Medium | Medium | Automated renewal, monitoring, fallback certificates |

#### Operational Risks  
| Risk | Impact | Probability | Mitigation Strategy |
|------|---------|-------------|-------------------|
| Container Orchestration | Medium | Medium | Kubernetes best practices, rolling deployments |
| Redis Data Loss | Medium | Low | Redis persistence, regular backups, clustering |
| Network Partitions | High | Low | Circuit breakers, retry logic, graceful degradation |
| Scaling Bottlenecks | Medium | Medium | Horizontal scaling, load testing, capacity planning |
| Security Vulnerabilities | High | Low | Regular audits, dependency scanning, penetration testing |

#### Business Risks
| Risk | Impact | Probability | Mitigation Strategy |
|------|---------|-------------|-------------------|
| Client Migration Friction | Medium | High | Backward compatibility, migration tools, documentation |
| Increased Infrastructure Costs | Medium | Medium | Cost monitoring, auto-scaling, resource optimization |
| Service Reliability Issues | High | Low | SLA monitoring, redundancy, incident response |
| Feature Parity Gaps | Medium | Medium | Comprehensive testing, gradual migration, feature flags |

### Success Metrics & KPIs

#### Technical Metrics
- **Availability**: 99.9% uptime (target: <8.77 hours downtime/year)
- **Performance**: Maintain 90th percentile response times under 500ms
- **Scalability**: Support 100+ concurrent sessions at 80% resource utilization
- **Reliability**: <0.1% error rate under normal load conditions

#### Business Metrics
- **Adoption Rate**: 80% of existing stdio clients migrate within 3 months
- **User Satisfaction**: >4.5/5 rating in post-migration surveys
- **Support Tickets**: <5% increase in support volume during migration
- **Cost Efficiency**: Infrastructure costs scale linearly with usage

#### Operational Metrics
- **Deployment Frequency**: Daily deployments with <5 minute rollback time
- **Mean Time to Recovery (MTTR)**: <30 minutes for critical issues
- **Security Incidents**: Zero critical security vulnerabilities in production
- **Monitoring Coverage**: 100% of critical paths covered by monitoring

### Conclusion

This comprehensive change request outlines the complete transformation of the Pdf2Md MCP server from a stdio-based local process to a modern, scalable HTTP-streamable service. The proposed architecture leverages the latest MCP Streamable HTTP specification (2025-03-26) to provide:

#### Key Benefits Delivered
1. **Always-Available Service**: 24/7 accessibility via standard HTTP endpoints
2. **Horizontal Scalability**: Support for 100+ concurrent sessions with Docker orchestration  
3. **Real-time Streaming**: Live progress updates for long-running audio transcription
4. **Enterprise Security**: OAuth 2.0, rate limiting, and comprehensive audit logging
5. **Operational Excellence**: Full observability, automated deployment, and incident response

#### Technical Excellence
- **Performance Preservation**: Maintains 19.4x GPU acceleration with <20% HTTP overhead
- **Backward Compatibility**: Gradual migration path with stdio support during transition
- **Production Readiness**: Comprehensive testing, monitoring, and documentation
- **Cloud Native**: Docker containers, Kubernetes orchestration, and microservice architecture

#### Implementation Readiness
- **Proven Foundation**: Built on `@modelcontextprotocol/sdk` v1.0.1 with established patterns
- **Comprehensive Planning**: 8-week timeline with detailed phase breakdown and success criteria
- **Risk Mitigation**: Thorough risk analysis with specific mitigation strategies for all identified concerns
- **Resource Allocation**: Clear team structure and infrastructure requirements

#### Expected Outcomes
Upon successful completion, this transformation will enable:
- **Seamless Agent Integration**: Standard HTTP APIs accessible by any system or agent
- **Enhanced Developer Experience**: OpenAPI documentation, SDKs, and integration examples  
- **Operational Scalability**: Automated deployment, monitoring, and incident response
- **Future-Proof Architecture**: Foundation for advanced features like multi-tenancy and geo-distribution

The estimated 8-week implementation timeline provides a realistic and achievable path to production deployment while maintaining the highest standards for code quality, testing coverage, and operational excellence.

---

**Immediate Next Steps**: 
1. **Approve Change Request**: Technical and business stakeholder review and approval
2. **Allocate Resources**: Assign development team and provision infrastructure  
3. **Initialize Environment**: Set up development, testing, and CI/CD environments
4. **Begin Phase 1**: Start HTTP transport layer implementation with StreamableHTTPServerTransport

**Project Status**: Ready for immediate implementation - all technical research completed, architecture validated, and implementation roadmap established.

**Contact**: Development team standing by for implementation kickoff upon stakeholder approval.

---

*Document Version: 2.0 - Updated with comprehensive Fast MCP Protocol investigation and Docker deployment strategy*  
*Last Updated: September 17, 2025 - HTTP-MCP Implementation Planning Phase*