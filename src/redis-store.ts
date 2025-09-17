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
  private redis: Redis;

  constructor(options: { host?: string; port?: number; url?: string } = {}) {
    if (options.url) {
      this.redis = new Redis(options.url);
    } else {
      this.redis = new Redis({
        host: options.host || process.env.REDIS_HOST || 'localhost',
        port: options.port || parseInt(process.env.REDIS_PORT || '6379'),
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
      });
    }

    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      console.log('Redis connected successfully');
    });
  }

  async create(sessionId: string): Promise<SessionData> {
    const session: SessionData = {
      sessionId,
      createdAt: new Date(),
      lastAccessed: new Date(),
      metadata: {}
    };
    
    await this.redis.setex(
      `session:${sessionId}`,
      3600, // 1 hour TTL
      JSON.stringify(session)
    );
    
    console.log(`Session created: ${sessionId}`);
    return session;
  }

  async get(sessionId: string): Promise<SessionData | null> {
    const data = await this.redis.get(`session:${sessionId}`);
    if (!data) return null;
    
    const session = JSON.parse(data) as SessionData;
    session.createdAt = new Date(session.createdAt);
    session.lastAccessed = new Date(session.lastAccessed);
    
    // Update last accessed time
    session.lastAccessed = new Date();
    await this.redis.setex(`session:${sessionId}`, 3600, JSON.stringify(session));
    
    return session;
  }

  async update(sessionId: string, metadata: Record<string, any>): Promise<void> {
    const session = await this.get(sessionId);
    if (!session) return;
    
    session.metadata = { ...session.metadata, ...metadata };
    session.lastAccessed = new Date();
    
    await this.redis.setex(`session:${sessionId}`, 3600, JSON.stringify(session));
  }

  async delete(sessionId: string): Promise<void> {
    await this.redis.del(`session:${sessionId}`);
    console.log(`Session deleted: ${sessionId}`);
  }

  async cleanup(): Promise<number> {
    const keys = await this.redis.keys('session:*');
    console.log(`Active sessions: ${keys.length}`);
    return keys.length;
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}

export class RedisEventStore {
  private redis: Redis;

  constructor(options: { host?: string; port?: number; url?: string } = {}) {
    if (options.url) {
      this.redis = new Redis(options.url);
    } else {
      this.redis = new Redis({
        host: options.host || process.env.REDIS_HOST || 'localhost',
        port: options.port || parseInt(process.env.REDIS_PORT || '6379'),
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
      });
    }
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
    return events.map(event => JSON.parse(event) as StreamEvent);
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