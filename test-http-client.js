#!/usr/bin/env node

/**
 * Test client for MCP HTTP Server
 * Tests both SSE streaming and direct HTTP requests
 */

import { randomUUID } from 'node:crypto';

class MCPHttpClient {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.sessionId = randomUUID();
  }

  async testHealth() {
    console.log('🏥 Testing health endpoint...');
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const health = await response.json();
      console.log('✅ Health check passed:', health);
      return health;
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      throw error;
    }
  }

  async testDirectJsonRpc() {
    console.log('📋 Testing direct JSON-RPC endpoint...');
    try {
      const response = await fetch(`${this.baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Mcp-Session-Id': this.sessionId
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
          params: {}
        })
      });

      const result = await response.json();
      console.log('✅ Direct JSON-RPC response:', result);
      return result;
    } catch (error) {
      console.error('❌ Direct JSON-RPC failed:', error.message);
      throw error;
    }
  }

  async testSSEConnection() {
    console.log('📡 Testing SSE connection...');
    return new Promise((resolve, reject) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        reject(new Error('SSE connection timeout'));
      }, 10000);

      fetch(`${this.baseUrl}/mcp/stream`, {
        headers: {
          'Accept': 'text/event-stream',
          'Mcp-Session-Id': this.sessionId
        },
        signal: controller.signal
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        console.log('✅ SSE connection established');
        clearTimeout(timeoutId);
        
        // For this test, we'll just verify the connection was successful
        controller.abort();
        resolve(true);
      })
      .catch(error => {
        if (error.name !== 'AbortError') {
          console.error('❌ SSE connection failed:', error.message);
          reject(error);
        } else {
          resolve(true); // Expected abort
        }
      });
    });
  }

  async testSessionStatus() {
    console.log('📊 Testing session status endpoint...');
    try {
      const response = await fetch(`${this.baseUrl}/mcp/session/${this.sessionId}/status`);
      const status = await response.json();
      console.log('✅ Session status:', status);
      return status;
    } catch (error) {
      console.error('❌ Session status failed:', error.message);
      throw error;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting MCP HTTP Client Tests');
    console.log('==================================\\n');

    const results = {
      health: false,
      directJsonRpc: false,
      sseConnection: false,
      sessionStatus: false
    };

    try {
      await this.testHealth();
      results.health = true;
    } catch (error) {
      console.error('Health test failed');
    }

    try {
      await this.testDirectJsonRpc();
      results.directJsonRpc = true;
    } catch (error) {
      console.error('Direct JSON-RPC test failed');
    }

    try {
      await this.testSSEConnection();
      results.sseConnection = true;
    } catch (error) {
      console.error('SSE connection test failed');
    }

    try {
      await this.testSessionStatus();
      results.sessionStatus = true;
    } catch (error) {
      console.error('Session status test failed');
    }

    console.log('\\n📊 Test Results Summary:');
    console.log('========================');
    Object.entries(results).forEach(([test, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
    });

    const passedCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;
    
    console.log(`\\n🎯 Overall: ${passedCount}/${totalCount} tests passed`);
    
    if (passedCount === totalCount) {
      console.log('🎉 All tests passed! HTTP MCP Server is working correctly.');
      return true;
    } else {
      console.log('⚠️  Some tests failed. Check the output above for details.');
      return false;
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const client = new MCPHttpClient();
  client.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

export { MCPHttpClient };