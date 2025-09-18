#!/usr/bin/env node

/**
 * Direct test of enhanced audio transcription with our Audio_Export files
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testOurAudioFiles() {
  console.log('🎵 Testing Our Audio Files with Enhanced System');
  console.log('==============================================\n');

  try {
    // Import the enhanced audio system
    const audio = await import('./dist/audio/index.js');
    console.log('✅ Enhanced audio module loaded');

    // Test with our audio file
    const audioPath = 'f:\\_Divorce_2025\\Audio_Export\\20250911_160742_1.mp3';
    console.log(`📁 Test file: ${audioPath}`);

    // Check file exists and get size
    const fs = await import('fs');
    if (fs.existsSync(audioPath)) {
      const stats = fs.statSync(audioPath);
      console.log(`📏 File size: ${Math.round(stats.size / 1024)} KB`);
    }

    // Show optimal configuration
    const config = audio.ConfigManager.getOptimalConfig();
    console.log(`\n⚙️  Configuration:`);
    console.log(`   Device: ${config.device}`);
    console.log(`   Model: ${config.modelSize}`);

    // Test transcription
    console.log(`\n🚀 Starting transcription...`);
    const startTime = Date.now();

    const result = await audio.transcribeAudio({
      filepath: audioPath,
      language: 'en',
      config: {
        modelSize: 'tiny',
        device: 'auto'
      }
    });

    console.log(`✅ Transcription completed!`);
    console.log(`⏰ Total time: ${Date.now() - startTime}ms`);

    if (result) {
      console.log(`\n📄 Transcription Result:`);
      console.log(`   Text length: ${result.text.length} characters`);
      console.log(`   Language: ${result.language || 'auto-detected'}`);
      console.log(`   Duration: ${result.duration ? Math.round(result.duration) + 's' : 'unknown'}`);

      console.log(`\n📝 Content Preview (first 500 chars):`);
      console.log(result.text.substring(0, 500) + '...');

      console.log(`\n🎉 SUCCESS: Audio transcription completed!`);
    } else {
      console.log('❌ No transcription result returned');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('📍 Stack:', error.stack);
  }

  console.log(`\n🏁 Test complete!`);
}

testOurAudioFiles().catch(console.error);