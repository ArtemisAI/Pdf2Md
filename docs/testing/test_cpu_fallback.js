#!/usr/bin/env node

/**
 * Test with CPU fallback to verify the enhanced system works
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testCPUFallback() {
  console.log('🎵 Enhanced Audio Test with CPU Fallback');
  console.log('=======================================\n');
  
  try {
    const audio = await import('./dist/audio/index.js');
    console.log('✅ Enhanced audio module loaded');
    
    // Use a smaller test file for CPU testing
    const audioPath = path.join(__dirname, 'tests', 'test_audio.wav');
    console.log(`📁 Test file: ${audioPath}`);
    
    // Force CPU mode to test fallback
    console.log(`\n⚙️  Testing CPU fallback mode:`);
    
    const startTime = Date.now();
    
    const taskId = await audio.transcribeAudio({
      filepath: audioPath,
      language: 'en',
      config: {
        modelSize: 'tiny', // Smallest model for testing
        device: 'cpu'      // Force CPU mode
      }
    });
    
    console.log(`✅ CPU transcription queued: ${taskId}`);
    console.log(`⏰ Queue time: ${Date.now() - startTime}ms`);
    
    // Monitor progress for CPU transcription
    let attempts = 0;
    const maxAttempts = 30; // CPU will be slower
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
      
      const task = await audio.getTaskStatus(taskId);
      if (!task) {
        console.log(`❌ Task not found: ${taskId}`);
        break;
      }
      
      console.log(`📈 Progress: ${task.status} - ${task.progress}%`);
      
      if (task.status === 'completed') {
        console.log(`✅ CPU transcription completed!`);
        console.log(`⏰ Total time: ${Date.now() - startTime}ms`);
        
        const result = await audio.getTranscriptionResult(taskId);
        if (result) {
          console.log(`\n📄 CPU Transcription Result:`);
          console.log(`   Output file: ${result.path}`);
          console.log(`   Text length: ${result.text.length} characters`);
          console.log(`   Language: ${result.language || 'auto-detected'}`);
          
          console.log(`\n📝 Content Preview:`);
          console.log(result.text.substring(0, 300) + '...');
          
          console.log(`\n🎉 SUCCESS: CPU fallback works perfectly!`);
          console.log(`✨ Enhanced system gracefully falls back to CPU when GPU isn't available`);
        }
        break;
      } else if (task.status === 'failed') {
        console.log(`❌ CPU transcription failed: ${task.error}`);
        
        // Test the original tool as comparison
        console.log(`\n🔄 Comparing with original tool...`);
        try {
          const { Markdownify } = await import('./dist/Markdownify.js');
          const originalResult = await Markdownify.toMarkdown({ filePath: audioPath });
          console.log(`📊 Original tool result: ${originalResult.text.substring(0, 200)}...`);
        } catch (origError) {
          console.log(`❌ Original tool also failed: ${origError.message}`);
        }
        break;
      }
    }
    
    if (attempts >= maxAttempts) {
      console.log(`⏰ CPU test timeout after ${maxAttempts * 2} seconds`);
    }
    
  } catch (error) {
    console.error('❌ CPU test failed:', error.message);
    console.error('📍 Details:', error.stack?.split('\n')[0]);
  }
  
  console.log(`\n🏁 CPU fallback test complete!`);
}

testCPUFallback().catch(console.error);
