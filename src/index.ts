#! /usr/bin/env node

import { createServer } from "./server.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { MCPHttpServer } from "./http-server.js";

async function main() {
  process.env.PYTHONUTF8 = '1';
  
  // Check if we should run in HTTP mode
  const httpMode = process.env.MCP_HTTP_MODE === 'true' || process.argv.includes('--http');
  const port = parseInt(process.env.MCP_HTTP_PORT || '3000');

  if (httpMode) {
    console.log('🌐 Starting MCP Server in HTTP mode...');
    const httpServer = new MCPHttpServer({
      port,
      enableCors: true,
      enableSecurity: true
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down HTTP server...');
      await httpServer.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Shutting down HTTP server...');
      await httpServer.stop();
      process.exit(0);
    });

    await httpServer.start(port);
  } else {
    console.log('📟 Starting MCP Server in STDIO mode...');
    const transport = new StdioServerTransport();
    const server = createServer();
    await server.connect(transport);
  }
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
