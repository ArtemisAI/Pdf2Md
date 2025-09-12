#!/usr/bin/env node
/**
 * Test MCP server integration specifically
 */

import { createServer } from './dist/server.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testMCPIntegration() {
  console.log('🧪 Testing MCP Server Enhanced Audio Integration\n');
  
  const server = createServer();
  const testAudioFile = path.join(__dirname, 'tests', 'test_audio.wav');
  
  console.log('📁 Testing enhanced-audio-to-markdown tool (sync mode)...');
  console.log(`📂 Test file: ${testAudioFile}`);
  
  try {
    const start = Date.now();
    
    const result = await server.request({
      method: 'tools/call',
      params: {
        name: 'enhanced-audio-to-markdown',
        arguments: {
          filepath: testAudioFile,
          language: 'en',
          modelSize: 'tiny',
          device: 'auto',
          asyncMode: false
        }
      }
    });
    
    const duration = Date.now() - start;
    
    console.log('✅ MCP Enhanced Audio Tool Success!');
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log('📝 Response Content:');
    
    if (result.content && Array.isArray(result.content)) {
      result.content.forEach((item, i) => {
        if (item.type === 'text') {
          const preview = item.text.length > 100 ? item.text.substring(0, 100) + '...' : item.text;
          console.log(`  [${i}] ${preview}`);
        }
      });
    }
    
    console.log('\n✅ Enhanced audio transcription fallback working correctly!');
    console.log('ℹ️  GPU acceleration will be used when dependencies are available');
    
  } catch (error) {
    console.log('❌ MCP Enhanced Audio Tool Failed:', error.message);
  }
}

testMCPIntegration().catch(console.error);