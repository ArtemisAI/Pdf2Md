#!/usr/bin/env node

/**
 * MCP Client Test for Enhanced Audio Transcription
 * Tests the actual MCP server through stdio interface
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MCPClient {
  constructor() {
    this.requestId = 1;
    this.pendingRequests = new Map();
  }

  async startServer() {
    console.log('🚀 Starting MCP Server...');
    
    // Start the server as configured in mcp.json
    this.server = spawn('npx', ['-y', 'tsx', path.join(__dirname, 'src/index.ts')], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: __dirname
    });

    // Handle server output
    this.server.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      for (const line of lines) {
        try {
          const response = JSON.parse(line);
          this.handleResponse(response);
        } catch (e) {
          console.log('📤 Server output:', line);
        }
      }
    });

    this.server.stderr.on('data', (data) => {
      console.log('🚨 Server error:', data.toString());
    });

    // Initialize the server
    await this.sendRequest({
      jsonrpc: '2.0',
      id: this.requestId++,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          roots: {
            listChanged: true
          }
        },
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      }
    });

    // Give server time to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async sendRequest(request) {
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(request.id, { resolve, reject });
      this.server.stdin.write(JSON.stringify(request) + '\n');
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(request.id)) {
          this.pendingRequests.delete(request.id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  handleResponse(response) {
    if (response.id && this.pendingRequests.has(response.id)) {
      const { resolve, reject } = this.pendingRequests.get(response.id);
      this.pendingRequests.delete(response.id);
      
      if (response.error) {
        reject(new Error(response.error.message || 'Server error'));
      } else {
        resolve(response.result);
      }
    }
  }

  async listTools() {
    const response = await this.sendRequest({
      jsonrpc: '2.0',
      id: this.requestId++,
      method: 'tools/list'
    });
    return response;
  }

  async callTool(name, args) {
    const response = await this.sendRequest({
      jsonrpc: '2.0',
      id: this.requestId++,
      method: 'tools/call',
      params: {
        name,
        arguments: args
      }
    });
    return response;
  }

  async stop() {
    if (this.server) {
      this.server.kill();
    }
  }
}

async function testEnhancedAudioMCP() {
  const client = new MCPClient();
  
  try {
    console.log('🎵 Testing Enhanced Audio through MCP Server...\n');
    
    // Start server
    await client.startServer();
    
    // Test 1: List available tools
    console.log('🔄 Test 1: Listing available tools...');
    const tools = await client.listTools();
    console.log('✅ Tools retrieved:', tools.tools.length);
    
    const audioTools = tools.tools.filter(tool => 
      tool.name.includes('audio') || tool.name.includes('Audio')
    );
    console.log('🎵 Audio tools found:');
    audioTools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    
    // Test 2: Test original audio tool (backward compatibility)
    console.log('\n🔄 Test 2: Testing original audio tool...');
    const audioPath = path.join(__dirname, 'tests', 'test_audio.mp3');
    console.log(`📁 Testing with file: ${audioPath}`);
    console.log(`📏 File size: ~15MB`);
    
    try {
      const originalResult = await client.callTool('audio-to-markdown', {
        filepath: audioPath
      });
      
      console.log('✅ Original audio tool works!');
      console.log('📄 Result type:', typeof originalResult);
      if (originalResult.content && originalResult.content.length > 0) {
        console.log('📝 Content preview:', originalResult.content[0].text.substring(0, 100) + '...');
      }
    } catch (error) {
      console.log('❌ Original tool error:', error.message);
    }
    
    // Test 3: Test enhanced audio tool (sync mode)
    console.log('\n🔄 Test 3: Testing enhanced audio tool (sync mode)...');
    try {
      const enhancedResult = await client.callTool('enhanced-audio-to-markdown', {
        filepath: audioPath,
        language: 'en',
        modelSize: 'tiny', // Use tiny for faster testing
        device: 'auto',
        asyncMode: false
      });
      
      console.log('✅ Enhanced audio tool (sync) works!');
      console.log('📄 Result type:', typeof enhancedResult);
      if (enhancedResult.content && enhancedResult.content.length > 0) {
        enhancedResult.content.forEach((item, i) => {
          console.log(`📝 Content ${i}:`, item.text.substring(0, 100) + (item.text.length > 100 ? '...' : ''));
        });
      }
    } catch (error) {
      console.log('❌ Enhanced tool (sync) error:', error.message);
    }
    
    // Test 4: Test enhanced audio tool (async mode)
    console.log('\n🔄 Test 4: Testing enhanced audio tool (async mode)...');
    try {
      const asyncResult = await client.callTool('enhanced-audio-to-markdown', {
        filepath: audioPath,
        language: 'en',
        modelSize: 'tiny',
        device: 'auto',
        asyncMode: true
      });
      
      console.log('✅ Enhanced audio tool (async) started!');
      if (asyncResult.content && asyncResult.content.length > 0) {
        asyncResult.content.forEach((item, i) => {
          console.log(`📝 Response ${i}:`, item.text);
        });
        
        // Extract task ID
        const taskIdLine = asyncResult.content.find(item => item.text.includes('Task ID:'));
        if (taskIdLine) {
          const taskId = taskIdLine.text.replace('Task ID: ', '').trim();
          console.log(`🆔 Task ID: ${taskId}`);
          
          // Test 5: Check status
          console.log('\n🔄 Test 5: Checking transcription status...');
          
          // Wait a bit
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const statusResult = await client.callTool('audio-transcription-status', {
            taskId: taskId
          });
          
          console.log('✅ Status check works!');
          if (statusResult.content && statusResult.content.length > 0) {
            statusResult.content.forEach((item, i) => {
              console.log(`📊 Status ${i}:`, item.text);
            });
          }
        }
      }
    } catch (error) {
      console.log('❌ Enhanced tool (async) error:', error.message);
    }
    
    console.log('\n🏁 MCP Server Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('📍 Stack:', error.stack);
  } finally {
    await client.stop();
    console.log('🛑 Server stopped');
  }
}

// Run the test
testEnhancedAudioMCP().catch(console.error);
