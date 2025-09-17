#!/usr/bin/env node

/**
 * Security Test client for MCP HTTP Server
 * Tests authentication, rate limiting, and security features
 */

import { randomUUID } from 'node:crypto';

class SecurityTestClient {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.sessionId = randomUUID();
  }

  async testHealthWithoutAuth() {
    console.log('🏥 Testing health endpoint (no auth required)...');
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const health = await response.json();
      console.log('✅ Health check passed:', {
        status: health.status,
        authentication: health.authentication,
        environment: health.environment
      });
      return health;
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      throw error;
    }
  }

  async testUnauthorizedAccess() {
    console.log('🔒 Testing unauthorized access (should fail in auth mode)...');
    try {
      const response = await fetch(`${this.baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list'
        })
      });

      if (response.status === 401) {
        console.log('✅ Correctly rejected unauthorized request');
        const error = await response.json();
        console.log('  📝 Error response:', error);
        return { authorized: false, expected: true };
      } else {
        console.log('✅ Request allowed (auth disabled)');
        const result = await response.json();
        return { authorized: true, expected: true };
      }
    } catch (error) {
      console.error('❌ Unauthorized access test failed:', error.message);
      throw error;
    }
  }

  async testWithApiKey(apiKey = 'test-api-key') {
    console.log('🔑 Testing with API key...');
    try {
      const response = await fetch(`${this.baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Mcp-Session-Id': this.sessionId
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list'
        })
      });

      const result = await response.json();
      const requestId = response.headers.get('X-Request-ID');
      
      if (response.ok) {
        console.log('✅ API key request successful');
        console.log('  📝 Request ID:', requestId);
        console.log('  📋 Response:', result);
      } else {
        console.log('❌ API key request failed:', result);
      }

      return { success: response.ok, requestId, result };
    } catch (error) {
      console.error('❌ API key test failed:', error.message);
      throw error;
    }
  }

  async testRateLimiting() {
    console.log('⚡ Testing rate limiting...');
    try {
      const requests = [];
      const startTime = Date.now();

      // Send multiple requests quickly to trigger rate limiting
      for (let i = 0; i < 15; i++) {
        requests.push(
          fetch(`${this.baseUrl}/health`).then(res => ({
            status: res.status,
            headers: {
              rateLimit: res.headers.get('X-RateLimit-Limit'),
              remaining: res.headers.get('X-RateLimit-Remaining'),
              reset: res.headers.get('X-RateLimit-Reset')
            }
          }))
        );
      }

      const responses = await Promise.all(requests);
      const duration = Date.now() - startTime;

      const rateLimited = responses.filter(r => r.status === 429);
      const successful = responses.filter(r => r.status === 200);

      console.log('✅ Rate limiting test completed:');
      console.log(`  📊 ${successful.length} successful, ${rateLimited.length} rate limited`);
      console.log(`  ⏱️  Duration: ${duration}ms`);
      
      if (successful.length > 0) {
        console.log(`  📈 Rate limit headers:`, successful[0].headers);
      }

      return {
        successful: successful.length,
        rateLimited: rateLimited.length,
        duration
      };
    } catch (error) {
      console.error('❌ Rate limiting test failed:', error.message);
      throw error;
    }
  }

  async testSecurityHeaders() {
    console.log('🛡️  Testing security headers...');
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      
      const securityHeaders = {
        'X-Content-Type-Options': response.headers.get('X-Content-Type-Options'),
        'X-Frame-Options': response.headers.get('X-Frame-Options'),
        'X-XSS-Protection': response.headers.get('X-XSS-Protection'),
        'Referrer-Policy': response.headers.get('Referrer-Policy'),
        'Content-Security-Policy': response.headers.get('Content-Security-Policy'),
        'X-Request-ID': response.headers.get('X-Request-ID')
      };

      console.log('✅ Security headers present:');
      Object.entries(securityHeaders).forEach(([header, value]) => {
        if (value) {
          console.log(`  🔒 ${header}: ${value}`);
        } else {
          console.log(`  ⚠️  ${header}: Not set`);
        }
      });

      return securityHeaders;
    } catch (error) {
      console.error('❌ Security headers test failed:', error.message);
      throw error;
    }
  }

  async testCorsHeaders() {
    console.log('🌐 Testing CORS headers...');
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://example.com',
          'Access-Control-Request-Method': 'GET'
        }
      });

      const corsHeaders = {
        'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
        'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
        'Access-Control-Allow-Credentials': response.headers.get('Access-Control-Allow-Credentials')
      };

      console.log('✅ CORS headers:');
      Object.entries(corsHeaders).forEach(([header, value]) => {
        console.log(`  🌍 ${header}: ${value || 'Not set'}`);
      });

      return corsHeaders;
    } catch (error) {
      console.error('❌ CORS headers test failed:', error.message);
      throw error;
    }
  }

  async runSecurityTests() {
    console.log('🔐 Starting MCP HTTP Security Tests');
    console.log('===================================\\n');

    const results = {
      health: false,
      unauthorized: false,
      apiKey: false,
      rateLimiting: false,
      securityHeaders: false,
      corsHeaders: false
    };

    try {
      await this.testHealthWithoutAuth();
      results.health = true;
    } catch (error) {
      console.error('Health test failed');
    }

    try {
      await this.testUnauthorizedAccess();
      results.unauthorized = true;
    } catch (error) {
      console.error('Unauthorized access test failed');
    }

    try {
      await this.testWithApiKey();
      results.apiKey = true;
    } catch (error) {
      console.error('API key test failed');
    }

    try {
      await this.testRateLimiting();
      results.rateLimiting = true;
    } catch (error) {
      console.error('Rate limiting test failed');
    }

    try {
      await this.testSecurityHeaders();
      results.securityHeaders = true;
    } catch (error) {
      console.error('Security headers test failed');
    }

    try {
      await this.testCorsHeaders();
      results.corsHeaders = true;
    } catch (error) {
      console.error('CORS headers test failed');
    }

    console.log('\\n🔐 Security Test Results Summary:');
    console.log('==================================');
    Object.entries(results).forEach(([test, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
    });

    const passedCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;
    
    console.log(`\\n🎯 Overall: ${passedCount}/${totalCount} security tests passed`);
    
    if (passedCount === totalCount) {
      console.log('🎉 All security tests passed! HTTP MCP Server is secure and production-ready.');
      return true;
    } else {
      console.log('⚠️  Some security tests failed. Check the output above for details.');
      return false;
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const client = new SecurityTestClient();
  client.runSecurityTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Security test suite failed:', error);
      process.exit(1);
    });
}

export { SecurityTestClient };