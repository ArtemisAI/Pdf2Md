#!/usr/bin/env node

/**
 * Real-world test of enhanced audio transcription with 15MB file
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testEnhancedAudioReal() {
  console.log('🎵 Real-World Enhanced Audio Test');
  console.log('==================================\n');
  
  try {
    // Import the enhanced audio system
    const audio = await import('./dist/audio/index.js');
    console.log('✅ Enhanced audio module loaded');
    
    // Test file
    const audioPath = path.join(__dirname, 'tests', 'test_audio.mp3');
    console.log(`📁 Test file: ${audioPath}`);
    console.log(`📏 File size: ~15MB (~30 minutes)`);
    
    // Show optimal configuration
    const config = audio.ConfigManager.getOptimalConfig();
    console.log(`\n⚙️  RTX 3060 Optimal Configuration:`);
    console.log(`   Device: ${config.device}`);
    console.log(`   Model: ${config.modelSize}`);
    console.log(`   Batch Size: ${config.batch_size}`);
    console.log(`   Precision: ${config.torch_dtype}`);
    
    // Test async transcription
    console.log(`\n🚀 Starting async transcription...`);
    const startTime = Date.now();
    
    const taskId = await audio.transcribeAudio({
      filepath: audioPath,
      language: 'en',
      config: {
        modelSize: 'tiny', // Use tiny for faster testing of large file
        device: 'auto'
      }
    });
    
    console.log(`✅ Transcription queued with Task ID: ${taskId}`);
    console.log(`⏰ Queue time: ${Date.now() - startTime}ms`);
    
    // Monitor progress
    console.log(`\n📊 Monitoring progress...`);
    let attempts = 0;
    const maxAttempts = 60; // Wait up to 1 minute
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
      
      const task = await audio.getTaskStatus(taskId);
      if (!task) {
        console.log(`❌ Task not found: ${taskId}`);
        break;
      }
      
      console.log(`📈 Progress: ${task.status} - ${task.progress}%`);
      
      if (task.status === 'completed') {
        console.log(`✅ Transcription completed!`);
        console.log(`⏰ Total time: ${Date.now() - startTime}ms`);
        
        const result = await audio.getTranscriptionResult(taskId);
        if (result) {
          console.log(`\n📄 Transcription Result:`);
          console.log(`   Output file: ${result.path}`);
          console.log(`   Text length: ${result.text.length} characters`);
          console.log(`   Language: ${result.language || 'auto-detected'}`);
          console.log(`   Duration: ${result.duration ? Math.round(result.duration) + 's' : 'unknown'}`);
          console.log(`   Confidence: ${result.confidence ? Math.round(result.confidence * 100) + '%' : 'unknown'}`);
          
          console.log(`\n📝 Content Preview (first 500 chars):`);
          console.log(result.text.substring(0, 500) + '...');
          
          console.log(`\n🎉 SUCCESS: Enhanced audio transcription completed!`);
          console.log(`✨ The enhanced system successfully transcribed a 30-minute audio file!`);
        }
        break;
      } else if (task.status === 'failed') {
        console.log(`❌ Transcription failed: ${task.error}`);
        break;
      } else if (task.status === 'processing') {
        console.log(`⚡ Processing... (attempt ${attempts}/${maxAttempts})`);
      }
    }
    
    if (attempts >= maxAttempts) {
      console.log(`⏰ Timeout after ${maxAttempts} seconds`);
      const task = await audio.getTaskStatus(taskId);
      if (task) {
        console.log(`📊 Final status: ${task.status} - ${task.progress}%`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('📍 Stack:', error.stack);
  }
  
  console.log(`\n🏁 Real-world test complete!`);
}

testEnhancedAudioReal().catch(console.error);
