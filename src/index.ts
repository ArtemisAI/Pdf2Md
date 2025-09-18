#!/usr/bin/env node

/**
 * MCP Server Entry Point - Dual Mode Support
 * Supports both stdio (legacy) and HTTP-SSE (new) transports
 */

const args = process.argv.slice(2);
const mode = args.includes('--http') || process.env.MCP_TRANSPORT === 'http' ? 'http' : 'stdio';

console.log(`[MCP] Starting server in ${mode.toUpperCase()} mode...`);

if (mode === 'http') {
  // Import and start HTTP server
  import('./http-server.js').catch((error) => {
    console.error('[MCP] Failed to start HTTP server:', error);
    process.exit(1);
  });
} else {
  // Import and start stdio server (original)
  import('./stdio-server.js').catch((error) => {
    console.error('[MCP] Failed to start stdio server:', error);
    process.exit(1);
  });
}
