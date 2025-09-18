#!/usr/bin/env node

/**
 * Stdio MCP Server (Original Implementation)
 * Maintains backward compatibility with stdio transport
 */

import { createServer } from "./server.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

async function main() {
  console.log('[MCP-STDIO] Starting stdio-based MCP server...');
  
  process.env.PYTHONUTF8 = '1';
  
  const transport = new StdioServerTransport();
  const server = createServer();
  
  await server.connect(transport);
  
  console.log('[MCP-STDIO] Server connected via stdio transport');
}

main().catch((error) => {
  console.error("Fatal error in stdio server:", error);
  process.exit(1);
});
