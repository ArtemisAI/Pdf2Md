#!/usr/bin/env node

/**
 * Test with longer audio files from Audio_Long folder
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testLongAudioFiles() {
  console.log('🎵 Testing with Longer Audio Files');
  console.log('==================================\n');

  try {
    // Import the audio functions directly
    const audio = await import('./dist/audio/index.js');
    console.log('✅ Audio module loaded');

    // Test with a medium-sized file first
    const mediumAudioPath = path.join(__dirname, 'tests', 'Audio_Long', '20250911_160742_1.mp3');
    console.log(`📁 Test file: ${mediumAudioPath}`);
    console.log(`📏 File size: ~3MB (medium test file)`);

    // Test 1: Direct EnhancedAudioTranscription with medium file
    console.log('\n🔄 Test 1: Medium file with EnhancedAudioTranscription');
    const startTime1 = Date.now();

    try {
      const transcriber = new audio.EnhancedAudioTranscription();
      const result1 = await transcriber.transcribe({
        filepath: mediumAudioPath,
        language: 'en'
      });

      const duration1 = Date.now() - startTime1;
      console.log(`✅ Medium file transcription completed in ${duration1}ms`);
      console.log(`📝 Result length: ${result1?.text?.length || 0} characters`);
      if (result1?.text) {
        console.log(`📄 Content preview: ${result1.text.substring(0, 100)}...`);
      }
    } catch (error) {
      console.log('❌ Medium file transcription error:', error.message);
    }

    // Test with a small file from the long folder
    const smallAudioPath = path.join(__dirname, 'tests', 'Audio_Long', 'PTT-20210726-WA0001.opus');
    console.log(`\n📁 Test file: ${smallAudioPath}`);
    console.log(`📏 File size: ~23KB (small test file from long folder)`);

    // Test 2: Small file from long folder
    console.log('\n🔄 Test 2: Small file from Audio_Long folder');
    const startTime2 = Date.now();

    try {
      const transcriber2 = new audio.EnhancedAudioTranscription();
      const result2 = await transcriber2.transcribe({
        filepath: smallAudioPath,
        language: 'en'
      });

      const duration2 = Date.now() - startTime2;
      console.log(`✅ Small file transcription completed in ${duration2}ms`);
      console.log(`📝 Result length: ${result2?.text?.length || 0} characters`);
      if (result2?.text) {
        console.log(`📄 Content preview: ${result2.text.substring(0, 100)}...`);
      }
    } catch (error) {
      console.log('❌ Small file transcription error:', error.message);
    }

  } catch (error) {
    console.log('❌ Test setup error:', error.message);
    console.log('Stack trace:', error.stack);
  }

  console.log('\n🏁 Long Audio Files Test Complete!');
}

testLongAudioFiles().catch(console.error);