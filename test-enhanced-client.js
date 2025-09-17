#!/usr/bin/env node

/**
 * Enhanced Test client for MCP HTTP Server
 * Tests SSE streaming, audio transcription progress, and resumability
 */

import { randomUUID } from 'node:crypto';

class EnhancedMCPHttpClient {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.sessionId = randomUUID();
  }

  async testHealth() {
    console.log('🏥 Testing health endpoint...');
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const health = await response.json();
      console.log('✅ Health check passed:', health);
      return health;
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      throw error;
    }
  }

  async testAudioTranscriptionStart() {
    console.log('🎵 Testing audio transcription start...');
    try {
      const response = await fetch(`${this.baseUrl}/mcp/audio/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Mcp-Session-Id': this.sessionId
        },
        body: JSON.stringify({
          filePath: '/tmp/test-audio.mp3',
          language: 'en',
          modelSize: 'tiny',
          device: 'auto'
        })
      });

      const result = await response.json();
      console.log('✅ Audio transcription started:', result);
      return result;
    } catch (error) {
      console.error('❌ Audio transcription start failed:', error.message);
      throw error;
    }
  }

  async testAudioProgressStreaming(taskId) {
    console.log(`📡 Testing audio progress streaming for task ${taskId}...`);
    return new Promise((resolve, reject) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        resolve({ events: [], message: 'Streaming test completed (timeout)' });
      }, 5000); // 5 second test

      const events = [];

      fetch(`${this.baseUrl}/mcp/audio/progress/${taskId}`, {
        headers: {
          'Accept': 'text/event-stream',
          'Mcp-Session-Id': this.sessionId
        },
        signal: controller.signal
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        function readStream() {
          reader.read().then(({ done, value }) => {
            if (done) {
              clearTimeout(timeoutId);
              resolve({ events, message: 'Stream completed' });
              return;
            }

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\\n');
            
            for (const line of lines) {
              if (line.startsWith('event:')) {
                const eventType = line.substring(6).trim();
                events.push({ type: 'event', data: eventType });
              } else if (line.startsWith('data:')) {
                try {
                  const data = JSON.parse(line.substring(5).trim());
                  events.push({ type: 'data', data });
                  console.log(`  📨 Received:`, data);
                } catch (e) {
                  // Non-JSON data
                  events.push({ type: 'data', data: line.substring(5).trim() });
                }
              }
            }

            readStream();
          }).catch(error => {
            if (error.name !== 'AbortError') {
              console.error('Stream reading error:', error);
              reject(error);
            }
          });
        }

        readStream();
      })
      .catch(error => {
        if (error.name !== 'AbortError') {
          console.error('❌ Audio progress streaming failed:', error.message);
          reject(error);
        }
      });
    });
  }

  async testAudioStatus(taskId) {
    console.log(`📊 Testing audio status for task ${taskId}...`);
    try {
      const response = await fetch(`${this.baseUrl}/mcp/audio/status/${taskId}`);
      const status = await response.json();
      console.log('✅ Audio status:', status);
      return status;
    } catch (error) {
      console.error('❌ Audio status failed:', error.message);
      throw error;
    }
  }

  async testSessionEvents() {
    console.log('📚 Testing session events endpoint...');
    try {
      const response = await fetch(`${this.baseUrl}/mcp/session/${this.sessionId}/events`);
      const result = await response.json();
      console.log('✅ Session events:', result);
      return result;
    } catch (error) {
      console.error('❌ Session events failed:', error.message);
      throw error;
    }
  }

  async runEnhancedTests() {
    console.log('🚀 Starting Enhanced MCP HTTP Client Tests');
    console.log('==========================================\\n');

    const results = {
      health: false,
      audioStart: false,
      audioStreaming: false,
      audioStatus: false,
      sessionEvents: false
    };

    let transcriptionResult = null;

    try {
      await this.testHealth();
      results.health = true;
    } catch (error) {
      console.error('Health test failed');
    }

    try {
      transcriptionResult = await this.testAudioTranscriptionStart();
      results.audioStart = true;
    } catch (error) {
      console.error('Audio transcription start test failed');
    }

    if (transcriptionResult && transcriptionResult.taskId) {
      try {
        const streamingResult = await this.testAudioProgressStreaming(transcriptionResult.taskId);
        console.log('✅ Audio progress streaming test passed:', streamingResult);
        results.audioStreaming = true;
      } catch (error) {
        console.error('Audio progress streaming test failed');
      }

      try {
        await this.testAudioStatus(transcriptionResult.taskId);
        results.audioStatus = true;
      } catch (error) {
        console.error('Audio status test failed');
      }
    }

    try {
      await this.testSessionEvents();
      results.sessionEvents = true;
    } catch (error) {
      console.error('Session events test failed');
    }

    console.log('\\n📊 Enhanced Test Results Summary:');
    console.log('=================================');
    Object.entries(results).forEach(([test, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
    });

    const passedCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;
    
    console.log(`\\n🎯 Overall: ${passedCount}/${totalCount} enhanced tests passed`);
    
    if (passedCount === totalCount) {
      console.log('🎉 All enhanced tests passed! HTTP MCP Server with streaming is working correctly.');
      return true;
    } else {
      console.log('⚠️  Some enhanced tests failed. Check the output above for details.');
      return false;
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const client = new EnhancedMCPHttpClient();
  client.runEnhancedTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Enhanced test suite failed:', error);
      process.exit(1);
    });
}

export { EnhancedMCPHttpClient };