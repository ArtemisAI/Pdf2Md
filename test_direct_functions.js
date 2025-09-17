#!/usr/bin/env node

/**
 * Direct test of audio transcription functions
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testDirectAudioFunctions() {
  console.log('🎵 Testing Direct Audio Functions');
  console.log('=================================\n');

  try {
    // Test file
    const audioPath = path.join(__dirname, 'tests', 'audio_samples', 'github_friendly', 'test_002_duration_21kb.mp3');
    console.log(`📁 Test file: ${audioPath}`);
    console.log(`📏 File size: ~21KB (short test file)`);

    // Import the audio functions directly
    const audio = await import('./dist/audio/index.js');
    console.log('✅ Audio module loaded');

    // Test 1: Direct EnhancedAudioTranscription
    console.log('\n🔄 Test 1: Direct EnhancedAudioTranscription');
    const startTime1 = Date.now();

    try {
      const transcriber = new audio.EnhancedAudioTranscription();
      const result1 = await transcriber.transcribe({
        filepath: audioPath,
        language: 'en'
      });

      const duration1 = Date.now() - startTime1;
      console.log(`✅ Direct transcription completed in ${duration1}ms`);
      console.log(`📝 Result length: ${result1?.text?.length || 0} characters`);
      if (result1?.text) {
        console.log(`📄 Content preview: ${result1.text.substring(0, 100)}...`);
      }
    } catch (error) {
      console.log('❌ Direct transcription error:', error.message);
    }

    // Test 2: Queue-based transcription
    console.log('\n🔄 Test 2: Queue-based transcription');
    const startTime2 = Date.now();

    try {
      const taskId = await audio.transcribeAudio({
        filepath: audioPath,
        language: 'en',
        config: {
          modelSize: 'tiny',
          device: 'auto'
        }
      });

      const duration2 = Date.now() - startTime2;
      console.log(`✅ Queue transcription started in ${duration2}ms`);
      console.log(`📝 Task ID: ${taskId}`);

      // Wait a bit and check status
      await new Promise(resolve => setTimeout(resolve, 2000));

      const status = await audio.getTaskStatus(taskId);
      console.log(`📊 Task status: ${status?.status}`);
      console.log(`📈 Progress: ${status?.progress}%`);

      if (status?.status === 'completed') {
        const result = audio.getTranscriptionResult(taskId);
        if (result) {
          console.log(`📄 Final result length: ${result.text?.length || 0} characters`);
          if (result.text) {
            console.log(`📄 Content preview: ${result.text.substring(0, 100)}...`);
          }
        }
      }

    } catch (error) {
      console.log('❌ Queue transcription error:', error.message);
    }

  } catch (error) {
    console.log('❌ Test setup error:', error.message);
    console.log('Stack trace:', error.stack);
  }

  console.log('\n🏁 Direct Audio Functions Test Complete!');
}

testDirectAudioFunctions().catch(console.error);