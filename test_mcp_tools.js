#!/usr/bin/env node
const axios = require('axios');
const EventSource = require('eventsource');

const SERVER_URL = 'http://localhost:3000';

async function testMCPTools() {
    console.log('\n🔧 Testing MCP Tools via HTTP-SSE Server\n');

    try {
        // Start a test SSE connection
        console.log('🔄 Test 1: Establishing SSE connection...');
        const eventSource = new EventSource(`${SERVER_URL}/mcp/sse?session_id=test-tools-session`);
        
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('SSE connection timeout'));
            }, 5000);

            eventSource.onopen = () => {
                console.log('  ✅ SSE connection established');
                clearTimeout(timeout);
                resolve();
            };

            eventSource.onerror = (error) => {
                console.log('  ⚠️ SSE connection error (expected without Redis):', error.type);
                clearTimeout(timeout);
                resolve(); // Continue with test
            };
        }).catch(error => {
            console.log('  ⚠️ SSE connection failed (expected without Redis)');
        });

        // Test list tools via POST message
        console.log('\n🔄 Test 2: Testing list_tools via POST...');
        const listToolsRequest = {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/list",
            params: {}
        };

        try {
            const response = await axios.post(`${SERVER_URL}/mcp/message`, listToolsRequest, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-ID': 'test-tools-session'
                },
                timeout: 10000
            });

            console.log('  Status:', response.status);
            if (response.data && response.data.result && response.data.result.tools) {
                console.log('  ✅ Tools list received');
                console.log(`  📊 Found ${response.data.result.tools.length} tools:`);
                
                response.data.result.tools.forEach(tool => {
                    console.log(`    - ${tool.name}: ${tool.description}`);
                });
            } else {
                console.log('  ❌ Invalid tools response');
                console.log('  Response:', JSON.stringify(response.data, null, 2));
            }
        } catch (error) {
            console.log('  ❌ POST request failed:', error.message);
            if (error.response) {
                console.log('  Response status:', error.response.status);
                console.log('  Response data:', error.response.data);
            }
        }

        // Clean up
        eventSource.close();

        console.log('\n🎯 MCP Tools test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    testMCPTools().catch(console.error);
}

module.exports = { testMCPTools };
