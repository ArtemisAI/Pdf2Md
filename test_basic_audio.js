#!/usr/bin/env node

/**
 * Test basic audio-to-markdown tool with short file
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testBasicAudio() {
  console.log('🎵 Testing Basic Audio Tool with Short File');
  console.log('===========================================\n');

  try {
    // Import the enhanced audio transcription system
    const { EnhancedAudioTranscription } = await import('./dist/audio/index.js');
    console.log('✅ Enhanced audio module loaded');

    // Test file
    const audioPath = path.join(__dirname, 'tests', 'audio_samples', 'github_friendly', 'test_002_duration_21kb.mp3');
    console.log(`📁 Test file: ${audioPath}`);
    console.log(`📏 File size: ~21KB (short test file)`);

    // Test basic audio transcription
    console.log(`\n🚀 Starting basic transcription...`);
    const startTime = Date.now();

    const transcriber = new EnhancedAudioTranscription();
    const result = await transcriber.transcribe({
      filepath: audioPath,
      uvPath: process.env.UV_PATH || 'uv'
    });

    const duration = Date.now() - startTime;
    console.log(`✅ Transcription completed in ${duration}ms`);
    console.log(`📝 Result length: ${result?.text?.length || 0} characters`);
    console.log(`🌍 Detected language: ${result?.language || 'unknown'}`);
    console.log(`⏱️  Audio duration: ${result?.duration ? Math.round(result.duration) + 's' : 'unknown'}`);

    if (result && result.text && result.text.length > 0) {
      console.log(`📄 Content preview: ${result.text.substring(0, 200)}...`);
    } else {
      console.log('⚠️  No transcription content returned');
    }

  } catch (error) {
    console.log('❌ Test failed:', error.message);
    console.log('Stack trace:', error.stack);
  }
}

testBasicAudio().catch(console.error);