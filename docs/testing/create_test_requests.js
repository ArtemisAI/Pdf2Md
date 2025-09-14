#!/usr/bin/env node

/**
 * Direct JSON-RPC test for the MCP server
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test requests to send to the server
const requests = [
  {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' }
    }
  },
  {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list'
  },
  {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'audio-to-markdown',
      arguments: {
        filepath: path.join(__dirname, 'tests', 'test_audio.mp3')
      }
    }
  },
  {
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'enhanced-audio-to-markdown',
      arguments: {
        filepath: path.join(__dirname, 'tests', 'test_audio.mp3'),
        language: 'en',
        modelSize: 'tiny',
        device: 'auto',
        asyncMode: false
      }
    }
  }
];

console.log('📝 Creating JSON-RPC test requests...\n');

requests.forEach((request, i) => {
  console.log(`Request ${i + 1}:`);
  console.log(JSON.stringify(request, null, 2));
  console.log('---');
});

console.log('\n📋 To test manually:');
console.log('1. Copy each request JSON');
console.log('2. Paste into the running MCP server stdin');
console.log('3. Check the response');

console.log('\n🎯 Key test points:');
console.log('- Test 1: Initialize - should return capabilities');
console.log('- Test 2: List tools - should show audio, enhanced-audio, and status tools');
console.log('- Test 3: Original audio - should work with 15MB file');
console.log('- Test 4: Enhanced audio - should show GPU optimization info');

console.log(`\n📁 Test file: ${path.join(__dirname, 'tests', 'test_audio.mp3')}`);
console.log(`📏 File size: ~15MB`);

// Save requests to file for easy copy-paste
const testFile = path.join(__dirname, 'mcp_test_requests.json');
fs.writeFileSync(testFile, JSON.stringify(requests, null, 2));
console.log(`\n💾 Requests saved to: ${testFile}`);
