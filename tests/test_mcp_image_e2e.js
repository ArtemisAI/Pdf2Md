import { spawn } from 'child_process';
import assert from 'assert';
import path from 'path';

async function testMCPImageEndToEnd() {
  console.log('🔗 Starting End-to-End MCP Image-to-Markdown Test');
  
  return new Promise((resolve, reject) => {
    // Start MCP server
    const server = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    server.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    server.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    // Wait for server to initialize
    setTimeout(() => {
      // Send test request
      const testRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'image-to-markdown',
          arguments: {
            filepath: path.resolve('tests/2.JPG')
          }
        }
      };
      
      server.stdin.write(JSON.stringify(testRequest) + '\n');
      
      // Wait for response
      setTimeout(() => {
        server.kill();
        
        console.log('📤 Request sent:', JSON.stringify(testRequest, null, 2));
        console.log('📥 Server stdout length:', stdout.length);
        
        if (stderr) {
          console.log('⚠️  Server stderr:', stderr);
        }
        
        // Validate response
        try {
          assert(stdout.includes('image-to-markdown') || stdout.includes('Image Content'), 
                 'Response should reference image-to-markdown or Image Content');
          assert(stdout.includes('result'), 'Response should contain result field');
          assert(!stdout.includes('"isError":true'), 'Response should not contain errors');
          assert(stdout.includes('OCR'), 'Response should mention OCR functionality');
          
          console.log('✅ End-to-End MCP test PASSED');
          resolve(true);
        } catch (error) {
          console.error('❌ End-to-End MCP test FAILED:', error.message);
          console.log('Full stdout for debugging:', stdout);
          reject(error);
        }
      }, 8000); // Give more time for OCR processing
    }, 2000);
    
    server.on('error', reject);
  });
}

testMCPImageEndToEnd().catch(error => {
  console.error('E2E test failed:', error);
  process.exit(1);
});