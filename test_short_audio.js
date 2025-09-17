#!/usr/bin/env node

/**
 * Simple test for enhanced audio transcription with short file
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testShortAudio() {
  console.log('🎵 Testing Enhanced Audio with Short File');
  console.log('=========================================\n');

  try {
    // Import the enhanced audio system
    const audio = await import('./dist/audio/index.js');
    console.log('✅ Enhanced audio module loaded');

    // Test file
    const audioPath = path.join(__dirname, 'tests', 'audio_samples', 'github_friendly', 'test_002_duration_21kb.mp3');
    console.log(`📁 Test file: ${audioPath}`);
    console.log(`📏 File size: ~21KB (short test file)`);

    // Show optimal configuration
    const config = audio.ConfigManager.getOptimalConfig();
    console.log(`\n⚙️  Configuration:`);
    console.log(`   Device: ${config.device}`);
    console.log(`   Model: ${config.modelSize}`);

    // Test sync transcription
    console.log(`\n🚀 Starting sync transcription...`);
    const startTime = Date.now();

    const result = await audio.transcribeAudio({
      filepath: audioPath,
      language: 'en',
      config: {
        modelSize: 'tiny', // Use tiny for fastest testing
        device: 'auto'
      }
    });

    const duration = Date.now() - startTime;
    console.log(`✅ Transcription completed in ${duration}ms`);
    console.log(`📝 Result length: ${result?.length || 0} characters`);

    if (result && result.length > 0) {
      console.log(`📄 Content preview: ${result.substring(0, 200)}...`);
    } else {
      console.log('⚠️  No transcription content returned');
    }

  } catch (error) {
    console.log('❌ Test failed:', error.message);
    console.log('Stack trace:', error.stack);
  }
}

testShortAudio().catch(console.error);