import { Markdownify } from '../dist/Markdownify.js';
import assert from 'assert';
import path from 'path';
import fs from 'fs';

async function testImageOCRIntegration() {
  console.log('🧪 Starting Image-to-Markdown OCR Integration Tests');
  
  const testImages = [
    { path: 'tests/2.JPG', expectText: true, minLength: 100 },
    { path: 'tests/Test_3.jpg', expectText: true, minLength: 20 },
    { path: 'logo.jpg', expectText: true, minLength: 50 }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const testImage of testImages) {
    console.log(`\n📸 Testing: ${testImage.path}`);
    
    try {
      // Check if file exists
      if (!fs.existsSync(testImage.path)) {
        console.log(`⚠️  Skipping ${testImage.path} - file not found`);
        continue;
      }
      
      // Run OCR conversion
      const startTime = Date.now();
      const result = await Markdownify.toMarkdown({
        filePath: path.resolve(testImage.path)
      });
      const processingTime = Date.now() - startTime;
      
      console.log(`📊 Results for ${testImage.path}:`);
      console.log(`   • Content length: ${result.text.length} characters`);
      console.log(`   • Processing time: ${processingTime}ms`);
      console.log(`   • Content preview: ${result.text.substring(0, 100).replace(/\n/g, '\\n')}`);
      
      // Validate results
      if (testImage.expectText) {
        assert(result.text.length >= testImage.minLength, 
               `Expected at least ${testImage.minLength} characters, got ${result.text.length}`);
        assert(result.text.includes('# Image Content'), 
               'Result should contain markdown headers');
        assert(result.text.includes('## Extracted Text'), 
               'Result should reference extracted text section');
        assert(result.text.includes('## Image Metadata'), 
               'Result should contain image metadata section');
      }
      
      // Performance validation
      assert(processingTime < 30000, 
             `Processing took too long: ${processingTime}ms (max 30s)`);
      
      console.log(`✅ PASSED: ${testImage.path}`);
      passed++;
      
    } catch (error) {
      console.error(`❌ FAILED: ${testImage.path} - ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n📈 Test Summary:`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📊 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

testImageOCRIntegration().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});