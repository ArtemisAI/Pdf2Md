#!/usr/bin/env node

/**
 * Test MCP audio tools directly with short file
 */

import { createServer } from './dist/server.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testMCPAudioTools() {
  console.log('🎵 Testing MCP Audio Tools with Short File');
  console.log('==========================================\n');

  const server = createServer();

  // Test file
  const audioPath = path.join(__dirname, 'tests', 'audio_samples', 'github_friendly', 'test_002_duration_21kb.mp3');
  console.log(`📁 Test file: ${audioPath}`);
  console.log(`📏 File size: ~21KB (short test file)`);

  try {
    // Test 1: Basic Audio Tool
    console.log('\n🔄 Test 1: Basic Audio Tool');
    const startTime1 = Date.now();

    const basicResult = await server.request({
      method: 'tools/call',
      params: {
        name: 'audio-to-markdown',
        arguments: {
          filepath: audioPath,
          language: 'en'
        }
      }
    });

    const duration1 = Date.now() - startTime1;
    console.log(`✅ Basic tool completed in ${duration1}ms`);
    console.log(`📝 Result: ${basicResult.content?.[0]?.text?.substring(0, 100)}...`);

  } catch (error) {
    console.log('❌ Basic tool error:', error.message);
  }

  try {
    // Test 2: Enhanced Audio Tool (Sync Mode)
    console.log('\n🔄 Test 2: Enhanced Audio Tool (Sync Mode)');
    const startTime2 = Date.now();

    const enhancedResult = await server.request({
      method: 'tools/call',
      params: {
        name: 'enhanced-audio-to-markdown',
        arguments: {
          filepath: audioPath,
          language: 'en',
          modelSize: 'tiny',
          device: 'auto',
          asyncMode: false
        }
      }
    });

    const duration2 = Date.now() - startTime2;
    console.log(`✅ Enhanced tool completed in ${duration2}ms`);
    console.log(`📝 Result: ${enhancedResult.content?.[0]?.text?.substring(0, 100)}...`);

  } catch (error) {
    console.log('❌ Enhanced tool error:', error.message);
  }

  console.log('\n🏁 MCP Audio Tools Test Complete!');
}

testMCPAudioTools().catch(console.error);