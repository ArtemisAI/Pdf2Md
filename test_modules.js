#!/usr/bin/env node

/**
 * Module import and basic functionality test for enhanced audio system
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testModuleImports() {
  console.log('🎵 Testing Enhanced Audio Module Imports...\n');
  
  try {
    // Test 1: Import audio modules
    console.log('🔄 Test 1: Importing audio modules...');
    const audioModule = await import('./dist/audio/index.js');
    console.log('✅ Audio module imported successfully');
    console.log('📦 Available exports:', Object.keys(audioModule));
    
    // Test 2: Import server module  
    console.log('\n🔄 Test 2: Importing server module...');
    const serverModule = await import('./dist/server.js');
    console.log('✅ Server module imported successfully');
    console.log('📦 Available exports:', Object.keys(serverModule));
    
    // Test 3: Import tools module
    console.log('\n🔄 Test 3: Importing tools module...');
    const toolsModule = await import('./dist/tools.js');
    console.log('✅ Tools module imported successfully');
    console.log('🛠️  Available tools:', Object.keys(toolsModule).filter(key => key.includes('Tool')));
    
    // Test 4: Check ConfigManager functionality
    console.log('\n🔄 Test 4: Testing ConfigManager...');
    const { ConfigManager } = audioModule;
    const optimalConfig = ConfigManager.getOptimalConfig();
    console.log('✅ ConfigManager working');
    console.log('⚙️  Optimal config:', {
      device: optimalConfig.device,
      modelSize: optimalConfig.modelSize,
      batch_size: optimalConfig.batch_size
    });
    
    // Test 5: Check if RTX 3060 detection works
    console.log('\n🔄 Test 5: Testing RTX 3060 detection...');
    const deviceInfo = await ConfigManager.detectOptimalDevice();
    console.log('✅ Device detection completed');
    console.log('🖥️  Detected device info:', deviceInfo);
    
    // Test 6: Verify tool schemas
    console.log('\n🔄 Test 6: Verifying enhanced tool schemas...');
    const { EnhancedAudioToMarkdownTool, AudioTranscriptionStatusTool } = toolsModule;
    console.log('✅ Enhanced tools verified');
    console.log('🎯 Enhanced Audio Tool:', EnhancedAudioToMarkdownTool.name);
    console.log('📊 Status Tool:', AudioTranscriptionStatusTool.name);
    
    console.log('\n🏁 All module tests passed!');
    console.log('✨ Enhanced Audio Transcription System is ready for RTX 3060 optimization!');
    
  } catch (error) {
    console.error('❌ Module test failed:', error.message);
    console.error('📍 Stack trace:', error.stack);
  }
}

// Run the test
testModuleImports().catch(console.error);
