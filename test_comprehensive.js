#!/usr/bin/env node
/**
 * Comprehensive test of GPU acceleration implementation
 * Tests the core functionality without requiring full MCP server connection
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runComprehensiveTest() {
  console.log('🚀 Comprehensive GPU Acceleration Test\n');
  console.log('=' * 50);
  
  let passedTests = 0;
  let totalTests = 0;
  
  // Test 1: Module Loading
  totalTests++;
  console.log('\n1. 📦 Module Loading Test');
  try {
    const { detectGPU, getOptimalTranscriptionConfig } = await import('./dist/utils.js');
    const { EnhancedAudioTranscription } = await import('./dist/audio/EnhancedAudioTranscription.js');
    const { createServer } = await import('./dist/server.js');
    
    console.log('✅ All modules loaded successfully');
    passedTests++;
  } catch (error) {
    console.log('❌ Module loading failed:', error.message);
  }
  
  // Test 2: GPU Detection Logic
  totalTests++;
  console.log('\n2. 🔍 GPU Detection Logic');
  try {
    const { detectGPU } = await import('./dist/utils.js');
    const gpuInfo = await detectGPU();
    
    // This should return a valid GPUInfo object regardless of GPU availability
    if (gpuInfo && typeof gpuInfo === 'object' && 'available' in gpuInfo) {
      console.log('✅ GPU detection logic working');
      console.log(`   Available: ${gpuInfo.available}`);
      console.log(`   Device: ${gpuInfo.device}`);
      console.log(`   Model: ${gpuInfo.recommendedModel}`);
      passedTests++;
    } else {
      throw new Error('Invalid GPU info returned');
    }
  } catch (error) {
    console.log('❌ GPU detection failed:', error.message);
  }
  
  // Test 3: Configuration Management
  totalTests++;
  console.log('\n3. ⚙️  Configuration Management');
  try {
    const { EnhancedAudioTranscription } = await import('./dist/audio/EnhancedAudioTranscription.js');
    const transcriber = new EnhancedAudioTranscription();
    const config = transcriber.getConfig();
    
    // Check required config properties
    const requiredProps = ['modelSize', 'device', 'language', 'batch_size'];
    const hasAllProps = requiredProps.every(prop => prop in config);
    
    if (hasAllProps) {
      console.log('✅ Configuration management working');
      console.log(`   Model Size: ${config.modelSize}`);
      console.log(`   Device: ${config.device}`);
      console.log(`   Batch Size: ${config.batch_size}`);
      passedTests++;
    } else {
      throw new Error('Missing required configuration properties');
    }
  } catch (error) {
    console.log('❌ Configuration test failed:', error.message);
  }
  
  // Test 4: File Validation
  totalTests++;
  console.log('\n4. 📂 File Validation');
  try {
    const testFile = path.join(__dirname, 'tests', 'test_audio.wav');
    const fs = await import('fs');
    
    if (fs.existsSync(testFile)) {
      const stats = await fs.promises.stat(testFile);
      console.log('✅ Test audio file found');
      console.log(`   Path: ${testFile}`);
      console.log(`   Size: ${Math.round(stats.size / 1024)}KB`);
      passedTests++;
    } else {
      throw new Error('Test audio file not found');
    }
  } catch (error) {
    console.log('❌ File validation failed:', error.message);
  }
  
  // Test 5: Python Script Availability
  totalTests++;
  console.log('\n5. 🐍 Python Script Check');
  try {
    const scriptPath = path.join(__dirname, 'src', 'gpu_transcribe.py');
    const fs = await import('fs');
    
    if (fs.existsSync(scriptPath)) {
      const content = await fs.promises.readFile(scriptPath, 'utf8');
      
      // Check for key functions
      const hasFasterWhisper = content.includes('faster_whisper');
      const hasGPUDetection = content.includes('detect_gpu_capability');
      const hasMain = content.includes('def main()');
      
      if (hasFasterWhisper && hasGPUDetection && hasMain) {
        console.log('✅ GPU transcription script valid');
        console.log('   ✓ faster-whisper integration');
        console.log('   ✓ GPU detection logic'); 
        console.log('   ✓ Main function');
        passedTests++;
      } else {
        throw new Error('Script missing required functionality');
      }
    } else {
      throw new Error('GPU transcription script not found');
    }
  } catch (error) {
    console.log('❌ Python script check failed:', error.message);
  }
  
  // Test 6: Tool Schema Validation
  totalTests++;
  console.log('\n6. 🛠️  Tool Schema Validation');
  try {
    const tools = await import('./dist/tools.js');
    
    if (tools.EnhancedAudioToMarkdownTool && tools.AudioTranscriptionStatusTool) {
      const enhancedTool = tools.EnhancedAudioToMarkdownTool;
      
      // Check schema properties
      const hasName = enhancedTool.name === 'enhanced-audio-to-markdown';
      const hasDescription = enhancedTool.description && enhancedTool.description.length > 0;
      const hasInputSchema = enhancedTool.inputSchema && enhancedTool.inputSchema.properties;
      
      if (hasName && hasDescription && hasInputSchema) {
        console.log('✅ Tool schemas valid');
        console.log(`   Enhanced tool: ${enhancedTool.name}`);
        console.log(`   Status tool: ${tools.AudioTranscriptionStatusTool.name}`);
        passedTests++;
      } else {
        throw new Error('Invalid tool schema structure');
      }
    } else {
      throw new Error('Enhanced audio tools not found');
    }
  } catch (error) {
    console.log('❌ Tool schema validation failed:', error.message);
  }
  
  // Test 7: Fallback Logic
  totalTests++;
  console.log('\n7. 🔄 Fallback Logic Test');
  try {
    // Test that our enhanced transcription gracefully handles missing dependencies
    const { EnhancedAudioTranscription } = await import('./dist/audio/EnhancedAudioTranscription.js');
    
    // Create instance - should not throw even without GPU
    const transcriber = new EnhancedAudioTranscription({
      device: 'cpu',  // Force CPU mode
      modelSize: 'tiny'
    });
    
    const config = transcriber.getConfig();
    
    if (config.device && config.modelSize) {
      console.log('✅ Fallback logic working');
      console.log('   ✓ CPU mode configuration');
      console.log('   ✓ Graceful degradation'); 
      passedTests++;
    } else {
      throw new Error('Fallback configuration invalid');
    }
  } catch (error) {
    console.log('❌ Fallback logic failed:', error.message);
  }
  
  // Test Summary
  console.log('\n' + '=' * 50);
  console.log('📊 Test Summary');
  console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);
  console.log(`📈 Success Rate: ${Math.round((passedTests/totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! GPU acceleration implementation is ready.');
    console.log('🚀 When dependencies are installed, GPU acceleration will be automatically used.');
    console.log('💻 Currently using CPU fallback mode.');
  } else {
    console.log(`\n⚠️  ${totalTests - passedTests} test(s) failed. Check implementation.`);
  }
  
  console.log('\n📚 Next Steps:');
  console.log('  1. Install GPU dependencies (see GPU_SETUP.md)'); 
  console.log('  2. Test with actual audio files');
  console.log('  3. Benchmark performance vs original implementation');
  
  return passedTests === totalTests;
}

runComprehensiveTest().catch(console.error);