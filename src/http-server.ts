import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createServer } from './server.js';
import { RedisEventStore } from './redis-store.js';
import { ProgressStreamManager } from './progress-stream.js';
import { randomUUID } from 'node:crypto';

export interface MCPHttpServerOptions {
  port?: number;
  redisUrl?: string;
  enableCors?: boolean;
  enableSecurity?: boolean;
}

export class MCPHttpServer {
  private app: express.Application;
  private eventStore: RedisEventStore;
  private progressManager: ProgressStreamManager;
  private sessions: Map<string, SSEServerTransport> = new Map();
  private mcpServer = createServer();

  constructor(options: MCPHttpServerOptions = {}) {
    this.app = express();
    this.eventStore = new RedisEventStore(options.redisUrl);
    this.progressManager = ProgressStreamManager.getInstance();
    
    this.setupMiddleware(options);
    this.setupRoutes();
  }

  private setupMiddleware(options: MCPHttpServerOptions) {
    // Security middleware
    if (options.enableSecurity !== false) {
      this.app.use(helmet({
        contentSecurityPolicy: false, // Allow SSE
        crossOriginEmbedderPolicy: false
      }));
    }

    // CORS middleware
    if (options.enableCors !== false) {
      this.app.use(cors({
        origin: true, // Allow all origins for development
        credentials: true,
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Last-Event-ID', 'Mcp-Session-Id']
      }));
    }

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging middleware
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path} - Session: ${req.headers['mcp-session-id'] || 'none'}`);
      next();
    });
  }

  private setupRoutes() {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      const redisHealth = await this.eventStore.isHealthy();
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        sessions: this.sessions.size,
        redis: redisHealth ? 'connected' : 'disconnected',
        gpu: await this.checkGPUStatus()
      };

      res.status(redisHealth ? 200 : 503).json(health);
    });

    // SSE endpoint for establishing connection
    this.app.get('/mcp/stream', async (req, res) => {
      const sessionId = req.headers['mcp-session-id'] as string || randomUUID();
      
      try {
        // Create SSE transport
        const transport = new SSEServerTransport('/mcp/message', res);
        this.sessions.set(sessionId, transport);

        // Set up event handlers
        transport.onclose = () => {
          console.log(`🔌 Session ${sessionId} closed`);
          this.sessions.delete(sessionId);
          this.eventStore.cleanup(sessionId);
          this.progressManager.cleanup(sessionId);
        };

        transport.onerror = (error) => {
          console.error(`❌ Session ${sessionId} error:`, error);
          this.sessions.delete(sessionId);
        };

        // Connect MCP server to transport
        await this.mcpServer.connect(transport);
        
        console.log(`🚀 SSE connection established for session ${sessionId}`);
        
        // Send session info
        await this.storeEvent(sessionId, {
          id: randomUUID(),
          type: 'session-started',
          data: { sessionId, timestamp: Date.now() },
          timestamp: Date.now()
        });

      } catch (error) {
        console.error('Failed to establish SSE connection:', error);
        res.status(500).json({ error: 'Failed to establish connection' });
      }
    });

    // Message endpoint for receiving POST requests
    this.app.post('/mcp/message', async (req, res) => {
      const sessionId = req.query.sessionId as string;
      
      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID required' });
      }

      const transport = this.sessions.get(sessionId);
      if (!transport) {
        return res.status(404).json({ error: 'Session not found' });
      }

      try {
        await transport.handlePostMessage(req, res);
        
        // Store the message event
        await this.storeEvent(sessionId, {
          id: randomUUID(),
          type: 'message-received',
          data: req.body,
          timestamp: Date.now()
        });

      } catch (error) {
        console.error('Failed to handle message:', error);
        res.status(500).json({ error: 'Failed to process message' });
      }
    });

    // JSON-RPC endpoint for direct requests (compatibility)
    this.app.post('/mcp', async (req, res) => {
      const sessionId = req.headers['mcp-session-id'] as string || randomUUID();
      
      try {
        // For direct JSON-RPC requests, we need to use a proper transport
        // For now, return a compatibility message directing to SSE endpoint
        res.json({
          jsonrpc: '2.0',
          id: req.body.id,
          result: { 
            message: 'Please use Server-Sent Events endpoint for full MCP functionality',
            endpoints: {
              sse: '/mcp/stream',
              message: '/mcp/message',
              health: '/health'
            }
          }
        });

      } catch (error) {
        console.error('Failed to process JSON-RPC request:', error);
        res.status(500).json({
          jsonrpc: '2.0',
          id: req.body.id,
          error: { code: -32603, message: 'Internal error' }
        });
      }
    });

    // Session status endpoint
    this.app.get('/mcp/session/:sessionId/status', async (req, res) => {
      const { sessionId } = req.params;
      const transport = this.sessions.get(sessionId);
      
      res.json({
        sessionId,
        active: !!transport,
        events: await this.eventStore.retrieve(sessionId)
      });
    });

    // Events endpoint with Last-Event-ID support
    this.app.get('/mcp/session/:sessionId/events', async (req, res) => {
      const { sessionId } = req.params;
      const lastEventId = req.headers['last-event-id'] as string;
      
      const events = await this.eventStore.retrieve(sessionId, lastEventId);
      res.json({ events });
    });

    // Audio transcription progress streaming endpoint
    this.app.get('/mcp/audio/progress/:taskId', async (req, res) => {
      const { taskId } = req.params;
      const sessionId = req.headers['mcp-session-id'] as string || randomUUID();

      // Set up SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Last-Event-ID, Mcp-Session-Id'
      });

      console.log(`📡 Audio progress streaming started for task ${taskId}, session ${sessionId}`);

      // Send initial connection event
      res.write(`event: connected\ndata: ${JSON.stringify({ taskId, sessionId, timestamp: Date.now() })}\n\n`);

      // Create progress stream and subscribe to updates
      const progressStream = this.progressManager.createProgressStream(sessionId, taskId);

      // Override the send method to also send via SSE
      const originalSend = progressStream.send;
      progressStream.send = async (type: string, data: any) => {
        // Call original send (stores in Redis/memory)
        await originalSend.call(progressStream, type, data);
        
        // Also send via SSE
        const sseData = JSON.stringify({ type, data, timestamp: Date.now() });
        res.write(`event: ${type}\ndata: ${sseData}\n\n`);
      };

      // Handle client disconnect
      req.on('close', async () => {
        console.log(`📡 Audio progress streaming closed for task ${taskId}`);
        await progressStream.close();
      });
    });

    // Audio transcription start endpoint with streaming
    this.app.post('/mcp/audio/transcribe', async (req, res) => {
      const sessionId = req.headers['mcp-session-id'] as string || randomUUID();
      const { filePath, language = 'en', modelSize = 'tiny', device = 'auto' } = req.body;

      if (!filePath) {
        return res.status(400).json({ error: 'filePath is required' });
      }

      try {
        const taskId = randomUUID();
        
        // Start streaming progress for this task
        await this.progressManager.streamAudioTranscription(sessionId, taskId, filePath, {
          language,
          modelSize,
          device
        });

        // Return task info with streaming endpoint
        res.json({
          taskId,
          sessionId,
          filePath,
          streamingEndpoint: `/mcp/audio/progress/${taskId}`,
          statusEndpoint: `/mcp/audio/status/${taskId}`,
          message: 'Audio transcription started with real-time progress streaming'
        });

        console.log(`🎵 Audio transcription started: ${taskId} for file: ${filePath}`);

      } catch (error) {
        console.error('Failed to start audio transcription:', error);
        res.status(500).json({ error: 'Failed to start transcription' });
      }
    });

    // Audio transcription status endpoint
    this.app.get('/mcp/audio/status/:taskId', async (req, res) => {
      const { taskId } = req.params;
      
      try {
        // Get status from audio system (this would integrate with existing getTaskStatus)
        // For now, return basic info
        res.json({
          taskId,
          status: 'processing',
          message: 'Use the streaming endpoint for real-time updates'
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to get task status' });
      }
    });
  }

  private async storeEvent(sessionId: string, event: any) {
    try {
      await this.eventStore.store(sessionId, event);
    } catch (error) {
      console.error('Failed to store event:', error);
    }
  }

  private async checkGPUStatus(): Promise<boolean> {
    try {
      // This would check GPU availability
      // For now, return false as placeholder
      return false;
    } catch {
      return false;
    }
  }

  async start(port: number = 3000): Promise<void> {
    await this.eventStore.connect();
    
    return new Promise((resolve) => {
      this.app.listen(port, () => {
        console.log(`🚀 MCP HTTP Server running on port ${port}`);
        console.log(`📡 SSE endpoint: http://localhost:${port}/mcp/stream`);
        console.log(`📬 Message endpoint: http://localhost:${port}/mcp/message`);
        console.log(`❤️  Health check: http://localhost:${port}/health`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    // Close all sessions
    for (const transport of this.sessions.values()) {
      await transport.close();
    }
    this.sessions.clear();

    // Cleanup progress streams
    for (const sessionId of this.sessions.keys()) {
      await this.progressManager.cleanup(sessionId);
    }

    // Disconnect from Redis
    await this.eventStore.disconnect();
  }
}