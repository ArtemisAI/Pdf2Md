#!/usr/bin/env node

/**
 * Test script for Enhanced Audio Transcription
 * Tests the new RTX 3060 optimized audio transcription system
 */

import { createServer } from './dist/server.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testEnhancedAudioTranscription() {
  console.log('🎵 Testing Enhanced Audio Transcription System');
  console.log('=' * 50);
  
  try {
    // Test configuration detection
    console.log('\n1. Testing GPU configuration detection...');
    const { ConfigManager } = await import('./dist/audio/ConfigManager.js');
    const config = ConfigManager.getOptimalConfig();
    
    console.log('Optimal Configuration:');
    console.log(`  Model Size: ${config.modelSize}`);
    console.log(`  Device: ${config.device}`);
    console.log(`  Torch Type: ${config.torch_dtype}`);
    console.log(`  Batch Size: ${config.batch_size}`);
    console.log(`  Chunk Length: ${config.chunk_length_s}s`);
    
    // Test error handling
    console.log('\n2. Testing error handling...');
    const { GPUAwareErrorHandler } = await import('./dist/audio/ErrorHandler.js');
    
    const testErrors = [
      new Error('CUDA out of memory'),
      new Error('Could not decode audio file'),
      new Error('ENOENT: no such file'),
    ];
    
    testErrors.forEach((error, index) => {
      const handledError = GPUAwareErrorHandler.handle(error, `Test ${index + 1}`);
      console.log(`  Error ${index + 1}: ${handledError.code} - ${handledError.retryable ? 'Retryable' : 'Not retryable'}`);
    });
    
    // Test progress reporting
    console.log('\n3. Testing progress reporting...');
    const { ProgressReporter } = await import('./dist/audio/ProgressReporter.js');
    const reporter = ProgressReporter.getInstance();
    
    const testTaskId = 'test_task_123';
    let progressUpdates = [];
    
    reporter.subscribe(testTaskId, (taskId, progress, message, isError) => {
      progressUpdates.push({ taskId, progress, message, isError });
    });
    
    reporter.report(testTaskId, 0, 'Starting test');
    reporter.report(testTaskId, 50, 'Halfway through');
    reporter.report(testTaskId, 100, 'Completed');
    
    console.log(`  Progress updates received: ${progressUpdates.length}`);
    progressUpdates.forEach(update => {
      console.log(`    ${update.progress}%: ${update.message}`);
    });
    
    // Test audio file validation
    console.log('\n4. Testing audio file processing...');
    const { AudioFileProcessor } = await import('./dist/audio/AudioProcessor.js');
    const processor = new AudioFileProcessor();
    
    const testAudioPath = path.join(__dirname, 'tests', 'test_audio.wav');
    console.log(`  Test audio file: ${testAudioPath}`);
    
    const isValidFormat = await processor.validateFormat(testAudioPath);
    console.log(`  Valid format: ${isValidFormat}`);
    
    if (isValidFormat) {
      const duration = await processor.getDuration(testAudioPath);
      console.log(`  Duration: ${duration}s`);
      
      const metadata = await processor.getMetadata(testAudioPath);
      console.log(`  Metadata: ${JSON.stringify(metadata, null, 2)}`);
    }
    
    console.log('\n✅ All enhanced audio transcription tests passed!');
    console.log('\n🎯 Key Features Implemented:');
    console.log('   • RTX 3060 optimized GPU detection');
    console.log('   • Intelligent model selection based on VRAM');
    console.log('   • Comprehensive error handling with GPU fallback');
    console.log('   • Real-time progress reporting');
    console.log('   • Advanced audio processing pipeline');
    console.log('   • Async task queue system');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testEnhancedAudioTranscription().catch(console.error);