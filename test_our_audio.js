#!/usr/bin/env node

/**
 * Test script for processing audio files from Audio_Export folder
 * Using the enhanced PDF2MD-HTTP MCP server
 */

import { createServer } from './dist/server.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testAudioFiles() {
  console.log('🎵 Testing Audio Files from Audio_Export Folder...\n');

  const server = createServer();

  // Test with one of our audio files
  const audioFile = 'f:\\_Divorce_2025\\Audio_Export\\20250911_160742_1.mp3';

  console.log(`Processing: ${audioFile}\n`);

  // Test Enhanced Audio Tool
  console.log('🔄 Processing with Enhanced Audio Tool (GPU Optimized)');
  try {
    const result = await server.request({
      method: 'tools/call',
      params: {
        name: 'enhanced-audio-to-markdown',
        arguments: {
          filepath: audioFile,
          language: 'en',
          modelSize: 'tiny', // Start with tiny for faster processing
          device: 'auto',
          asyncMode: false
        }
      }
    });

    console.log('✅ Processing completed!');
    console.log('📊 Result:', result.content?.[0]?.text);

    if (result.content?.[3]?.text) {
      console.log('📄 Transcribed Content:');
      console.log(result.content[3].text);
    }

  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n🏁 Audio Processing Test Complete!');
}

// Run the test
testAudioFiles().catch(console.error);