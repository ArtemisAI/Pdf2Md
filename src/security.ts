import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

export interface AuthConfig {
  enabled: boolean;
  apiKeys?: string[];
  jwtSecret?: string;
  rateLimiting: {
    windowMs: number;
    max: number;
    skipSuccessfulRequests?: boolean;
  };
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    type: 'api-key' | 'jwt' | 'anonymous';
    permissions: string[];
  };
}

export class SecurityMiddleware {
  private config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = config;
  }

  // API Key authentication middleware
  apiKeyAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!this.config.enabled) {
      // Set anonymous user for non-authenticated mode
      req.user = {
        id: 'anonymous',
        type: 'anonymous',
        permissions: ['read', 'write']
      };
      return next();
    }

    const authHeader = req.headers.authorization;
    const apiKey = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

    if (!apiKey) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide an API key in the Authorization header'
      });
    }

    // Validate API key
    if (!this.config.apiKeys?.includes(apiKey)) {
      return res.status(401).json({
        error: 'Invalid API key',
        message: 'The provided API key is not valid'
      });
    }

    // Set authenticated user
    req.user = {
      id: `api-key-${apiKey.substring(0, 8)}...`,
      type: 'api-key',
      permissions: ['read', 'write', 'admin']
    };

    next();
  };

  // Rate limiting middleware
  createRateLimiter(options?: Partial<AuthConfig['rateLimiting']>) {
    const rateLimitConfig = { ...this.config.rateLimiting, ...options };

    return rateLimit({
      windowMs: rateLimitConfig.windowMs,
      max: rateLimitConfig.max,
      skipSuccessfulRequests: rateLimitConfig.skipSuccessfulRequests,
      keyGenerator: (req: AuthenticatedRequest) => {
        // Use user ID if authenticated, otherwise IP
        return req.user?.id || req.ip || 'unknown';
      },
      handler: (req, res) => {
        res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${Math.ceil(rateLimitConfig.windowMs / 1000)} seconds.`,
          retryAfter: Math.ceil(rateLimitConfig.windowMs / 1000)
        });
      },
      standardHeaders: true,
      legacyHeaders: false
    });
  }

  // Permission checking middleware
  requirePermission = (permission: string) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'User context not found'
        });
      }

      if (!req.user.permissions.includes(permission) && !req.user.permissions.includes('admin')) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: `This operation requires '${permission}' permission`
        });
      }

      next();
    };
  };

  // Request logging middleware
  requestLogger = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const requestId = randomUUID();
    const startTime = Date.now();

    // Add request ID to headers
    res.setHeader('X-Request-ID', requestId);

    // Log request
    console.log(`[${requestId}] ${req.method} ${req.path} - User: ${req.user?.id || 'anonymous'} - IP: ${req.ip}`);

    // Log response on finish
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const status = res.statusCode >= 400 ? '❌' : '✅';
      console.log(`[${requestId}] ${status} ${res.statusCode} - ${duration}ms`);
    });

    next();
  };

  // CORS configuration
  getCorsOptions() {
    return {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);

        // In production, you would check against a whitelist
        // For development, allow all origins
        if (process.env.NODE_ENV !== 'production') {
          return callback(null, true);
        }

        // Production whitelist
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
        
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'), false);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'Last-Event-ID',
        'Mcp-Session-Id',
        'X-Request-ID'
      ],
      exposedHeaders: [
        'X-Request-ID',
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset'
      ]
    };
  }

  // Security headers middleware
  securityHeaders = (req: Request, res: Response, next: NextFunction) => {
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Only set HSTS in production with HTTPS
    if (process.env.NODE_ENV === 'production' && req.secure) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    // Content Security Policy for API (less restrictive than web apps)
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'none'; object-src 'none'; base-uri 'self'"
    );

    next();
  };
}

// Default security configuration
export const defaultSecurityConfig: AuthConfig = {
  enabled: process.env.NODE_ENV === 'production',
  apiKeys: process.env.API_KEYS?.split(',') || [],
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each user to 100 requests per windowMs
    skipSuccessfulRequests: false
  }
};

// Rate limit configurations for different endpoints
export const rateLimitConfigs = {
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // requests per window
  },
  streaming: {
    windowMs: 5 * 60 * 1000, // 5 minutes  
    max: 10 // concurrent streams per user
  },
  health: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30 // health checks per minute
  },
  audio: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20 // audio transcriptions per hour
  }
};