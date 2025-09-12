#!/usr/bin/env node
/**
 * Simple test for GPU-accelerated audio transcription
 * Tests both the direct Python script and the MCP server integration
 */

import { createServer } from './dist/server.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { detectGPU, getOptimalTranscriptionConfig } from './dist/utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testGPUTranscription() {
  console.log('🧪 Testing GPU-Accelerated Audio Transcription\n');
  
  // Test GPU detection
  console.log('1. Testing GPU Detection...');
  try {
    const gpuInfo = await detectGPU();
    console.log('✅ GPU Detection Result:', gpuInfo);
    
    const config = await getOptimalTranscriptionConfig();
    console.log('✅ Optimal Config:', config);
  } catch (error) {
    console.log('❌ GPU Detection Failed:', error.message);
  }
  
  console.log('\n2. Testing Direct Python Script...');
  
  // Test the direct Python script first
  const testAudioFile = path.join(__dirname, 'tests', 'test_audio.wav');
  console.log(`Testing with: ${testAudioFile}`);
  
  try {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);
    
    const scriptPath = path.join(__dirname, 'src', 'gpu_transcribe.py');
    
    console.log('📂 Running GPU transcription script...');
    const start = Date.now();
    
    const { stdout, stderr } = await execFileAsync('uv', [
      'run', 'python', scriptPath,
      testAudioFile,
      '--model-size', 'tiny',
      '--device', 'auto',
      '--format', 'markdown'
    ], {
      timeout: 60000,
      env: {
        ...process.env,
        KMP_DUPLICATE_LIB_OK: 'TRUE',
        OMP_NUM_THREADS: '4'
      }
    });
    
    const duration = Date.now() - start;
    
    console.log('✅ Direct Python Script Success!');
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log('📝 Output Preview:', stdout.substring(0, 200) + '...');
    
    if (stderr) {
      console.log('ℹ️  Stderr:', stderr.substring(0, 200));
    }
    
  } catch (error) {
    console.log('❌ Direct Python Script Failed:', error.message);
    return false; // Don't test MCP if Python script fails
  }
  
  console.log('\n3. Testing MCP Server Integration...');
  
  // Test the MCP server integration
  try {
    const server = createServer();
    
    console.log('🔄 Testing enhanced-audio-to-markdown tool...');
    const start = Date.now();
    
    const result = await server.request({
      method: 'tools/call',
      params: {
        name: 'enhanced-audio-to-markdown',
        arguments: {
          filepath: testAudioFile,
          language: 'en',
          modelSize: 'tiny',
          device: 'auto',
          asyncMode: false // Test sync mode first
        }
      }
    });
    
    const duration = Date.now() - start;
    
    console.log('✅ MCP Server Integration Success!');
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log('📝 Result:', result.content?.[0]?.text);
    
    if (result.content?.length > 3) {
      console.log('📄 Content Preview:', result.content[3]?.text?.substring(0, 200) + '...');
    }
    
  } catch (error) {
    console.log('❌ MCP Server Integration Failed:', error.message);
  }
  
  console.log('\n🎉 GPU Acceleration Testing Complete!');
}

// Run the test
testGPUTranscription().catch(console.error);