# Change Request: Convert MCP Server to HTTP-Streamable Architecture

## Executive Summary

Convert the current stdio-based Model Context Protocol (MCP) server to an HTTP-streamable architecture that enables always-available access for other agents and systems. This transformation will modernize the server architecture while maintaining all existing functionality and enhancing accessibility, scalability, and integration capabilities.

## Current State Analysis

### Architecture Overview
- **Transport Protocol**: stdio-based MCP using `StdioServerTransport`
- **Deployment Model**: Local process execution via command line
- **Access Pattern**: Direct process spawning for each client session
- **Communication**: Synchronous stdio pipes between client and server
- **Availability**: On-demand execution only

### Existing Capabilities
- **File Conversion Tools**: PDF, DOCX, XLSX, PPTX, images to Markdown
- **Web Content Processing**: YouTube transcripts, Bing search results, webpage conversion
- **Audio Transcription**: GPU-accelerated (RTX 3060) audio-to-text with faster-whisper
- **Performance**: 19.4x real-time audio processing speed
- **Python Integration**: UV package manager for Python script execution
- **Error Handling**: Comprehensive fallback mechanisms (GPU → CPU)

### Technical Stack
- **Runtime**: Node.js with TypeScript
- **MCP SDK**: `@modelcontextprotocol/sdk` v1.0.1
- **Dependencies**: Zod validation, private-ip security
- **Python Backend**: UV-managed Python scripts for processing
- **GPU Acceleration**: CUDA 12.1, PyTorch 2.5.1+cu121, faster-whisper

## Target Architecture: HTTP-Streamable MCP

### Core Requirements

#### 1. **Always-Available Service**
- **Persistent Server Process**: Background daemon/service operation
- **High Availability**: 99.9% uptime with automatic restart mechanisms
- **Load Balancing**: Support for horizontal scaling across multiple instances
- **Health Monitoring**: Endpoint monitoring and automatic recovery

#### 2. **HTTP-Based Communication**
- **Streamable HTTP Transport**: Implement MCP Streamable HTTP specification (2025-03-26)
- **RESTful API**: Standard HTTP methods (GET, POST, DELETE)
- **Server-Sent Events (SSE)**: Real-time streaming for long-running operations
- **JSON Response Mode**: Support for both streaming and direct JSON responses

#### 3. **Session Management**
- **Stateful Sessions**: Maintain context across multiple requests
- **Session Persistence**: Redis/memory-based session storage
- **Concurrent Sessions**: Support multiple simultaneous client connections
- **Session Termination**: Graceful cleanup and resource management

#### 4. **Streaming Capabilities**
- **Real-time Progress**: Live updates for long-running transcriptions
- **Partial Results**: Incremental delivery of processing results
- **Resumability**: Continue interrupted operations from last checkpoint
- **Backpressure Handling**: Manage client-server flow control

### Implementation Strategy

#### Phase 1: Core HTTP Transport Migration

##### 1.1 **Replace Transport Layer**
```typescript
// Current: stdio transport
const transport = new StdioServerTransport();

// Target: HTTP streamable transport
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => randomUUID(),
  eventStore: new RedisEventStore(), // For resumability
  enableJsonResponse: true,
  onsessioninitialized: (sessionId) => {
    // Session management logic
  }
});
```

##### 1.2 **HTTP Server Implementation**
```typescript
// Express.js server with MCP integration
const app = express();
app.use(express.json({ limit: '50mb' })); // Support large files
app.use(cors({
  origin: '*',
  exposedHeaders: ['Mcp-Session-Id']
}));

// MCP endpoints
app.post('/mcp', handleMcpRequest);
app.get('/mcp', handleSseStream);
app.delete('/mcp', terminateSession);
```

##### 1.3 **Session Storage Integration**
```typescript
interface SessionStore {
  create(sessionId: string): Promise<Session>;
  get(sessionId: string): Promise<Session | null>;
  update(sessionId: string, data: Partial<Session>): Promise<void>;
  delete(sessionId: string): Promise<void>;
}

// Redis-based implementation for scalability
class RedisSessionStore implements SessionStore {
  // Implementation details
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

// SSE streaming for long operations
async function streamAudioTranscription(
  audioPath: string, 
  res: ServerResponse
): Promise<void> {
  const progressReporter = new ProgressReporter((progress) => {
    res.write(`data: ${JSON.stringify({
      type: 'progress',
      data: progress,
      timestamp: Date.now()
    })}\n\n`);
  });
  
  // Continue with existing GPU acceleration logic
}
```

##### 2.2 **Resumability Support**
```typescript
interface EventStore {
  append(sessionId: string, event: StreamEvent): Promise<EventId>;
  getEventsAfter(sessionId: string, afterId?: EventId): Promise<StreamEvent[]>;
  cleanup(sessionId: string): Promise<void>;
}

// Redis-based event storage
class RedisEventStore implements EventStore {
  // Persistent event streaming support
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
    version: '2.0.0'
  },
  paths: {
    '/api/v1/convert/pdf': {
      post: {
        summary: 'Convert PDF to Markdown',
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: { type: 'string', format: 'binary' }
                }
              }
            }
          }
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
```

#### Phase 4: Deployment & Operations

##### 4.1 **Containerization**
```dockerfile
FROM node:20-alpine

# Install CUDA runtime for GPU acceleration
FROM nvidia/cuda:12.1-runtime-ubuntu22.04

# Application setup
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Python environment with UV
COPY requirements-gpu.txt ./
RUN uv pip install --system -r requirements-gpu.txt

# GPU optimization
ENV CUDA_VISIBLE_DEVICES=0
ENV KMP_DUPLICATE_LIB_OK=TRUE

EXPOSE 3000
CMD ["npm", "start"]
```

##### 4.2 **Service Discovery**
```yaml
# Docker Compose for development
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

### Resource Requirements

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

This change request outlines a comprehensive transformation of the Pdf2Md MCP server from a stdio-based local process to a modern HTTP-streamable service. The proposed architecture maintains all existing functionality while dramatically improving accessibility, scalability, and integration capabilities.

The implementation strategy emphasizes incremental migration with thorough testing and validation at each phase. Security, performance, and operational excellence are prioritized throughout the development process.

Upon completion, this transformation will enable:
- **Always-available service** accessible by any HTTP client
- **Real-time streaming** for long-running operations
- **Seamless agent integration** via standard HTTP APIs
- **Enterprise-grade security** and monitoring
- **Horizontal scalability** for high-demand scenarios

The estimated 8-week timeline provides a realistic path to production deployment while maintaining high quality and thorough testing standards.

---

**Next Steps**: 
1. Review and approve this change request
2. Allocate development resources
3. Set up development environment
4. Begin Phase 1 implementation

**Contact**: Development team ready to commence implementation upon approval.