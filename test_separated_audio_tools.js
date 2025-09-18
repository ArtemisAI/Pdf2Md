#!/usr/bin/env node

/**
 * Test separated CPU and GPU audio transcription tools
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test file path
const testAudioFile = path.join(__dirname, 'tests/audio_samples/github_friendly/test_002_duration_21kb.mp3');

console.log('🎯 Testing Separated Audio Transcription Tools\n');

async function testMCPServer() {
    return new Promise((resolve, reject) => {
        console.log('🚀 Starting MCP Server...');
        
        const server = spawn('node', ['dist/index.js'], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let serverReady = false;
        let toolsResult = null;

        // Handle server output
        server.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('📤 Server output:', output.trim());
        });

        server.stderr.on('data', (data) => {
            const output = data.toString();
            if (output.includes('error') || output.includes('Error')) {
                console.log('🚨 Server error:', output.trim());
            } else {
                console.log('📤 Server stderr:', output.trim());
            }
        });

        // Function to send JSON-RPC request
        const sendRequest = (request) => {
            server.stdin.write(JSON.stringify(request) + '\n');
        };

        // Handle server responses
        let responseBuffer = '';
        server.stdout.on('data', (data) => {
            responseBuffer += data.toString();
            
            // Try to parse complete JSON responses
            const lines = responseBuffer.split('\n');
            responseBuffer = lines.pop() || ''; // Keep incomplete line

            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const response = JSON.parse(line);
                        handleResponse(response);
                    } catch (e) {
                        // Not JSON, might be log output
                    }
                }
            }
        });

        let testStep = 0;
        const tests = [
            { name: 'List Tools', id: 1 },
            { name: 'Test CPU Audio Tool', id: 2 },
            { name: 'Test GPU Audio Tool', id: 3 }
        ];

        function handleResponse(response) {
            if (!serverReady && response.result && response.result.tools) {
                serverReady = true;
                toolsResult = response.result;
                console.log(`✅ Tools retrieved: ${response.result.tools.length}`);
                
                // Find audio tools
                const audioTools = response.result.tools.filter(tool => 
                    tool.name.includes('audio') || tool.name.includes('Audio')
                );
                
                console.log('🎵 Audio tools found:');
                audioTools.forEach(tool => {
                    console.log(`  - ${tool.name}: ${tool.description}`);
                });
                
                // Start CPU test
                console.log('\\n🔄 Test 1: Testing CPU audio tool...');
                testCPUAudio();
                
            } else if (response.id === 2) {
                // CPU test result
                console.log('✅ CPU audio tool response received!');
                if (response.result && response.result.length > 0) {
                    console.log('📝 CPU Result type:', typeof response.result[0].content);
                    if (response.result[0].content && response.result[0].content.text) {
                        console.log('📄 CPU Transcription preview:', response.result[0].content.text.substring(0, 100) + '...');
                    }
                } else if (response.error) {
                    console.log('❌ CPU Tool error:', response.error.message);
                }
                
                // Start GPU test
                console.log('\\n🔄 Test 2: Testing GPU audio tool...');
                testGPUAudio();
                
            } else if (response.id === 3) {
                // GPU test result
                console.log('✅ GPU audio tool response received!');
                if (response.result && response.result.length > 0) {
                    console.log('📝 GPU Result type:', typeof response.result[0].content);
                    if (response.result[0].content && response.result[0].content.text) {
                        console.log('📄 GPU Transcription preview:', response.result[0].content.text.substring(0, 100) + '...');
                    }
                } else if (response.error) {
                    console.log('❌ GPU Tool error:', response.error.message);
                    console.log('🔍 GPU Error details:', JSON.stringify(response.error, null, 2));
                }
                
                console.log('\\n🏁 Separated Audio Tools Test Complete!');
                server.kill();
                resolve('Tests completed');
            }
        }

        function testCPUAudio() {
            const cpuRequest = {
                jsonrpc: "2.0",
                id: 2,
                method: "tools/call",
                params: {
                    name: "cpu-audio-to-markdown",
                    arguments: {
                        filepath: testAudioFile,
                        modelSize: "base",
                        language: "en"
                    }
                }
            };
            console.log('📤 Sending CPU audio request...');
            sendRequest(cpuRequest);
        }

        function testGPUAudio() {
            const gpuRequest = {
                jsonrpc: "2.0",
                id: 3,
                method: "tools/call",
                params: {
                    name: "gpu-audio-to-markdown",
                    arguments: {
                        filepath: testAudioFile,
                        modelSize: "base",
                        language: "en",
                        device: "cuda"
                    }
                }
            };
            console.log('📤 Sending GPU audio request...');
            sendRequest(gpuRequest);
        }

        // Start with listing tools
        setTimeout(() => {
            const listToolsRequest = {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/list",
                params: {}
            };
            console.log('🔄 Requesting tools list...');
            sendRequest(listToolsRequest);
        }, 1000);

        server.on('close', (code) => {
            console.log(`🛑 Server stopped with code ${code}`);
            resolve('Server stopped');
        });

        // Timeout after 2 minutes
        setTimeout(() => {
            console.log('⏰ Test timeout reached');
            server.kill();
            resolve('Timeout');
        }, 120000);
    });
}

// Run the test
testMCPServer()
    .then(result => {
        console.log('🎯 Test completed:', result);
        process.exit(0);
    })
    .catch(error => {
        console.error('💥 Test failed:', error);
        process.exit(1);
    });
