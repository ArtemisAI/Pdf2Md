#!/usr/bin/env node

/**
 * HTTP-MCP Server Entry Point
 * Modern, streamable, and compliant MCP Server
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from "./server.js";
// @ts-ignore
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { RedisSessionStore, RedisEventStore } from "./redis-store.js";
import { createHealthEndpoints } from "./health.js";
import { randomUUID } from 'crypto';

const app = express();
const port = parseInt(process.env.PORT || '3000');
const host = process.env.HOST || '0.0.0.0';

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  exposedHeaders: ['Mcp-Session-Id', 'Last-Event-ID'],
  allowedHeaders: ['Content-Type', 'mcp-session-id', 'last-event-id'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Store active transports by session ID
const transports: Record<string, StreamableHTTPServerTransport> = {};

// MCP endpoint - must be defined BEFORE other middleware
app.all('/mcp', async (req, res) => {
  try {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
    } else {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId: string) => {
          transports[newSessionId] = transport;
          console.log(`[HTTP-MCP] New session initialized: ${newSessionId}`);
        },
      });

      transport.onclose = () => {
        if (transport.sessionId) {
          delete transports[transport.sessionId];
          console.log(`[HTTP-MCP] Session closed: ${transport.sessionId}`);
        }
      };

      const server = createServer();
      await server.connect(transport);
    }

    await transport.handleRequest(req, res);
  } catch (error) {
    console.error('[HTTP-MCP] Error handling request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal error',
          data: error instanceof Error ? error.message : 'Unknown error'
        },
        id: null
      });
    }
  }
});

// JSON parsing middleware (for non-MCP routes)
app.use(express.json({ limit: '10mb' }));

// Health check endpoints
// Note: These are dummy stores for now. In a real implementation,
// you would pass in your actual Redis stores.
const healthRouter = createHealthEndpoints(new RedisSessionStore(), new RedisEventStore());
app.use('/health', healthRouter);


// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[HTTP-MCP] SIGTERM received, shutting down gracefully...');
  const closing = Object.values(transports).map(t => t.close());
  await Promise.all(closing);
  process.exit(0);
});

// Start the HTTP server
async function startServer() {
  try {
    process.env.PYTHONUTF8 = '1';
    
    console.log('[HTTP-MCP] Initializing HTTP-Streamable MCP Server...');
    
    const server = app.listen(port, host, () => {
      console.log(`🚀 [HTTP-MCP] Server ready at http://${host}:${port}`);
      console.log(`📡 [HTTP-MCP] MCP endpoint: http://${host}:${port}/mcp`);
      console.log(`❤️  [HTTP-MCP] Health check: http://${host}:${port}/health`);
    });
    
    server.timeout = 300000;
    
  } catch (error) {
    console.error('[HTTP-MCP] Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
