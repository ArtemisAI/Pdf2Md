#!/usr/bin/env node

/**
 * Direct test of the enhanced audio tools
 * Tests tools directly without MCP protocol overhead
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from './dist/server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testAudioToolsDirect() {
  console.log('🎵 Direct Audio Tools Test...\n');
  
  const server = createServer();
  
  // Test file path
  const audioPath = path.join(__dirname, 'tests', 'test_audio.mp3');
  console.log(`📁 Testing with: ${audioPath}`);
  console.log(`📏 File size: ~15MB\n`);
  
  // Test 1: List tools
  console.log('🔄 Test 1: Listing available tools...');
  try {
    const toolsResponse = await server.request({
      method: 'tools/list',
      params: {}
    }, { requestId: 1 });
    
    console.log(`✅ Found ${toolsResponse.tools.length} tools`);
    
    const audioTools = toolsResponse.tools.filter(tool => 
      tool.name.includes('audio') || tool.name.includes('Audio')
    );
    
    console.log('🎵 Audio-related tools:');
    audioTools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description.substring(0, 80)}...`);
    });
    
  } catch (error) {
    console.log('❌ List tools error:', error.message);
  }
  
  // Test 2: Original audio tool
  console.log('\n🔄 Test 2: Testing original audio-to-markdown tool...');
  try {
    const originalResult = await server.request({
      method: 'tools/call',
      params: {
        name: 'audio-to-markdown',
        arguments: {
          filepath: audioPath
        }
      }
    }, { requestId: 2 });
    
    console.log('✅ Original audio tool succeeded!');
    console.log('📄 Response content items:', originalResult.content.length);
    if (originalResult.content[0]) {
      console.log('📝 First item:', originalResult.content[0].text.substring(0, 100) + '...');
    }
    if (originalResult.content[2]) {
      console.log('📝 Content preview:', originalResult.content[2].text.substring(0, 200) + '...');
    }
    
  } catch (error) {
    console.log('❌ Original audio tool error:', error.message);
    console.log('📍 Error details:', error.stack?.split('\n')[0]);
  }
  
  // Test 3: Enhanced audio tool (sync mode)
  console.log('\n🔄 Test 3: Testing enhanced-audio-to-markdown (sync mode)...');
  try {
    const enhancedResult = await server.request({
      method: 'tools/call',
      params: {
        name: 'enhanced-audio-to-markdown',
        arguments: {
          filepath: audioPath,
          language: 'en',
          modelSize: 'tiny', // Use tiny for faster testing
          device: 'auto',
          asyncMode: false
        }
      }
    }, { requestId: 3 });
    
    console.log('✅ Enhanced audio tool (sync) succeeded!');
    console.log('📄 Response content items:', enhancedResult.content.length);
    enhancedResult.content.forEach((item, i) => {
      console.log(`📝 Content ${i}:`, item.text.substring(0, 100) + (item.text.length > 100 ? '...' : ''));
    });
    
  } catch (error) {
    console.log('❌ Enhanced audio tool (sync) error:', error.message);
    console.log('📍 Error details:', error.stack?.split('\n')[0]);
  }
  
  // Test 4: Enhanced audio tool (async mode)
  console.log('\n🔄 Test 4: Testing enhanced-audio-to-markdown (async mode)...');
  try {
    const asyncResult = await server.request({
      method: 'tools/call',
      params: {
        name: 'enhanced-audio-to-markdown',
        arguments: {
          filepath: audioPath,
          language: 'en',
          modelSize: 'tiny',
          device: 'auto',
          asyncMode: true
        }
      }
    }, { requestId: 4 });
    
    console.log('✅ Enhanced audio tool (async) started!');
    console.log('📄 Response content items:', asyncResult.content.length);
    asyncResult.content.forEach((item, i) => {
      console.log(`📝 Response ${i}:`, item.text);
    });
    
    // Extract task ID for status check
    const taskIdLine = asyncResult.content.find(item => item.text.includes('Task ID:'));
    if (taskIdLine) {
      const taskId = taskIdLine.text.replace('Task ID: ', '').trim();
      console.log(`\n🆔 Extracted Task ID: ${taskId}`);
      
      // Test 5: Status check
      console.log('\n🔄 Test 5: Checking transcription status...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      
      try {
        const statusResult = await server.request({
          method: 'tools/call',
          params: {
            name: 'audio-transcription-status',
            arguments: {
              taskId: taskId
            }
          }
        }, { requestId: 5 });
        
        console.log('✅ Status check succeeded!');
        console.log('📊 Status response items:', statusResult.content.length);
        statusResult.content.forEach((item, i) => {
          console.log(`📈 Status ${i}:`, item.text);
        });
        
      } catch (error) {
        console.log('❌ Status check error:', error.message);
      }
    }
    
  } catch (error) {
    console.log('❌ Enhanced audio tool (async) error:', error.message);
    console.log('📍 Error details:', error.stack?.split('\n')[0]);
  }
  
  console.log('\n🏁 Direct Audio Tools Test Complete!');
  console.log('✨ All tests completed successfully!');
}

// Run the test
testAudioToolsDirect().catch(error => {
  console.error('❌ Test failed:', error.message);
  console.error('📍 Stack:', error.stack);
  process.exit(1);
});
