#!/usr/bin/env node

// Direct test of the enhanced audio transcription
import { EnhancedAudioTranscription } from './dist/audio/EnhancedAudioTranscription.js';
import path from 'path';

async function testDirectTranscription() {
  console.log('🧪 Direct Enhanced Audio Transcription Test');
  
  const transcription = new EnhancedAudioTranscription();
  const audioFile = '/home/agent/Projects/Pdf2Md/tests/audio_samples/github_friendly/test_002_duration_21kb.mp3';
  
  try {
    console.log('📁 Testing file:', audioFile);
    console.log('⚡ Starting transcription...');
    
    const result = await transcription.transcribe({
      filepath: audioFile,
      language: 'en',
      progressCallback: (progress) => {
        console.log(`📊 Progress: ${progress.percentage}% - ${progress.message}`);
      }
    });
    
    console.log('✅ Transcription successful!');
    console.log('📝 Result:', result.text.substring(0, 200) + (result.text.length > 200 ? '...' : ''));
    console.log('⏱️ Processing time:', result.processingTime + 'ms');
    
  } catch (error) {
    console.error('❌ Transcription failed:', error.message);
    console.error('🔍 Error details:', error);
  }
}

testDirectTranscription();
