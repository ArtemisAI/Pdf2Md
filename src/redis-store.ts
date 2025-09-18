import Redis from 'ioredis';
import { randomUUID } from 'crypto';

interface SessionData {
  sessionId: string;
  createdAt: Date;
  lastAccessed: Date;
  metadata: Record<string, any>;
}

interface StreamEvent {
  eventId: string;
  type: 'progress' | 'partial' | 'complete' | 'error';
  data: any;
  timestamp: number;
}

export class RedisSessionStore {
  private redis: any;
  private errorLogged = false;

  constructor(options: { host?: string; port?: number; url?: string } = {}) {
    if (options.url) {
      this.redis = new (Redis as any)(options.url, {
        lazyConnect: true,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        commandTimeout: 1000,
      });
    } else {
      this.redis = new (Redis as any)({
        host: options.host || process.env.REDIS_HOST || 'localhost',
        port: options.port || parseInt(process.env.REDIS_PORT || '6379'),
        lazyConnect: true,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        commandTimeout: 1000,
      });
    }

    this.redis.on('error', (error: Error) => {
      if (!this.errorLogged) {
        console.error('Redis connection error (operating without Redis):', (error as any).code || error.message);
        this.errorLogged = true;
      }
    });

    this.redis.on('connect', () => {
      console.log('Redis connected successfully');
      this.errorLogged = false; // Reset error logging on successful connection
    });
  }

  async create(sessionId: string): Promise<SessionData> {
    const session: SessionData = {
      sessionId,
      createdAt: new Date(),
      lastAccessed: new Date(),
      metadata: {}
    };
    
    try {
      await this.redis.setex(
        `session:${sessionId}`,
        3600, // 1 hour TTL
        JSON.stringify(session)
      );
      console.log(`Session created: ${sessionId}`);
    } catch (error) {
      console.warn(`Could not persist session ${sessionId} to Redis:`, (error as any).code || error);
      throw error; // Re-throw so caller can handle gracefully
    }
    
    return session;
  }

  async get(sessionId: string): Promise<SessionData | null> {
    try {
      const data = await this.redis.get(`session:${sessionId}`);
      if (!data) return null;
      
      const session = JSON.parse(data) as SessionData;
      session.createdAt = new Date(session.createdAt);
      session.lastAccessed = new Date(session.lastAccessed);
      return session;
    } catch (error) {
      console.warn(`Could not retrieve session ${sessionId} from Redis:`, (error as any).code || error);
      return null;
    }
  }

  async update(sessionId: string, metadata: Record<string, any>): Promise<void> {
    try {
      const session = await this.get(sessionId);
      if (!session) return;
      
      session.metadata = { ...session.metadata, ...metadata };
      session.lastAccessed = new Date();
      
      await this.redis.setex(`session:${sessionId}`, 3600, JSON.stringify(session));
    } catch (error) {
      console.warn(`Could not update session ${sessionId} in Redis:`, (error as any).code || error);
    }
  }

  async delete(sessionId: string): Promise<void> {
    try {
      await this.redis.del(`session:${sessionId}`);
      console.log(`Session deleted: ${sessionId}`);
    } catch (error) {
      console.warn(`Could not delete session ${sessionId} from Redis:`, (error as any).code || error);
    }
  }

  async cleanup(): Promise<number> {
    try {
      const keys = await this.redis.keys('session:*');
      console.log(`Active sessions: ${keys.length}`);
      return keys.length;
    } catch (error) {
      console.warn('Could not cleanup Redis sessions:', (error as any).code || error);
      return 0;
    }
  }

  async close(): Promise<void> {
    try {
      await this.redis.quit();
    } catch (error) {
      console.warn('Could not close Redis connection:', (error as any).code || error);
    }
  }
}

export class RedisEventStore {
  private redis: any;
  private errorLogged = false;

  constructor(options: { host?: string; port?: number; url?: string } = {}) {
    if (options.url) {
      this.redis = new (Redis as any)(options.url, {
        lazyConnect: true,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        commandTimeout: 1000,
      });
    } else {
      this.redis = new (Redis as any)({
        host: options.host || process.env.REDIS_HOST || 'localhost',
        port: options.port || parseInt(process.env.REDIS_PORT || '6379'),
        lazyConnect: true,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        commandTimeout: 1000,
      });
    }

    this.redis.on('error', (error: Error) => {
      if (!this.errorLogged) {
        console.error('Redis EventStore error (operating without Redis):', (error as any).code || error.message);
        this.errorLogged = true;
      }
    });

    this.redis.on('connect', () => {
      console.log('Redis EventStore connected successfully');
      this.errorLogged = false;
    });
  }

  async storeEvent(streamId: string, event: Omit<StreamEvent, 'eventId'>): Promise<string> {
    const eventId = `${Date.now()}-${randomUUID()}`;
    const fullEvent: StreamEvent = { ...event, eventId };
    const key = `events:${streamId}`;
    
    await this.redis.zadd(key, Date.now(), JSON.stringify(fullEvent));
    await this.redis.expire(key, 86400); // 24 hour TTL
    
    return eventId;
  }

  async getEventsAfter(streamId: string, afterEventId?: string): Promise<StreamEvent[]> {
    const key = `events:${streamId}`;
    let minScore = 0;
    
    if (afterEventId) {
      // Extract timestamp from event ID to determine starting point
      const timestamp = parseInt(afterEventId.split('-')[0]);
      minScore = timestamp + 1;
    }
    
    const events = await this.redis.zrangebyscore(key, minScore, '+inf');
    return events.map((event: string) => JSON.parse(event) as StreamEvent);
  }

  async cleanup(streamId: string): Promise<void> {
    await this.redis.del(`events:${streamId}`);
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}

// Singleton instances for the application
let sessionStore: RedisSessionStore | null = null;
let eventStore: RedisEventStore | null = null;

export function getSessionStore(): RedisSessionStore {
  if (!sessionStore) {
    sessionStore = new RedisSessionStore({
      url: process.env.REDIS_URL
    });
  }
  return sessionStore;
}

export function getEventStore(): RedisEventStore {
  if (!eventStore) {
    eventStore = new RedisEventStore({
      url: process.env.REDIS_URL
    });
  }
  return eventStore;
}