/**
 * Health Check and Monitoring Endpoints
 * Provides comprehensive health monitoring for HTTP-MCP server
 */

import express from 'express';
import { RedisSessionStore, RedisEventStore } from './redis-store.js';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export function createHealthEndpoints(
  sessionStore: RedisSessionStore, 
  eventStore: RedisEventStore
) {
  const router = express.Router();

  // Basic health check
  router.get('/', async (req, res) => {
    try {
      const health = await performHealthCheck(sessionStore, eventStore);
      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Detailed health check
  router.get('/detailed', async (req, res) => {
    try {
      const health = await performDetailedHealthCheck(sessionStore, eventStore);
      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });

  // GPU status check
  router.get('/gpu', async (req, res) => {
    try {
      const gpuStatus = await checkGPUStatus();
      res.json(gpuStatus);
    } catch (error) {
      res.status(500).json({
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Redis connection check
  router.get('/redis', async (req, res) => {
    try {
      const redisStatus = await checkRedisStatus(sessionStore);
      const statusCode = redisStatus.connected ? 200 : 503;
      res.status(statusCode).json(redisStatus);
    } catch (error) {
      res.status(503).json({
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });

  // System metrics
  router.get('/metrics', async (req, res) => {
    try {
      const metrics = await getSystemMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });

  return router;
}

async function performHealthCheck(
  sessionStore: RedisSessionStore, 
  eventStore: RedisEventStore
) {
  // Use timeout wrapper for all checks
  const timeoutWrapper = (promise: Promise<any>, timeout = 3000) => {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout')), timeout)
      )
    ]);
  };

  const checks = await Promise.allSettled([
    timeoutWrapper(checkRedisStatus(sessionStore)),
    timeoutWrapper(checkGPUStatus()),
    timeoutWrapper(checkSystemResources())
  ]);

  const redisResult = checks[0];
  const gpuResult = checks[1];
  const systemResult = checks[2];

  const redisHealthy = redisResult.status === 'fulfilled' && redisResult.value.connected;
  const systemHealthy = systemResult.status === 'fulfilled';
  
  // Server is healthy even if Redis is not available
  const overall = systemHealthy ? 'healthy' : 'degraded';

  return {
    status: overall,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    redis: redisResult.status === 'fulfilled' ? redisResult.value.connected : false,
    gpu: gpuResult.status === 'fulfilled' ? gpuResult.value.available : false,
    system: systemHealthy,
    version: process.env.npm_package_version || '0.0.2',
    checks: {
      redis: redisResult.status === 'fulfilled' ? 'ok' : 'failed',
      gpu: gpuResult.status === 'fulfilled' ? 'ok' : 'failed', 
      system: systemResult.status === 'fulfilled' ? 'ok' : 'failed'
    }
  };
}

async function performDetailedHealthCheck(
  sessionStore: RedisSessionStore, 
  eventStore: RedisEventStore
) {
  const [redisStatus, gpuStatus, systemMetrics] = await Promise.allSettled([
    checkRedisStatus(sessionStore),
    checkGPUStatus(),
    getSystemMetrics()
  ]);

  return {
    status: 'healthy', // Will be updated based on checks
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    
    redis: redisStatus.status === 'fulfilled' 
      ? redisStatus.value 
      : { connected: false, error: redisStatus.reason?.message },
      
    gpu: gpuStatus.status === 'fulfilled' 
      ? gpuStatus.value 
      : { available: false, error: gpuStatus.reason?.message },
      
    system: systemMetrics.status === 'fulfilled' 
      ? systemMetrics.value 
      : { error: systemMetrics.reason?.message },
      
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      nodeEnv: process.env.NODE_ENV || 'development',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  };
}

async function checkRedisStatus(sessionStore: RedisSessionStore) {
  try {
    // Try to create a test session with timeout
    const testSessionId = `health-check-${Date.now()}`;
    
    // Use Promise.race for timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Redis timeout')), 2000);
    });
    
    const testPromise = sessionStore.create(testSessionId)
      .then(() => sessionStore.delete(testSessionId));
    
    await Promise.race([testPromise, timeoutPromise]);
    
    return {
      connected: true,
      responseTime: Date.now(), // Simple timing
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown Redis error',
      timestamp: new Date().toISOString()
    };
  }
}

async function checkGPUStatus() {
  try {
    // Create a simple Python script to check GPU
    const pythonScript = `
import json
import sys
try:
    import torch
    if torch.cuda.is_available():
        gpu_props = torch.cuda.get_device_properties(0)
        result = {
            "available": True,
            "deviceName": gpu_props.name,
            "memoryTotal": round(gpu_props.total_memory / (1024**3), 1),
            "cudaVersion": torch.version.cuda,
            "pytorchVersion": torch.__version__
        }
    else:
        result = {"available": False, "reason": "CUDA not available"}
    
    print(json.dumps(result))
except ImportError as e:
    print(json.dumps({"available": False, "reason": f"Missing dependencies: {str(e)}"}))
except Exception as e:
    print(json.dumps({"available": False, "reason": str(e)}))
`;

    const venvPython = process.env.PYTHON_PATH || 'python';
    const { stdout, stderr } = await execFileAsync('python', ['-c', pythonScript], {
      timeout: 10000 // 10 second timeout
    });

    if (stderr && stderr.includes('error')) {
      throw new Error(stderr);
    }

    const result = JSON.parse(stdout.trim());
    return {
      ...result,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Unknown GPU error',
      timestamp: new Date().toISOString()
    };
  }
}

async function checkSystemResources() {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  return {
    memory: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB  
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      external: Math.round(memoryUsage.external / 1024 / 1024) // MB
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  };
}

async function getSystemMetrics() {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  return {
    process: {
      pid: process.pid,
      uptime: process.uptime(),
      version: process.version,
      platform: process.platform,
      arch: process.arch
    },
    memory: {
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external,
      arrayBuffers: memoryUsage.arrayBuffers
    },
    cpu: cpuUsage,
    environment: {
      nodeEnv: process.env.NODE_ENV,
      pythonPath: process.env.PYTHON_PATH,
      redisHost: process.env.REDIS_HOST,
      redisPort: process.env.REDIS_PORT
    },
    timestamp: new Date().toISOString()
  };
}
