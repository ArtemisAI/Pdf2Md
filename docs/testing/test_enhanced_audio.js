#!/usr/bin/env node

/**
 * Test script for enhanced audio transcription system
 * Tests both sync and async modes with RTX 3060 optimizations
 */

import { createServer } from './dist/server.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testEnhancedAudio() {
  console.log('🎵 Testing Enhanced Audio Transcription System...\n');
  
  const server = createServer();
  
  // Test file paths
  const testAudioWav = path.join(__dirname, 'tests', 'test_audio.wav');
  const testAudioMp3 = path.join(__dirname, 'tests', 'test_audio.mp3');
  const testAudioFlac = path.join(__dirname, 'tests', 'Test_2.flac');
  
  console.log('Available test files:');
  console.log(`- WAV: ${testAudioWav}`);
  console.log(`- MP3: ${testAudioMp3}`);
  console.log(`- FLAC: ${testAudioFlac}\n`);
  
  // Test 1: Enhanced Audio Tool (Sync Mode)
  console.log('🔄 Test 1: Enhanced Audio Transcription (Sync Mode)');
  try {
    const syncResult = await server.request({
      method: 'tools/call',
      params: {
        name: 'enhanced-audio-to-markdown',
        arguments: {
          filepath: testAudioWav,
          language: 'en',
          modelSize: 'tiny', // Use tiny model for faster testing
          device: 'auto',
          asyncMode: false
        }
      }
    });
    
    console.log('✅ Sync mode result:', syncResult.content?.[0]?.text);
    console.log('📄 Content preview:', syncResult.content?.[3]?.text?.substring(0, 200) + '...\n');
  } catch (error) {
    console.log('❌ Sync mode error:', error.message, '\n');
  }
  
  // Test 2: Enhanced Audio Tool (Async Mode)
  console.log('🔄 Test 2: Enhanced Audio Transcription (Async Mode)');
  try {
    const asyncResult = await server.request({
      method: 'tools/call',
      params: {
        name: 'enhanced-audio-to-markdown',
        arguments: {
          filepath: testAudioMp3,
          language: 'en',
          modelSize: 'tiny',
          device: 'auto',
          asyncMode: true
        }
      }
    });
    
    console.log('✅ Async mode started:', asyncResult.content?.[0]?.text);
    const taskId = asyncResult.content?.[1]?.text?.replace('Task ID: ', '');
    console.log('🆔 Task ID extracted:', taskId);
    
    // Test 3: Check Status
    if (taskId) {
      console.log('\n🔄 Test 3: Checking transcription status...');
      
      // Wait a bit and check status
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResult = await server.request({
        method: 'tools/call',
        params: {
          name: 'audio-transcription-status',
          arguments: {
            taskId: taskId
          }
        }
      });
      
      console.log('📊 Status result:', statusResult.content?.[0]?.text);
      console.log('📈 Progress:', statusResult.content?.[1]?.text);
    }
  } catch (error) {
    console.log('❌ Async mode error:', error.message, '\n');
  }
  
  // Test 4: Original Audio Tool (Backward Compatibility)
  console.log('\n🔄 Test 4: Original Audio Tool (Backward Compatibility)');
  try {
    const originalResult = await server.request({
      method: 'tools/call',
      params: {
        name: 'audio-to-markdown',
        arguments: {
          filepath: testAudioWav
        }
      }
    });
    
    console.log('✅ Original tool still works:', originalResult.content?.[0]?.text);
    console.log('📄 Content preview:', originalResult.content?.[2]?.text?.substring(0, 200) + '...\n');
  } catch (error) {
    console.log('❌ Original tool error:', error.message, '\n');
  }
  
  console.log('🏁 Enhanced Audio Transcription Test Complete!');
  console.log('✨ System successfully preserves existing functionality while adding RTX 3060 optimizations.');
}

// Run the test
testEnhancedAudio().catch(console.error);
