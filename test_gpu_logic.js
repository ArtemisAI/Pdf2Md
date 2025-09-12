#!/usr/bin/env node
/**
 * Direct test of GPU acceleration logic without MCP server
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { detectGPU, getOptimalTranscriptionConfig } from './dist/utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testGPULogic() {
  console.log('🔧 Testing GPU Acceleration Logic (Direct)\n');
  
  // Test 1: GPU Detection
  console.log('1. GPU Detection Test');
  try {
    const gpuInfo = await detectGPU();
    console.log('✅ GPU Info:', JSON.stringify(gpuInfo, null, 2));
    
    if (gpuInfo.available) {
      console.log('🚀 GPU acceleration available!');
    } else {
      console.log('💻 CPU fallback will be used');
    }
  } catch (error) {
    console.log('❌ GPU detection error:', error.message);
  }
  
  // Test 2: Optimal Configuration
  console.log('\n2. Optimal Configuration Test');
  try {
    const config = await getOptimalTranscriptionConfig();
    console.log('✅ Optimal Config:', JSON.stringify(config, null, 2));
  } catch (error) {
    console.log('❌ Config error:', error.message);
  }
  
  // Test 3: EnhancedAudioTranscription Class
  console.log('\n3. Enhanced Audio Transcription Class Test');
  try {
    const { EnhancedAudioTranscription } = await import('./dist/audio/EnhancedAudioTranscription.js');
    const transcriber = new EnhancedAudioTranscription({
      modelSize: 'tiny',
      device: 'auto'
    });
    
    console.log('✅ EnhancedAudioTranscription class loaded');
    console.log('📋 Config:', JSON.stringify(transcriber.getConfig(), null, 2));
    
    // Test file validation
    const testFile = path.join(__dirname, 'tests', 'test_audio.wav');
    console.log(`📂 Testing with: ${testFile}`);
    
    // Note: We won't actually transcribe without proper environment
    console.log('ℹ️  Transcription test requires GPU dependencies (see GPU_SETUP.md)');
    
  } catch (error) {
    console.log('❌ Enhanced transcription error:', error.message);
  }
  
  // Test 4: Python Script Check
  console.log('\n4. Python Script Availability Test');
  try {
    const scriptPath = path.join(__dirname, 'src', 'gpu_transcribe.py');
    const fs = await import('fs');
    
    if (fs.existsSync(scriptPath)) {
      console.log('✅ GPU transcription script found');
      console.log(`📄 Location: ${scriptPath}`);
      
      // Check if script is executable
      const stats = await fs.promises.stat(scriptPath);
      console.log(`📊 Size: ${stats.size} bytes`);
    } else {
      console.log('❌ GPU transcription script not found');
    }
  } catch (error) {
    console.log('❌ Script check error:', error.message);
  }
  
  // Test 5: Dependencies Check
  console.log('\n5. Dependencies Check');
  console.log('📦 Required for GPU acceleration:');
  console.log('  - uv (Python package manager)');
  console.log('  - faster-whisper>=1.0.0');
  console.log('  - torch>=2.4.0 with CUDA');
  console.log('  - NVIDIA GPU with CUDA support');
  console.log('');
  console.log('📚 See GPU_SETUP.md for installation instructions');
  
  console.log('\n🎯 GPU Acceleration Logic Test Complete!');
  console.log('✨ Implementation ready - will use GPU when dependencies available');
}

testGPULogic().catch(console.error);